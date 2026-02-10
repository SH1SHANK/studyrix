"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Check,
  CheckSquare,
  Download,
  File as FileIcon,
  FileText,
  FileArchive,
  FileAudio,
  FileCode,
  FileImage,
  FileSpreadsheet,
  FileVideo2,
  Folder,
  FolderOpen,
  HelpCircle,
  LayoutGrid,
  List,
  MoreVertical,
  Pin,
  Settings,
  Presentation,
  RefreshCw,
  Search,
  Share2,
  Sparkles,
  Square,
  Star,
  Tag,
  WifiOff,
} from "lucide-react";
import DotPatternBackground from "@/components/ui/DotPatternBackground";
import { RetroSkeleton } from "@/components/ui/skeleton";
import { useDriveFolder, useResourceCourses } from "@/hooks/useResources";
import { useStudyMaterialsPreferences } from "@/hooks/useStudyMaterialsPreferences";
import { useOfflineManager } from "@/hooks/useOfflineManager";
import { useOfflineStorageUsage } from "@/hooks/useOfflineStorageUsage";
import { useDownloadCenter } from "@/hooks/useDownloadCenter";
import { Menu } from "@/components/ui/Menu";
import { Drawer } from "@/components/ui/Drawer";
import { toast } from "sonner";
import {
  buildResourceId,
  buildResourcePath,
  parseResourceId,
} from "@/lib/resources/resource-id";
import { cn } from "@/lib/utils";
import {
  DRIVE_FOLDER_MIME,
  type DriveItem,
  type ResourceCourse,
} from "@/types/resources";
import { OfflineFallbackButton } from "@/components/resources/OfflineFallbackButton";
import {
  CommandCenter,
  type CommandItem,
} from "@/components/resources/CommandCenter";
import { ShortcutsSheet } from "@/components/resources/ShortcutsSheet";
import { StudyrixFooter } from "@/components/resources/StudyrixFooter";

const isFolder = (mimeType?: string) => mimeType === DRIVE_FOLDER_MIME;

const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDES = "application/vnd.google-apps.presentation";
const PDF_MIME = "application/pdf";

const ARCHIVE_MIMES = new Set([
  "application/zip",
  "application/x-zip-compressed",
  "application/x-7z-compressed",
  "application/x-rar-compressed",
  "application/x-tar",
  "application/gzip",
]);

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

type QuickFilterOption =
  | { id: "all"; label: string }
  | { id: "pdf" | "docs" | "slides"; label: string; mime: "pdf" | "docs" | "slides" }
  | { id: "pyq" | "offline" | "starred"; label: string; course: "pyq" | "offline" | "starred" };

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

const buildDriveLink = (link?: string, email?: string | null) => {
  if (!link) return null;
  if (!email) return link;
  try {
    const url = new URL(link);
    url.searchParams.set("authuser", email);
    return url.toString();
  } catch {
    return link;
  }
};

