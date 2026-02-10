"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Folder, FileText, MoreVertical, Search, Star, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import DotPatternBackground from "@/components/ui/DotPatternBackground";
import { Menu } from "@/components/ui/Menu";
import { RetroSkeleton } from "@/components/ui/skeleton";
import { OfflineFallbackButton } from "@/components/resources/OfflineFallbackButton";
import { ShortcutsSheet } from "@/components/resources/ShortcutsSheet";
import { StudyrixFooter } from "@/components/resources/StudyrixFooter";
import { ViewSwitcher } from "@/components/resources/ViewSwitcher";
import { useResourceCourses, useResourceFilters } from "@/hooks/useResources";
import { useStudyMaterialsPreferences } from "@/hooks/useStudyMaterialsPreferences";
import { useOfflineManager } from "@/hooks/useOfflineManager";
import { useOnlineStatus } from "@/hooks/useOptimizations";
import { buildResourceId, parseResourceId } from "@/lib/resources/resource-id";
import { cn } from "@/lib/utils";
import {
  DRIVE_FOLDER_MIME,
  type DriveItem,
  type ResourceCourse,
} from "@/types/resources";
import {
  CommandCenter,
  type CommandItem,
} from "@/components/resources/CommandCenter";

type ResourceTab = "academic";

type CrossCourseResult = {
  item: DriveItem;
  resourceId: string;
  courseId: string;
  courseName: string | null;
  pathIds: string[];
  pathNames: string[];
};

const TAB_ORDER: ResourceTab[] = ["academic"];

const COURSE_PALETTE = [
  { border: "#8B5CF6", dot: "bg-[#8B5CF6]" },
  { border: "#F43F5E", dot: "bg-[#F43F5E]" },
  { border: "#10B981", dot: "bg-[#10B981]" },
  { border: "#0EA5E9", dot: "bg-[#0EA5E9]" },
  { border: "#F59E0B", dot: "bg-[#F59E0B]" },
  { border: "#6366F1", dot: "bg-[#6366F1]" },
];

const DEFAULT_SEMESTERS = [1, 2, 3, 4, 5, 6, 7, 8];

const hashCourseKey = (value: string) => {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 31 + value.charCodeAt(i)) % 2147483647;
  }
  return hash;
};

function buildSearchKey(course: ResourceCourse) {
  return `${course.courseName ?? ""} ${course.courseID}`.toLowerCase();
}

function getSearchIcon(mimeType?: string) {
  return mimeType === DRIVE_FOLDER_MIME ? Folder : FileText;
}

