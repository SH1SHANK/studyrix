import "server-only";
import { DRIVE_FOLDER_MIME, type DriveItem, type FileNode } from "@/types/resources";

const DRIVE_FIELDS =
  "nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink,iconLink,size)";

const DEFAULT_REQUEST_TIMEOUT_MS = 10_000;
const MAX_PAGES = 10;

type FetchDriveChildrenOptions = {
  timeoutMs?: number;
  cache?: RequestCache;
  revalidateSeconds?: number;
};

export async function fetchWithTimeout(
  input: string,
  timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS,
  init?: RequestInit,
) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

export async function fetchDriveChildren(
  folderId: string,
  apiKey: string,
  options?: FetchDriveChildrenOptions,
) {
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
      options?.timeoutMs,
      {
        cache: options?.cache ?? "force-cache",
        next:
          typeof options?.revalidateSeconds === "number"
            ? { revalidate: options.revalidateSeconds }
            : { revalidate: 60 * 60 },
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
  } while (pageToken && pageCount < MAX_PAGES);

  return items;
}

export function normalizeDriveItem(
  item: DriveItem,
  tags: string[] = [],
): FileNode {
  const sizeNumber = Number(item.size);
  return {
    id: item.id,
    name: item.name,
    type: item.mimeType === DRIVE_FOLDER_MIME ? "folder" : "file",
    size: Number.isFinite(sizeNumber) ? sizeNumber : undefined,
    modifiedTime: item.modifiedTime ?? new Date(0).toISOString(),
    mimeType: item.mimeType,
    tags,
  };
}

export function normalizeDriveItems(
  items: DriveItem[],
  tagsById?: Record<string, string[]>,
) {
  return items.map((item) => normalizeDriveItem(item, tagsById?.[item.id] ?? []));
}

