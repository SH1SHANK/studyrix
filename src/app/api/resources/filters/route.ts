import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { buildApiError, buildApiSuccess } from "@/lib/api/errors";

export const runtime = "nodejs";

type FilterRow = {
  department_id: string | null;
  semesterID: number | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const departmentId = searchParams.get("departmentId")?.trim() || null;

    const supabase = getSupabaseServerClient();
    let query = supabase
      .from("courseRecords")
      .select("department_id,semesterID,syllabusAssets")
      .not("syllabusAssets", "is", null);

    if (departmentId) {
      query = query.eq("department_id", departmentId);
    }

    const { data, error } = await query;

    if (error) {
      const response = NextResponse.json(
        buildApiError(
          "SUPABASE_ERROR",
          "Failed to load resource filters",
        ),
        { status: 500 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const departments = new Set<string>();
    const semesters = new Set<number>();

    (data ?? []).forEach((row) => {
      const typed = row as FilterRow;
      if (typed.department_id) {
        departments.add(typed.department_id);
      }
      if (typeof typed.semesterID === "number" && Number.isFinite(typed.semesterID)) {
        semesters.add(typed.semesterID);
      }
    });

    const payload = {
      departments: Array.from(departments).sort((a, b) => a.localeCompare(b)),
      semesters: Array.from(semesters).sort((a, b) => a - b),
    };

    const response = NextResponse.json(buildApiSuccess(payload));
    response.headers.set(
      "Cache-Control",
      "public, max-age=60, s-maxage=300, stale-while-revalidate=3600",
    );
    return response;
  } catch {
    const response = NextResponse.json(
      buildApiError("INTERNAL_ERROR", "Unable to load resource filters"),
      { status: 500 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