const ResourceFolderCard = memo(function ResourceFolderCard({
  course,
  resourceId,
  isFavorite,
  onOpenCourse,
  onToggleFavorite,
  variant = "grid",
}: {
  course: ResourceCourse;
  resourceId: string | null;
  isFavorite: boolean;
  onOpenCourse: (courseId: string) => void;
  onToggleFavorite: (resourceId: string) => void;
  variant?: "grid" | "row";
}) {
  const hasAssets = Boolean(course.syllabusAssets?.folderId);
  const slotBadge = course.courseID.slice(-2).toUpperCase();
  const paletteIndex =
    hashCourseKey(course.courseID || course.courseName || "course") %
    COURSE_PALETTE.length;
  const palette = COURSE_PALETTE[paletteIndex] ??
    COURSE_PALETTE[0] ?? {
      border: "#000",
      dot: "bg-black",
    };
  const isGrid = variant === "grid";
  const [menuOpen, setMenuOpen] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef(false);
  const handleOpen = useCallback(() => {
    if (!hasAssets) return;
    onOpenCourse(course.courseID);
  }, [course.courseID, hasAssets, onOpenCourse]);
  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current !== null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);
  const handleLongPressStart = useCallback(
    (event: React.PointerEvent) => {
      if (event.pointerType !== "touch") return;
      if (!hasAssets && !resourceId) return;
      clearLongPress();
      longPressTriggeredRef.current = false;
      longPressTimerRef.current = window.setTimeout(() => {
        longPressTriggeredRef.current = true;
        setMenuOpen(true);
      }, 450);
    },
    [clearLongPress, hasAssets, resourceId],
  );
  const handleLongPressCancel = useCallback(() => {
    clearLongPress();
  }, [clearLongPress]);
  const handleMenuOpenChange = useCallback((open: boolean) => {
    setMenuOpen(open);
    if (!open) {
      longPressTriggeredRef.current = false;
    }
  }, []);
  const menuItemClass =
    "flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-[#FFF8E1] focus:bg-[#FFF8E1]";

  const menuButtonClass = cn(
    "h-9 w-9 min-h-[36px] min-w-[36px] border-2 border-black bg-white flex items-center justify-center shadow-[1px_1px_0_#000] transition-all duration-150 active:scale-95 hover:bg-[#FFF8E1] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1",
    isGrid ? "absolute right-2 top-2" : "ml-auto shrink-0",
    isGrid
      ? "opacity-0 pointer-events-none group-hover:opacity-100 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto"
      : "opacity-100 sm:opacity-0 sm:pointer-events-none sm:group-hover:opacity-100 sm:group-hover:pointer-events-auto",
    menuOpen && "opacity-100 pointer-events-auto",
  );

  const accentBorderStyle = { borderLeftColor: palette.border };

  return (
    <div
      className={cn("group relative", isGrid ? "" : "flex items-center gap-2")}
    >
      <button
        type="button"
        disabled={!hasAssets}
        onClick={() => {
          if (longPressTriggeredRef.current) {
            longPressTriggeredRef.current = false;
            return;
          }
          handleOpen();
        }}
        onPointerDown={handleLongPressStart}
        onPointerUp={handleLongPressCancel}
        onPointerCancel={handleLongPressCancel}
        onPointerMove={handleLongPressCancel}
        className={cn(
          "w-full border-2 border-black text-left shadow-[3px_3px_0_#000] transition-all duration-150 overflow-hidden active:scale-[0.98] motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
          hasAssets
            ? "bg-white"
            : "bg-neutral-100 opacity-70 cursor-not-allowed",
          hasAssets && "hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#000]",
          isGrid
            ? "flex flex-col border-l-4 p-3"
            : "flex-1 flex items-center gap-3 border-l-4 px-3 py-2",
        )}
        style={hasAssets ? accentBorderStyle : undefined}
      >
        {isGrid ? (
          <>
            <div className="flex items-start justify-between gap-2 min-w-0">
              <h3 className="text-[13px] font-black uppercase tracking-tight text-stone-900 line-clamp-2 leading-snug">
                {course.courseName || course.courseID}
              </h3>
              {isFavorite && (
                <Star
                  className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-500"
                  aria-label="Starred"
                />
              )}
            </div>
            <div className="mt-auto pt-2 flex items-center justify-between gap-2 min-w-0">
              <div className="flex items-center gap-1.5 min-w-0">
                <span
                  aria-hidden="true"
                  className={cn(
                    "h-2 w-2 shrink-0 border border-black",
                    palette.dot,
                  )}
                />
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500 truncate">
                  {course.courseID}
                </p>
              </div>
              {slotBadge && (
                <span className="shrink-0 border border-black bg-[#FFF8E1] px-1.5 py-px text-[8px] font-black uppercase leading-none">
                  {slotBadge}
                </span>
              )}
            </div>
            {!hasAssets && (
              <p className="mt-1.5 text-[9px] font-bold uppercase text-stone-400">
                Unavailable
              </p>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <span
                aria-hidden="true"
                className={cn(
                  "h-2.5 w-2.5 shrink-0 border border-black",
                  palette.dot,
                )}
              />
              <div className="min-w-0 flex-1">
                <h3 className="text-[13px] font-black uppercase tracking-tight text-stone-900 truncate leading-snug">
                  {course.courseName || course.courseID}
                </h3>
                <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">
                  {course.courseID}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {slotBadge && (
                <span className="border border-black bg-[#FFF8E1] px-1.5 py-px text-[8px] font-black uppercase leading-none">
                  {slotBadge}
                </span>
              )}
              {isFavorite && (
                <Star
                  className="h-3.5 w-3.5 fill-amber-400 text-amber-500"
                  aria-label="Starred"
                />
              )}
            </div>
          </>
        )}
      </button>
      <Menu open={menuOpen} onOpenChange={handleMenuOpenChange}>
        <Menu.Trigger asChild>
          <button
            type="button"
            aria-label="Open folder actions"
            onClick={(event) => event.stopPropagation()}
            className={menuButtonClass}
          >
            <MoreVertical className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </Menu.Trigger>
        <Menu.Content
          align="end"
          sideOffset={4}
          className="border-2 border-black bg-white shadow-[3px_3px_0_#000] min-w-[160px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
        >
          <Menu.Item
            className={cn(menuItemClass, !hasAssets && "opacity-50")}
            disabled={!hasAssets}
            onSelect={() => {
              if (!hasAssets) return;
              handleOpen();
            }}
          >
            <Folder className="h-3.5 w-3.5" aria-hidden="true" />
            Open folder
          </Menu.Item>
          <Menu.Item
            className={cn(menuItemClass, !resourceId && "opacity-50")}
            disabled={!resourceId}
            onSelect={() => {
              if (!resourceId) return;
              onToggleFavorite(resourceId);
            }}
          >
            <Star className="h-3.5 w-3.5" aria-hidden="true" />
            {isFavorite ? "Unstar" : "Star"}
          </Menu.Item>
        </Menu.Content>
      </Menu>
    </div>
  );
});

export default function ResourcesPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<ResourceTab>("academic");
  const [searchTerm, setSearchTerm] = useState("");
  const deferredSearchTerm = useDeferredValue(searchTerm);
  const trimmedDeferredSearch = deferredSearchTerm.trim();
  const hasSearchQuery = trimmedDeferredSearch.length > 0;
  const isSearchStale = deferredSearchTerm !== searchTerm;
  const [commandOpen, setCommandOpen] = useState(false);
  const [overflowOpen, setOverflowOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [activeView, setActiveView] = useState<
    "courses" | "recent" | "starred" | "offline" | "tagged"
  >("courses");
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const evictionRef = useRef(false);
  const isOnline = useOnlineStatus();

  const {
    loaded: prefsLoaded,
    favorites,
    tags,
    lastOpened,
    offlineFiles,
    cacheConfig,
    offlineStorageMode,
    departmentId,
    semesterId,
    toggleFavorite,
    markOpened,
    removeOfflineFiles,
    setOfflineFile,
    replaceOfflineFiles,
    updateOfflineStorageMode,
    updateDepartmentSemester,
  } = useStudyMaterialsPreferences(null);
  const cacheLimitMb = cacheConfig.limitMb ?? null;
  const offlineManager = useOfflineManager({
    loaded: prefsLoaded,
    offlineFiles,
    offlineStorageMode,
    cacheLimitMb,
    setOfflineFile,
    removeOfflineFiles,
    replaceOfflineFiles,
    updateOfflineStorageMode,
  });
  const hasSelection =
    Boolean(departmentId) &&
    typeof semesterId === "number" &&
    Number.isFinite(semesterId);

  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [draftDepartmentId, setDraftDepartmentId] = useState("");
  const [draftSemesterId, setDraftSemesterId] = useState<number | null>(null);

  const coursesQuery = useResourceCourses({ departmentId, semesterId });
  const courses = useMemo(() => coursesQuery.data ?? [], [coursesQuery.data]);
  const needsOnboarding = prefsLoaded && !hasSelection;
  const showOnboarding = needsOnboarding || (onboardingOpen && !hasSelection);
  const activeDepartmentId = showOnboarding
    ? draftDepartmentId ||
      (departmentId && departmentId.length > 0 ? departmentId : "")
    : departmentId && departmentId.length > 0
      ? departmentId
      : "";
  const departmentsQuery = useResourceFilters(null);
  const semestersQuery = useResourceFilters(
    activeDepartmentId.length > 0 ? activeDepartmentId : null,
  );
  const shouldSearch = hasSelection && trimmedDeferredSearch.length >= 2;
  const searchQuery = useQuery({
    queryKey: [
      "resources-search",
      departmentId ?? "",
      semesterId ?? null,
      trimmedDeferredSearch,
    ],
    enabled: shouldSearch,
    retry: false,
    queryFn: async ({ signal }) => {
      if (!departmentId || !hasSelection) {
        return { results: [], truncated: false };
      }
      const params = new URLSearchParams();
      params.set("q", trimmedDeferredSearch);
      params.set("departmentId", departmentId);
      params.set("semesterId", String(semesterId));
      const response = await fetch(
        `/api/resources/search?${params.toString()}`,
        { signal },
      );
      if (!response.ok) {
        throw new Error("Search failed");
      }
      const payload = (await response.json()) as {
        ok?: boolean;
        data?: { results?: CrossCourseResult[]; truncated?: boolean };
      };
      if (!payload?.ok || !payload.data?.results) {
        throw new Error("Invalid search response");
      }
      return {
        results: payload.data.results,
        truncated: Boolean(payload.data.truncated),
      };
    },
  });
  const syncStatus = useMemo(() => {
    if (!isOnline) return "Offline";
    if (!hasSelection) return "Select filters";
    if (coursesQuery.isFetching || coursesQuery.isLoading) {
      return "Updating";
    }
    return "Up to date";
  }, [coursesQuery.isFetching, coursesQuery.isLoading, hasSelection, isOnline]);
  const departments = useMemo(
    () => departmentsQuery.data?.departments ?? [],
    [departmentsQuery.data],
  );
  const semestersFromApi = useMemo(
    () => semestersQuery.data?.semesters ?? [],
    [semestersQuery.data],
  );
  const semesterOptions = useMemo(() => {
    if (!draftDepartmentId) return DEFAULT_SEMESTERS;
    return semestersFromApi.length > 0 ? semestersFromApi : DEFAULT_SEMESTERS;
  }, [draftDepartmentId, semestersFromApi]);
  const normalizedDraftSemesterId = useMemo(() => {
    if (!draftDepartmentId) return null;
    if (
      typeof draftSemesterId === "number" &&
      semesterOptions.includes(draftSemesterId)
    ) {
      return draftSemesterId;
    }
    return null;
  }, [draftDepartmentId, draftSemesterId, semesterOptions]);
  const canContinue =
    draftDepartmentId.length > 0 &&
    typeof normalizedDraftSemesterId === "number";
  const favoritesSet = useMemo(
    () => new Set(Object.keys(favorites)),
    [favorites],
  );
  const listVisibilityStyle = useMemo(
    () =>
      ({
        contentVisibility: "auto",
        containIntrinsicSize: "1px 520px",
      }) as React.CSSProperties,
    [],
  );
  const gridClass = useMemo(
    () => "grid gap-2.5 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
    [],
  );
  const rowClass = useMemo(() => "space-y-2", []);
  const courseSearchIndex = useMemo(() => {
    return new Map(
      courses.map((course) => [course.courseID, buildSearchKey(course)]),
    );
  }, [courses]);

  const courseResourceIds = useMemo(() => {
    const map = new Map<string, string>();
    courses.forEach((course) => {
      const folderId = course.syllabusAssets?.folderId ?? "";
      if (!folderId) return;
      map.set(
        course.courseID,
        buildResourceId({
          courseId: course.courseID,
          path: folderId,
          itemId: folderId,
        }),
      );
    });
    return map;
  }, [courses]);

  const handleOnboardingSubmit = useCallback(() => {
    if (!canContinue || !normalizedDraftSemesterId) return;
    updateDepartmentSemester(draftDepartmentId, normalizedDraftSemesterId);
    setOnboardingOpen(false);
  }, [
    canContinue,
    draftDepartmentId,
    normalizedDraftSemesterId,
    updateDepartmentSemester,
  ]);

  const handleOnboardingCancel = useCallback(() => {
    setDraftDepartmentId(departmentId ?? "");
    setDraftSemesterId(
      typeof semesterId === "number" && Number.isFinite(semesterId)
        ? semesterId
        : null,
    );
    setOnboardingOpen(false);
  }, [departmentId, semesterId]);

  const openOnboarding = useCallback(() => {
    setDraftDepartmentId(departmentId ?? "");
    setDraftSemesterId(
      typeof semesterId === "number" && Number.isFinite(semesterId)
        ? semesterId
        : null,
    );
    setOnboardingOpen(true);
  }, [departmentId, semesterId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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

  const effectiveSearchResults = shouldSearch
    ? (searchQuery.data?.results ?? [])
    : [];
  const effectiveSearchTruncated = shouldSearch
    ? Boolean(searchQuery.data?.truncated)
    : false;
  const effectiveSearchStatus = shouldSearch
    ? searchQuery.isError
      ? "error"
      : searchQuery.isLoading || searchQuery.isFetching
        ? "loading"
        : "ready"
    : "idle";

  const filteredCourses = useMemo(() => {
    const query = trimmedDeferredSearch.toLowerCase();
    if (!query) return courses;
    return courses.filter((course) => {
      const key =
        courseSearchIndex.get(course.courseID) ?? buildSearchKey(course);
      return key.includes(query);
    });
  }, [courses, courseSearchIndex, trimmedDeferredSearch]);

  const favoriteCourses = useMemo(
    () =>
      filteredCourses.filter((course) => {
        const resourceId = courseResourceIds.get(course.courseID);
        return resourceId ? favoritesSet.has(resourceId) : false;
      }),
    [filteredCourses, favoritesSet, courseResourceIds],
  );

  const taggedCourseIds = useMemo(() => {
    const ids = new Set<string>();
    Object.keys(tags).forEach((resourceId) => {
      const parsed = parseResourceId(resourceId);
      if (parsed?.courseId) {
        ids.add(parsed.courseId);
      }
    });
    return ids;
  }, [tags]);

  const taggedCourses = useMemo(() => {
    if (taggedCourseIds.size === 0) return [];
    return filteredCourses.filter((course) =>
      taggedCourseIds.has(course.courseID),
    );
  }, [filteredCourses, taggedCourseIds]);

  const recentCourses = useMemo(() => {
    const withDates = filteredCourses
      .map((course) => ({
        course,
        openedAt: (() => {
          const resourceId = courseResourceIds.get(course.courseID);
          return resourceId ? lastOpened[resourceId] : undefined;
        })(),
      }))
      .filter((entry) => Boolean(entry.openedAt)) as Array<{
      course: ResourceCourse;
      openedAt: string;
    }>;

    return withDates
      .sort(
        (a, b) =>
          new Date(b.openedAt).getTime() - new Date(a.openedAt).getTime(),
      )
      .map((entry) => entry.course);
  }, [filteredCourses, lastOpened, courseResourceIds]);

  const handleTabKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const currentIndex = TAB_ORDER.indexOf(activeTab);
    if (event.key === "ArrowRight") {
      event.preventDefault();
      const nextIndex = (currentIndex + 1) % TAB_ORDER.length;
      const nextTab = TAB_ORDER[nextIndex];
      if (nextTab) {
        setActiveTab(nextTab);
        tabRefs.current[nextIndex]?.focus();
      }
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      const nextIndex =
        (currentIndex - 1 + TAB_ORDER.length) % TAB_ORDER.length;
      const nextTab = TAB_ORDER[nextIndex];
      if (nextTab) {
        setActiveTab(nextTab);
        tabRefs.current[nextIndex]?.focus();
      }
    }
  };

  const handleOpenCourse = useCallback(
    (courseId: string) => {
      const resourceId = courseResourceIds.get(courseId);
      if (resourceId) markOpened(resourceId);
      router.push(`/course/${courseId}`);
    },
    [courseResourceIds, markOpened, router],
  );

  const handleOpenSearchResult = useCallback(
    (result: CrossCourseResult) => {
      if (typeof window === "undefined") return;
      const isFolderResult = result.item.mimeType === DRIVE_FOLDER_MIME;
      const pathIds = isFolderResult
        ? [...result.pathIds, result.item.id]
        : result.pathIds;
      const pathNames = isFolderResult
        ? [...result.pathNames, result.item.name]
        : result.pathNames;
      const path = pathIds.map((id, index) => ({
        id,
        name: pathNames[index] ?? id,
      }));
      window.sessionStorage.setItem(
        `resources.course.${result.courseId}.path`,
        JSON.stringify(path),
      );
      const target = isFolderResult
        ? `/course/${result.courseId}`
        : `/course/${result.courseId}?open=${result.item.id}`;
      router.push(target);
    },
    [router],
  );

  const handleToggleFavorite = useCallback(
    (resourceId: string) => {
      toggleFavorite(resourceId);
    },
    [toggleFavorite],
  );

  const commandItems = useMemo<CommandItem[]>(() => {
    const items: CommandItem[] = [
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
    ];

    courses.forEach((course) => {
      items.push({
        id: `course-${course.courseID}`,
        label: course.courseName || course.courseID,
        description: "Open course resources",
        group: "Courses",
        keywords: course.courseID,
        href: `/course/${course.courseID}`,
        onSelect: () => handleOpenCourse(course.courseID),
      });
    });

    return items;
  }, [courses, handleOpenCourse]);

  const offlineCourses = useMemo(() => {
    const offlineEntries = Object.values(offlineFiles);
    const courseIds = new Set(
      offlineEntries.map((entry) => entry.courseId).filter(Boolean) as string[],
    );
    if (courseIds.size === 0) return [];
    return filteredCourses.filter((course) => courseIds.has(course.courseID));
  }, [filteredCourses, offlineFiles]);

  const viewOptions = useMemo(
    () => [
      { id: "courses", label: "Courses", count: filteredCourses.length },
      { id: "recent", label: "Recent", count: recentCourses.length },
      { id: "starred", label: "Starred", count: favoriteCourses.length },
      { id: "offline", label: "Offline", count: offlineCourses.length },
      { id: "tagged", label: "Tagged", count: taggedCourses.length },
    ],
    [
      favoriteCourses.length,
      filteredCourses.length,
      offlineCourses.length,
      recentCourses.length,
      taggedCourses.length,
    ],
  );

  const activeCourses = useMemo(() => {
    switch (activeView) {
      case "recent":
        return recentCourses;
      case "starred":
        return favoriteCourses;
      case "offline":
        return offlineCourses;
      case "tagged":
        return taggedCourses;
      default:
        return filteredCourses;
    }
  }, [
    activeView,
    favoriteCourses,
    filteredCourses,
    offlineCourses,
    recentCourses,
    taggedCourses,
  ]);
  const activeVariant = activeView === "courses" ? "grid" : "row";
  const activeEmptyState = useMemo(() => {
    switch (activeView) {
      case "recent":
        return "Open a folder to see it here.";
      case "starred":
        return "Star a folder to keep it here.";
      case "offline":
        return "Save a file to see its course here.";
      case "tagged":
        return "Add a tag to see related courses here.";
      default:
        return "No courses match your search.";
    }
  }, [activeView]);

  useEffect(() => {
    if (cacheLimitMb === null || !Number.isFinite(cacheLimitMb)) return;
    if (cacheLimitMb <= 0) return;
    if (evictionRef.current) return;
    evictionRef.current = true;
    const evict = async () => {
      await offlineManager.enforceCacheLimit(cacheLimitMb);
      evictionRef.current = false;
    };
    void evict();
  }, [cacheLimitMb, offlineManager]);

  const getCourseResourceId = useCallback(
    (course: ResourceCourse) => {
      return courseResourceIds.get(course.courseID) ?? null;
    },
    [courseResourceIds],
  );

  return (
    <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
      <DotPatternBackground />

      <div className="mx-auto max-w-5xl relative z-10">
        <header className="bg-white border-b-2 border-black px-3 py-2.5 sm:px-5 shadow-neo-sm">
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-base sm:text-lg font-black uppercase text-stone-900 tracking-tight shrink-0">
              Materials
            </h1>

            {/* Inline search */}
            <div className="flex-1 flex items-center gap-2 border-2 border-black bg-white px-2.5 py-1.5 shadow-[2px_2px_0_#000] min-w-0">
              <Search
                className="h-4 w-4 text-stone-400 shrink-0"
                aria-hidden="true"
              />
              <label className="sr-only" htmlFor="studyrix-course-search">
                Search courses or files
              </label>
              <input
                id="studyrix-course-search"
                type="search"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search courses…"
                aria-label="Search courses or files"
                name="resources-search"
                autoComplete="off"
                className="flex-1 bg-transparent text-[13px] font-bold placeholder:text-stone-400 focus-visible:outline-none min-w-0"
                ref={searchInputRef}
              />
              {searchTerm.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchTerm("");
                    searchInputRef.current?.focus();
                  }}
                  aria-label="Clear search"
                  className="h-6 w-6 flex items-center justify-center transition-all duration-100 active:scale-90"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
              {isSearchStale && (
                <span
                  className="text-[9px] font-black uppercase text-stone-400 shrink-0"
                  role="status"
                  aria-live="polite"
                >
                  …
                </span>
              )}
            </div>

            {/* Menu button */}
            <Menu open={overflowOpen} onOpenChange={setOverflowOpen}>
              <Menu.Trigger asChild>
                <button
                  type="button"
                  aria-label="Open menu"
                  className="h-9 w-9 min-h-[36px] min-w-[36px] border-2 border-black bg-white flex items-center justify-center shadow-[2px_2px_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] hover:bg-[#FFF8E1] active:translate-y-0 active:shadow-[1px_1px_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
                >
                  <MoreVertical className="h-4 w-4" aria-hidden="true" />
                </button>
              </Menu.Trigger>
              <Menu.Content
                align="end"
                sideOffset={6}
                className="border-2 border-black bg-white shadow-[3px_3px_0_#000] min-w-[180px] max-w-[calc(100vw-2rem)] max-h-[min(60svh,320px)] overflow-y-auto"
              >
                <div className="px-3 py-1.5 text-[9px] font-black uppercase text-stone-400 border-b border-stone-200">
                  {syncStatus}
                </div>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-[#FFF8E1] focus:bg-[#FFF8E1]"
                  onSelect={() => router.push("/offline")}
                >
                  Saved Materials
                </Menu.Item>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-[#FFF8E1] focus:bg-[#FFF8E1]"
                  onSelect={() => router.push("/downloads")}
                >
                  Downloads
                </Menu.Item>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-[#FFF8E1] focus:bg-[#FFF8E1]"
                  onSelect={() => setCommandOpen(true)}
                >
                  Quick Search
                </Menu.Item>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-[#FFF8E1] focus:bg-[#FFF8E1]"
                  onSelect={() => setShortcutsOpen(true)}
                >
                  Shortcuts
                </Menu.Item>
                <Menu.Item
                  className="flex items-center gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-[#FFF8E1] focus:bg-[#FFF8E1]"
                  onSelect={() => router.push("/settings")}
                >
                  Settings
                </Menu.Item>
              </Menu.Content>
            </Menu>
          </div>
        </header>

        {hasSearchQuery && (
          <section className="bg-white border-b-2 border-black px-3 py-3 sm:px-5 shadow-neo-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h2 className="text-[11px] font-black uppercase tracking-wide text-stone-500">
                Search Results
              </h2>
              {effectiveSearchTruncated && (
                <span className="border border-black bg-[#FFF8E1] px-1.5 py-0.5 text-[8px] font-black uppercase">
                  Capped
                </span>
              )}
            </div>

            {!shouldSearch ? (
              <div className="border-2 border-black bg-neutral-50 px-3 py-2.5 text-[11px] font-bold uppercase text-stone-500 shadow-neo-xs">
                Type at least 2 characters to search.
              </div>
            ) : effectiveSearchStatus === "loading" ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, index) => (
                  <RetroSkeleton key={index} className="h-12 w-full" />
                ))}
              </div>
            ) : effectiveSearchStatus === "error" ? (
              <div className="border-2 border-black bg-red-50 p-3 shadow-neo-xs">
                <p className="text-[11px] font-bold uppercase text-red-600">
                  Unable to search. Please try again.
                </p>
              </div>
            ) : effectiveSearchResults.length === 0 ? (
              <div className="border-2 border-black bg-white p-3 shadow-neo-xs">
                <p className="text-[11px] font-bold uppercase text-neutral-600">
                  No materials match your search.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {effectiveSearchResults.map((result) => {
                  const Icon = getSearchIcon(result.item.mimeType);
                  const isFolderResult =
                    result.item.mimeType === DRIVE_FOLDER_MIME;
                  const courseLabel =
                    result.courseName || result.courseId || "Course";
                  const pathLabel =
                    result.pathNames.length > 1
                      ? result.pathNames.slice(1).join(" / ")
                      : "Root";
                  return (
                    <div
                      key={result.resourceId}
                      className="group w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-2 border-black px-3 py-2.5 text-left shadow-[2px_2px_0_#000] transition-all duration-150 bg-white even:bg-[#FFFCF3] hover:bg-[#FFF8E1]/40 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000]"
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenSearchResult(result)}
                        className="flex flex-1 min-w-0 items-center gap-2.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      >
                        <span className="flex h-8 w-8 items-center justify-center border-2 border-black bg-white shadow-[1px_1px_0_#000] shrink-0">
                          <Icon className="h-4 w-4" aria-hidden="true" />
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-black uppercase text-stone-900 truncate leading-snug">
                            {result.item.name}
                          </p>
                          <p className="text-[10px] font-bold uppercase text-stone-500/80">
                            {courseLabel} • {pathLabel} •{" "}
                            {isFolderResult ? "Folder" : "File"}
                          </p>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {activeTab === "academic" ? (
          <section className="bg-white border-b-2 border-black px-3 py-4 sm:px-5 shadow-neo-xs">
            {coursesQuery.isError ? (
              <div className="border-2 border-black bg-red-50 p-4 shadow-neo-sm">
                <p className="text-[13px] font-bold text-red-600">
                  Unable to load resources. Please try again.
                </p>
                <div className="mt-3">
                  <OfflineFallbackButton />
                </div>
              </div>
            ) : coursesQuery.isLoading ? (
              <div className={gridClass}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <RetroSkeleton key={index} className="w-full h-24" />
                ))}
              </div>
            ) : !prefsLoaded ? (
              <div className={gridClass}>
                {Array.from({ length: 6 }).map((_, index) => (
                  <RetroSkeleton key={index} className="w-full h-24" />
                ))}
              </div>
            ) : !hasSelection ? (
              <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]">
                <p className="text-sm font-bold text-neutral-600">
                  Select your department and semester to see available study
                  materials. This only filters content on this device.
                </p>
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={openOnboarding}
                    className="inline-flex items-center gap-2 border-2 border-black bg-[#FFD700] px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Choose Department & Semester
                  </button>
                </div>
              </div>
            ) : filteredCourses.length === 0 ? (
              <div className="border-2 border-black bg-white p-6 shadow-[4px_4px_0px_0px_#000]">
                <p className="text-sm font-bold text-neutral-600">
                  {searchTerm
                    ? "No courses match your search."
                    : `No courses found for ${departmentId ?? "this department"} Semester ${semesterId ?? ""}. Try another semester or department.`}
                </p>
                {!searchTerm && (
                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={openOnboarding}
                      className="inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                    >
                      Change Department / Semester
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center">
                  <ViewSwitcher
                    views={viewOptions}
                    activeId={activeView}
                    onChange={(next) =>
                      setActiveView(
                        next as
                          | "courses"
                          | "recent"
                          | "starred"
                          | "offline"
                          | "tagged",
                      )
                    }
                    label="Views"
                  />
                </div>
                {activeView !== "courses" && activeCourses.length === 0 ? (
                  <p className="text-xs font-bold uppercase text-stone-500">
                    {activeEmptyState}
                  </p>
                ) : (
                  <div
                    className={activeVariant === "grid" ? gridClass : rowClass}
                    style={listVisibilityStyle}
                  >
                    {activeCourses.map((course) => {
                      const resourceId = getCourseResourceId(course);
                      return (
                        <ResourceFolderCard
                          key={course.courseID}
                          course={course}
                          resourceId={resourceId}
                          isFavorite={
                            resourceId ? favoritesSet.has(resourceId) : false
                          }
                          onOpenCourse={handleOpenCourse}
                          onToggleFavorite={handleToggleFavorite}
                          variant={activeVariant}
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </section>
        ) : (
          <section className="bg-white border-b-2 border-black px-3 py-4 sm:px-5 shadow-neo-xs">
            <div className="border-2 border-dashed border-black bg-neutral-50 p-4 text-center">
              <p className="text-[13px] font-bold uppercase text-stone-600">
                Coming soon
              </p>
            </div>
          </section>
        )}
      </div>

      <StudyrixFooter />
      <CommandCenter
        open={commandOpen}
        onOpenChange={setCommandOpen}
        items={commandItems}
        placeholder="Search courses… e.g. math"
        emptyLabel="No matching courses."
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
      {showOnboarding && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end sm:items-center justify-center"
          role="dialog"
          aria-modal="true"
          aria-label="Department and semester selection"
        >
          <div className="w-full h-svh sm:h-auto sm:max-h-[90vh] sm:max-w-lg bg-white border-4 border-black shadow-neo-xl flex flex-col">
            <div className="border-b-4 border-black bg-[#FFD700] px-4 py-3">
              <h2 className="text-lg sm:text-xl font-black uppercase">
                Department & Semester
              </h2>
              <p className="text-[11px] font-bold uppercase text-stone-700">
                Choose to filter study materials
              </p>
            </div>
            <div className="p-4 space-y-3 overflow-y-auto">
              <div className="space-y-2">
                <label
                  className="text-[11px] font-black uppercase text-stone-600"
                  htmlFor="onboarding-department"
                >
                  Department
                </label>
                <select
                  id="onboarding-department"
                  value={draftDepartmentId}
                  onChange={(event) => {
                    setDraftDepartmentId(event.target.value);
                    setDraftSemesterId(null);
                  }}
                  disabled={
                    departmentsQuery.isLoading || departments.length === 0
                  }
                  name="department"
                  className="w-full h-10 border-2 border-black bg-white px-3 text-[13px] font-black uppercase shadow-neo-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <option value="" disabled>
                    {departmentsQuery.isLoading
                      ? "Loading departments…"
                      : "Choose a department"}
                  </option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
                {departmentsQuery.isError && (
                  <p className="text-[11px] font-bold uppercase text-red-600">
                    Unable to load departments.
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label
                  className="text-[11px] font-black uppercase text-stone-600"
                  htmlFor="onboarding-semester"
                >
                  Semester
                </label>
                <select
                  id="onboarding-semester"
                  value={normalizedDraftSemesterId ?? ""}
                  onChange={(event) => {
                    const value = Number(event.target.value);
                    setDraftSemesterId(Number.isFinite(value) ? value : null);
                  }}
                  disabled={!draftDepartmentId}
                  name="semester"
                  className="w-full h-10 border-2 border-black bg-white px-3 text-[13px] font-black uppercase shadow-neo-xs focus:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:opacity-60"
                >
                  <option value="" disabled>
                    {draftDepartmentId
                      ? "Choose a semester"
                      : "Select a department first"}
                  </option>
                  {semesterOptions.map((semester) => (
                    <option key={semester} value={semester}>
                      Semester {semester}
                    </option>
                  ))}
                </select>
                {!draftDepartmentId && (
                  <p className="text-[11px] font-bold uppercase text-stone-500">
                    Semester options unlock after selecting a department.
                  </p>
                )}
              </div>
            </div>
            <div className="border-t-4 border-black bg-stone-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2.5">
              {!needsOnboarding && (
                <button
                  type="button"
                  onClick={handleOnboardingCancel}
                  className="inline-flex items-center justify-center gap-2 border-2 border-black bg-white px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  Cancel
                </button>
              )}
              <button
                type="button"
                onClick={handleOnboardingSubmit}
                disabled={!canContinue}
                className="inline-flex items-center justify-center gap-2 border-2 border-black bg-[#FFD700] px-4 py-2 text-[11px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 disabled:opacity-60 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
