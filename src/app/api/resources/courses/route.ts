import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildApiError, buildApiSuccess } from "@/lib/api/errors";
import { parseSyllabusAssets } from "@/lib/resources/syllabus";
import type { ResourceCourse } from "@/types/resources";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId")?.trim() || null;
    const semesterRaw = searchParams.get("semesterId");
    const semesterId = semesterRaw ? Number(semesterRaw) : null;
    const hasSemester =
      typeof semesterId === "number" && Number.isFinite(semesterId);

    if (!departmentId || !hasSemester) {
      const response = NextResponse.json(buildApiSuccess([]));
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

    courses.sort((a, b) =>
      (a.courseName ?? a.courseID).localeCompare(b.courseName ?? b.courseID),
    );

    const response = NextResponse.json(buildApiSuccess(courses));
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    );
    return response;
  } catch {
    const response = NextResponse.json(
      buildApiError("INTERNAL_ERROR", "Unable to load resources"),
      { status: 500 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
