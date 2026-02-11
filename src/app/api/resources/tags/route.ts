import { NextRequest, NextResponse } from "next/server";
import { buildApiError, buildApiSuccess } from "@/lib/api/errors";
import {
  getTagsByResourceIds,
  normalizeResourceId,
  normalizeTags,
  upsertTagsBatch,
} from "@/lib/resources/tags-server";

export const runtime = "nodejs";

const WRITE_TOKEN = process.env.TAGS_WRITE_TOKEN;
const MAX_IDS = 200;
const MAX_BODY_UPDATES = 200;

function parseIdsFromSearchParams(searchParams: URLSearchParams) {
  const listFromIds = (searchParams.get("ids") ?? "")
    .split(",")
    .map((id) => normalizeResourceId(id));
  const listFromRepeated = searchParams
    .getAll("id")
    .map((id) => normalizeResourceId(id));
  return Array.from(new Set([...listFromIds, ...listFromRepeated].filter(Boolean))).slice(
    0,
    MAX_IDS,
  );
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = parseIdsFromSearchParams(searchParams);
    if (ids.length === 0) {
      const response = NextResponse.json(buildApiSuccess({ tags: {} }));
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const tags = await getTagsByResourceIds(ids);
    const response = NextResponse.json(buildApiSuccess({ tags }));
    response.headers.set(
      "Cache-Control",
      "public, max-age=30, s-maxage=60, stale-while-revalidate=300",
    );
    return response;
  } catch {
    const response = NextResponse.json(
      buildApiError("INTERNAL_ERROR", "Unable to load tags"),
      { status: 500 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get("x-tags-write-token")?.trim();
    if (!WRITE_TOKEN) {
      const response = NextResponse.json(
        buildApiError("INTERNAL_ERROR", "Tag writes are disabled"),
        { status: 503 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    if (!token || token !== WRITE_TOKEN) {
      const response = NextResponse.json(
        buildApiError("UNAUTHORIZED", "Unauthorized"),
        { status: 401 },
      );
      response.headers.set("Cache-Control", "private, no-store");
      return response;
    }

    const payload = (await request.json()) as {
      updates?: Array<{ id?: unknown; tags?: unknown }>;
    };
    const rawUpdates = Array.isArray(payload?.updates) ? payload.updates : [];
    const updates = rawUpdates
      .map((entry) => ({
        id: normalizeResourceId(entry.id),
        tags: normalizeTags(entry.tags),
      }))
      .filter((entry) => Boolean(entry.id))
      .slice(0, MAX_BODY_UPDATES);

    const result = await upsertTagsBatch(updates);
    const response = NextResponse.json(buildApiSuccess(result));
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  } catch {
    const response = NextResponse.json(
      buildApiError("INTERNAL_ERROR", "Unable to save tags"),
      { status: 500 },
    );
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  }
}

