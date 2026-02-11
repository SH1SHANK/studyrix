import "server-only";
import { getSupabaseServerClient } from "@/lib/supabase/server";

const MAX_BATCH_SIZE = 200;
const MAX_TAGS_PER_ITEM = 20;
const MAX_TAG_LENGTH = 32;

const TAGS_TABLE = process.env.SUPABASE_TAGS_TABLE || "resourceTags";

export type TagMap = Record<string, string[]>;

type QueryResult<T> = Promise<{ data?: T; error?: unknown }>;

type DynamicTagsTable = {
  select: (columns: string) => {
    in: (column: string, values: string[]) => QueryResult<unknown[]>;
  };
  delete: () => {
    in: (column: string, values: string[]) => Promise<{ error?: unknown }>;
  };
  upsert: (
    values: Array<{ resource_id: string; tags: string[] }>,
    options: { onConflict: string },
  ) => Promise<{ error?: unknown }>;
};

type DynamicSupabaseClient = {
  from: (table: string) => DynamicTagsTable;
};

export function normalizeTags(rawTags: unknown): string[] {
  if (!Array.isArray(rawTags)) return [];
  const deduped = new Set<string>();
  for (const rawTag of rawTags) {
    if (typeof rawTag !== "string") continue;
    const normalized = rawTag.trim().toLowerCase();
    if (!normalized || normalized.length > MAX_TAG_LENGTH) continue;
    deduped.add(normalized);
    if (deduped.size >= MAX_TAGS_PER_ITEM) break;
  }
  return Array.from(deduped);
}

export function normalizeResourceId(rawId: unknown) {
  if (typeof rawId !== "string") return "";
  return rawId.trim();
}

export async function getTagsByResourceIds(resourceIds: string[]) {
  if (resourceIds.length === 0) return {} as TagMap;
  const safeIds = Array.from(
    new Set(resourceIds.map((id) => normalizeResourceId(id)).filter(Boolean)),
  ).slice(0, MAX_BATCH_SIZE);

  if (safeIds.length === 0) return {} as TagMap;

  try {
    const supabase = getSupabaseServerClient() as unknown as DynamicSupabaseClient;
    const { data, error } = await supabase
      .from(TAGS_TABLE)
      .select("resource_id,tags")
      .in("resource_id", safeIds);

    if (error || !Array.isArray(data)) return {} as TagMap;

    const map: TagMap = {};
    for (const row of data) {
      const id = normalizeResourceId((row as { resource_id?: unknown }).resource_id);
      if (!id) continue;
      map[id] = normalizeTags((row as { tags?: unknown }).tags);
    }
    return map;
  } catch {
    return {} as TagMap;
  }
}

export async function upsertTagsBatch(updates: Array<{ id: string; tags: string[] }>) {
  const normalized = updates
    .map((update) => ({
      resource_id: normalizeResourceId(update.id),
      tags: normalizeTags(update.tags),
    }))
    .filter((update) => Boolean(update.resource_id))
    .slice(0, MAX_BATCH_SIZE);

  if (normalized.length === 0) return { updated: 0 };

  try {
    const supabase = getSupabaseServerClient() as unknown as DynamicSupabaseClient;

    const toDelete = normalized.filter((update) => update.tags.length === 0).map((u) => u.resource_id);
    const toUpsert = normalized.filter((update) => update.tags.length > 0);

    if (toDelete.length > 0) {
      const { error } = await supabase
        .from(TAGS_TABLE)
        .delete()
        .in("resource_id", toDelete);
      if (error) throw error;
    }

    if (toUpsert.length > 0) {
      const { error } = await supabase
        .from(TAGS_TABLE)
        .upsert(toUpsert, { onConflict: "resource_id" });
      if (error) throw error;
    }

    return { updated: normalized.length };
  } catch {
    return { updated: 0 };
  }
}
