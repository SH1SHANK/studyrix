import { NextRequest, NextResponse } from "next/server";
import { buildApiError } from "@/lib/api/errors";
import { checkRateLimit, getClientIp } from "@/lib/api/rate-limit";

export const runtime = "nodejs";
const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,200}$/;
const EXPORT_MIME_PATTERN = /^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/;
const MAX_EXPORT_MIME_LENGTH = 100;
const REQUEST_TIMEOUT_MS = 10000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 240;
const PROXY_FORWARD_HEADERS = [
  "content-type",
  "content-disposition",
  "etag",
  "last-modified",
  "accept-ranges",
] as const;

function isValidDriveId(value: string) {
  return DRIVE_ID_PATTERN.test(value);
}

function isValidExportMime(value: string) {
  if (value.length > MAX_EXPORT_MIME_LENGTH) return false;
  return EXPORT_MIME_PATTERN.test(value);
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

function buildProxyResponseHeaders(source: Headers, bodyByteLength: number) {
  const headers = new Headers();

  for (const key of PROXY_FORWARD_HEADERS) {
    const value = source.get(key);
    if (value) headers.set(key, value);
  }

  headers.set("Content-Length", String(bodyByteLength));
  headers.set("Cache-Control", "public, max-age=3600, s-maxage=3600");
  return headers;
}

export async function GET(request: NextRequest) {
  try {
    const ip = getClientIp(request.headers);
    const rate = checkRateLimit(`drive:file:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
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
    const fileId = searchParams.get("fileId")?.trim() ?? "";
    const exportMime = searchParams.get("export")?.trim() ?? "";

    if (!fileId) {
      const response = NextResponse.json(
        buildApiError("VALIDATION_ERROR", "Invalid request"),
        { status: 400 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    if (!isValidDriveId(fileId)) {
      const response = NextResponse.json(
        buildApiError("VALIDATION_ERROR", "Invalid request"),
        { status: 400 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    if (exportMime && !isValidExportMime(exportMime)) {
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

    const baseUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`;
    const url = exportMime
      ? `${baseUrl}/export?mimeType=${encodeURIComponent(exportMime)}&key=${apiKey}`
      : `${baseUrl}?alt=media&key=${apiKey}`;

    const response = await fetchWithTimeout(url, { cache: "no-store" });
    if (!response.ok) {
      const errorResponse = NextResponse.json(
        buildApiError("HTTP_ERROR", "Unable to fetch file"),
        { status: response.status },
      );
      errorResponse.headers.set("Cache-Control", "private, no-store");
      return errorResponse;
    }

    const buffer = await response.arrayBuffer();
    const headers = buildProxyResponseHeaders(response.headers, buffer.byteLength);
    return new NextResponse(buffer, {
      status: 200,
      headers,
    });
  } catch {
    const response = NextResponse.json(
      buildApiError("INTERNAL_ERROR", "Unable to fetch file"),
      { status: 500 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}
