import "server-only";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { parseSyllabusAssets } from "@/lib/resources/syllabus";

const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{10,200}$/;
const ALLOWLIST_TTL_MS = 5 * 60 * 1000;
const PARENTS_TTL_MS = 5 * 60 * 1000;
const ALLOWED_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_PARENT_TRAVERSAL = 25;
const REQUEST_TIMEOUT_MS = 10000;

type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

let allowlistCache: CacheEntry<Set<string>> | null = null;
const allowedCache = new Map<string, CacheEntry<boolean>>();
const parentsCache = new Map<string, CacheEntry<string[]>>();
const parentsInflight = new Map<string, Promise<string[]>>();

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

async function loadAllowlist(): Promise<Set<string>> {
  const cached = allowlistCache;
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const supabase = getSupabaseServerClient();
  const { data, error } = await supabase
    .from("courseRecords")
    .select("syllabusAssets")
    .not("syllabusAssets", "is", null);

  if (error) {
    throw new Error("Failed to load allowed Drive roots");
  }

  const roots = new Set<string>();
  type SyllabusRow = { syllabusAssets: unknown };
  ((data ?? []) as SyllabusRow[]).forEach((row) => {
    const assets = parseSyllabusAssets(row.syllabusAssets);
    if (!assets?.folderId) return;
    if (!isValidDriveId(assets.folderId)) return;
    roots.add(assets.folderId);
  });

  allowlistCache = {
    value: roots,
    expiresAt: Date.now() + ALLOWLIST_TTL_MS,
  };
  return roots;
}

async function fetchParents(fileId: string, apiKey: string): Promise<string[]> {
  const cached = parentsCache.get(fileId);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const inflight = parentsInflight.get(fileId);
  if (inflight) return inflight;

  const promise = (async () => {
    const params = new URLSearchParams();
    params.set("fields", "id,parents");
    params.set("supportsAllDrives", "true");
    params.set("includeItemsFromAllDrives", "true");
    params.set("key", apiKey);

    const response = await fetchWithTimeout(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?${params.toString()}`,
      {
        cache: "force-cache",
        next: { revalidate: 5 * 60 },
      },
    );

    if (!response.ok) {
      if (response.status >= 500 || response.status === 429) {
        throw new Error("Drive metadata unavailable");
      }
      return [];
    }

    const payload = (await response.json()) as { parents?: string[] };
    const parents = Array.isArray(payload.parents) ? payload.parents : [];

    parentsCache.set(fileId, {
      value: parents,
      expiresAt: Date.now() + PARENTS_TTL_MS,
    });

    return parents;
  })();

  parentsInflight.set(fileId, promise);

  try {
    return await promise;
  } finally {
    parentsInflight.delete(fileId);
  }
}

export async function isDriveIdAllowed(
  id: string,
  apiKey: string,
): Promise<boolean> {
  if (!id || !isValidDriveId(id)) return false;

  const roots = await loadAllowlist();
  if (roots.has(id)) {
    allowedCache.set(id, {
      value: true,
      expiresAt: Date.now() + ALLOWED_CACHE_TTL_MS,
    });
    return true;
  }

  const cached = allowedCache.get(id);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  const queue = [id];
  const visited = new Set<string>();

  while (queue.length > 0 && visited.size < MAX_PARENT_TRAVERSAL) {
    const current = queue.shift();
    if (!current || visited.has(current)) continue;
    visited.add(current);

    const parents = await fetchParents(current, apiKey);
    if (!parents.length) continue;

    for (const parent of parents) {
      if (!parent || visited.has(parent)) continue;
      if (roots.has(parent)) {
        allowedCache.set(id, {
          value: true,
          expiresAt: Date.now() + ALLOWED_CACHE_TTL_MS,
        });
        return true;
      }
      queue.push(parent);
    }
  }

  allowedCache.set(id, {
    value: false,
    expiresAt: Date.now() + ALLOWED_CACHE_TTL_MS,
  });
  return false;
}
