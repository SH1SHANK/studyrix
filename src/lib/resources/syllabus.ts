import type { SyllabusAssets } from "@/types/resources";

type RawSyllabusAssets = {
  provider?: string;
  folderId?: string;
  folderUrl?: string;
  visibility?: string;
};

const DRIVE_HOSTS = new Set([
  "drive.google.com",
  "docs.google.com",
  "google.com",
]);

function extractDriveFolderId(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;

  if (!trimmed.includes("http")) {
    return trimmed;
  }

  try {
    const url = new URL(trimmed);
    if (!DRIVE_HOSTS.has(url.hostname)) return null;

    const match = url.pathname.match(/\/folders\/([^/]+)/);
    if (match?.[1]) return match[1];

    const idParam = url.searchParams.get("id");
    if (idParam) return idParam;

    return null;
  } catch {
    return null;
  }
}

function isSyllabusAssets(value: unknown): value is RawSyllabusAssets {
  if (!value || typeof value !== "object") return false;
  return true;
}

export function parseSyllabusAssets(raw: unknown): SyllabusAssets | null {
  if (!raw) return null;

  let parsed: RawSyllabusAssets | null = null;
  let rawUrl: string | null = null;

  if (typeof raw === "string") {
    const trimmed = raw.trim();
    if (trimmed.startsWith("http")) {
      rawUrl = trimmed;
      parsed = {
        provider: "google-drive",
        folderId: extractDriveFolderId(trimmed) ?? undefined,
        folderUrl: trimmed,
      };
    } else {
      try {
        parsed = JSON.parse(trimmed) as RawSyllabusAssets;
      } catch {
        const folderId = extractDriveFolderId(trimmed);
        parsed = folderId
          ? { provider: "google-drive", folderId }
          : null;
      }
    }
  } else if (isSyllabusAssets(raw)) {
    parsed = raw as RawSyllabusAssets;
  }

  if (!parsed) return null;

  if (parsed.provider && parsed.provider !== "google-drive") return null;
  const folderId =
    typeof parsed.folderId === "string"
      ? parsed.folderId
      : parsed.folderUrl
        ? extractDriveFolderId(parsed.folderUrl)
        : rawUrl
          ? extractDriveFolderId(rawUrl)
          : null;
  if (!folderId) return null;

  return {
    provider: "google-drive",
    folderId,
    folderUrl:
      typeof parsed.folderUrl === "string"
        ? parsed.folderUrl
        : rawUrl ?? undefined,
    visibility:
      typeof parsed.visibility === "string" ? parsed.visibility : undefined,
  };
}
