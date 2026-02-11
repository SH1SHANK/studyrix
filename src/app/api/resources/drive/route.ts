import { NextRequest, NextResponse } from "next/server";
import { buildApiError, buildApiSuccess } from "@/lib/api/errors";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";
import { fetchDriveChildren, normalizeDriveItems } from "@/lib/resources/drive-server";

export const runtime = "nodejs";

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,200}$/;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 240;

function isValidDriveId(value: string) {
  return DRIVE_ID_PATTERN.test(value);
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

    const items = await fetchDriveChildren(folderId, apiKey);
    const nodes = normalizeDriveItems(items);

    const response = NextResponse.json(buildApiSuccess(nodes));
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