const formatBytes = (size?: string | number) => {
  const value = typeof size === "number" ? size : Number(size ?? NaN);
  if (!Number.isFinite(value) || value <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let current = value;
  let idx = 0;
  while (current >= 1024 && idx < units.length - 1) {
    current /= 1024;
    idx += 1;
  }
  return `${current.toFixed(current >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
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
  if (mimeType === DRIVE_FOLDER_MIME) return "Folder";
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
  if (mimeType === DRIVE_FOLDER_MIME) return Folder;
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
  folder: {
    row: "bg-[linear-gradient(90deg,#FDE68A_0,#FDE68A_8px,transparent_8px)]",
    bg: "bg-amber-50/30",
    hoverBg: "hover:bg-amber-50/50",
    icon: "bg-[#FFD700]",
    iconGradient: "bg-gradient-to-br from-amber-200 to-yellow-400",
  },
  pdf: {
    row: "bg-[linear-gradient(90deg,#FECACA_0,#FECACA_8px,transparent_8px)]",
    bg: "bg-red-50/30",
    hoverBg: "hover:bg-red-50/50",
    icon: "bg-[#FEE2E2]",
    iconGradient: "bg-gradient-to-br from-red-100 to-red-300",
  },
  slides: {
    row: "bg-[linear-gradient(90deg,#DDD6FE_0,#DDD6FE_8px,transparent_8px)]",
    bg: "bg-violet-50/30",
    hoverBg: "hover:bg-violet-50/50",
    icon: "bg-[#E9D5FF]",
    iconGradient: "bg-gradient-to-br from-violet-100 to-purple-300",
  },
  docs: {
    row: "bg-[linear-gradient(90deg,#BFDBFE_0,#BFDBFE_8px,transparent_8px)]",
    bg: "bg-blue-50/30",
    hoverBg: "hover:bg-blue-50/50",
    icon: "bg-[#DBEAFE]",
    iconGradient: "bg-gradient-to-br from-blue-100 to-blue-300",
  },
  archives: {
    row: "bg-[linear-gradient(90deg,#FED7AA_0,#FED7AA_8px,transparent_8px)]",
    bg: "bg-orange-50/30",
    hoverBg: "hover:bg-orange-50/50",
    icon: "bg-[#FFEDD5]",
    iconGradient: "bg-gradient-to-br from-orange-100 to-orange-300",
  },
  default: {
    row: "bg-[linear-gradient(90deg,#E5E7EB_0,#E5E7EB_8px,transparent_8px)]",
    bg: "bg-stone-50/30",
    hoverBg: "hover:bg-stone-50/50",
    icon: "bg-white",
    iconGradient: "bg-gradient-to-br from-stone-100 to-stone-200",
  },
};

const getRowTone = (mimeType?: string) => {
  if (mimeType === DRIVE_FOLDER_MIME) return ROW_TONES.folder;
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

type ResourceCourseBrowserProps = {
  course: ResourceCourse;
  rootFolderId: string;
  userEmail?: string | null;
  courses?: ResourceCourse[];
  preferences: ReturnType<typeof useStudyMaterialsPreferences>;
};

type TagOption = {
  key: string;
  label: string;
  color: string;
};

type SearchResult = {
  item: DriveItem;
  resourceId: string;
  pathIds: string[];
  pathNames: string[];
};

type TagDrawerState = {
  mode: "single" | "bulk";
  action?: "add" | "remove";
  resourceIds: string[];
  name: string;
};

function ResourceCourseBrowser({
  course,
  rootFolderId,
  userEmail,
  courses,
  preferences,
}: ResourceCourseBrowserProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isSearchDebouncing, setIsSearchDebouncing] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  useEffect(() => {
    setIsSearchDebouncing(true);
    const timer = window.setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
      setIsSearchDebouncing(false);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchTerm]);
  const [offlinePending, setOfflinePending] = useState<Set<string>>(
    () => new Set(),
  );
  const { addDownload } = useDownloadCenter();
  const [deepSearchIndex, setDeepSearchIndex] = useState<SearchResult[]>([]);
  const [deepSearchStatus, setDeepSearchStatus] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [deepSearchTruncated, setDeepSearchTruncated] = useState(false);
  const deepSearchRootRef = useRef<string | null>(null);
  const [accountNotice, setAccountNotice] = useState<{
    link: string;
    email: string;
  } | null>(null);
  const [searchFocused, setSearchFocused] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [commandOpen, setCommandOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [viewSettingsOpen, setViewSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
  const [mimeFilter, setMimeFilter] = useState<
    "all" | "pdf" | "slides" | "docs"
  >("all");
  const [courseFilter, setCourseFilter] = useState<
    "all" | "pyq" | "offline" | "starred"
  >("all");
  const [isFilterPending, setIsFilterPending] = useState(false);
  const [listReady, setListReady] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(
    () => new Set(),
  );
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef<string | null>(null);
  const openTargetRef = useRef<string | null>(null);
  const [tagDrawer, setTagDrawer] = useState<TagDrawerState | null>(null);
  const [tagSelection, setTagSelection] = useState<Set<string>>(
    () => new Set(),
  );
  const [tagSearch, setTagSearch] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(
    TAG_COLORS[0]?.value ?? "#E2E8F0",
  );
  const [duplicateTagKey, setDuplicateTagKey] = useState<string | null>(null);
  const accessStatsRef = useRef<
    Record<string, { count: number; lastAccessed: string }>
  >({});
  const [accessStatsTick, setAccessStatsTick] = useState(0);
  const [cleanupDismissed, setCleanupDismissed] = useState(false);
  const [folderStack, setFolderStack] = useState<
    Array<{ id: string; name: string }>
  >([{ id: rootFolderId, name: course.courseName || course.courseID }]);
  const currentPathIds = useMemo(
    () => folderStack.map((folder) => folder.id),
    [folderStack],
  );
  const currentPathNames = useMemo(
    () => folderStack.map((folder) => folder.name),
    [folderStack],
  );
  const [isCompactBreadcrumb, setIsCompactBreadcrumb] = useState(false);
  const breadcrumbRef = useRef<HTMLDivElement | null>(null);
  const scrollPositionsRef = useRef<Record<string, number>>({});
  const previousDepthRef = useRef(1);
  const courseList = useMemo(() => courses ?? [], [courses]);
  const clampStyle = useMemo(
    () =>
      ({
        display: "-webkit-box",
        WebkitLineClamp: 2,
        WebkitBoxOrient: "vertical",
        overflow: "hidden",
      }) as React.CSSProperties,
    [],
  );
  const listVisibilityStyle = useMemo(
    () =>
      ({
        contentVisibility: "auto",
        containIntrinsicSize: "1px 720px",
      }) as React.CSSProperties,
    [],
  );
  const applyFilterPreset = useCallback(
    (preset: "all" | "slides" | "offline" | "starred") => {
      if (preset === "all") {
        setMimeFilter("all");
        setCourseFilter("all");
        return;
      }
      if (preset === "slides") {
        setMimeFilter("slides");
        setCourseFilter("all");
        return;
      }
      if (preset === "offline") {
        setCourseFilter("offline");
        setMimeFilter("all");
        return;
      }
      if (preset === "starred") {
        setCourseFilter("starred");
        setMimeFilter("all");
      }
    },
    [setCourseFilter, setMimeFilter],
  );
  const quickFiltersBase = useMemo<QuickFilterOption[]>(
    () => [
      { id: "all", label: "All" },
      { id: "pdf", label: "PDF", mime: "pdf" },
      { id: "docs", label: "Docs", mime: "docs" },
      { id: "pyq", label: "PYQ", course: "pyq" },
    ],
    [],
  );

  const currentFolder = folderStack[folderStack.length - 1];
  const driveQuery = useDriveFolder(currentFolder?.id ?? null);
  const openTargetId = searchParams.get("open");
  const {
    favorites,
    tags,
    tagPalette,
    tagPins,
    lastOpened,
    offlineFiles,
    cacheConfig,
    offlineStorageMode,
    courseViewMode,
    courseViewSize,
    toggleFavorite,
    setTags,
    setTagsBatch,
    upsertTagPalette,
    toggleTagPin,
    markOpened,
    setOfflineFile,
    removeOfflineFiles,
    replaceOfflineFiles,
    updateOfflineStorageMode,
    updateCourseView,
  } = preferences;
  const cacheLimitMb = cacheConfig.limitMb ?? null;
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
    loaded: preferences.loaded,
    offlineFiles,
    offlineStorageMode,
    cacheLimitMb,
    setOfflineFile,
    removeOfflineFiles,
    replaceOfflineFiles,
    updateOfflineStorageMode,
    onHaptic: triggerHaptic,
  });
  const viewMode = courseViewMode ?? "list";
  const viewSize = courseViewSize ?? "md";
  const isGridView = viewMode === "grid";
  const isCompactView = viewMode === "compact";
  const viewSizing = useMemo(() => {
    if (viewSize === "sm") {
      return {
        padding: "px-2.5 py-2",
        iconBox: "h-9 w-9",
        icon: "h-4 w-4",
        title: "text-xs",
        meta: "text-[10px]",
        badge: "text-[8px]",
      };
    }
    if (viewSize === "lg") {
      return {
        padding: "px-4 py-3",
        iconBox: "h-12 w-12",
        icon: "h-6 w-6",
        title: "text-base",
        meta: "text-[12px]",
        badge: "text-[10px]",
      };
    }
    return {
      padding: "px-3.5 py-2.5",
      iconBox: "h-10 w-10",
      icon: "h-5 w-5",
      title: "text-sm",
      meta: "text-[11px]",
      badge: "text-[9px]",
    };
  }, [viewSize]);
  const viewModeOptions = useMemo(
    () => [
      { id: "grid", label: "Grid", icon: LayoutGrid },
      { id: "list", label: "List", icon: List },
      { id: "compact", label: "Compact", icon: Square },
    ],
    [],
  );
  const viewSizeOptions = useMemo(
    () => [
      { id: "sm", label: "Small" },
      { id: "md", label: "Medium" },
      { id: "lg", label: "Large" },
    ],
    [],
  );
  const badgeClass = useMemo(
    () =>
      cn(
        "border-2 border-black px-1.5 py-0.5 font-black uppercase leading-none shadow-[1px_1px_0px_0px_#000] bg-white/90",
        viewSizing.badge,
      ),
    [viewSizing.badge],
  );
  const gridLayoutClass = useMemo(() => {
    if (viewSize === "lg") {
      return "grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
    }
    if (viewSize === "sm") {
      return "grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
    }
    return "grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4";
  }, [viewSize]);
  const listSpacingClass = useMemo(() => {
    if (viewSize === "lg") return "space-y-4";
    if (viewSize === "sm") return "space-y-2";
    return "space-y-3";
  }, [viewSize]);
  const storageUsage = useOfflineStorageUsage(
    offlineFiles,
    cacheLimitMb,
  );

  const pathKey = useMemo(
    () => buildResourcePath(folderStack.map((folder) => folder.id)),
    [folderStack],
  );

  const getResourceId = useCallback(
    (itemId: string) =>
      buildResourceId({
        courseId: course.courseID,
        path: pathKey,
        itemId,
      }),
    [course.courseID, pathKey],
  );

  const getResourceIdForPath = useCallback(
    (pathIds: string[], itemId: string) =>
      buildResourceId({
        courseId: course.courseID,
        path: buildResourcePath(pathIds),
        itemId,
      }),
    [course.courseID],
  );

  const tagLibrary = useMemo(() => {
    const library = new Map<string, TagOption>();
    Object.entries(tagPalette ?? {}).forEach(([key, meta]) => {
      if (!meta) return;
      const normalized = normalizeTagKey(key);
      library.set(normalized, {
        key: normalized,
        label: meta.label,
        color: meta.color,
      });
    });
    Object.values(tags).forEach((list) => {
      list?.forEach((tag) => {
        const normalized = normalizeTagKey(tag);
        if (library.has(normalized)) return;
        library.set(normalized, {
          key: normalized,
          label: tag,
          color: pickTagColor(normalized),
        });
      });
    });
    return library;
  }, [tagPalette, tags]);

  const pinnedTagSet = useMemo(() => new Set(tagPins), [tagPins]);

  const tagOptions = useMemo(() => {
    return Array.from(tagLibrary.values()).sort((a, b) => {
      const aPinned = pinnedTagSet.has(a.key);
      const bPinned = pinnedTagSet.has(b.key);
      if (aPinned !== bPinned) return aPinned ? -1 : 1;
      return a.label.localeCompare(b.label);
    });
  }, [pinnedTagSet, tagLibrary]);

  const resolveTagOption = useCallback(
    (tag: string) => {
      const normalized = normalizeTagKey(tag);
      return (
        tagLibrary.get(normalized) ?? {
          key: normalized,
          label: tag,
          color: pickTagColor(normalized),
        }
      );
    },
    [tagLibrary],
  );

  const storeScrollPosition = useCallback(() => {
    if (typeof window === "undefined") return;
    scrollPositionsRef.current[pathKey] = window.scrollY;
  }, [pathKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let timer: number | null = null;
    const update = () => {
      setIsCompactBreadcrumb(window.matchMedia("(max-width: 640px)").matches);
    };
    const schedule = () => {
      if (timer !== null) window.clearTimeout(timer);
      timer = window.setTimeout(update, 150);
    };
    update();
    window.addEventListener("resize", schedule);
    window.addEventListener("orientationchange", schedule);
    return () => {
      if (timer !== null) window.clearTimeout(timer);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [rootFolderId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `resources.course.${course.courseID}.path`;
    const raw = window.sessionStorage.getItem(storageKey);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as Array<{ id: string; name: string }>;
      if (Array.isArray(parsed) && parsed.length > 0) {
        const root = parsed[0];
        if (root && root.id === rootFolderId) {
          setFolderStack(parsed);
        }
      }
    } catch {
      return;
    }
  }, [course.courseID, rootFolderId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const currentDepth = folderStack.length;
    const previousDepth = previousDepthRef.current;
    if (currentDepth > previousDepth) {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } else if (currentDepth < previousDepth) {
      const stored = scrollPositionsRef.current[pathKey];
      window.scrollTo({
        top: typeof stored === "number" ? stored : 0,
        left: 0,
        behavior: "auto",
      });
    }
    previousDepthRef.current = currentDepth;
  }, [folderStack.length, pathKey]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const storageKey = `resources.course.${course.courseID}.path`;
    window.sessionStorage.setItem(storageKey, JSON.stringify(folderStack));
  }, [course.courseID, folderStack]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const statsKey = `resources.course.${course.courseID}.accessStats`;
    try {
      const raw = window.sessionStorage.getItem(statsKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<
          string,
          { count: number; lastAccessed: string }
        >;
        if (parsed && typeof parsed === "object") {
          accessStatsRef.current = parsed;
        }
      }
    } catch {
      accessStatsRef.current = {};
    }
  }, [course.courseID]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissKey = `resources.course.${course.courseID}.cleanupDismissed`;
    setCleanupDismissed(window.sessionStorage.getItem(dismissKey) === "1");
  }, [course.courseID]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissKey = `resources.course.${course.courseID}.cleanupDismissed`;
    if (cleanupDismissed) {
      window.sessionStorage.setItem(dismissKey, "1");
    } else {
      window.sessionStorage.removeItem(dismissKey);
    }
  }, [cleanupDismissed, course.courseID]);

  useEffect(() => {
    setSelectedItems(new Set());
    setSelectionMode(false);
  }, [pathKey]);

  useEffect(() => {
    if (!currentFolder?.id) return;
    const resourceId = getResourceId(currentFolder.id);
    markOpened(resourceId);
  }, [currentFolder?.id, getResourceId, markOpened]);

  const tagSearchIndex = useMemo(() => {
    const index = new Map<string, Set<string>>();
    Object.entries(tags).forEach(([resourceId, list]) => {
      if (!list || list.length === 0) return;
      index.set(resourceId, new Set(list.map((tag) => normalizeTagKey(tag))));
    });
    return index;
  }, [tags]);

  const parsedSearch = useMemo(() => {
    const parsed = parseSearchQuery(debouncedSearchTerm);
    return {
      text: parsed.text.trim().toLowerCase(),
      tagKeys: parsed.tags.map((tag) => normalizeTagKey(tag)),
    };
  }, [debouncedSearchTerm]);
  const searchModeActive =
    parsedSearch.text.length > 0 || parsedSearch.tagKeys.length > 0;

  const fetchFolderItems = useCallback(async (folderId: string) => {
    const params = new URLSearchParams();
    params.set("folderId", folderId);
    const response = await fetch(`/api/resources/drive?${params.toString()}`);
    if (!response.ok) {
      throw new Error("Unable to fetch folder contents");
    }
    const payload = (await response.json()) as {
      ok?: boolean;
      data?: DriveItem[];
    };
    if (!payload?.ok || !Array.isArray(payload.data)) {
      throw new Error("Invalid folder response");
    }
    return payload.data;
  }, []);

  useEffect(() => {
    if (!searchModeActive) {
      setDeepSearchStatus("idle");
      return;
    }
    if (!rootFolderId) return;
    if (
      deepSearchRootRef.current === rootFolderId &&
      deepSearchIndex.length > 0
    ) {
      setDeepSearchStatus("ready");
      return;
    }

    let active = true;
    setDeepSearchStatus("loading");
    setDeepSearchTruncated(false);

    const MAX_SEARCH_ITEMS = 2000;
    const MAX_SEARCH_FOLDERS = 250;

    (async () => {
      const results: SearchResult[] = [];
      const queue: Array<{
        id: string;
        name: string;
        pathIds: string[];
        pathNames: string[];
      }> = [
        {
          id: rootFolderId,
          name: course.courseName || course.courseID,
          pathIds: [rootFolderId],
          pathNames: [course.courseName || course.courseID],
        },
      ];
      const visited = new Set<string>();
      let truncated = false;

      while (queue.length > 0) {
        if (
          results.length >= MAX_SEARCH_ITEMS ||
          visited.size >= MAX_SEARCH_FOLDERS
        ) {
          truncated = true;
          break;
        }

        const current = queue.shift();
        if (!current || visited.has(current.id)) continue;
        visited.add(current.id);

        const items = await fetchFolderItems(current.id);
        for (const item of items) {
          results.push({
            item,
            resourceId: buildResourceId({
              courseId: course.courseID,
              path: buildResourcePath(current.pathIds),
              itemId: item.id,
            }),
            pathIds: current.pathIds,
            pathNames: current.pathNames,
          });

          if (isFolder(item.mimeType)) {
            if (results.length >= MAX_SEARCH_ITEMS) {
              truncated = true;
              break;
            }
            queue.push({
              id: item.id,
              name: item.name,
              pathIds: [...current.pathIds, item.id],
              pathNames: [...current.pathNames, item.name],
            });
          }
        }
        if (truncated) break;
      }

      if (!active) return;
      deepSearchRootRef.current = rootFolderId;
      setDeepSearchIndex(results);
      setDeepSearchTruncated(truncated);
      setDeepSearchStatus("ready");
    })().catch(() => {
      if (active) {
        setDeepSearchStatus("error");
      }
    });

    return () => {
      active = false;
    };
  }, [
    course.courseID,
    course.courseName,
    deepSearchIndex.length,
    fetchFolderItems,
    rootFolderId,
    searchModeActive,
  ]);

  const baseItems = useMemo(() => {
    const items = driveQuery.data ?? [];
    const { text, tagKeys } = parsedSearch;
    if (!text && tagKeys.length === 0) return items;
    return items.filter((item) => {
      const resourceId = getResourceId(item.id);
      const itemTags = tagSearchIndex.get(resourceId) ?? new Set();
      const matchesText = !text || item.name.toLowerCase().includes(text);
      const matchesTags =
        tagKeys.length === 0 || tagKeys.every((tag) => itemTags.has(tag));
      return matchesText && matchesTags;
    });
  }, [driveQuery.data, getResourceId, parsedSearch, tagSearchIndex]);

  const availableFilters = useMemo(() => {
    const availability = {
      pdf: false,
      slides: false,
      docs: false,
      pyq: false,
      offline: false,
      starred: false,
    };
    baseItems.forEach((item) => {
      const resourceId = getResourceId(item.id);
      const name = item.name.toLowerCase();
      if (name.includes("pyq") || name.includes("previous year")) {
        availability.pyq = true;
      }
      if (offlineFiles[resourceId]) {
        availability.offline = true;
      }
      if (favorites[resourceId]) {
        availability.starred = true;
      }
      if (item.mimeType === DRIVE_FOLDER_MIME) return;
      if (item.mimeType === PDF_MIME) availability.pdf = true;
      if (SLIDE_MIMES.has(item.mimeType)) availability.slides = true;
      if (DOC_MIMES.has(item.mimeType)) availability.docs = true;
    });
    return availability;
  }, [baseItems, favorites, getResourceId, offlineFiles]);

  const activeMimeFilter = useMemo(() => {
    if (mimeFilter === "all") return "all";
    return availableFilters[mimeFilter] ? mimeFilter : "all";
  }, [availableFilters, mimeFilter]);

  const activeCourseFilter = useMemo(() => {
    if (courseFilter === "all") return "all";
    return availableFilters[courseFilter] ? courseFilter : "all";
  }, [availableFilters, courseFilter]);

  const quickFilters = useMemo(() => {
    const base = quickFiltersBase.filter((option) => {
      if (option.id === "all") return true;
      if ("mime" in option) {
        return availableFilters[option.mime];
      }
      if ("course" in option) {
        return availableFilters[option.course];
      }
      return false;
    });
    const extras: QuickFilterOption[] = [];
    if (activeMimeFilter === "slides" && availableFilters.slides) {
      extras.push({ id: "slides", label: "Slides", mime: "slides" });
    }
    if (activeCourseFilter === "offline" && availableFilters.offline) {
      extras.push({ id: "offline", label: "Offline", course: "offline" });
    }
    if (activeCourseFilter === "starred" && availableFilters.starred) {
      extras.push({ id: "starred", label: "Starred", course: "starred" });
    }
    return [...base, ...extras];
  }, [
    activeCourseFilter,
    activeMimeFilter,
    availableFilters,
    quickFiltersBase,
  ]);

  const matchesMimeFilter = useCallback(
    (item: DriveItem) => {
      if (activeMimeFilter === "all") return true;
      if (item.mimeType === DRIVE_FOLDER_MIME) return false;
      if (activeMimeFilter === "pdf") return item.mimeType === PDF_MIME;
      if (activeMimeFilter === "slides") return SLIDE_MIMES.has(item.mimeType);
      if (activeMimeFilter === "docs") return DOC_MIMES.has(item.mimeType);
      return true;
    },
    [activeMimeFilter],
  );

  const matchesCourseFilter = useCallback(
    (item: DriveItem, resourceId: string) => {
      if (activeCourseFilter === "all") return true;
      if (activeCourseFilter === "offline") {
        return Boolean(offlineFiles[resourceId]);
      }
      if (activeCourseFilter === "starred") {
        return Boolean(favorites[resourceId]);
      }
      if (activeCourseFilter === "pyq") {
        const name = item.name.toLowerCase();
        return name.includes("pyq") || name.includes("previous year");
      }
      return true;
    },
    [activeCourseFilter, favorites, offlineFiles],
  );

  const filteredItems = useMemo(() => {
    const items = baseItems;
    const hasFilters =
      activeMimeFilter !== "all" || activeCourseFilter !== "all";
    if (!hasFilters) return items;
    return items.filter((item) => {
      const resourceId = getResourceId(item.id);
      const matchesMime = matchesMimeFilter(item);
      const matchesCourse = matchesCourseFilter(item, resourceId);
      return matchesMime && matchesCourse;
    });
  }, [
    baseItems,
    getResourceId,
    matchesCourseFilter,
    matchesMimeFilter,
    activeCourseFilter,
    activeMimeFilter,
  ]);

  useEffect(() => {
    setIsFilterPending(true);
    const timer = window.setTimeout(() => {
      setIsFilterPending(false);
    }, 180);
    return () => window.clearTimeout(timer);
  }, [
    activeMimeFilter,
    activeCourseFilter,
    debouncedSearchTerm,
    folderStack.length,
    viewMode,
    viewSize,
  ]);

  const deepFilteredItems = useMemo(() => {
    if (!searchModeActive || deepSearchStatus !== "ready") return [];
    const { text, tagKeys } = parsedSearch;
    return deepSearchIndex.filter((entry) => {
      const itemTags = tagSearchIndex.get(entry.resourceId) ?? new Set();
      const matchesText = !text || entry.item.name.toLowerCase().includes(text);
      const matchesTags =
        tagKeys.length === 0 || tagKeys.every((tag) => itemTags.has(tag));
      if (!matchesText || !matchesTags) return false;
      const matchesMime = matchesMimeFilter(entry.item);
      const matchesCourse = matchesCourseFilter(entry.item, entry.resourceId);
      return matchesMime && matchesCourse;
    });
  }, [
    deepSearchIndex,
    deepSearchStatus,
    matchesCourseFilter,
    matchesMimeFilter,
    parsedSearch,
    searchModeActive,
    tagSearchIndex,
  ]);

  const liveSearch = useMemo(() => parseSearchQuery(searchTerm), [searchTerm]);
  const activeSearchTags = useMemo(
    () => liveSearch.tags.map((tag) => resolveTagOption(tag)),
    [liveSearch.tags, resolveTagOption],
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
    if (tagOptions.length === 0) return [];
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
          !tagLibrary.has(normalizeTagKey(existing[existing.length - 1] ?? ""));
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
    [tagLibrary],
  );

  const tagDrawerPool = useMemo(() => {
    if (!tagDrawer || tagDrawer.mode !== "bulk") return null;
    const pool = new Set<string>();
    tagDrawer.resourceIds.forEach((resourceId) => {
      (tags[resourceId] ?? []).forEach((tag) => {
        pool.add(normalizeTagKey(tag));
      });
    });
    return pool;
  }, [tagDrawer, tags]);

  const filteredDrawerTags = useMemo(() => {
    if (!tagDrawer) return [];
    let options = tagOptions;
    if (tagDrawer.mode === "bulk" && tagDrawer.action === "remove") {
      options = options.filter((option) => tagDrawerPool?.has(option.key));
    }
    if (tagSearch.trim()) {
      const query = tagSearch.trim().toLowerCase();
      options = options.filter((option) =>
        option.label.toLowerCase().includes(query),
      );
    }
    return options;
  }, [tagDrawer, tagOptions, tagDrawerPool, tagSearch]);

  const selectedDrawerTags = useMemo(() => {
    return Array.from(tagSelection).map(
      (key) =>
        tagLibrary.get(key) ?? {
          key,
          label: key,
          color: pickTagColor(key),
        },
    );
  }, [tagLibrary, tagSelection]);

  const itemLookup = useMemo(() => {
    return new Map((driveQuery.data ?? []).map((item) => [item.id, item]));
  }, [driveQuery.data]);

  const suggestedTags = useMemo(() => {
    if (!tagDrawer || tagDrawer.mode !== "single") return [];
    const resourceId = tagDrawer.resourceIds[0];
    if (!resourceId) return [];
    const parsed = parseResourceId(resourceId);
    const item =
      parsed?.itemId && itemLookup.has(parsed.itemId)
        ? itemLookup.get(parsed.itemId)
        : null;
    const name = (item?.name ?? tagDrawer.name ?? "").toLowerCase();
    const mimeType = item?.mimeType ?? "";
    const folderContext = folderStack
      .map((folder) => folder.name.toLowerCase())
      .join(" ");
    const suggestions = new Set<string>();

    if (name.includes("pyq") || name.includes("previous year")) {
      suggestions.add("PYQ");
    }
    if (
      name.includes("assignment") ||
      name.includes("homework") ||
      name.includes("hw")
    ) {
      suggestions.add("Assignment");
    }
    if (folderContext.includes("lab")) {
      suggestions.add("Lab");
    }
    if (folderContext.includes("exam") || folderContext.includes("midsem")) {
      suggestions.add("Exam");
    }
    if (DOC_MIMES.has(mimeType) || mimeType === GOOGLE_DOC) {
      suggestions.add("Notes");
    }
    if (SHEET_MIMES.has(mimeType)) {
      suggestions.add("Sheets");
    }
    if (SLIDE_MIMES.has(mimeType)) {
      suggestions.add("Slides");
    }
    if (mimeType === PDF_MIME) {
      suggestions.add("PDF");
    }
    if (ARCHIVE_MIMES.has(mimeType)) {
      suggestions.add("Archive");
    }

    return Array.from(suggestions)
      .map((label) => resolveTagOption(label))
      .filter((tag) => !tagSelection.has(tag.key));
  }, [folderStack, itemLookup, resolveTagOption, tagDrawer, tagSelection]);

  const renderEntries = useMemo<SearchResult[]>(() => {
    if (searchModeActive && deepSearchStatus === "ready") {
      return deepFilteredItems;
    }
    return filteredItems.map((item) => ({
      item,
      resourceId: getResourceId(item.id),
      pathIds: currentPathIds,
      pathNames: currentPathNames,
    }));
  }, [
    currentPathIds,
    currentPathNames,
    deepFilteredItems,
    deepSearchStatus,
    filteredItems,
    getResourceId,
    searchModeActive,
  ]);

  useEffect(() => {
    setListReady(false);
    const timer = window.setTimeout(() => {
      setListReady(true);
    }, 30);
    return () => window.clearTimeout(timer);
  }, [
    renderEntries.length,
    viewMode,
    viewSize,
    activeMimeFilter,
    activeCourseFilter,
    debouncedSearchTerm,
    folderStack.length,
  ]);

  const { folders, files } = useMemo(() => {
    const nextFolders: SearchResult[] = [];
    const nextFiles: SearchResult[] = [];

    renderEntries.forEach((entry) => {
      if (isFolder(entry.item.mimeType)) {
        nextFolders.push(entry);
      } else {
        nextFiles.push(entry);
      }
    });

    return { folders: nextFolders, files: nextFiles };
  }, [renderEntries]);
  const [visibleFolderCount, setVisibleFolderCount] = useState(24);
  const [visibleFileCount, setVisibleFileCount] = useState(60);
  const folderSentinelRef = useRef<HTMLDivElement | null>(null);
  const fileSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setVisibleFolderCount(24);
    setVisibleFileCount(60);
  }, [
    folderStack.length,
    searchModeActive,
    activeMimeFilter,
    activeCourseFilter,
    debouncedSearchTerm,
  ]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const target = folderSentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleFolderCount((prev) => Math.min(prev + 24, folders.length));
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [folders.length]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const target = fileSentinelRef.current;
    if (!target) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisibleFileCount((prev) => Math.min(prev + 40, files.length));
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [files.length]);

  const visibleFolders = useMemo(
    () => folders.slice(0, visibleFolderCount),
    [folders, visibleFolderCount],
  );
  const visibleFiles = useMemo(
    () => files.slice(0, visibleFileCount),
    [files, visibleFileCount],
  );

  const resolveResourceLabel = useCallback(
    (resourceId: string) => {
      const parsed = parseResourceId(resourceId);
      const itemId = parsed?.itemId;
      const item = itemId ? itemLookup.get(itemId) : undefined;
      return item?.name ?? offlineFiles[resourceId]?.name ?? "Offline file";
    },
    [itemLookup, offlineFiles],
  );

  const offlineItems = useMemo(() => {
    return Object.entries(offlineFiles)
      .map(([resourceId, meta]) => ({
        resourceId,
        meta,
        item: meta.fileId ? itemLookup.get(meta.fileId) : undefined,
      }))
      .filter((entry) => entry.meta.courseId === course.courseID);
  }, [course.courseID, itemLookup, offlineFiles]);

  const syncStatus = useMemo(() => {
    if (!isOnline) return "Offline";
    if (
      driveQuery.isFetching ||
      driveQuery.isLoading ||
      offlinePending.size > 0
    ) {
      return "Updating";
    }
    return "Up to date";
  }, [
    driveQuery.isFetching,
    driveQuery.isLoading,
    isOnline,
    offlinePending.size,
  ]);
  const showFilteringSkeleton = isSearchDebouncing || isFilterPending;

  const cleanupSummary = useMemo(() => {
    if (storageUsage.limitBytes === Infinity) return null;
    if (!Number.isFinite(storageUsage.limitBytes)) return null;
    if (storageUsage.limitBytes <= 0) return null;
    const usageRatio =
      storageUsage.usedBytes / storageUsage.limitBytes + accessStatsTick * 0;
    if (usageRatio < 0.85) return null;

    const entries = Object.entries(offlineFiles).map(([resourceId, meta]) => ({
      resourceId,
      meta,
      size: Number(meta.size) || 0,
      lastUsed:
        accessStatsRef.current[resourceId]?.lastAccessed ||
        lastOpened[resourceId] ||
        meta.cachedAt,
    }));
    if (entries.length === 0) return null;

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

    return {
      usageRatio,
      largest,
      leastUsed,
    };
  }, [
    accessStatsTick,
    lastOpened,
    offlineFiles,
    storageUsage.limitBytes,
    storageUsage.usedBytes,
  ]);

  const shouldCollapseBreadcrumb =
    isCompactBreadcrumb && folderStack.length > 3;
  const breadcrumbMiddle = useMemo(
    () => folderStack.slice(1, -2),
    [folderStack],
  );
  const breadcrumbTail = useMemo(() => folderStack.slice(-2), [folderStack]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const target = breadcrumbRef.current;
    if (!target) return;
    const prefersReduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    target.scrollTo({
      left: target.scrollWidth,
      behavior: prefersReduced ? "auto" : "smooth",
    });
  }, [folderStack.length]);

  const handleOpenFolder = useCallback(
    (
      id: string,
      name: string,
      pathIds: string[] = currentPathIds,
      pathNames: string[] = currentPathNames,
    ) => {
      storeScrollPosition();
      const resourceId = getResourceIdForPath(pathIds, id);
      markOpened(resourceId);
      const nextPathIds = [...pathIds, id];
      const nextPathNames = [...pathNames, name];
      setFolderStack(
        nextPathIds.map((folderId, index) => ({
          id: folderId,
          name: nextPathNames[index] ?? folderId,
        })),
      );
    },
    [
      currentPathIds,
      currentPathNames,
      getResourceIdForPath,
      markOpened,
      storeScrollPosition,
    ],
  );

  const handleBreadcrumb = useCallback(
    (index: number) => {
      storeScrollPosition();
      setFolderStack((prev) => prev.slice(0, index + 1));
    },
    [storeScrollPosition],
  );

  const handleCourseBack = useCallback(() => {
    if (folderStack.length > 1) {
      handleBreadcrumb(folderStack.length - 2);
      return;
    }
    router.push("/");
  }, [folderStack.length, handleBreadcrumb, router]);

  const openDriveLink = useCallback(
    (link?: string) => {
      const target = buildDriveLink(link, userEmail);
      if (!target) return false;
      const opened = window.open(target, "_blank", "noopener,noreferrer");
      if (!opened && userEmail) {
        setAccountNotice({ link: target, email: userEmail });
      } else if (userEmail && !accountNotice) {
        setAccountNotice({ link: target, email: userEmail });
      }
      return Boolean(opened);
    },
    [accountNotice, userEmail],
  );

  const toggleSelection = useCallback((resourceId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(resourceId)) {
        next.delete(resourceId);
      } else {
        next.add(resourceId);
      }
      return next;
    });
  }, []);

  const exitSelectionMode = useCallback(() => {
    setSelectionMode(false);
    setSelectedItems(new Set());
  }, []);

  const handleSelectionToggle = useCallback(() => {
    if (selectionMode) {
      exitSelectionMode();
    } else {
      setSelectionMode(true);
    }
  }, [exitSelectionMode, selectionMode]);

  useEffect(() => {
    if (focusMode) {
      exitSelectionMode();
    }
  }, [exitSelectionMode, focusMode]);

  const handleLongPressStart = useCallback(
    (resourceId: string) => (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") return;
      if (longPressTimerRef.current !== null) {
        window.clearTimeout(longPressTimerRef.current);
      }
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = resourceId;
        setSelectionMode(true);
        setSelectedItems((prev) => {
          const next = new Set(prev);
          next.add(resourceId);
          return next;
        });
      }, 450);
    },
    [],
  );

  const handleLongPressCancel = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const handlePrimaryAction = useCallback(
    (resourceId: string, action: () => void) =>
      (event: React.PointerEvent | React.MouseEvent) => {
        if (longPressTriggeredRef.current === resourceId) {
          longPressTriggeredRef.current = null;
          event.preventDefault();
          return;
        }
        if (selectionMode) {
          event.preventDefault();
          toggleSelection(resourceId);
          return;
        }
        action();
      },
    [selectionMode, toggleSelection],
  );

  const recordAccess = useCallback(
    (resourceId: string) => {
      if (typeof window === "undefined") return;
      const statsKey = `resources.course.${course.courseID}.accessStats`;
      const now = new Date().toISOString();
      const current = accessStatsRef.current[resourceId];
      accessStatsRef.current[resourceId] = {
        count: current ? current.count + 1 : 1,
        lastAccessed: now,
      };
      try {
        window.sessionStorage.setItem(
          statsKey,
          JSON.stringify(accessStatsRef.current),
        );
      } catch {
        return;
      }
      setAccessStatsTick((prev) => prev + 1);
    },
    [course.courseID],
  );

  const openBlob = useCallback((blob: Blob) => {
    const url = URL.createObjectURL(blob);
    window.open(url, "_blank", "noopener,noreferrer");
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }, []);

  const buildDownloadFilename = useCallback(
    (item: DriveItem, exportMime?: string | null) => {
      const fallback = item.name || "study-material";
      if (
        exportMime === "application/pdf" &&
        !fallback.toLowerCase().endsWith(".pdf")
      ) {
        return `${fallback}.pdf`;
      }
      return fallback;
    },
    [],
  );

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

  const prepareFilePayload = useCallback(
    async (item: DriveItem, resourceId: string) => {
      const exportMime = getExportMime(item.mimeType);

      if (offlineFiles[resourceId]) {
        const cached = await offlineManager.getOfflineBlobForResource(
          resourceId,
          item.id,
        );
        if (cached) {
          return {
            blob: cached,
            filename: buildDownloadFilename(item, exportMime),
            exportMime,
          };
        }
      }

      if (!isOnline) {
        toast.error("Connect to the internet to download or share this file.");
        return null;
      }

      const params = new URLSearchParams();
      params.set("fileId", item.id);
      if (exportMime) {
        params.set("export", exportMime);
      }
      const response = await fetch(
        `/api/resources/drive/file?${params.toString()}`,
      );
      if (!response.ok) {
        toast.error("Unable to fetch the file. Please try again.");
        return null;
      }
      const blob = await response.blob();
      return {
        blob,
        filename: buildDownloadFilename(item, exportMime),
        exportMime,
      };
    },
    [buildDownloadFilename, isOnline, offlineFiles, offlineManager],
  );

  const openOfflineResource = useCallback(
    async (resourceId: string, fileId?: string) => {
      const blob = await offlineManager.openOfflineResource({
        resourceId,
        fileId,
      });
      if (!blob) return false;
      openBlob(blob);
      recordAccess(resourceId);
      return true;
    },
    [offlineManager, openBlob, recordAccess],
  );

  const handleOpenFile = useCallback(
    async (item: DriveItem, resourceId: string) => {
      if (offlineFiles[resourceId]) {
        const opened = await openOfflineResource(
          resourceId,
          offlineFiles[resourceId]?.fileId ?? item.id,
        );
        if (opened) {
          markOpened(resourceId);
          return;
        }
      }

      const baseLink =
        item.webViewLink ?? `https://drive.google.com/file/d/${item.id}/view`;
      if (openDriveLink(baseLink)) {
        recordAccess(resourceId);
        markOpened(resourceId);
      } else {
        toast.error("Preview link not available for this file.");
      }
    },
    [
      markOpened,
      offlineFiles,
      openDriveLink,
      openOfflineResource,
      recordAccess,
    ],
  );

  useEffect(() => {
    if (!openTargetId) return;
    if (driveQuery.isLoading || !driveQuery.data) return;
    if (openTargetRef.current === openTargetId) return;
    const item = driveQuery.data.find((entry) => entry.id === openTargetId);
    if (!item || isFolder(item.mimeType)) return;
    openTargetRef.current = openTargetId;
    const resourceId = getResourceId(item.id);
    void handleOpenFile(item, resourceId);
  }, [
    driveQuery.data,
    driveQuery.isLoading,
    getResourceId,
    handleOpenFile,
    openTargetId,
  ]);

  const handleToggleOffline = useCallback(
    async (
      item: DriveItem,
      resourceId: string,
      pathIds: string[] = currentPathIds,
    ) => {
      if (offlinePending.has(resourceId)) return;

      setOfflinePending((prev) => new Set(prev).add(resourceId));
      const pathForMeta = buildResourcePath(pathIds);

      try {
        if (offlineFiles[resourceId]) {
          await offlineManager.removeOfflineResource(resourceId);
          return;
        }

        await offlineManager.saveOfflineResource(
          {
            resourceId,
            fileId: item.id,
            name: item.name,
            size: Number(item.size ?? 0),
            mimeType: item.mimeType,
            courseId: course.courseID,
            path: pathForMeta,
            exportMime: getExportMime(item.mimeType),
          },
          isOnline,
        );
      } finally {
        setOfflinePending((prev) => {
          const next = new Set(prev);
          next.delete(resourceId);
          return next;
        });
      }
    },
    [
      course.courseID,
      isOnline,
      offlineFiles,
      offlinePending,
      currentPathIds,
      offlineManager,
    ],
  );

  const handleCleanupRemove = useCallback(
    async (resourceId: string) => {
      await offlineManager.removeOfflineResource(resourceId, true);
      triggerHaptic();
    },
    [offlineManager, triggerHaptic],
  );

  const handleCleanupBulk = useCallback(async () => {
    if (!cleanupSummary) return;
    const ids = new Set<string>();
    cleanupSummary.largest.forEach((entry) => ids.add(entry.resourceId));
    cleanupSummary.leastUsed.forEach((entry) => ids.add(entry.resourceId));
    for (const id of ids) {
      await offlineManager.removeOfflineResource(id, true);
    }
    if (ids.size > 0) triggerHaptic();
  }, [cleanupSummary, offlineManager, triggerHaptic]);

  const handleToggleFavorite = useCallback(
    (resourceId: string) => {
      triggerHaptic();
      toggleFavorite(resourceId);
    },
    [toggleFavorite, triggerHaptic],
  );

  const openTagDrawerForResource = useCallback(
    (resourceId: string, name: string) => {
      const existingTags = tags[resourceId] ?? [];
      setTagDrawer({
        mode: "single",
        resourceIds: [resourceId],
        name,
      });
      setTagSelection(new Set(existingTags.map((tag) => normalizeTagKey(tag))));
      setTagSearch("");
      setNewTagName("");
      setNewTagColor(TAG_COLORS[0]?.value ?? "#E2E8F0");
      setDuplicateTagKey(null);
    },
    [tags],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (commandOpen || tagDrawer) return;
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
        return;
      }

      if (focusMode) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (selectedItems.size === 0) return;

      const resourceId = Array.from(selectedItems)[0];
      if (!resourceId) return;

      if (event.key.toLowerCase() === "f") {
        event.preventDefault();
        handleToggleFavorite(resourceId);
        return;
      }

      if (event.key.toLowerCase() === "o") {
        event.preventDefault();
        const parsed = parseResourceId(resourceId);
        const itemId = parsed?.itemId;
        const item = itemId ? itemLookup.get(itemId) : undefined;
        if (item && !isFolder(item.mimeType)) {
          handleToggleOffline(item, resourceId);
        }
        return;
      }

      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        openTagDrawerForResource(resourceId, resolveResourceLabel(resourceId));
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [
    commandOpen,
    focusMode,
    handleToggleFavorite,
    handleToggleOffline,
    itemLookup,
    openTagDrawerForResource,
    resolveResourceLabel,
    selectedItems,
    tagDrawer,
  ]);

  const openBulkTagDrawer = useCallback(
    (action: "add" | "remove") => {
      const ids = Array.from(selectedItems);
      if (ids.length === 0) return;
      setTagDrawer({
        mode: "bulk",
        action,
        resourceIds: ids,
        name: `${ids.length} items`,
      });
      setTagSelection(new Set());
      setTagSearch("");
      setNewTagName("");
      setNewTagColor(TAG_COLORS[0]?.value ?? "#E2E8F0");
      setDuplicateTagKey(null);
    },
    [selectedItems],
  );

  const toggleTagSelection = useCallback((key: string) => {
    setDuplicateTagKey(null);
    setTagSelection((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const handleCreateTag = useCallback(() => {
    const raw = newTagName.trim();
    if (!raw) return;
    const normalized = normalizeTagKey(raw);
    if (tagLibrary.has(normalized)) {
      setDuplicateTagKey(normalized);
      setTagSelection((prev) => {
        const next = new Set(prev);
        next.add(normalized);
        return next;
      });
      return;
    }
    upsertTagPalette(normalized, {
      label: raw,
      color: newTagColor,
    });
    setTagSelection((prev) => {
      const next = new Set(prev);
      next.add(normalized);
      return next;
    });
    setNewTagName("");
    setDuplicateTagKey(null);
  }, [newTagColor, newTagName, tagLibrary, upsertTagPalette]);

  const handleApplyTags = useCallback(() => {
    if (!tagDrawer) return;
    const selectedKeys = Array.from(tagSelection);
    const selectedLabels = selectedKeys.map(
      (key) => tagLibrary.get(key)?.label ?? key,
    );

    if (tagDrawer.mode === "single") {
      const resourceId = tagDrawer.resourceIds[0];
      if (resourceId) {
        setTags(resourceId, selectedLabels);
      }
      triggerHaptic();
      setTagDrawer(null);
      return;
    }

    const updates: Record<string, string[]> = {};
    if (tagDrawer.action === "remove") {
      const removeSet = new Set(selectedKeys);
      tagDrawer.resourceIds.forEach((resourceId) => {
        const current = tags[resourceId] ?? [];
        updates[resourceId] = current.filter(
          (tag) => !removeSet.has(normalizeTagKey(tag)),
        );
      });
    } else {
      tagDrawer.resourceIds.forEach((resourceId) => {
        const current = tags[resourceId] ?? [];
        const nextMap = new Map(
          current.map((tag) => [normalizeTagKey(tag), tag]),
        );
        selectedKeys.forEach((key) => {
          nextMap.set(key, tagLibrary.get(key)?.label ?? key);
        });
        updates[resourceId] = Array.from(nextMap.values());
      });
    }
    setTagsBatch(updates);
    triggerHaptic();
    setTagDrawer(null);
  }, [
    setTags,
    setTagsBatch,
    tagDrawer,
    tagLibrary,
    tagSelection,
    tags,
    triggerHaptic,
  ]);

  const recordDownload = useCallback(
    (resourceId: string, item: DriveItem, blob: Blob, filename: string) => {
      const parsed = parseResourceId(resourceId);
      addDownload({
        id: resourceId,
        name: filename,
        downloadedAt: new Date().toISOString(),
        size: blob.size,
        courseId: parsed?.courseId,
        itemId: item.id,
        mimeType: item.mimeType,
        path: parsed?.path,
      });
    },
    [addDownload],
  );

  const handleDownloadFile = useCallback(
    async (item: DriveItem, resourceId: string) => {
      const payload = await prepareFilePayload(item, resourceId);
      if (!payload) return;
      downloadBlobToDevice(payload.blob, payload.filename);
      recordDownload(resourceId, item, payload.blob, payload.filename);
      toast.message("Download started. Check Downloads for history.");
    },
    [downloadBlobToDevice, prepareFilePayload, recordDownload],
  );

  const handleShareFile = useCallback(
    async (item: DriveItem, resourceId: string) => {
      const payload = await prepareFilePayload(item, resourceId);
      if (!payload) return;

      if (typeof navigator !== "undefined" && "share" in navigator) {
        const file = new File([payload.blob], payload.filename, {
          type:
            payload.blob.type ||
            payload.exportMime ||
            "application/octet-stream",
        });
        const canShareFiles =
          !("canShare" in navigator) ||
          (typeof navigator.canShare === "function" &&
            navigator.canShare({ files: [file] }));

        if (canShareFiles) {
          try {
            await navigator.share({
              files: [file],
              title: item.name || payload.filename,
            });
            return;
          } catch (error) {
            if ((error as Error)?.name === "AbortError") {
              return;
            }
          }
        }
      }

      downloadBlobToDevice(payload.blob, payload.filename);
      recordDownload(resourceId, item, payload.blob, payload.filename);
      toast.message("File downloaded. Share it from your device.");
    },
    [downloadBlobToDevice, prepareFilePayload, recordDownload],
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
        id: "nav-offline",
        label: "Go to Offline Study Materials",
        description: "See saved files only",
        group: "Navigation",
        href: "/offline",
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
      {
        id: "focus-toggle",
        label: focusMode ? "Exit Focus Mode" : "Enter Focus Mode",
        description: "Hide actions and filters",
        group: "Navigation",
        onSelect: () => setFocusMode((prev) => !prev),
      },
    ];

    [
      { id: "all", label: "All Types", value: "all" },
      { id: "pdf", label: "PDFs", value: "pdf" },
      { id: "slides", label: "Slides", value: "slides" },
      { id: "docs", label: "Docs", value: "docs" },
    ].forEach((option) => {
      items.push({
        id: `filter-mime-${option.id}`,
        label: `Filter: ${option.label}`,
        description: "Quick MIME filter",
        group: "Filters",
        keywords: option.label,
        onSelect: () =>
          setMimeFilter(option.value as "all" | "pdf" | "slides" | "docs"),
      });
    });

    [
      { id: "all", label: "All", value: "all" },
      { id: "pyq", label: "PYQs", value: "pyq" },
      { id: "offline", label: "Offline", value: "offline" },
      { id: "starred", label: "Starred", value: "starred" },
    ].forEach((option) => {
      items.push({
        id: `filter-course-${option.id}`,
        label: `Quick Filter: ${option.label}`,
        description: "Course scoped filter",
        group: "Filters",
        keywords: option.label,
        onSelect: () =>
          setCourseFilter(
            option.value as "all" | "pyq" | "offline" | "starred",
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

    folders.forEach((entry) => {
      const item = entry.item;
      items.push({
        id: `folder-${item.id}`,
        label: item.name,
        description: "Open folder",
        group: "Folders",
        keywords: item.name,
        onSelect: () =>
          handleOpenFolder(item.id, item.name, entry.pathIds, entry.pathNames),
      });
    });

    files.forEach((entry) => {
      const item = entry.item;
      const resourceId = entry.resourceId;
      items.push({
        id: `file-${item.id}`,
        label: item.name,
        description: "Open file",
        group: "Files",
        keywords: `${item.name} ${getMimeLabel(item.mimeType, item.name)}`,
        onSelect: () => handleOpenFile(item, resourceId),
      });
    });

    offlineItems.forEach(({ resourceId, meta, item }) => {
      const label = item?.name ?? meta.name ?? "Offline file";
      items.push({
        id: `offline-${resourceId}`,
        label,
        description: "Open offline file",
        group: "Offline",
        keywords: label,
        onSelect: () =>
          openOfflineResource(resourceId, meta.fileId ?? item?.id),
      });
    });

    courseList.forEach((courseItem) => {
      items.push({
        id: `course-${courseItem.courseID}`,
        label: courseItem.courseName || courseItem.courseID,
        description: "Jump to course",
        group: "Courses",
        keywords: courseItem.courseID,
        onSelect: () => router.push(`/course/${courseItem.courseID}`),
      });
    });

    return items;
  }, [
    courseList,
    files,
    folders,
    focusMode,
    handleOpenFile,
    handleOpenFolder,
    offlineItems,
    openOfflineResource,
    router,
    setCourseFilter,
    setMimeFilter,
    tagOptions,
  ]);

  return (
    <>
      <header className="sticky top-0 z-20 bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleCourseBack}
            aria-label="Go back"
            className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0_#0a0a0a] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#0a0a0a] hover:bg-yellow-50 active:translate-y-0 active:shadow-[1px_1px_0_#0a0a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-stone-900 tracking-tight truncate">
              {course.courseName || course.courseID}
              {course.courseName && (
                <span className="ml-2 text-xs sm:text-sm font-black uppercase tracking-wide text-stone-500">
                  {course.courseID}
                </span>
              )}
            </h1>
          </div>
          <Menu open={overflowOpen} onOpenChange={setOverflowOpen}>
            <Menu.Trigger asChild>
              <button
                type="button"
                aria-label="Open menu"
                className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0_#0a0a0a] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#0a0a0a] hover:bg-yellow-50 active:translate-y-0 active:shadow-[1px_1px_0_#0a0a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                <MoreVertical className="h-5 w-5" aria-hidden="true" />
              </button>
            </Menu.Trigger>
            <Menu.Content
              align="end"
              sideOffset={8}
              className="border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] min-w-[220px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
            >
              <div className="px-3 py-2 text-[10px] font-black uppercase text-stone-500 border-b border-stone-200">
                Status: {syncStatus}
              </div>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => driveQuery.refetch()}
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Refresh folder
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => {
                  const folderUrl =
                    course.syllabusAssets?.folderUrl ??
                    `https://drive.google.com/drive/folders/${rootFolderId}`;
                  openDriveLink(folderUrl);
                }}
              >
                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                Open in Drive
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => setCommandOpen(true)}
              >
                Quick Search
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => setViewSettingsOpen(true)}
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                View Settings
              </Menu.Item>
              <div className="px-3 py-2 text-[10px] font-black uppercase text-stone-500 border-t border-stone-200">
                Quick Filters
              </div>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => applyFilterPreset("all")}
              >
                All materials
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => applyFilterPreset("slides")}
              >
                Slides only
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => applyFilterPreset("offline")}
              >
                Offline only
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => applyFilterPreset("starred")}
              >
                Starred only
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => setShortcutsOpen(true)}
              >
                Keyboard Shortcuts
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => setHelpOpen(true)}
              >
                <HelpCircle className="h-4 w-4" aria-hidden="true" />
                Help
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => setFocusMode((prev) => !prev)}
              >
                {focusMode ? "Exit Focus Mode" : "Focus Mode"}
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => router.push("/offline")}
              >
                Saved Materials
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => router.push("/downloads")}
              >
                Downloads
              </Menu.Item>
              <Menu.Item
                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                onSelect={() => router.push("/settings")}
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
                Settings
              </Menu.Item>
            </Menu.Content>
          </Menu>
        </div>
      </header>

      <section className="sticky top-[72px] sm:top-[80px] z-10 bg-white border-b-4 border-black px-4 py-3 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
        <nav
          ref={breadcrumbRef}
          aria-label="Breadcrumb"
          className="flex items-center gap-2 text-[11px] font-black uppercase text-stone-600 overflow-x-auto whitespace-nowrap pr-2"
        >
          <Link
            href="/"
            className="shrink-0 flex items-center gap-1 border-2 border-black px-2 py-1 shadow-[2px_2px_0_#0a0a0a] bg-white text-stone-700 hover:bg-yellow-100 transition-transform active:scale-95 motion-reduce:transition-none"
          >
            Home
          </Link>
          <span aria-hidden="true" className="text-stone-400">
            /
          </span>
          {!shouldCollapseBreadcrumb &&
            folderStack.map((folder, index) => {
              const isCurrent = index === folderStack.length - 1;
              return (
                <div key={folder.id} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleBreadcrumb(index)}
                    aria-current={isCurrent ? "page" : undefined}
                    className={cn(
                      "shrink-0 flex items-center gap-1 border-2 border-black px-2 py-1 shadow-[2px_2px_0_#0a0a0a] transition-transform active:scale-95 motion-reduce:transition-none",
                      isCurrent
                        ? "bg-stone-900 text-white"
                        : "bg-white text-stone-700 hover:bg-yellow-100",
                    )}
                  >
                    {folder.name}
                  </button>
                  {index < folderStack.length - 1 && (
                    <span aria-hidden="true" className="text-stone-400">
                      /
                    </span>
                  )}
                </div>
              );
            })}
          {shouldCollapseBreadcrumb && (
            <>
              <button
                type="button"
                onClick={() => handleBreadcrumb(0)}
                className="shrink-0 flex items-center gap-1 border-2 border-black px-2 py-1 shadow-[2px_2px_0_#0a0a0a] bg-white text-stone-700 hover:bg-yellow-100 transition-transform active:scale-95 motion-reduce:transition-none"
              >
                {folderStack[0]?.name ?? "Root"}
              </button>
              {breadcrumbMiddle.length > 0 && (
                <>
                  <span aria-hidden="true" className="text-stone-400">
                    /
                  </span>
                  <Menu>
                    <Menu.Trigger asChild>
                      <button
                        type="button"
                        aria-label="Show all folders"
                        className="shrink-0 flex items-center gap-1 border-2 border-black px-2 py-1 shadow-[2px_2px_0_#0a0a0a] bg-white text-stone-700 hover:bg-yellow-100 transition-transform active:scale-95 motion-reduce:transition-none"
                      >
                        <span className="text-base leading-none">…</span>
                      </button>
                    </Menu.Trigger>
                    <Menu.Content
                      align="start"
                      sideOffset={6}
                      className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] min-w-[180px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
                    >
                      {breadcrumbMiddle.map((folder, idx) => (
                        <Menu.Item
                          key={folder.id}
                          className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                          onSelect={() => handleBreadcrumb(idx + 1)}
                        >
                          <FolderOpen className="h-4 w-4" aria-hidden="true" />
                          <span className="max-w-[220px] truncate">
                            {folder.name}
                          </span>
                        </Menu.Item>
                      ))}
                    </Menu.Content>
                  </Menu>
                </>
              )}
              {breadcrumbTail.map((folder, index) => {
                const offset = folderStack.length - breadcrumbTail.length;
                const actualIndex = offset + index;
                const isCurrent = actualIndex === folderStack.length - 1;
                return (
                  <div key={folder.id} className="flex items-center gap-2">
                    <span aria-hidden="true" className="text-stone-400">
                      /
                    </span>
                    <button
                      type="button"
                      onClick={() => handleBreadcrumb(actualIndex)}
                      aria-current={isCurrent ? "page" : undefined}
                      className={cn(
                        "shrink-0 flex items-center gap-1 border-2 border-black px-2 py-1 shadow-[2px_2px_0_#0a0a0a] transition-transform active:scale-95 motion-reduce:transition-none",
                        isCurrent
                          ? "bg-stone-900 text-white"
                          : "bg-white text-stone-700 hover:bg-yellow-100",
                      )}
                    >
                      {folder.name}
                    </button>
                  </div>
                );
              })}
            </>
          )}
        </nav>
      </section>

      {!focusMode && (
        <section className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
          <div className="flex flex-wrap items-center gap-3">
            <div
              className="flex items-center gap-2"
              aria-label="View mode"
            >
              {viewModeOptions.map((option) => {
                const Icon = option.icon;
                const isActive = viewMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    aria-pressed={isActive}
                    onClick={() =>
                      updateCourseView(
                        option.id as "grid" | "list" | "compact",
                        viewSize,
                      )
                    }
                    className={cn(
                      "h-10 min-h-[44px] border-2 border-black px-3 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] flex items-center gap-2 transition-colors duration-150 transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                      isActive
                        ? "bg-black text-white"
                        : "bg-white hover:bg-yellow-50",
                    )}
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    {option.label}
                  </button>
                );
              })}
            </div>
            <span className="hidden sm:block h-6 w-px bg-black/20" />
            {showFilteringSkeleton ? (
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
                {Array.from({ length: 4 }).map((_, index) => (
                  <RetroSkeleton
                    key={`filter-skeleton-${index}`}
                    className="h-9 w-16 shrink-0"
                  />
                ))}
              </div>
            ) : (
              <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
                {quickFilters.map((option) => {
                  const hasMime = "mime" in option;
                  const hasCourse = "course" in option;
                  const isActive =
                    option.id === "all"
                      ? activeMimeFilter === "all" &&
                        activeCourseFilter === "all"
                      : hasMime
                        ? activeMimeFilter === option.mime
                        : hasCourse
                          ? activeCourseFilter === option.course
                          : false;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => {
                        if (option.id === "all") {
                          setMimeFilter("all");
                          setCourseFilter("all");
                          return;
                        }
                        if (hasMime) {
                          setMimeFilter((prev) =>
                            prev === option.mime ? "all" : option.mime,
                          );
                          return;
                        }
                        if (hasCourse) {
                          setCourseFilter((prev) =>
                            prev === option.course ? "all" : option.course,
                          );
                        }
                      }}
                      aria-pressed={isActive}
                      className={cn(
                        "shrink-0 h-10 min-h-[44px] border-2 border-black px-3 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] transition-colors duration-150 transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
                        isActive
                          ? "bg-black text-white"
                          : "bg-white hover:bg-yellow-50",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
        <div className="flex items-center justify-between gap-2 mb-2">
          <label className="sr-only" htmlFor="studyrix-search">
            Search files or tags
          </label>
          {showFilteringSkeleton && (
            <span
              className="text-[10px] font-black uppercase text-stone-400"
              role="status"
              aria-live="polite"
            >
              Filtering…
            </span>
          )}
        </div>
        <div className="relative">
          <div className="flex items-center gap-3 border-[3px] border-black bg-white px-4 py-3 shadow-[2px_2px_0px_0px_#000]">
            <Search className="h-5 w-5 text-neutral-600" aria-hidden="true" />
            <input
              id="studyrix-search"
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => {
                window.setTimeout(() => setSearchFocused(false), 120);
              }}
              placeholder="Search files or /tags… e.g. /notes"
              aria-label="Search files or tags"
              name="course-search"
              autoComplete="off"
              className="flex-1 bg-transparent text-base font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              ref={searchInputRef}
            />
            {!focusMode && (
              <button
                type="button"
                onClick={handleSelectionToggle}
                aria-pressed={selectionMode}
                aria-label={selectionMode ? "Exit selection mode" : "Enter selection mode"}
                className={cn(
                  "h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black flex items-center justify-center shadow-[1px_1px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none",
                  selectionMode ? "bg-black text-white" : "bg-white",
                )}
              >
                <CheckSquare className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
          {showTagSuggestions && !focusMode && (
            <div className="absolute left-0 right-0 mt-2 border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] max-h-[min(50svh,280px)] overflow-y-auto z-20">
              <div className="px-3 py-2 text-[10px] font-black uppercase text-stone-500 border-b border-stone-200">
                Tag filters
              </div>
              {filteredTagSuggestions.length === 0 ? (
                <div className="px-3 py-3 text-xs font-bold uppercase text-stone-500">
                  No tags found yet.
                </div>
              ) : (
                filteredTagSuggestions.map((option) => (
                  <button
                    key={option.key}
                    type="button"
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
                      {pinnedTagSet.has(option.key) && (
                        <span className="border border-black px-1 text-[8px] uppercase bg-white">
                          Pinned
                        </span>
                      )}
                    </span>
                    {activeSearchKeys.has(option.key) && (
                      <Check className="h-3.5 w-3.5 text-black" />
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
        {selectionMode && !focusMode && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
            <span>{selectedItems.size} selected</span>
            <span className="h-3 w-px bg-black/40" />
            <button
              type="button"
              onClick={() => openBulkTagDrawer("add")}
              className="px-2 py-1 border-2 border-black bg-[#FFD700] text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Add tags
            </button>
            <button
              type="button"
              onClick={() => openBulkTagDrawer("remove")}
              className="px-2 py-1 border-2 border-black bg-white text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 transition-transform hover:bg-yellow-50 active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Remove tags
            </button>
            <button
              type="button"
              onClick={exitSelectionMode}
              className="ml-auto px-2 py-1 border-2 border-black bg-white text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 transition-transform hover:bg-yellow-50 active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Clear selection
            </button>
          </div>
        )}
      </section>

      <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
        {!isOnline && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase text-neutral-700 shadow-[3px_3px_0px_0px_#000]">
            <span className="flex items-center gap-2">
              <WifiOff className="h-4 w-4" aria-hidden="true" />
              You&apos;re offline. Saved files are still here.
            </span>
            <OfflineFallbackButton className="text-[10px] px-3 py-1.5" />
          </div>
        )}

        {accountNotice && (
          <div className="mb-4 border-2 border-black bg-yellow-50 px-4 py-3 text-xs font-black uppercase text-neutral-700 shadow-[3px_3px_0px_0px_#000]">
            <p className="mb-2">
              If you&apos;re seeing the wrong Google profile, we tried{" "}
              <span className="text-neutral-900">{accountNotice.email}</span>.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => openDriveLink(accountNotice.link)}
                className="border-2 border-black bg-[#FFD700] px-2.5 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() =>
                  window.open(
                    "https://support.google.com/accounts/answer/1721977",
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
                className="border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
              >
                Help
              </button>
              <button
                type="button"
                onClick={() => setAccountNotice(null)}
                className="border-2 border-black bg-white px-2.5 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] ml-auto"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {!focusMode && cleanupSummary && !cleanupDismissed && (
          <div className="mb-6 border-2 border-black bg-yellow-50 px-4 py-4 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-black uppercase text-stone-700">
                  Storage Cleanup
                </p>
                <p className="text-[11px] font-bold uppercase text-stone-600">
                  {storageUsage.usedMb} MB used •{" "}
                  {storageUsage.limitMb === null
                    ? "Unlimited"
                    : `${storageUsage.limitMb} MB limit`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setCleanupDismissed(true)}
                className="border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
              >
                Dismiss
              </button>
            </div>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div className="border-2 border-black bg-white px-3 py-3 shadow-[2px_2px_0px_0px_#000]">
                <p className="text-[10px] font-black uppercase text-stone-600 mb-2">
                    Largest files
                </p>
                <div className="space-y-2">
                  {cleanupSummary.largest.map((entry) => (
                    <div
                      key={entry.resourceId}
                      className="flex items-center justify-between gap-2 text-[10px] font-black uppercase"
                    >
                      <span className="truncate">
                        {resolveResourceLabel(entry.resourceId)}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span>{formatBytes(entry.size)}</span>
                        <button
                          type="button"
                          onClick={() => handleCleanupRemove(entry.resourceId)}
                          className="border border-black bg-white px-1.5 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
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
                  Least used
                </p>
                <div className="space-y-2">
                  {cleanupSummary.leastUsed.map((entry) => (
                    <div
                      key={entry.resourceId}
                      className="flex items-center justify-between gap-2 text-[10px] font-black uppercase"
                    >
                      <span className="truncate">
                        {resolveResourceLabel(entry.resourceId)}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span>{formatModifiedDate(entry.lastUsed)}</span>
                        <button
                          type="button"
                          onClick={() => handleCleanupRemove(entry.resourceId)}
                          className="border border-black bg-white px-1.5 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCleanupBulk}
                className="border-2 border-black bg-black px-3 py-2 text-[10px] font-black uppercase text-white shadow-[3px_3px_0px_0px_#000]"
              >
                Free up space
              </button>
              <button
                type="button"
                onClick={() => router.push("/settings")}
                className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000]"
              >
                Review limits
              </button>
            </div>
          </div>
        )}

        {offlineItems.length > 0 && (
          <div className="mb-6">
            <h4 className="inline-flex items-center gap-2 text-xs font-black uppercase tracking-wide text-stone-700 mb-3 bg-yellow-50/70 border border-yellow-200/80 px-2 py-1">
              <span className="h-2 w-2 border border-black bg-yellow-300" />
              Available Offline
            </h4>
            <div
              className={isGridView ? gridLayoutClass : listSpacingClass}
              style={listVisibilityStyle}
            >
              {offlineItems.map(({ resourceId, meta, item }) => {
                const Icon = getItemIcon(item?.mimeType ?? meta.mimeType);
                const mimeLabel = getMimeLabel(
                  item?.mimeType ?? meta.mimeType,
                  item?.name ?? meta.name,
                );
                const tone = getRowTone(item?.mimeType ?? meta.mimeType);
                const sizeLabel = formatBytes(meta.size);
                const modifiedLabel = formatModifiedDate(meta.cachedAt);

                if (isGridView) {
                  return (
                    <div
                      key={resourceId}
                      className={cn(
                          "group relative border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow duration-150 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000]",
                        viewSizing.padding,
                      )}
                    >
                      <button
                        type="button"
                        onClick={() =>
                          handleOpenFile(
                            item ?? {
                              id: meta.fileId,
                              name: meta.name ?? "Offline file",
                              mimeType: meta.mimeType ?? "",
                            },
                            resourceId,
                          )
                        }
                        className="flex flex-col gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      >
                          <span
                            className={cn(
                              "flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]",
                              viewSizing.iconBox,
                              tone.icon,
                            )}
                          >
                            <Icon className={viewSizing.icon} aria-hidden="true" />
                          </span>
                        <div className="min-w-0">
                          <p
                            className={cn(
                              "font-black uppercase text-stone-900",
                              viewSizing.title,
                            )}
                            style={clampStyle}
                          >
                            {item?.name ?? meta.name ?? "Offline file"}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <span className={badgeClass}>{mimeLabel}</span>
                            {sizeLabel !== "—" && (
                              <span className={badgeClass}>{sizeLabel}</span>
                            )}
                            {modifiedLabel !== "—" && (
                              <span className={badgeClass}>
                                Saved {modifiedLabel}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                      <span className="absolute right-2 top-2 flex items-center gap-1 border-2 border-black bg-emerald-50 px-2 py-1 text-[9px] font-black uppercase leading-none shadow-[1px_1px_0px_0px_#000]">
                        <Download
                          className="h-3 w-3 text-emerald-700"
                          aria-hidden="true"
                        />
                        Offline
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={resourceId}
                    className={cn(
                      "group w-full flex flex-wrap sm:flex-nowrap items-center justify-between gap-3 border-2 border-black text-left shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000]",
                      tone.row,
                      tone.bg,
                      tone.hoverBg,
                      viewSizing.padding,
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        handleOpenFile(
                          item ?? {
                            id: meta.fileId,
                            name: meta.name ?? "Offline file",
                            mimeType: meta.mimeType ?? "",
                          },
                          resourceId,
                        )
                      }
                      className="flex flex-1 min-w-0 items-center gap-3 text-left transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      <span
                        className={cn(
                          "flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]",
                          viewSizing.iconBox,
                          tone.icon,
                        )}
                      >
                        <Icon className={viewSizing.icon} aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p
                            className={cn(
                              "font-black uppercase text-stone-900",
                              viewSizing.title,
                            )}
                            style={clampStyle}
                          >
                            {item?.name ?? meta.name ?? "Offline file"}
                          </p>
                          <span className={badgeClass}>{mimeLabel}</span>
                        </div>
                        {!isCompactView && (
                          <p
                            className={cn(
                              "font-bold uppercase text-stone-500/80",
                              viewSizing.meta,
                            )}
                          >
                            {sizeLabel !== "—" ? sizeLabel : "—"} • Saved{" "}
                            {modifiedLabel}
                          </p>
                        )}
                      </div>
                    </button>
                    <span className="mt-2 sm:mt-0 flex items-center gap-1 border-2 border-black bg-emerald-50 px-2 py-1 text-[10px] font-black uppercase leading-none shadow-[1px_1px_0px_0px_#000] shrink-0">
                      <Download
                        className="h-3 w-3 text-emerald-700"
                        aria-hidden="true"
                      />
                      Offline
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {driveQuery.isLoading || showFilteringSkeleton ? (
          <div
            className={isGridView ? gridLayoutClass : listSpacingClass}
            style={listVisibilityStyle}
          >
            {Array.from({ length: 6 }).map((_, index) => (
              <RetroSkeleton
                key={index}
                className={isGridView ? "w-full aspect-[4/3]" : "h-16 w-full"}
              />
            ))}
          </div>
        ) : driveQuery.isError ? (
          <div className="border-2 border-black bg-red-50 p-6 shadow-[4px_4px_0px_0px_#000]">
            <p className="text-sm font-bold text-red-600 mb-4">
              Unable to load Drive materials. Please try again.
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => driveQuery.refetch()}
                className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0_#0a0a0a]"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Retry
              </button>
              <OfflineFallbackButton />
            </div>
          </div>
        ) : searchModeActive && deepSearchStatus === "loading" ? (
          <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]">
            <p
              className="text-sm font-bold uppercase text-neutral-600"
              role="status"
              aria-live="polite"
            >
              Searching across folders…
            </p>
          </div>
        ) : searchModeActive && deepSearchStatus === "error" ? (
          <div className="border-2 border-black bg-red-50 p-6 shadow-[4px_4px_0px_0px_#000]">
            <p className="text-sm font-bold text-red-600">
              Search failed. Please try again.
            </p>
          </div>
        ) : renderEntries.length === 0 ? (
          <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]">
            <p className="text-sm font-bold uppercase text-neutral-600">
              {searchTerm
                ? "No materials match your search."
                : "No files or folders found."}
            </p>
          </div>
        ) : (
          <div className="space-y-4" style={listVisibilityStyle}>
            {searchModeActive && deepSearchTruncated && (
              <div className="border-2 border-black bg-yellow-50 px-4 py-3 text-xs font-bold uppercase text-stone-700 shadow-[2px_2px_0px_0px_#000]">
                Search results are capped. Refine your query for more precise
                matches.
              </div>
            )}
            {visibleFolders.length > 0 && (
              <div className={isGridView ? gridLayoutClass : listSpacingClass}>
                {visibleFolders.map((entry, index) => {
                  const item = entry.item;
                  const resourceId = entry.resourceId;
                  const tone = getRowTone(item.mimeType);
                  const itemTags = tags[resourceId] ?? [];
                  const tagChips = itemTags.map((tag) => resolveTagOption(tag));
                  const isFavorite = Boolean(favorites[resourceId]);
                  const isSelected = selectedItems.has(resourceId);
                  const Icon = getItemIcon(item.mimeType);
                  const mimeLabel = getMimeLabel(item.mimeType, item.name);
                  const modifiedLabel = formatModifiedDate(item.modifiedTime);
                  const pathLabel =
                    searchModeActive && entry.pathNames.length > 1
                      ? `In ${entry.pathNames.slice(1).join(" / ")}`
                      : null;
                  const detailLine = [
                    modifiedLabel !== "—" ? `Updated ${modifiedLabel}` : null,
                    pathLabel,
                  ]
                    .filter(Boolean)
                    .join(" • ");
                  const motionClass = listReady
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-1";
                  const motionStyle = {
                    transitionDelay: listReady
                      ? `${Math.min(index * 20, 200)}ms`
                      : "0ms",
                  };

                  if (isGridView) {
                    return (
                      <div
                        key={item.id}
                        style={motionStyle}
                        className={cn(
                          "group relative border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000]",
                          viewSizing.padding,
                          motionClass,
                          isSelected &&
                            selectionMode &&
                            "ring-2 ring-black bg-yellow-50",
                        )}
                      >
                        {selectionMode && (
                          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000]">
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handlePrimaryAction(resourceId, () =>
                            handleOpenFolder(
                              item.id,
                              item.name,
                              entry.pathIds,
                              entry.pathNames,
                            ),
                          )}
                          onPointerDown={handleLongPressStart(resourceId)}
                          onPointerUp={handleLongPressCancel}
                          onPointerCancel={handleLongPressCancel}
                          onPointerMove={handleLongPressCancel}
                          className="flex flex-col gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                        >
                          <span
                            className={cn(
                              "flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]",
                              viewSizing.iconBox,
                              tone.icon,
                            )}
                          >
                            <Icon className={viewSizing.icon} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "font-black uppercase text-stone-900",
                                viewSizing.title,
                              )}
                              style={clampStyle}
                            >
                              {item.name}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className={badgeClass}>{mimeLabel}</span>
                              {detailLine && (
                                <span className={badgeClass}>{detailLine}</span>
                              )}
                            </div>
                            {!focusMode &&
                              !isCompactView &&
                              (isFavorite || tagChips.length > 0) && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {isFavorite && (
                                    <span className={badgeClass}>Starred</span>
                                  )}
                                  {tagChips.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag.key}
                                      className={badgeClass}
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
                          <div className="absolute right-2 top-2">
                            <Menu>
                              <Menu.Trigger asChild>
                                <button
                                  type="button"
                                  aria-label="Folder actions"
                                  className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0px_0px_#000] transition-colors duration-150 hover:bg-yellow-50/70 active:bg-yellow-100/70 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                                >
                                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </Menu.Trigger>
                              <Menu.Content
                                align="end"
                                sideOffset={6}
                                className="border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] min-w-[180px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
                              >
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    handleOpenFolder(
                                      item.id,
                                      item.name,
                                      entry.pathIds,
                                      entry.pathNames,
                                    )
                                  }
                                >
                                  <FolderOpen className="h-4 w-4" aria-hidden="true" />
                                  Open folder
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    handleToggleFavorite(resourceId)
                                  }
                                >
                                  <Star className="h-4 w-4" aria-hidden="true" />
                                  {isFavorite ? "Unstar folder" : "Star folder"}
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    openTagDrawerForResource(
                                      resourceId,
                                      item.name,
                                    )
                                  }
                                >
                                  <Tag className="h-4 w-4" aria-hidden="true" />
                                  Manage tags
                                </Menu.Item>
                              </Menu.Content>
                            </Menu>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      style={motionStyle}
                      className={cn(
                        "group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-black text-left shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 motion-reduce:transition-none",
                        tone.row,
                        tone.bg,
                        tone.hoverBg,
                        viewSizing.padding,
                        motionClass,
                        isSelected &&
                          selectionMode &&
                          "bg-yellow-50 ring-2 ring-black",
                        "hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000]",
                      )}
                    >
                      <button
                        type="button"
                        onClick={handlePrimaryAction(resourceId, () =>
                          handleOpenFolder(
                            item.id,
                            item.name,
                            entry.pathIds,
                            entry.pathNames,
                          ),
                        )}
                        onPointerDown={handleLongPressStart(resourceId)}
                        onPointerUp={handleLongPressCancel}
                        onPointerCancel={handleLongPressCancel}
                        onPointerMove={handleLongPressCancel}
                        className="flex flex-1 min-w-0 items-center gap-3 text-left transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      >
                        {selectionMode && (
                          <span className="flex h-6 w-6 items-center justify-center border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000] shrink-0">
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </span>
                        )}
                        <span
                          className={cn(
                            "flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]",
                            viewSizing.iconBox,
                            tone.icon,
                          )}
                        >
                          <Icon className={viewSizing.icon} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={cn(
                                "font-black uppercase text-stone-900",
                                viewSizing.title,
                              )}
                              style={clampStyle}
                            >
                              {item.name}
                            </p>
                            <span className={badgeClass}>{mimeLabel}</span>
                          </div>
                          {!isCompactView && detailLine && (
                            <p
                              className={cn(
                                "font-bold uppercase text-stone-500/80",
                                viewSizing.meta,
                              )}
                            >
                              {detailLine}
                            </p>
                          )}
                          {!focusMode &&
                            !isCompactView &&
                            (isFavorite || tagChips.length > 0) && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {isFavorite && (
                                  <span className={badgeClass}>Starred</span>
                                )}
                                {tagChips.map((tag) => (
                                  <span
                                    key={tag.key}
                                    className={badgeClass}
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
                          <Menu>
                            <Menu.Trigger asChild>
                              <button
                                type="button"
                                aria-label="Folder actions"
                                className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 hover:bg-yellow-50/70 active:scale-90 active:shadow-[2px_2px_0px_0px_#000] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                              >
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </Menu.Trigger>
                            <Menu.Content
                              align="end"
                              sideOffset={6}
                              className="border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] min-w-[180px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
                            >
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  handleOpenFolder(
                                    item.id,
                                    item.name,
                                    entry.pathIds,
                                    entry.pathNames,
                                  )
                                }
                              >
                                <FolderOpen className="h-4 w-4" aria-hidden="true" />
                                Open folder
                              </Menu.Item>
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  handleToggleFavorite(resourceId)
                                }
                              >
                                <Star className="h-4 w-4" aria-hidden="true" />
                                {isFavorite ? "Unstar folder" : "Star folder"}
                              </Menu.Item>
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  openTagDrawerForResource(
                                    resourceId,
                                    item.name,
                                  )
                                }
                              >
                                <Tag className="h-4 w-4" aria-hidden="true" />
                                Manage tags
                              </Menu.Item>
                            </Menu.Content>
                          </Menu>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {visibleFolders.length < folders.length && (
              <div ref={folderSentinelRef} className="h-2" aria-hidden="true" />
            )}
            {visibleFiles.length > 0 && (
              <div
                className={cn(
                  isGridView ? gridLayoutClass : listSpacingClass,
                  visibleFolders.length > 0 && "pt-2",
                )}
              >
                {visibleFiles.map((entry, index) => {
                  const item = entry.item;
                  const resourceId = entry.resourceId;
                  const tone = getRowTone(item.mimeType);
                  const itemTags = tags[resourceId] ?? [];
                  const tagChips = itemTags.map((tag) => resolveTagOption(tag));
                  const isFavorite = Boolean(favorites[resourceId]);
                  const offlineMeta = offlineFiles[resourceId];
                  const isOffline = Boolean(offlineMeta);
                  const isSelected = selectedItems.has(resourceId);
                  const Icon = getItemIcon(item.mimeType);
                  const mimeLabel = getMimeLabel(item.mimeType, item.name);
                  const sizeLabel = formatBytes(offlineMeta?.size ?? item.size);
                  const modifiedLabel = formatModifiedDate(
                    item.modifiedTime ?? offlineMeta?.cachedAt,
                  );
                  const pathLabel =
                    searchModeActive && entry.pathNames.length > 1
                      ? `In ${entry.pathNames.slice(1).join(" / ")}`
                      : null;
                  const detailLine = [
                    sizeLabel !== "—" ? sizeLabel : null,
                    modifiedLabel !== "—" ? modifiedLabel : null,
                    pathLabel,
                  ]
                    .filter(Boolean)
                    .join(" • ");
                  const motionClass = listReady
                    ? "opacity-100 translate-y-0"
                    : "opacity-0 translate-y-1";
                  const motionStyle = {
                    transitionDelay: listReady
                      ? `${Math.min((index + visibleFolders.length) * 20, 200)}ms`
                      : "0ms",
                  };

                  if (isGridView) {
                    return (
                      <div
                        key={item.id}
                        style={motionStyle}
                        className={cn(
                          "group relative border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 motion-reduce:transition-none",
                          viewSizing.padding,
                          motionClass,
                          item.webViewLink
                            ? "hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000]"
                            : "opacity-80",
                          isSelected &&
                            selectionMode &&
                            "ring-2 ring-black bg-yellow-50",
                        )}
                      >
                        {selectionMode && (
                          <span className="absolute left-2 top-2 flex h-6 w-6 items-center justify-center border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000]">
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={handlePrimaryAction(resourceId, () =>
                            handleOpenFile(item, resourceId),
                          )}
                          onPointerDown={handleLongPressStart(resourceId)}
                          onPointerUp={handleLongPressCancel}
                          onPointerCancel={handleLongPressCancel}
                          onPointerMove={handleLongPressCancel}
                          className="flex flex-col gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                        >
                          <span
                            className={cn(
                              "flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]",
                              viewSizing.iconBox,
                              tone.icon,
                            )}
                          >
                            <Icon className={viewSizing.icon} aria-hidden="true" />
                          </span>
                          <div className="min-w-0">
                            <p
                              className={cn(
                                "font-black uppercase text-stone-900",
                                viewSizing.title,
                              )}
                              style={clampStyle}
                            >
                              {item.name}
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <span className={badgeClass}>{mimeLabel}</span>
                              {sizeLabel !== "—" && (
                                <span className={badgeClass}>{sizeLabel}</span>
                              )}
                              {modifiedLabel !== "—" && (
                                <span className={badgeClass}>
                                  {modifiedLabel}
                                </span>
                              )}
                            </div>
                            {!focusMode &&
                              !isCompactView &&
                              (isFavorite ||
                                isOffline ||
                                tagChips.length > 0) && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {isFavorite && (
                                    <span className={badgeClass}>Starred</span>
                                  )}
                                  {isOffline && (
                                    <span className={badgeClass}>Offline</span>
                                  )}
                                  {tagChips.slice(0, 2).map((tag) => (
                                    <span
                                      key={tag.key}
                                      className={badgeClass}
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
                          <div className="absolute right-2 top-2">
                            <Menu>
                              <Menu.Trigger asChild>
                                <button
                                  type="button"
                                  aria-label="File actions"
                                  className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 hover:bg-yellow-50/70 active:scale-90 active:shadow-[2px_2px_0px_0px_#000] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                                >
                                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                                </button>
                              </Menu.Trigger>
                              <Menu.Content
                                align="end"
                                sideOffset={6}
                                className="border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] min-w-[190px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
                              >
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    handleOpenFile(item, resourceId)
                                  }
                                >
                                  <FileText className="h-4 w-4" aria-hidden="true" />
                                  Open file
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    handleToggleFavorite(resourceId)
                                  }
                                >
                                  <Star className="h-4 w-4" aria-hidden="true" />
                                  {isFavorite ? "Unstar file" : "Star file"}
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    handleDownloadFile(item, resourceId)
                                  }
                                >
                                  <Download className="h-4 w-4" aria-hidden="true" />
                                  Download file
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    handleShareFile(item, resourceId)
                                  }
                                >
                                  <Share2 className="h-4 w-4" aria-hidden="true" />
                                  Share file
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    handleToggleOffline(
                                      item,
                                      resourceId,
                                      entry.pathIds,
                                    )
                                  }
                                >
                                  <Download className="h-4 w-4" aria-hidden="true" />
                                  {isOffline
                                    ? "Remove offline access"
                                    : "Make available offline"}
                                </Menu.Item>
                                <Menu.Item
                                  className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                  onSelect={() =>
                                    openTagDrawerForResource(
                                      resourceId,
                                      item.name,
                                    )
                                  }
                                >
                                  <Tag className="h-4 w-4" aria-hidden="true" />
                                  Manage tags
                                </Menu.Item>
                              </Menu.Content>
                            </Menu>
                          </div>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div
                      key={item.id}
                      style={motionStyle}
                      className={cn(
                        "group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-2 border-black text-left shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 motion-reduce:transition-none",
                        tone.row,
                        tone.bg,
                        tone.hoverBg,
                        viewSizing.padding,
                        motionClass,
                        isSelected &&
                          selectionMode &&
                          "bg-yellow-50 ring-2 ring-black",
                        item.webViewLink
                          ? "hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000]"
                          : "opacity-80",
                      )}
                    >
                      <button
                        type="button"
                        onClick={handlePrimaryAction(resourceId, () =>
                          handleOpenFile(item, resourceId),
                        )}
                        onPointerDown={handleLongPressStart(resourceId)}
                        onPointerUp={handleLongPressCancel}
                        onPointerCancel={handleLongPressCancel}
                        onPointerMove={handleLongPressCancel}
                        className="flex flex-1 min-w-0 items-center gap-3 text-left transition-colors duration-150 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      >
                        {selectionMode && (
                          <span className="flex h-6 w-6 items-center justify-center border-2 border-black bg-white shadow-[1px_1px_0px_0px_#000] shrink-0">
                            {isSelected && <Check className="h-3.5 w-3.5" />}
                          </span>
                        )}
                        <span
                          className={cn(
                            "flex items-center justify-center border-2 border-black shadow-[2px_2px_0px_0px_#000]",
                            viewSizing.iconBox,
                            tone.icon,
                          )}
                        >
                          <Icon className={viewSizing.icon} aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <p
                              className={cn(
                                "font-black uppercase text-stone-900",
                                viewSizing.title,
                              )}
                              style={clampStyle}
                            >
                              {item.name}
                            </p>
                            <span className={badgeClass}>{mimeLabel}</span>
                          </div>
                          {!isCompactView && detailLine && (
                            <p
                              className={cn(
                                "font-bold uppercase text-stone-500/80",
                                viewSizing.meta,
                              )}
                            >
                              {detailLine}
                            </p>
                          )}
                          {!focusMode && !isCompactView && (
                            <div className="mt-2 flex flex-wrap gap-2">
                              {isFavorite && (
                                <span className={badgeClass}>Starred</span>
                              )}
                              {isOffline && (
                                <span className={badgeClass}>Offline</span>
                              )}
                              {tagChips.map((tag) => (
                                <span
                                  key={tag.key}
                                  className={badgeClass}
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
                          <Menu>
                            <Menu.Trigger asChild>
                              <button
                                type="button"
                                aria-label="File actions"
                                className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0px_0px_#000] transition-transform transition-shadow transition-colors duration-150 hover:bg-yellow-50/70 active:scale-90 active:shadow-[2px_2px_0px_0px_#000] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                              >
                                <MoreVertical className="h-4 w-4" aria-hidden="true" />
                              </button>
                            </Menu.Trigger>
                            <Menu.Content
                              align="end"
                              sideOffset={6}
                              className="border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] min-w-[190px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
                            >
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  handleOpenFile(item, resourceId)
                                }
                              >
                                <FileText className="h-4 w-4" aria-hidden="true" />
                                Open file
                              </Menu.Item>
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  handleToggleFavorite(resourceId)
                                }
                              >
                                <Star className="h-4 w-4" aria-hidden="true" />
                                {isFavorite ? "Unstar file" : "Star file"}
                              </Menu.Item>
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  handleDownloadFile(item, resourceId)
                                }
                              >
                                <Download className="h-4 w-4" aria-hidden="true" />
                                Download file
                              </Menu.Item>
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  handleShareFile(item, resourceId)
                                }
                              >
                                <Share2 className="h-4 w-4" aria-hidden="true" />
                                Share file
                              </Menu.Item>
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  handleToggleOffline(
                                    item,
                                    resourceId,
                                    entry.pathIds,
                                  )
                                }
                              >
                                <Download className="h-4 w-4" aria-hidden="true" />
                                {isOffline
                                  ? "Remove offline access"
                                  : "Make available offline"}
                              </Menu.Item>
                              <Menu.Item
                                className="flex items-center gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100"
                                onSelect={() =>
                                  openTagDrawerForResource(
                                    resourceId,
                                    item.name,
                                  )
                                }
                              >
                                <Tag className="h-4 w-4" aria-hidden="true" />
                                Manage tags
                              </Menu.Item>
                            </Menu.Content>
                          </Menu>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
            {visibleFiles.length < files.length && (
              <div ref={fileSentinelRef} className="h-2" aria-hidden="true" />
            )}
          </div>
        )}
      </section>

      <Drawer
        open={Boolean(tagDrawer)}
        onOpenChange={(open) => {
          if (!open) {
            setTagDrawer(null);
            setTagSelection(new Set());
            setTagSearch("");
            setNewTagName("");
            setDuplicateTagKey(null);
          }
        }}
      >
        <Drawer.Content className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] w-full max-w-none max-h-[calc(100svh-1rem)] overflow-y-auto overflow-x-hidden pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Drawer.Header>
            <Drawer.Title className="text-lg font-black uppercase">
              {tagDrawer?.mode === "bulk"
                ? tagDrawer.action === "remove"
                  ? "Remove Tags"
                  : "Add Tags"
                : "Manage Tags"}
            </Drawer.Title>
            <Drawer.Description className="text-sm font-bold text-neutral-600">
              {tagDrawer?.mode === "bulk"
                ? `Apply to ${tagDrawer.resourceIds.length} items`
                : (tagDrawer?.name ?? "Resource")}
            </Drawer.Description>
          </Drawer.Header>
          <div className="px-4 pb-2 space-y-4">
            <div className="space-y-2">
              <label
                className="text-[10px] font-black uppercase text-stone-600"
                htmlFor="tag-search"
              >
                Search tags
              </label>
              <input
                id="tag-search"
                type="search"
                value={tagSearch}
                onChange={(event) => setTagSearch(event.target.value)}
                placeholder="Filter tags… e.g. notes"
                aria-label="Filter tags"
                name="tag-search"
                autoComplete="off"
                className="w-full border-2 border-black px-3 py-2 text-xs font-bold uppercase shadow-[3px_3px_0px_0px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              />
            </div>

            {selectedDrawerTags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {selectedDrawerTags.map((tag) => (
                  <span
                    key={tag.key}
                    className="border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                    style={{ backgroundColor: tag.color }}
                  >
                    {tag.label}
                  </span>
                ))}
              </div>
            )}

            {suggestedTags.length > 0 && (
              <div className="border-2 border-black bg-white px-3 py-2 shadow-[2px_2px_0px_0px_#000]">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase text-stone-600 mb-2">
                  <Sparkles className="h-3.5 w-3.5" />
                  Suggested tags
                </div>
                <div className="flex flex-wrap gap-2">
                  {suggestedTags.map((tag) => (
                    <button
                      key={tag.key}
                      type="button"
                      onClick={() => toggleTagSelection(tag.key)}
                      className="min-h-[44px] min-w-[44px] inline-flex items-center justify-center border-2 border-black px-2 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                      style={{ backgroundColor: tag.color }}
                    >
                      {tag.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              {filteredDrawerTags.length === 0 ? (
                <div className="border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase text-stone-500 shadow-[2px_2px_0px_0px_#000]">
                  No matching tags.
                </div>
              ) : (
                filteredDrawerTags.map((tag) => (
                  <div
                    key={tag.key}
                    className={cn(
                      "w-full flex items-center justify-between gap-3 border-2 border-black px-3 py-2 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-transform motion-reduce:transition-none focus-within:ring-2 focus-within:ring-black",
                      tagSelection.has(tag.key) ? "bg-yellow-100" : "bg-white",
                      duplicateTagKey === tag.key && "ring-2 ring-black",
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTagSelection(tag.key)}
                      aria-pressed={tagSelection.has(tag.key)}
                      className="flex flex-1 min-h-[44px] items-center gap-2 min-w-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:transition-none"
                    >
                      <span
                        className="h-2.5 w-2.5 rounded-full border border-black shrink-0"
                        style={{ backgroundColor: tag.color }}
                      />
                      <span className="truncate">{tag.label}</span>
                      {pinnedTagSet.has(tag.key) && (
                        <span className="border border-black px-1 text-[8px] uppercase bg-white">
                          Pinned
                        </span>
                      )}
                    </button>
                    <span className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => toggleTagPin(tag.key)}
                        className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0px_0px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                        aria-label={
                          pinnedTagSet.has(tag.key)
                            ? `Unpin ${tag.label}`
                            : `Pin ${tag.label}`
                        }
                      >
                        <Pin
                          className={cn(
                            "h-3.5 w-3.5",
                            pinnedTagSet.has(tag.key)
                              ? "text-black"
                              : "text-stone-400",
                          )}
                          fill={
                            pinnedTagSet.has(tag.key) ? "currentColor" : "none"
                          }
                        />
                      </button>
                      {tagSelection.has(tag.key) && (
                        <Check className="h-4 w-4" />
                      )}
                    </span>
                  </div>
                ))
              )}
            </div>

            {tagDrawer?.action !== "remove" && (
              <div className="border-2 border-black bg-white p-3 shadow-[2px_2px_0px_0px_#000] space-y-3">
                <div className="text-[10px] font-black uppercase text-stone-600">
                  Create new tag
                </div>
                <div className="flex flex-wrap gap-2">
                  {TAG_COLORS.map((color) => (
                    <button
                      key={color.id}
                      type="button"
                      onClick={() => setNewTagColor(color.value)}
                      aria-label={`Select ${color.label}`}
                      className={cn(
                        "h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black shadow-[2px_2px_0px_0px_#000]",
                        newTagColor === color.value && "ring-2 ring-black",
                      )}
                      style={{ backgroundColor: color.value }}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  <input
                    value={newTagName}
                    onChange={(event) => setNewTagName(event.target.value)}
                    placeholder="New tag name… e.g. notes"
                    aria-label="New tag name"
                    name="new-tag"
                    autoComplete="off"
                    className="flex-1 min-w-0 w-full sm:min-w-[180px] border-2 border-black px-3 py-2 text-xs font-bold uppercase shadow-[3px_3px_0px_0px_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  />
                  <button
                    type="button"
                    onClick={handleCreateTag}
                    className="w-full sm:w-auto border-2 border-black bg-[#FFD700] px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000]"
                  >
                    Create
                  </button>
                </div>
                {duplicateTagKey && (
                  <p className="text-[10px] font-black uppercase text-stone-500">
                    Tag already exists — tap it above to apply.
                  </p>
                )}
              </div>
            )}
          </div>
          <Drawer.Footer>
            <button
              type="button"
              onClick={handleApplyTags}
              disabled={tagDrawer?.mode === "bulk" && tagSelection.size === 0}
              className="inline-flex items-center justify-center gap-2 border-2 border-black bg-[#FFD700] px-4 py-3 text-sm font-black uppercase shadow-[4px_4px_0px_0px_#000] disabled:opacity-60"
            >
              Apply tags
            </button>
            <button
              type="button"
              onClick={() => {
                setTagDrawer(null);
                setTagSelection(new Set());
                setTagSearch("");
                setNewTagName("");
                setDuplicateTagKey(null);
              }}
              className="inline-flex items-center justify-center gap-2 border-2 border-black bg-white px-4 py-3 text-sm font-black uppercase shadow-[3px_3px_0px_0px_#000]"
            >
              Cancel
            </button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <Drawer open={viewSettingsOpen} onOpenChange={setViewSettingsOpen}>
        <Drawer.Content className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] w-full max-w-none max-h-[calc(100svh-1rem)] overflow-y-auto overflow-x-hidden pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Drawer.Header>
            <Drawer.Title className="text-lg font-black uppercase">
              View Settings
            </Drawer.Title>
            <Drawer.Description className="text-sm font-bold text-neutral-600">
              Adjust layout density for folders and files.
            </Drawer.Description>
          </Drawer.Header>
          <div className="px-4 pb-4 space-y-4">
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-stone-600">
                View mode
              </p>
              <div className="flex flex-wrap gap-2">
                {viewModeOptions.map((option) => {
                  const Icon = option.icon;
                  const isActive = viewMode === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() =>
                        updateCourseView(
                          option.id as "grid" | "list" | "compact",
                          viewSize,
                        )
                      }
                      className={cn(
                        "h-10 border-2 border-black px-3 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] flex items-center gap-2 transition-colors duration-150 transition-transform active:scale-95 motion-reduce:transition-none",
                        isActive
                          ? "bg-black text-white"
                          : "bg-white hover:bg-yellow-50",
                      )}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase text-stone-600">
                Size
              </p>
              <div className="flex flex-wrap gap-2">
                {viewSizeOptions.map((option) => {
                  const isActive = viewSize === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      aria-pressed={isActive}
                      onClick={() =>
                        updateCourseView(
                          viewMode,
                          option.id as "sm" | "md" | "lg",
                        )
                      }
                      className={cn(
                        "h-9 border-2 border-black px-3 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 transition-transform active:scale-95 motion-reduce:transition-none",
                        isActive
                          ? "bg-black text-white"
                          : "bg-white hover:bg-yellow-50",
                      )}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <Drawer.Footer>
            <button
              type="button"
              onClick={() => setViewSettingsOpen(false)}
              className="border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000]"
            >
              Done
            </button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>
      <Drawer open={helpOpen} onOpenChange={setHelpOpen}>
        <Drawer.Content className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] w-full max-w-none max-h-[calc(100svh-1rem)] overflow-y-auto overflow-x-hidden pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
          <Drawer.Header>
            <Drawer.Title className="text-lg font-black uppercase">
              Help
            </Drawer.Title>
            <Drawer.Description className="text-sm font-bold text-neutral-600">
              Quick tips for navigating study materials.
            </Drawer.Description>
          </Drawer.Header>
          <div className="px-4 pb-4 space-y-3">
            <div className="border-2 border-black bg-yellow-50 px-3 py-3 text-[11px] font-bold uppercase text-stone-700 shadow-[2px_2px_0px_0px_#000]">
              Use <span className="text-black">/tag</span> in search to filter
              by tags.
            </div>
            <div className="border-2 border-black bg-white px-3 py-3 text-[11px] font-bold uppercase text-stone-700 shadow-[2px_2px_0px_0px_#000]">
              Long-press on mobile to select multiple items quickly.
            </div>
            <div className="border-2 border-black bg-white px-3 py-3 text-[11px] font-bold uppercase text-stone-700 shadow-[2px_2px_0px_0px_#000]">
              Star files and folders to surface them in smart views.
            </div>
            <div className="border-2 border-black bg-white px-3 py-3 text-[11px] font-bold uppercase text-stone-700 shadow-[2px_2px_0px_0px_#000]">
              Offline toggles keep files saved for quick access.
            </div>
          </div>
          <Drawer.Footer>
            <button
              type="button"
              onClick={() => setHelpOpen(false)}
              className="border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000]"
            >
              Close
            </button>
          </Drawer.Footer>
        </Drawer.Content>
      </Drawer>

      <StudyrixFooter />

      <CommandCenter
        open={commandOpen}
        onOpenChange={setCommandOpen}
        items={commandItems}
        placeholder="Search files or tags… e.g. notes"
        emptyLabel="No matching resources."
        onOpenShortcuts={() => setShortcutsOpen(true)}
      />
      <ShortcutsSheet
        open={shortcutsOpen}
        onOpenChange={setShortcutsOpen}
        shortcuts={[
          { keys: "/", label: "Focus search" },
          { keys: "⌘K / Ctrl+K", label: "Open Quick Search" },
          { keys: "f", label: "Star selected item" },
          { keys: "o", label: "Toggle offline" },
          { keys: "t", label: "Manage tags" },
        ]}
      />
    </>
  );
}

export default function ResourceCoursePage() {
  const router = useRouter();
  const params = useParams();
  const courseIdParam = params?.courseID;
  const courseId = Array.isArray(courseIdParam)
    ? courseIdParam[0]
    : courseIdParam;

  const preferences = useStudyMaterialsPreferences(null);
  const { departmentId, semesterId, loaded: prefsLoaded } = preferences;
  const hasSelection =
    Boolean(departmentId) &&
    typeof semesterId === "number" &&
    Number.isFinite(semesterId);
  const coursesQuery = useResourceCourses({ departmentId, semesterId });

  const course = useMemo(() => {
    return (coursesQuery.data ?? []).find((item) => item.courseID === courseId);
  }, [coursesQuery.data, courseId]);

  const rootFolderId = course?.syllabusAssets?.folderId ?? null;

  useEffect(() => {
    if (!course?.courseID || !rootFolderId) return;
    const resourceId = buildResourceId({
      courseId: course.courseID,
      path: rootFolderId,
      itemId: rootFolderId,
    });
    preferences.markOpened(resourceId);
  }, [course?.courseID, preferences, rootFolderId]);

  if (!prefsLoaded) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
        <DotPatternBackground />
        <div className="mx-auto max-w-5xl relative z-10">
          <header className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
            <RetroSkeleton className="h-10 w-64" />
          </header>
          <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <RetroSkeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!hasSelection) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-6">
        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]">
          <p className="text-sm font-bold uppercase text-neutral-600">
            Select a department and semester to view course materials.
          </p>
          <div className="mt-4 flex items-center gap-2">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-2 border-2 border-black bg-[#FFD700] px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Choose Department & Semester
            </button>
            <button
              type="button"
              onClick={() => router.push("/settings")}
              className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Settings
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (coursesQuery.isLoading) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
        <DotPatternBackground />
        <div className="mx-auto max-w-5xl relative z-10">
          <header className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
            <RetroSkeleton className="h-10 w-64" />
          </header>
          <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
            <div className="space-y-3">
              {Array.from({ length: 4 }).map((_, index) => (
                <RetroSkeleton key={index} className="h-16 w-full" />
              ))}
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!courseId) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]">
          <p className="text-sm font-bold uppercase text-neutral-600">
            Course not found.
          </p>
          <div className="mt-4">
            <OfflineFallbackButton />
          </div>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center p-4">
        <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]">
          <p className="text-sm font-bold uppercase text-neutral-600">
            Course resources are unavailable.
          </p>
          <div className="mt-4">
            <OfflineFallbackButton />
          </div>
        </div>
      </div>
    );
  }

  if (!rootFolderId) {
    return (
      <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
        <DotPatternBackground />
        <div className="mx-auto max-w-5xl relative z-10">
          <header className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => router.push("/")}
                aria-label="Back to resources"
                className="h-11 w-11 min-h-[44px] min-w-[44px] border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0_#0a0a0a] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#0a0a0a] active:translate-y-0 active:shadow-[1px_1px_0_#0a0a0a]"
              >
                <ArrowLeft className="h-5 w-5" aria-hidden="true" />
              </button>
              <div>
                <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-stone-900 tracking-tight">
                  {course.courseName || course.courseID}
                </h1>
                <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-stone-500">
                  {course.courseID}
                </p>
              </div>
            </div>
          </header>

          <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
            <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]">
              <p className="text-sm font-bold uppercase text-neutral-600">
                Resources not available for this course.
              </p>
              <div className="mt-4">
                <OfflineFallbackButton />
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
      <DotPatternBackground />

      <div className="mx-auto max-w-5xl relative z-10">
        <ResourceCourseBrowser
          key={rootFolderId}
          course={course}
          rootFolderId={rootFolderId}
          userEmail={null}
          courses={coursesQuery.data ?? []}
          preferences={preferences}
        />
      </div>
    </div>
  );
}
