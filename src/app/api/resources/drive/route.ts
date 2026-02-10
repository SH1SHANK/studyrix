import { NextRequest, NextResponse } from "next/server";
import { buildApiError, buildApiSuccess } from "@/lib/api/errors";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { isDriveIdAllowed } from "@/lib/resources/drive-allowlist";
import type { DriveItem } from "@/types/resources";

export const runtime = "nodejs";

const DRIVE_FIELDS =
  "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)";
const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,200}$/;
const REQUEST_TIMEOUT_MS = 10000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 240;

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
    const rate = checkRateLimit(`drive:list:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
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
    const folderId = searchParams.get("folderId")?.trim() ?? "";

    if (!folderId) {
      const response = NextResponse.json(
        buildApiError("VALIDATION_ERROR", "Invalid request"),
        { status: 400 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    if (!isValidDriveId(folderId)) {
      const response = NextResponse.json(
        buildApiError("VALIDATION_ERROR", "Invalid request"),
        { status: 400 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const apiKey = process.env.GOOGLE_DRIVE_API_KEY;
    if (!apiKey) {
      const response = NextResponse.json(
        buildApiError("INTERNAL_ERROR", "Service unavailable"),
        { status: 500 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const allowed = await isDriveIdAllowed(folderId, apiKey);
    if (!allowed) {
      const response = NextResponse.json(
        buildApiError("FORBIDDEN", "Access denied"),
        { status: 403 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const items = await fetchDriveChildren(folderId, apiKey);

    const response = NextResponse.json(buildApiSuccess(items));
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=3600, stale-while-revalidate=86400",
    );
    return response;
  } catch {
    const response = NextResponse.json(
      buildApiError("INTERNAL_ERROR", "Unable to load Drive resources"),
      { status: 500 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
