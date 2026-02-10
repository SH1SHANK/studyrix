"use client";

import {
  Suspense,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  Download,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo2,
  FolderOpen,
  MoreVertical,
  Presentation,
  Search,
  Settings,
  Share2,
  Star,
  Trash2,
  WifiOff,
} from "lucide-react";
import DotPatternBackground from "@/components/ui/DotPatternBackground";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Menu } from "@/components/ui/Menu";
import { CommandCenter, type CommandItem } from "@/components/resources/CommandCenter";
import { ShortcutsSheet } from "@/components/resources/ShortcutsSheet";
import { StudyrixFooter } from "@/components/resources/StudyrixFooter";
import { toast } from "sonner";
import { useStudyMaterialsPreferences } from "@/hooks/useStudyMaterialsPreferences";
import { useOfflineManager } from "@/hooks/useOfflineManager";
import { useOfflineStorageUsage } from "@/hooks/useOfflineStorageUsage";
import { useOnlineStatus } from "@/hooks/useOptimizations";
import { useDownloadCenter } from "@/hooks/useDownloadCenter";
import { parseResourceId } from "@/lib/resources/resource-id";
import { cn } from "@/lib/utils";

const PDF_MIME = "application/pdf";
const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDES = "application/vnd.google-apps.presentation";

const DOC_MIMES = new Set([
  GOOGLE_DOC,
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

const SHEET_MIMES = new Set([
  GOOGLE_SHEET,
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const SLIDE_MIMES = new Set([
  GOOGLE_SLIDES,
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
]);

const ARCHIVE_MIMES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/gzip",
]);

type MimeFilter = "all" | "pdf" | "slides" | "docs" | "archives";

type ConfirmState =
  | { type: "remove"; resourceId: string; name: string }
  | { type: "cleanup"; ids: string[]; count: number }
  | null;

const MIME_FILTERS: MimeFilter[] = ["all", "pdf", "slides", "docs", "archives"];

const parseMimeFilter = (value?: string | null): MimeFilter => {
  if (!value) return "all";
  if (MIME_FILTERS.includes(value as MimeFilter)) return value as MimeFilter;
  return "all";
};

const TAG_COLORS = [
  { id: "sun", label: "Sun", value: "#FDE68A" },
  { id: "mint", label: "Mint", value: "#BBF7D0" },
  { id: "sky", label: "Sky", value: "#BFDBFE" },
  { id: "rose", label: "Rose", value: "#FBCFE8" },
  { id: "violet", label: "Violet", value: "#DDD6FE" },
  { id: "apricot", label: "Apricot", value: "#FED7AA" },
  { id: "lemon", label: "Lemon", value: "#FEF9C3" },
  { id: "slate", label: "Slate", value: "#E2E8F0" },
  { id: "teal", label: "Teal", value: "#CCFBF1" },
  { id: "peach", label: "Peach", value: "#FFE4E6" },
];

type TagOption = {
  key: string;
  label: string;
  color: string;
};

const normalizeTagKey = (value: string) => value.trim().toLowerCase();

const hashTag = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

const pickTagColor = (value: string) => {
  const index = Math.abs(hashTag(value)) % TAG_COLORS.length;
  return TAG_COLORS[index]?.value ?? "#E2E8F0";
};

const formatBytes = (size?: number) => {
  if (!Number.isFinite(size) || !size) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let current = size;
  let idx = 0;
  while (current >= 1024 && idx < units.length - 1) {
    current /= 1024;
    idx += 1;
  }
  return `${current.toFixed(current >= 10 || idx === 0 ? 0 : 1)}\u00A0${units[idx]}`;
};

const formatModifiedDate = (value?: string) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const getMimeLabel = (mimeType?: string, name?: string) => {
  if (DOC_MIMES.has(mimeType ?? "")) return "DOC";
  if (SHEET_MIMES.has(mimeType ?? "")) return "XLSX";
  if (SLIDE_MIMES.has(mimeType ?? "")) return "PPTX";
  if (mimeType === PDF_MIME) return "PDF";
  if ((mimeType ?? "").startsWith("image/")) return "Image";
  if ((mimeType ?? "").startsWith("video/")) return "Video";
  if ((mimeType ?? "").startsWith("audio/")) return "Audio";
  if (ARCHIVE_MIMES.has(mimeType ?? "")) return "Archive";
  if ((mimeType ?? "").includes("json")) return "JSON";
  if ((mimeType ?? "").startsWith("text/")) return "Text";
  if (name && name.includes(".")) {
    const ext = name.split(".").pop();
    if (ext) return ext.toUpperCase();
  }
  return "File";
};

const getItemIcon = (mimeType?: string) => {
  if (DOC_MIMES.has(mimeType ?? "") || mimeType === PDF_MIME) return FileText;
  if (SHEET_MIMES.has(mimeType ?? "")) return FileSpreadsheet;
  if (SLIDE_MIMES.has(mimeType ?? "")) return Presentation;
  if ((mimeType ?? "").startsWith("image/")) return FileImage;
  if ((mimeType ?? "").startsWith("video/")) return FileVideo2;
  if ((mimeType ?? "").startsWith("audio/")) return FileAudio;
  if ((mimeType ?? "").includes("json") || (mimeType ?? "").includes("xml")) {
    return FileCode;
  }
  if (ARCHIVE_MIMES.has(mimeType ?? "")) return FileArchive;
  return FileIcon;
};

const ROW_TONES = {
  pdf: {
    row: "bg-[linear-gradient(90deg,#FECACA_0,#FECACA_8px,transparent_8px)]",
    icon: "bg-[#FEE2E2]",
  },
  slides: {
    row: "bg-[linear-gradient(90deg,#DDD6FE_0,#DDD6FE_8px,transparent_8px)]",
    icon: "bg-[#E9D5FF]",
  },
  docs: {
    row: "bg-[linear-gradient(90deg,#BFDBFE_0,#BFDBFE_8px,transparent_8px)]",
    icon: "bg-[#DBEAFE]",
  },
  archives: {
    row: "bg-[linear-gradient(90deg,#FED7AA_0,#FED7AA_8px,transparent_8px)]",
    icon: "bg-[#FFEDD5]",
  },
  default: {
    row: "bg-[linear-gradient(90deg,#E5E7EB_0,#E5E7EB_8px,transparent_8px)]",
    icon: "bg-white",
  },
};

const getRowTone = (mimeType?: string) => {
  if (mimeType === PDF_MIME) return ROW_TONES.pdf;
  if (SLIDE_MIMES.has(mimeType ?? "")) return ROW_TONES.slides;
  if (DOC_MIMES.has(mimeType ?? "")) return ROW_TONES.docs;
  if (ARCHIVE_MIMES.has(mimeType ?? "")) return ROW_TONES.archives;
  return ROW_TONES.default;
};

const parseSearchQuery = (input: string) => {
  const [text = "", ...tagSegments] = input.split("/");
  const tags = tagSegments
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 0);
  return { text: text.trim(), tags };
};

const buildSearchValue = (text: string, tags: string[]) => {
  const tagPart = tags.map((tag) => `/${tag}`).join(" ");
  return [text.trim(), tagPart].filter(Boolean).join(" ").trim();
};

const getExportMime = (mimeType?: string) => {
  if (mimeType === GOOGLE_DOC) return "application/pdf";
  if (mimeType === GOOGLE_SHEET) return "application/pdf";
  if (mimeType === GOOGLE_SLIDES) return "application/pdf";
  return null;
};

const buildDownloadFilename = (name?: string, exportMime?: string | null) => {
  const fallback = name || "saved-file";
  if (exportMime === "application/pdf" && !fallback.toLowerCase().endsWith(".pdf")) {
    return `${fallback}.pdf`;
  }
  return fallback;
};

function OfflineResourcesPageInner() {
  const isOnline = useOnlineStatus();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const initialSearch = searchParams.get("q") ?? "";
  const initialMimeFilter = parseMimeFilter(searchParams.get("type"));
  const [searchTerm, setSearchTerm] = useState(initialSearch);
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const [searchFocused, setSearchFocused] = useState(false);
  const [commandOpen, setCommandOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>(initialMimeFilter);
  const [confirmState, setConfirmState] = useState<ConfirmState>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  const {
    loaded,
    favorites,
    tags,
    tagPalette,
    tagPins,
    lastOpened,
    offlineFiles,
    cacheConfig,
    offlineStorageMode,
    toggleFavorite,
    setOfflineFile,
    removeOfflineFiles,
    replaceOfflineFiles,
    updateOfflineStorageMode,
    markOpened,
  } = useStudyMaterialsPreferences(null);
  const { addDownload } = useDownloadCenter();
  const triggerHaptic = useCallback(() => {
    if (typeof window === "undefined") return;
    if (!("vibrate" in navigator)) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (prefersReduced) return;
    if (!window.matchMedia("(pointer: coarse)").matches) return;
    navigator.vibrate(10);
  }, []);
  const offlineManager = useOfflineManager({
    loaded,
    offlineFiles,
    offlineStorageMode,
    cacheLimitMb: cacheConfig?.limitMb ?? null,
    setOfflineFile,
    removeOfflineFiles,
    replaceOfflineFiles,
    updateOfflineStorageMode,
    onHaptic: triggerHaptic,
  });

  const storageUsage = useOfflineStorageUsage(
    offlineFiles,
    cacheConfig?.limitMb ?? null,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const nextSearch = params.get("q") ?? "";
      const nextType = parseMimeFilter(params.get("type"));
      setSearchTerm(nextSearch);
      setMimeFilter(nextType);
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (commandOpen) return;
      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        setCommandOpen(true);
        return;
      }
      if (
        event.key === "/" &&
        !event.metaKey &&
        !event.ctrlKey &&
        !event.altKey
      ) {
        event.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [commandOpen]);

  const tagOptions = useMemo(() => {
    const library = new Map<string, TagOption>();
    Object.entries(tagPalette ?? {}).forEach(([key, meta]) => {
      const normalized = normalizeTagKey(key);
      if (!library.has(normalized)) {
        library.set(normalized, {
          key: normalized,
          label: meta.label || key,
          color: meta.color || pickTagColor(normalized),
        });
      }
    });
    Object.values(tags).forEach((list) => {
      list.forEach((tag) => {
        const normalized = normalizeTagKey(tag);
        if (!library.has(normalized)) {
          library.set(normalized, {
            key: normalized,
            label: tag,
            color: pickTagColor(normalized),
          });
        }
      });
    });
    const pinned = new Set(tagPins ?? []);
    return Array.from(library.values()).sort((a, b) => {
      const aPinned = pinned.has(a.key);
      const bPinned = pinned.has(b.key);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [tagPalette, tagPins, tags]);

  const parsedSearch = useMemo(() => {
    const parsed = parseSearchQuery(deferredSearchTerm);
    return {
      text: parsed.text.trim().toLowerCase(),
      tagKeys: parsed.tags.map((tag) => normalizeTagKey(tag)),
    };
  }, [deferredSearchTerm]);

  const offlineEntries = useMemo(() => {
    return Object.entries(offlineFiles).map(([resourceId, meta]) => {
      const entryTags = tags[resourceId] ?? [];
      return {
        resourceId,
        meta,
        tags: entryTags,
        tagKeys: entryTags.map((tag) => normalizeTagKey(tag)),
        lastOpenedAt: lastOpened[resourceId] ?? meta.cachedAt,
      };
    });
  }, [lastOpened, offlineFiles, tags]);

  const availableMimeFilters = useMemo(() => {
    const availability = {
      pdf: false,
      slides: false,
      docs: false,
      archives: false,
    };
    offlineEntries.forEach((entry) => {
      const mimeType = entry.meta.mimeType ?? "";
      if (mimeType === PDF_MIME) availability.pdf = true;
      if (SLIDE_MIMES.has(mimeType)) availability.slides = true;
      if (DOC_MIMES.has(mimeType)) availability.docs = true;
      if (ARCHIVE_MIMES.has(mimeType)) availability.archives = true;
    });
    return availability;
  }, [offlineEntries]);

  const quickFilters = useMemo(
    () =>
      [
        { id: "all", label: "All" },
        { id: "pdf", label: "PDFs" },
        { id: "slides", label: "Slides" },
        { id: "docs", label: "Docs" },
        { id: "archives", label: "Archives" },
      ].filter((option) =>
        option.id === "all"
          ? true
          : availableMimeFilters[
              option.id as "pdf" | "slides" | "docs" | "archives"
            ],
      ),
    [availableMimeFilters],
  );

  const activeMimeFilter = useMemo(() => {
    if (mimeFilter === "all") return "all";
    return availableMimeFilters[mimeFilter] ? mimeFilter : "all";
  }, [availableMimeFilters, mimeFilter]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const nextSearch = searchTerm.trim();
    if (nextSearch) {
      params.set("q", nextSearch);
    } else {
      params.delete("q");
    }
    if (activeMimeFilter !== "all") {
      params.set("type", activeMimeFilter);
    } else {
      params.delete("type");
    }
    const nextParams = params.toString();
    const currentParams = window.location.search.replace(/^\?/, "");
    if (nextParams === currentParams) return;
    router.replace(
      `${pathname}${nextParams ? `?${nextParams}` : ""}`,
      { scroll: false },
    );
  }, [activeMimeFilter, pathname, router, searchTerm]);

  const matchesMimeFilter = useCallback(
    (mimeType?: string) => {
      if (activeMimeFilter === "all") return true;
      if (mimeType === PDF_MIME) return activeMimeFilter === "pdf";
      if (SLIDE_MIMES.has(mimeType ?? "")) return activeMimeFilter === "slides";
      if (DOC_MIMES.has(mimeType ?? "")) return activeMimeFilter === "docs";
      if (ARCHIVE_MIMES.has(mimeType ?? "")) return activeMimeFilter === "archives";
      return false;
    },
    [activeMimeFilter],
  );

  const filteredEntries = useMemo(() => {
    const { text, tagKeys } = parsedSearch;
    if (!text && tagKeys.length === 0 && activeMimeFilter === "all") {
      return offlineEntries;
    }
    return offlineEntries.filter((entry) => {
      const name = entry.meta.name ?? "Saved file";
      const matchesText = !text || name.toLowerCase().includes(text);
      const matchesTags =
        tagKeys.length === 0 || tagKeys.every((tag) => entry.tagKeys.includes(tag));
      const matchesMime = matchesMimeFilter(entry.meta.mimeType);
      return matchesText && matchesTags && matchesMime;
    });
  }, [activeMimeFilter, matchesMimeFilter, offlineEntries, parsedSearch]);

  const recentEntries = useMemo(() => {
    return filteredEntries
      .slice()
      .sort(
        (a, b) =>
          new Date(b.lastOpenedAt).getTime() -
          new Date(a.lastOpenedAt).getTime(),
      )
      .slice(0, 6);
  }, [filteredEntries]);

  const confirmCopy = useMemo(() => {
    if (!confirmState) return null;
    if (confirmState.type === "remove") {
      return {
        title: "Remove Saved File",
        description: `Remove "${confirmState.name}" from saved files?`,
        confirmLabel: "Remove",
      };
    }
    const label = confirmState.count === 1 ? "file" : "files";
    return {
      title: "Free Up Space",
      description: `Remove ${confirmState.count} saved ${label} from this device?`,
      confirmLabel: "Remove Files",
    };
  }, [confirmState]);

  const courseGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredEntries>();
    filteredEntries.forEach((entry) => {
      const courseId = entry.meta.courseId ?? "Unknown";
      const existing = groups.get(courseId) ?? [];
      existing.push(entry);
      groups.set(courseId, existing);
    });
    return Array.from(groups.entries());
  }, [filteredEntries]);

  const tagGroups = useMemo(() => {
    const groups = new Map<string, typeof filteredEntries>();
    filteredEntries.forEach((entry) => {
      entry.tags.forEach((tag) => {
        const key = normalizeTagKey(tag);
        const existing = groups.get(key) ?? [];
        existing.push(entry);
        groups.set(key, existing);
      });
    });
    const pinned = new Set(tagPins ?? []);
    return Array.from(groups.entries()).sort(([a], [b]) => {
      const aPinned = pinned.has(a);
      const bPinned = pinned.has(b);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return a.localeCompare(b);
    });
  }, [filteredEntries, tagPins]);

  const liveSearch = useMemo(() => parseSearchQuery(searchTerm), [searchTerm]);
  const activeSearchTags = useMemo(
    () => liveSearch.tags.map((tag) => {
      const normalized = normalizeTagKey(tag);
      const option = tagOptions.find((entry) => entry.key === normalized);
      return option ?? {
        key: normalized,
        label: tag,
        color: pickTagColor(normalized),
      };
    }),
    [liveSearch.tags, tagOptions],
  );
  const activeSearchKeys = useMemo(
    () => new Set(liveSearch.tags.map((tag) => normalizeTagKey(tag))),
    [liveSearch.tags],
  );
  const tagQueryFragment = useMemo(() => {
    if (!searchTerm.includes("/")) return "";
    const parts = searchTerm.split("/");
    return (parts[parts.length - 1] ?? "").trim().toLowerCase();
  }, [searchTerm]);
  const showTagSuggestions = searchFocused && searchTerm.includes("/");
  const filteredTagSuggestions = useMemo(() => {
    if (!tagQueryFragment) return tagOptions;
    return tagOptions.filter((option) =>
      option.label.toLowerCase().includes(tagQueryFragment),
    );
  }, [tagOptions, tagQueryFragment]);

  const toggleSearchTag = useCallback(
    (option: TagOption) => {
      setSearchTerm((prev) => {
        const parsed = parseSearchQuery(prev);
        const existing = parsed.tags;
        const existingKeys = existing.map((tag) => normalizeTagKey(tag));
        const hasPartial =
          existing.length > 0 &&
          !tagOptions.some(
            (entry) =>
              entry.key === normalizeTagKey(existing[existing.length - 1] ?? ""),
          );
        const baseTags = hasPartial ? existing.slice(0, -1) : existing;
        let nextTags: string[] = [];
        if (existingKeys.includes(option.key)) {
          nextTags = baseTags.filter(
            (tag) => normalizeTagKey(tag) !== option.key,
          );
        } else {
          nextTags = [...baseTags, option.label];
        }
        return buildSearchValue(parsed.text, nextTags);
      });
    },
    [tagOptions],
  );

  const cleanupSummary = useMemo(() => {
    if (storageUsage.limitBytes === Infinity) return null;
    if (!Number.isFinite(storageUsage.limitBytes)) return null;
    if (storageUsage.limitBytes <= 0) return null;
    const usageRatio = storageUsage.usedBytes / storageUsage.limitBytes;
    if (usageRatio < 0.85) return null;

    const entries = offlineEntries.map((entry) => ({
      resourceId: entry.resourceId,
      meta: entry.meta,
      size: Number(entry.meta.size) || 0,
      lastUsed: entry.lastOpenedAt,
    }));

    const largest = entries
      .slice()
      .sort((a, b) => b.size - a.size)
      .slice(0, 3);
    const leastUsed = entries
      .slice()
      .sort(
        (a, b) =>
          new Date(a.lastUsed).getTime() - new Date(b.lastUsed).getTime(),
      )
      .slice(0, 3);

    return { largest, leastUsed, usageRatio };
  }, [offlineEntries, storageUsage.limitBytes, storageUsage.usedBytes]);

  const openBlob = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, []);

  const downloadBlobToDevice = useCallback((blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, []);

  const getOfflineBlob = useCallback(
    async (resourceId: string) => {
      return await offlineManager.getOfflineBlobForResource(resourceId);
    },
    [offlineManager],
  );

  const openOfflineResource = useCallback(
    async (resourceId: string) => {
      const blob = await offlineManager.openOfflineResource({ resourceId });
      if (!blob) return false;
      openBlob(blob);
      markOpened(resourceId);
      return true;
    },
    [markOpened, offlineManager, openBlob],
  );

  const handleRemoveOffline = useCallback(
    async (resourceId: string) => {
      await offlineManager.removeOfflineResource(resourceId);
    },
    [offlineManager],
  );

  const handleCleanupBulk = useCallback(
    async (ids: string[]) => {
      if (ids.length === 0) return;
      for (const id of ids) {
        await offlineManager.removeOfflineResource(id, true);
      }
      toast.message("Space cleaned up.");
    },
    [offlineManager],
  );

  const requestRemoveOffline = useCallback(
    (resourceId: string) => {
      const name = offlineFiles[resourceId]?.name ?? "Saved file";
      setConfirmState({ type: "remove", resourceId, name });
    },
    [offlineFiles],
  );

  const requestCleanup = useCallback(() => {
    if (!cleanupSummary) return;
    const ids = new Set<string>();
    cleanupSummary.largest.forEach((entry) => ids.add(entry.resourceId));
    cleanupSummary.leastUsed.forEach((entry) => ids.add(entry.resourceId));
    setConfirmState({ type: "cleanup", ids: Array.from(ids), count: ids.size });
  }, [cleanupSummary]);

  const handleConfirmAction = useCallback(async () => {
    if (!confirmState) return;
    if (confirmState.type === "remove") {
      await handleRemoveOffline(confirmState.resourceId);
    } else {
      await handleCleanupBulk(confirmState.ids);
    }
    setConfirmState(null);
  }, [confirmState, handleCleanupBulk, handleRemoveOffline]);

  const handleDownloadFile = useCallback(
    async (resourceId: string) => {
      const meta = offlineFiles[resourceId];
      const blob = await getOfflineBlob(resourceId);
      if (!meta || !blob) {
        toast.error("Unable to download this file.");
        return;
      }
      const exportMime = getExportMime(meta.mimeType);
      const filename = buildDownloadFilename(meta.name, exportMime);
      downloadBlobToDevice(blob, filename);
      const parsed = parseResourceId(resourceId);
      addDownload({
        id: resourceId,
        name: filename,
        downloadedAt: new Date().toISOString(),
        size: blob.size,
        courseId: parsed?.courseId,
        itemId: parsed?.itemId,
        mimeType: meta.mimeType,
        path: parsed?.path,
      });
      toast.message("Download started. Check Downloads for history.");
    },
    [addDownload, downloadBlobToDevice, getOfflineBlob, offlineFiles],
  );

  const handleShareFile = useCallback(
    async (resourceId: string, name: string) => {
      const meta = offlineFiles[resourceId];
      const blob = await getOfflineBlob(resourceId);
      if (!meta || !blob) {
        toast.error("Unable to share this file.");
        return;
      }
      const exportMime = getExportMime(meta.mimeType);
      const filename = buildDownloadFilename(name || meta.name, exportMime);

      if (typeof navigator !== "undefined" && "share" in navigator) {
        const file = new File([blob], filename, {
          type: blob.type || exportMime || "application/octet-stream",
        });
        const canShareFiles =
          !("canShare" in navigator) ||
          (typeof navigator.canShare === "function" &&
            navigator.canShare({ files: [file] }));

        if (canShareFiles) {
          try {
            await navigator.share({
              files: [file],
              title: name || filename,
            });
            return;
          } catch (error) {
            if ((error as Error)?.name === "AbortError") return;
          }
        }
      }

      downloadBlobToDevice(blob, filename);
      const parsed = parseResourceId(resourceId);
      addDownload({
        id: resourceId,
        name: filename,
        downloadedAt: new Date().toISOString(),
        size: blob.size,
        courseId: parsed?.courseId,
        itemId: parsed?.itemId,
        mimeType: meta.mimeType,
        path: parsed?.path,
      });
      toast.message("File downloaded. Share it from your device.");
    },
    [addDownload, downloadBlobToDevice, getOfflineBlob, offlineFiles],
  );

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
      {
        id: "nav-resources",
        label: "Go to Study Materials",
        description: "Return to the resources hub",
        group: "Navigation",
        href: "/",
      },
      {
        id: "nav-downloads",
        label: "Open Downloads",
        description: "See downloads and saved files",
        group: "Navigation",
        href: "/downloads",
      },
      {
        id: "nav-settings",
        label: "Open Study Materials Settings",
        description: "Saved files and offline",
        group: "Navigation",
        href: "/settings",
      },
    ];

    [
      { id: "all", label: "All Types", value: "all" },
      { id: "pdf", label: "PDFs", value: "pdf" },
      { id: "slides", label: "Slides", value: "slides" },
      { id: "docs", label: "Docs", value: "docs" },
      { id: "archives", label: "Archives", value: "archives" },
    ].forEach((option) => {
      items.push({
        id: `filter-mime-${option.id}`,
        label: `Filter: ${option.label}`,
        description: "Quick MIME filter",
        group: "Filters",
        onSelect: () =>
          setMimeFilter(
            option.value as "all" | "pdf" | "slides" | "docs" | "archives",
          ),
      });
    });

    tagOptions.forEach((tag) => {
      items.push({
        id: `tag-${tag.key}`,
        label: `Tag: ${tag.label}`,
        description: "Filter by tag",
        group: "Tags",
        keywords: tag.label,
        onSelect: () =>
          setSearchTerm((prev) => {
            const parsed = parseSearchQuery(prev);
            return buildSearchValue(parsed.text, [tag.label]);
          }),
      });
    });

    courseGroups.forEach(([courseId]) => {
      items.push({
        id: `course-${courseId}`,
        label: `Course ${courseId}`,
        description: "Open course resources",
        group: "Courses",
        href: `/course/${courseId}`,
      });
    });

    offlineEntries.forEach((entry) => {
      const name = entry.meta.name ?? "Saved file";
      items.push({
        id: `offline-${entry.resourceId}`,
        label: name,
        description: "Open saved file",
        group: "Saved",
        keywords: `${name} ${getMimeLabel(entry.meta.mimeType, name)}`,
        onSelect: () => openOfflineResource(entry.resourceId),
      });
    });

    return items;
  }, [courseGroups, offlineEntries, openOfflineResource, tagOptions]);

  const syncStatus = useMemo(() => {
    if (!isOnline) return "Offline";
    return "Up to Date";
  }, [isOnline]);

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
      <DotPatternBackground />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000]"
      >
        Skip to Content
      </a>
      <div
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-5xl relative z-10"
      >
        <header className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0px_#0a0a0a]">
          <div className="flex items-center justify-between gap-3">
            <Link
              href="/"
              aria-label="Back to resources"
              className="h-10 w-10 border-2 border-black bg-white flex items-center justify-center shadow-[3px_3px_0_#0a0a0a] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0a0a0a] hover:bg-yellow-50 active:translate-y-0 active:shadow-[2px_2px_0_#0a0a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <h1 className="flex-1 font-display text-xl sm:text-2xl font-black uppercase text-stone-900 tracking-tight truncate">
              Saved Materials
            </h1>
            <Menu open={overflowOpen} onOpenChange={setOverflowOpen}>
              <Menu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="h-10 w-10 border-2 border-black bg-white flex items-center justify-center shadow-[3px_3px_0_#0a0a0a] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0a0a0a] hover:bg-yellow-50 active:translate-y-0 active:shadow-[2px_2px_0_#0a0a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  <MoreVertical className="h-5 w-5" aria-hidden="true" />
                </button>
              </Menu.Trigger>
              <Menu.Content
                align="end"
                sideOffset={8}
                className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] min-w-[200px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
              >
                <div className="px-3 py-2 text-[10px] font-black uppercase text-stone-500 border-b border-stone-200">
                  Status: {syncStatus}
                </div>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                  onSelect={() => setCommandOpen(true)}
                >
                  Quick Search
                </Menu.Item>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                  onSelect={() => setShortcutsOpen(true)}
                >
                  Keyboard Shortcuts
                </Menu.Item>
                <Menu.Item asChild>
                  <Link
                    href="/downloads"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                  >
                    Downloads
                  </Link>
                </Menu.Item>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                  onSelect={() => setFocusMode((prev) => !prev)}
                >
                  {focusMode ? "Exit Focus Mode" : "Focus Mode"}
                </Menu.Item>
                <Menu.Item asChild>
                  <Link
                    href="/settings"
                    className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                  >
                    <Settings className="h-4 w-4" aria-hidden="true" />
                    Settings
                  </Link>
                </Menu.Item>
              </Menu.Content>
            </Menu>
          </div>
        </header>

        {!focusMode && (
          <section className="sticky top-[72px] sm:top-[80px] z-10 bg-white border-b-4 border-black px-4 py-2 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
            <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
              {quickFilters.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() =>
                    setMimeFilter(
                      option.id as
                        | "all"
                        | "pdf"
                        | "slides"
                        | "docs"
                        | "archives",
                    )
                  }
                  aria-pressed={activeMimeFilter === option.id}
                  className={cn(
                    "shrink-0 border-2 border-black px-2.5 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                    activeMimeFilter === option.id
                      ? "bg-black text-white"
                      : "bg-white hover:bg-yellow-50",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0px_#0a0a0a]">
          <label
            className="text-xs font-black uppercase text-neutral-600 mb-2 block"
            htmlFor="offline-search"
          >
            Search Saved Files
          </label>
          <div className="relative">
            <div className="flex items-center gap-3 border-[3px] border-black bg-white px-3 py-2 shadow-[3px_3px_0px_0px_#000]">
              <Search className="h-4 w-4 text-neutral-600" aria-hidden="true" />
              <input
                id="offline-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => {
                  window.setTimeout(() => setSearchFocused(false), 120);
                }}
                placeholder="Search files or /tags… e.g. /notes"
                aria-label="Search Saved Files"
                role="combobox"
                aria-autocomplete="list"
                aria-controls="offline-tag-suggestions"
                aria-expanded={showTagSuggestions}
                aria-haspopup="listbox"
                aria-describedby="offline-search-hint"
                name="offline-search"
                autoComplete="off"
                className="flex-1 bg-transparent text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                ref={searchInputRef}
              />
            </div>
            <p id="offline-search-hint" className="sr-only">
              Type /tag to filter by tag.
            </p>
            {showTagSuggestions && !focusMode && (
              <div
                id="offline-tag-suggestions"
                role="listbox"
                aria-label="Tag suggestions"
                className="absolute left-0 right-0 mt-2 border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] max-h-[min(50svh,280px)] overflow-y-auto z-20"
              >
                <div className="px-3 py-2 text-[10px] font-black uppercase text-stone-500 border-b border-stone-200">
                  Tag Filters
                </div>
                {filteredTagSuggestions.length === 0 ? (
                  <div className="px-3 py-3 text-xs font-bold uppercase text-stone-500">
                    No tags found yet.
                  </div>
                ) : (
                  filteredTagSuggestions.map((option) => (
                    <button
                      id={`offline-tag-${option.key}`}
                      key={option.key}
                      type="button"
                      role="option"
                      aria-selected={activeSearchKeys.has(option.key)}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => toggleSearchTag(option)}
                      className={cn(
                        "w-full flex items-center justify-between gap-3 px-3 py-2 text-xs font-black uppercase tracking-wide text-left border-b border-stone-200 last:border-b-0 hover:bg-yellow-100",
                        activeSearchKeys.has(option.key) && "bg-yellow-50",
                      )}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black shrink-0"
                          style={{ backgroundColor: option.color }}
                        />
                        <span className="truncate">{option.label}</span>
                      </span>
                      {activeSearchKeys.has(option.key) && (
                        <Check className="h-3.5 w-3.5 text-black" aria-hidden="true" />
                      )}
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {!focusMode && activeSearchTags.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              {activeSearchTags.map((tag) => (
                <span
                  key={tag.key}
                  className="inline-flex items-center gap-2 border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase leading-none shadow-[2px_2px_0px_0px_#000]"
                  style={{ backgroundColor: tag.color }}
                >
                  <span className="h-2 w-2 rounded-full border border-black bg-white" />
                  {tag.label}
                </span>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_#0a0a0a]">
          {!isOnline && (
            <div
              className="mb-4 flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase text-neutral-700 shadow-[3px_3px_0px_0px_#000]"
              role="status"
              aria-live="polite"
            >
              <span className="flex items-center gap-2">
                <WifiOff className="h-4 w-4" aria-hidden="true" />
                You&apos;re offline. Saved files are still here.
              </span>
            </div>
          )}

          {!focusMode && cleanupSummary && (
            <div className="mb-6 border-2 border-black bg-yellow-50 px-4 py-4 shadow-[3px_3px_0px_0px_#000]">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-black uppercase text-stone-700">
                    Space Cleanup
                  </p>
                  <p className="text-[11px] font-bold uppercase text-stone-600">
                    {storageUsage.usedMb}
                    {"\u00A0"}MB used • {storageUsage.limitMb === null
                      ? "Unlimited"
                      : `${storageUsage.limitMb}\u00A0MB limit`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={requestCleanup}
                  className="border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase text-white shadow-[3px_3px_0px_0px_#000] transition-colors duration-150 hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  Free Up Space
                </button>
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <div className="border-2 border-black bg-white px-3 py-3 shadow-[2px_2px_0px_0px_#000]">
                  <p className="text-[10px] font-black uppercase text-stone-600 mb-2">
                    Largest Files
                  </p>
                  <div className="space-y-2">
                    {cleanupSummary.largest.map((entry) => (
                      <div
                        key={entry.resourceId}
                        className="flex items-center justify-between gap-2 text-[10px] font-black uppercase"
                      >
                        <span className="truncate">
                          {entry.meta.name ?? "Saved file"}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span>{formatBytes(entry.size)}</span>
                          <button
                            type="button"
                            onClick={() => requestRemoveOffline(entry.resourceId)}
                            aria-label={`Remove ${entry.meta.name ?? "saved file"}`}
                            className="border border-black bg-white px-1.5 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="border-2 border-black bg-white px-3 py-3 shadow-[2px_2px_0px_0px_#000]">
                  <p className="text-[10px] font-black uppercase text-stone-600 mb-2">
                    Least Used
                  </p>
                  <div className="space-y-2">
                    {cleanupSummary.leastUsed.map((entry) => (
                      <div
                        key={entry.resourceId}
                        className="flex items-center justify-between gap-2 text-[10px] font-black uppercase"
                      >
                        <span className="truncate">
                          {entry.meta.name ?? "Saved file"}
                        </span>
                        <div className="flex items-center gap-2 shrink-0">
                          <span>{formatModifiedDate(entry.lastUsed)}</span>
                          <button
                            type="button"
                            onClick={() => requestRemoveOffline(entry.resourceId)}
                            aria-label={`Remove ${entry.meta.name ?? "saved file"}`}
                            className="border border-black bg-white px-1.5 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {filteredEntries.length === 0 ? (
            <div
              className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]"
              role="status"
              aria-live="polite"
            >
              <p className="text-sm font-bold uppercase text-neutral-600">
                No saved files yet. Save a file when you&apos;re online.
              </p>
            </div>
          ) : (
            <div
              className="space-y-6"
              style={{
                contentVisibility: "auto",
                containIntrinsicSize: "1px 800px",
              }}
            >
              <div>
                <h2 className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-stone-700 mb-3 bg-yellow-50/70 border border-yellow-200/80 px-2 py-1">
                  <span className="h-2 w-2 border border-black bg-yellow-300" />
                  Recently Accessed
                </h2>
                <div className="space-y-3">
                  {recentEntries.map((entry) => {
                    const Icon = getItemIcon(entry.meta.mimeType);
                    const tone = getRowTone(entry.meta.mimeType);
                    const isFavorite = Boolean(favorites[entry.resourceId]);
                    const tagChips = entry.tags.map((tag) => {
                      const normalized = normalizeTagKey(tag);
                      const option = tagOptions.find((item) => item.key === normalized);
                      return (
                        option ??
                        ({ key: normalized, label: tag, color: pickTagColor(normalized) } as TagOption)
                      );
                    });
                    return (
                      <div
                        key={entry.resourceId}
                        className={cn(
                          "group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-black px-4 py-3 text-left shadow-[2px_2px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 bg-white even:bg-[#FFFCF3] hover:bg-yellow-50/40 hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000]",
                          tone.row,
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => openOfflineResource(entry.resourceId)}
                          aria-label={`Open ${entry.meta.name ?? "saved file"}`}
                          className="flex flex-1 min-w-0 items-center gap-3 text-left transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                        >
                          <span
                            className={cn(
                              "flex h-10 w-10 items-center justify-center border-2 border-black shadow-[3px_3px_0px_0px_#000]",
                              tone.icon,
                            )}
                          >
                            <Icon className="h-5 w-5" aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p
                              className="text-sm font-black uppercase text-stone-900 truncate"
                              title={entry.meta.name ?? "Saved file"}
                            >
                              {entry.meta.name ?? "Saved file"}
                            </p>
                            <p className="text-[11px] font-bold uppercase text-stone-500/80">
                              {getMimeLabel(entry.meta.mimeType, entry.meta.name)} • {formatBytes(Number(entry.meta.size) || 0)} • Saved {formatModifiedDate(entry.meta.cachedAt)}
                            </p>
                            {!focusMode && (isFavorite || tagChips.length > 0) && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {isFavorite && (
                                  <span className="border-2 border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase leading-none text-stone-700 shadow-[2px_2px_0px_0px_#000]">
                                    Starred
                                  </span>
                                )}
                                {tagChips.map((tag) => (
                                  <span
                                    key={tag.key}
                                    className="border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase leading-none text-stone-700 shadow-[2px_2px_0px_0px_#000]"
                                    style={{ backgroundColor: tag.color }}
                                  >
                                    {tag.label}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </button>
                        {!focusMode && (
                          <div className="flex w-full sm:w-auto items-center justify-between sm:justify-end gap-2 pt-2 sm:pt-0">
                            <div className="flex items-center gap-2 opacity-100 transition-opacity sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto">
                              <button
                                type="button"
                                aria-label={isFavorite ? "Unstar file" : "Star file"}
                                aria-pressed={isFavorite}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  triggerHaptic();
                                  toggleFavorite(entry.resourceId);
                                }}
                                className={cn(
                                  "h-10 w-10 min-h-[44px] min-w-[44px] border-2 border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 hover:bg-yellow-50/70 active:bg-yellow-100/70 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                                  isFavorite ? "bg-yellow-50" : "bg-white",
                                )}
                              >
                                <Star
                                  className={cn(
                                    "h-4 w-4",
                                    isFavorite ? "text-yellow-600" : "text-black",
                                  )}
                                  fill={isFavorite ? "currentColor" : "none"}
                                  aria-hidden="true"
                                />
                              </button>
                            </div>
                            <Menu>
                              <Menu.Trigger asChild>
                                <button
                                  type="button"
                                  aria-label="File actions"
                                  className="h-10 w-10 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 hover:bg-yellow-50/70 active:bg-yellow-100/70 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                                >
                                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </Menu.Trigger>
                              <Menu.Content
                                align="end"
                                sideOffset={6}
                                className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] min-w-[190px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
                              >
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() => openOfflineResource(entry.resourceId)}
                                >
                                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                                  Open File
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() => handleDownloadFile(entry.resourceId)}
                                >
                                  <Download className="h-4 w-4" aria-hidden="true" />
                                  Download to Device
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    handleShareFile(
                                      entry.resourceId,
                                      entry.meta.name ?? "Saved file",
                                    )
                                  }
                                >
                                  <Share2 className="h-4 w-4" aria-hidden="true" />
                                  Share File
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide text-red-700 hover:bg-red-50 focus:bg-red-50"
                                  onSelect={() => requestRemoveOffline(entry.resourceId)}
                                >
                                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                                  Remove Saved Copy
                                </Menu.Item>
                              </Menu.Content>
                            </Menu>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h2 className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-stone-700 mb-3 bg-yellow-50/70 border border-yellow-200/80 px-2 py-1">
                  <span className="h-2 w-2 border border-black bg-yellow-300" />
                  By Course
                </h2>
                {courseGroups.length === 0 ? (
                  <p className="text-xs font-bold uppercase text-stone-500">
                    No course matches yet.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {courseGroups.map(([courseId, items]) => (
                      <div
                        key={courseId}
                        className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000]"
                      >
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <p className="text-[11px] font-black uppercase text-stone-700">
                            {courseId === "Unknown" ? "Unassigned" : courseId}
                          </p>
                          {courseId !== "Unknown" && (
                            <Link
                              href={`/course/${courseId}`}
                              className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                            >
                              Open Course
                            </Link>
                          )}
                        </div>
                        <div className="space-y-2">
                          {items.map((entry) => {
                            const Icon = getItemIcon(entry.meta.mimeType);
                            const tone = getRowTone(entry.meta.mimeType);
                            return (
                              <button
                                key={entry.resourceId}
                                type="button"
                                onClick={() => openOfflineResource(entry.resourceId)}
                                aria-label={`Open ${entry.meta.name ?? "saved file"}`}
                                className={cn(
                                  "w-full min-h-[44px] flex items-center justify-between gap-3 border-2 border-black px-3 py-2 text-left shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 bg-white even:bg-[#FFFCF3] hover:bg-yellow-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                                  tone.row,
                                )}
                              >
                                <span className="flex items-center gap-2 min-w-0">
                                  <span
                                    className={cn(
                                      "flex h-8 w-8 items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]",
                                      tone.icon,
                                    )}
                                  >
                                    <Icon className="h-4 w-4" aria-hidden="true" />
                                  </span>
                                  <span
                                    className="truncate text-xs font-black uppercase text-stone-900"
                                    title={entry.meta.name ?? "Saved file"}
                                  >
                                    {entry.meta.name ?? "Saved file"}
                                  </span>
                                </span>
                                <span className="text-[10px] font-black uppercase text-stone-500">
                                  {getMimeLabel(entry.meta.mimeType, entry.meta.name)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <h2 className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-stone-700 mb-3 bg-yellow-50/70 border border-yellow-200/80 px-2 py-1">
                  <span className="h-2 w-2 border border-black bg-yellow-300" />
                  By Tag
                </h2>
                {tagGroups.length === 0 ? (
                  <p className="text-xs font-bold uppercase text-stone-500">
                    Tag files to group them here.
                  </p>
                ) : (
                  <div className="space-y-4">
                    {tagGroups.map(([tagKey, items]) => {
                      const option = tagOptions.find((entry) => entry.key === tagKey);
                      const label = option?.label ?? tagKey;
                      const color = option?.color ?? pickTagColor(tagKey);
                      return (
                        <div
                          key={tagKey}
                          className="border-2 border-black bg-white p-4 shadow-[3px_3px_0px_0px_#000]"
                        >
                          <div className="flex items-center gap-2 mb-3">
                            <span
                              className="h-3 w-3 rounded-full border border-black"
                              style={{ backgroundColor: color }}
                            />
                            <p className="text-[11px] font-black uppercase text-stone-700">
                              {label}
                            </p>
                          </div>
                          <div className="space-y-2">
                            {items.map((entry) => {
                              const tone = getRowTone(entry.meta.mimeType);
                              return (
                                <button
                                  key={entry.resourceId}
                                  type="button"
                                  onClick={() => openOfflineResource(entry.resourceId)}
                                  aria-label={`Open ${entry.meta.name ?? "saved file"}`}
                                  className={cn(
                                    "w-full min-h-[44px] flex items-center justify-between gap-3 border-2 border-black px-3 py-2 text-left shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 bg-white even:bg-[#FFFCF3] hover:bg-yellow-50/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                                    tone.row,
                                  )}
                                >
                                  <span
                                    className="truncate text-xs font-black uppercase text-stone-900"
                                    title={entry.meta.name ?? "Saved file"}
                                  >
                                    {entry.meta.name ?? "Saved file"}
                                  </span>
                                  <span className="text-[10px] font-black uppercase text-stone-500">
                                    {getMimeLabel(entry.meta.mimeType, entry.meta.name)}
                                  </span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </div>

      <Dialog
        open={Boolean(confirmState)}
        onOpenChange={(open) => {
          if (!open) setConfirmState(null);
        }}
      >
        <DialogContent className="border-2 border-black bg-white shadow-[6px_6px_0px_0px_#000] max-w-[92vw] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase text-stone-900">
              {confirmCopy?.title ?? "Confirm"}
            </DialogTitle>
            <DialogDescription className="text-sm font-bold text-stone-600">
              {confirmCopy?.description ?? "Confirm this action."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <DialogClose asChild>
              <button
                type="button"
                className="border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                Cancel
              </button>
            </DialogClose>
            <button
              type="button"
              onClick={handleConfirmAction}
              className="border-2 border-black bg-black px-4 py-2 text-xs font-black uppercase text-white shadow-[3px_3px_0px_0px_#000] hover:bg-neutral-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              {confirmCopy?.confirmLabel ?? "Confirm"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <StudyrixFooter />
      <CommandCenter
        open={commandOpen}
        onOpenChange={setCommandOpen}
        items={commandItems}
        placeholder="Search saved files or tags… e.g. notes"
        emptyLabel="No matching saved files."
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsSheet
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        shortcuts={[
          { keys: "/", label: "Focus search" },
          { keys: "⌘K / Ctrl+K", label: "Open Quick Search" },
        ]}
      />
    </div>
  );
}

export default function OfflineResourcesPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-neutral-50" aria-busy="true" />
      }
    >
      <OfflineResourcesPageInner />
    </Suspense>
  );
}
