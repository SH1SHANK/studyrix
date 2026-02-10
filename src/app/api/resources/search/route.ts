import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildApiError, buildApiSuccess } from "@/lib/api/errors";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { parseSyllabusAssets } from "@/lib/resources/syllabus";
import {
  buildResourceId,
  buildResourcePath,
} from "@/lib/resources/resource-id";
import type { DriveItem, ResourceCourse } from "@/types/resources";
import { DRIVE_FOLDER_MIME } from "@/types/resources";

export const runtime = "nodejs";

const DRIVE_FIELDS =
  "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)";

const MAX_RESULTS = 200;
const MAX_FOLDERS = 250;
const MAX_ITEMS = 4000;
const MAX_QUERY_LENGTH = 120;
const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,200}$/;
const REQUEST_TIMEOUT_MS = 10000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

function isValidDriveId(value: string) {
  return DRIVE_ID_PATTERN.test(value);
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDriveChildren(folderId: string, apiKey: string) {
  const items: DriveItem[] = [];
  let pageToken: string | null = null;
  let pageCount = 0;

  do {
    const params = new URLSearchParams();
    params.set("q", `'${folderId}' in parents and trashed = false`);
    params.set("fields", DRIVE_FIELDS);
    params.set("pageSize", "1000");
    params.set("orderBy", "folder,name");
    params.set("supportsAllDrives", "true");
    params.set("includeItemsFromAllDrives", "true");
    params.set("key", apiKey);
    if (pageToken) params.set("pageToken", pageToken);

    const response = await fetchWithTimeout(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        cache: "force-cache",
        next: { revalidate: 60 * 60 },
      },
    );

    if (!response.ok) {
      throw new Error("Drive request failed");
    }

    const payload = (await response.json()) as {
      files?: DriveItem[];
      nextPageToken?: string;
    };

    items.push(...(payload.files ?? []));
    pageToken = payload.nextPageToken ?? null;
    pageCount += 1;
  } while (pageToken && pageCount < 10);

  return items;
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`drive:search:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      const response = NextResponse.json(
        buildApiError("RATE_LIMITED", "Too many requests"),
        { status: 429 },
      );
      response.headers.set("Retry-After", rate.resetAfterSeconds.toString());
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const { searchParams } = new URL(request.url);
    const rawQuery = (searchParams.get("q")?.trim() ?? "").slice(
      0,
      MAX_QUERY_LENGTH,
    );
    const departmentId = searchParams.get("departmentId")?.trim() || null;
    const semesterRaw = searchParams.get("semesterId");
    const semesterId = semesterRaw ? Number(semesterRaw) : null;
    const hasSemester =
      typeof semesterId === "number" && Number.isFinite(semesterId);

    if (rawQuery.length < 2) {
      const response = NextResponse.json(
        buildApiSuccess({ results: [], truncated: false }),
      );
      response.headers.set(
        "Cache-Control",
        "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
      );
      return response;
    }

    if (!departmentId || !hasSemester) {
      const response = NextResponse.json(
        buildApiSuccess({ results: [], truncated: false }),
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const supabase = getSupabaseServerClient();
    const { data, error } = await supabase
      .from("courseRecords")
      .select("courseID,courseName,syllabusAssets")
      .eq("department_id", departmentId)
      .eq("semesterID", semesterId)
      .not("syllabusAssets", "is", null);

    if (error) {
      const response = NextResponse.json(
        buildApiError(
          "SUPABASE_ERROR",
          "Failed to load course resources",
        ),
        { status: 500 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    type CourseRow = {
      courseID: string;
      courseName: string | null;
      syllabusAssets: unknown;
    };

    const courses: ResourceCourse[] = ((data ?? []) as CourseRow[])
      .map((row) => ({
        courseID: String(row.courseID ?? ""),
        courseName: row.courseName ?? null,
        syllabusAssets: parseSyllabusAssets(row.syllabusAssets),
      }))
      .filter((course) => Boolean(course.syllabusAssets?.folderId));

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      const response = NextResponse.json(
        buildApiError("INTERNAL_ERROR", "Service unavailable"),
        { status: 500 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const queue: Array<{
      courseId: string;
      courseName: string | null;
      folderId: string;
      pathIds: string[];
      pathNames: string[];
    }> = [];

    courses.forEach((course) => {
      const folderId = course.syllabusAssets?.folderId ?? null;
      if (!folderId || !isValidDriveId(folderId)) return;
      queue.push({
        courseId: course.courseID,
        courseName: course.courseName ?? null,
        folderId,
        pathIds: [folderId],
        pathNames: [course.courseName || course.courseID],
      });
    });

    const normalized = rawQuery.toLowerCase();
    const results: Array<{
      item: DriveItem;
      resourceId: string;
      courseId: string;
      courseName: string | null;
      pathIds: string[];
      pathNames: string[];
    }> = [];
    const visited = new Set<string>();
    let scannedItems = 0;
    let truncated = false;

    while (queue.length > 0) {
      if (results.length >= MAX_RESULTS || visited.size >= MAX_FOLDERS) {
        truncated = true;
        break;
      }

      const current = queue.shift();
      if (!current) continue;
      const folderKey = `${current.courseId}:${current.folderId}`;
      if (visited.has(folderKey)) continue;
      visited.add(folderKey);

      const items = await fetchDriveChildren(current.folderId, apiKey);
      for (const item of items) {
        scannedItems += 1;
        if (results.length >= MAX_RESULTS || scannedItems >= MAX_ITEMS) {
          truncated = true;
          break;
        }

        if (item.name?.toLowerCase().includes(normalized)) {
          results.push({
            item,
            resourceId: buildResourceId({
              courseId: current.courseId,
              path: buildResourcePath(current.pathIds),
              itemId: item.id,
            }),
            courseId: current.courseId,
            courseName: current.courseName,
            pathIds: current.pathIds,
            pathNames: current.pathNames,
          });
        }

        if (item.mimeType === DRIVE_FOLDER_MIME) {
          if (visited.size >= MAX_FOLDERS) {
            truncated = true;
            break;
          }
          queue.push({
            courseId: current.courseId,
            courseName: current.courseName,
            folderId: item.id,
            pathIds: [...current.pathIds, item.id],
            pathNames: [...current.pathNames, item.name],
          });
        }
      }
      if (truncated) break;
    }

    const response = NextResponse.json(buildApiSuccess({ results, truncated }));
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    );
    return response;
  } catch {
    const response = NextResponse.json(
      buildApiError("INTERNAL_ERROR", "Unable to search resources"),
      { status: 500 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
