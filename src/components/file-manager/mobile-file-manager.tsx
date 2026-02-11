"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  EllipsisVertical,
  FolderCog,
  HardDriveDownload,
  Search,
  Settings,
  Tag,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { getFileVisual } from "@/components/file-manager/file-type";
import { useFileManagerActions, useFileManagerBrowseState, useFileManagerLocalState } from "@/hooks/useFileManager";
import { useResourceCourses, useResourceFilters } from "@/hooks/useResources";
import { resetFileManagerDeviceAccess, type ViewMode } from "@/lib/file-manager/store";
import type { FileNode } from "@/types/resources";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

const DEFAULT_TAG_COLOR = "#3B82F6";
const DEFAULT_EDIT_TAG_COLOR = "#F97316";

type MobileFileManagerProps = {
  initialTab?: ViewMode;
  initialCourseId?: string | null;
};

type ScopeState = {
  departmentId: string;
  semesterId: string;
  courseId: string;
};

const STORAGE_SCOPE_KEY = "studyrix:scope";

function formatSize(size?: number) {
  if (!Number.isFinite(size) || !size) return "--";
  const units = ["B", "KB", "MB", "GB"];
  let current = size;
  let unitIndex = 0;
  while (current >= 1024 && unitIndex < units.length - 1) {
    current /= 1024;
    unitIndex += 1;
  }
  const precision = current >= 10 || unitIndex === 0 ? 0 : 1;
  return `${current.toFixed(precision)} ${units[unitIndex]}`;
}

function formatDate(value?: string) {
  if (!value) return "--";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "--";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(parsed);
}

function formatStorageUsage(totalBytes: number) {
  if (totalBytes <= 0) return "0 B";
  return formatSize(totalBytes);
}

function buildNavItems() {
  return [
    { href: "/resources", label: "Browse", id: "browse" as const },
    { href: "/resources/offline", label: "Offline", id: "offline" as const },
    { href: "/resources/tags", label: "Tags", id: "tags" as const },
    { href: "/resources/settings", label: "Settings", id: "settings" as const },
  ];
}

function normalizeScope(raw: Partial<ScopeState> | null) {
  return {
    departmentId: typeof raw?.departmentId === "string" ? raw.departmentId : "",
    semesterId: typeof raw?.semesterId === "string" ? raw.semesterId : "",
    courseId: typeof raw?.courseId === "string" ? raw.courseId : "",
  };
}

function getInitialScope(initialCourseId: string | null): ScopeState {
  if (typeof window === "undefined") {
    return { departmentId: "", semesterId: "", courseId: initialCourseId ?? "" };
  }

  const stored = window.localStorage.getItem(STORAGE_SCOPE_KEY);
  if (!stored) {
    return { departmentId: "", semesterId: "", courseId: initialCourseId ?? "" };
  }

  try {
    const parsed = normalizeScope(JSON.parse(stored) as Partial<ScopeState>);
    return {
      departmentId: parsed.departmentId,
      semesterId: parsed.semesterId,
      courseId: parsed.courseId || initialCourseId || "",
    };
  } catch {
    return { departmentId: "", semesterId: "", courseId: initialCourseId ?? "" };
  }
}

function CompactTag({ name, color }: { name: string; color: string }) {
  return (
    <span
      className="inline-flex max-w-[110px] items-center truncate rounded-full px-2 py-0.5 text-[10px] font-medium"
      style={{
        backgroundColor: `${color}1F`,
        color,
      }}
      title={name}
    >
      {name}
    </span>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-8 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-muted-foreground mt-1 text-xs">{body}</p>
    </div>
  );
}

export function MobileFileManager({ initialTab = "browse", initialCourseId = null }: MobileFileManagerProps) {
  const {
    currentFolder,
    folderStack,
    driveFiles,
    searchQuery,
    debouncedSearchQuery,
    selectedTagId,
    isLoading,
    error,
    rootFolderId,
  } = useFileManagerBrowseState();
  const {
    tags,
    fileTags,
    offlineFiles,
    storageMode,
    canUseDeviceStorage,
    deviceStorageReady,
    viewMode,
  } = useFileManagerLocalState();
  const {
    initialize,
    setViewMode,
    setSearchQuery,
    setTagFilter,
    setRootFolder,
    openFolder,
    goBack,
    navigateToStackIndex,
    refreshCurrentFolder,
    createTag,
    editTag,
    deleteTag,
    toggleTagForFile,
    setStorageMode,
    saveFileOffline,
    removeOfflineEntry,
    clearOfflineEntries,
    openFile,
    downloadFile,
  } = useFileManagerActions();

  const [scope, setScope] = useState<ScopeState>(() => getInitialScope(initialCourseId));
  const [searchVisible, setSearchVisible] = useState(false);
  const [scopeSheetOpen, setScopeSheetOpen] = useState(false);
  const [tagSheetFileId, setTagSheetFileId] = useState<string | null>(null);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState(DEFAULT_TAG_COLOR);
  const [editTagId, setEditTagId] = useState<string | null>(null);
  const [editTagName, setEditTagName] = useState("");
  const [editTagColor, setEditTagColor] = useState(DEFAULT_EDIT_TAG_COLOR);

  const filtersQuery = useResourceFilters(null);
  const semestersQuery = useResourceFilters(scope.departmentId || null);
  const coursesQuery = useResourceCourses({
    departmentId: scope.departmentId || null,
    semesterId: scope.semesterId ? Number(scope.semesterId) : null,
  });

  const selectedCourse = useMemo(() => {
    return coursesQuery.data?.find((course) => course.courseID === scope.courseId) ?? null;
  }, [coursesQuery.data, scope.courseId]);

  const tagById = useMemo(() => {
    return new Map(tags.map((tag) => [tag.id, tag]));
  }, [tags]);

  const tagUsageCount = useMemo(() => {
    const usage = new Map<string, number>();
    for (const tagIds of Object.values(fileTags)) {
      for (const tagId of tagIds) {
        usage.set(tagId, (usage.get(tagId) ?? 0) + 1);
      }
    }
    return usage;
  }, [fileTags]);

  const sortedDriveFiles = useMemo(() => {
    const query = debouncedSearchQuery.trim().toLowerCase();

    const filtered = driveFiles.filter((node) => {
      if (selectedTagId) {
        const tagIds = fileTags[node.id] ?? [];
        if (!tagIds.includes(selectedTagId)) return false;
      }

      if (!query) return true;
      return node.name.toLowerCase().includes(query);
    });

    return [...filtered].sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === "folder" ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  }, [debouncedSearchQuery, driveFiles, fileTags, selectedTagId]);

  const offlineList = useMemo(() => {
    return Object.values(offlineFiles).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  }, [offlineFiles]);

  const offlineBytes = useMemo(() => {
    return offlineList.reduce((sum, entry) => sum + (Number(entry.size) || 0), 0);
  }, [offlineList]);

  const activeTagFile = useMemo(() => {
    if (!tagSheetFileId) return null;
    return driveFiles.find((node) => node.id === tagSheetFileId) ?? null;
  }, [driveFiles, tagSheetFileId]);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    setViewMode(initialTab);
  }, [initialTab, setViewMode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(STORAGE_SCOPE_KEY, JSON.stringify(scope));
  }, [scope]);

  useEffect(() => {
    const folderId = selectedCourse?.syllabusAssets?.folderId;
    if (!folderId) return;
    if (folderId === rootFolderId) return;

    void setRootFolder(folderId, selectedCourse.courseName ?? selectedCourse.courseID);
  }, [rootFolderId, selectedCourse, setRootFolder]);

  const pageTitle = useMemo(() => {
    if (viewMode === "offline") return "Offline";
    if (viewMode === "tags") return "Tags";
    if (viewMode === "settings") return "Settings";
    return currentFolder?.name ?? selectedCourse?.courseName ?? "Browse";
  }, [currentFolder?.name, selectedCourse?.courseName, viewMode]);

  const showBack = viewMode === "browse" && folderStack.length > 1;

  const navItems = useMemo(() => buildNavItems(), []);

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-[430px] border-x border-border/50 bg-background pb-24">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
          <div className="flex h-14 items-center px-4">
            <div className="w-10">
              {showBack ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    void goBack();
                  }}
                  aria-label="Go back"
                >
                  <ArrowLeft className="size-4" />
                </Button>
              ) : null}
            </div>

            <p className="flex-1 truncate text-center text-sm font-medium">{pageTitle}</p>

            <div className="flex w-20 items-center justify-end gap-1">
              {viewMode === "browse" ? (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSearchVisible((prev) => !prev)}
                  aria-label="Search"
                >
                  <Search className="size-4" />
                </Button>
              ) : null}

              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="More options" />}>
                  <EllipsisVertical className="size-4" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setScopeSheetOpen(true)}>
                    <FolderCog className="size-4" />
                    Choose course
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => {
                      void refreshCurrentFolder();
                    }}
                    disabled={viewMode !== "browse"}
                  >
                    <HardDriveDownload className="size-4" />
                    Refresh folder
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => {
                      void setStorageMode(storageMode === "web" ? "device" : "web");
                    }}
                  >
                    <Settings className="size-4" />
                    Storage: {storageMode === "web" ? "Web" : "Device"}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {viewMode === "browse" && searchVisible ? (
            <div className="px-4 pb-3">
              <Input
                placeholder="Search files"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-9"
              />
            </div>
          ) : null}

          {viewMode === "browse" && folderStack.length > 0 ? (
            <div className="overflow-x-auto px-4 pb-2">
              <div className="flex min-w-max items-center gap-1">
                {folderStack.map((segment, index) => (
                  <Button
                    key={segment.id}
                    variant={index === folderStack.length - 1 ? "secondary" : "ghost"}
                    size="xs"
                    onClick={() => {
                      void navigateToStackIndex(index);
                    }}
                    className="h-6 max-w-[150px] truncate"
                    title={segment.name}
                  >
                    {index === 0 ? "Root" : segment.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : null}
        </header>

        {viewMode === "browse" ? (
          <section className="space-y-1 py-2">
            {tags.length > 0 ? (
              <div className="overflow-x-auto px-4 pb-1">
                <div className="flex min-w-max items-center gap-1">
                  <Button
                    variant={selectedTagId ? "outline" : "secondary"}
                    size="xs"
                    onClick={() => setTagFilter(null)}
                  >
                    All
                  </Button>
                  {tags.map((tagItem) => (
                    <Button
                      key={tagItem.id}
                      variant={selectedTagId === tagItem.id ? "secondary" : "outline"}
                      size="xs"
                      onClick={() => setTagFilter(selectedTagId === tagItem.id ? null : tagItem.id)}
                      style={{
                        borderColor: selectedTagId === tagItem.id ? tagItem.color : undefined,
                        color: selectedTagId === tagItem.id ? tagItem.color : undefined,
                      }}
                    >
                      {tagItem.name}
                    </Button>
                  ))}
                </div>
              </div>
            ) : null}

            {!selectedCourse ? (
              <EmptyState
                title="Choose a course"
                body="Open menu > Choose course to load Drive files."
              />
            ) : isLoading ? (
              <EmptyState title="Loading files" body="Fetching folder contents..." />
            ) : error ? (
              <EmptyState title="Unable to load files" body={error} />
            ) : sortedDriveFiles.length === 0 ? (
              <EmptyState title="No files" body="No items found for this folder or filter." />
            ) : (
              <ul>
                {sortedDriveFiles.map((node) => {
                  const visual = getFileVisual(node);
                  const nodeTagIds = fileTags[node.id] ?? [];
                  const nodeTags = nodeTagIds
                    .map((tagId) => tagById.get(tagId))
                    .filter((tag): tag is NonNullable<typeof tag> => Boolean(tag));
                  const isOffline = Boolean(offlineFiles[node.id]);

                  return (
                    <li key={node.id} className="px-4 py-1">
                      <div
                        className={cn(
                          "flex min-h-[66px] items-center gap-3 rounded-lg border border-border/70 bg-background px-3 py-3 transition-colors",
                          visual.rowHoverClass,
                        )}
                      >
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() => {
                            if (node.type === "folder") {
                              void openFolder(node);
                              return;
                            }
                            void openFile(node);
                          }}
                        >
                          <span className={cn("inline-flex size-9 items-center justify-center rounded-md", visual.wrapperClass)}>
                            <visual.Icon className={cn("size-4", visual.iconClass)} />
                          </span>

                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-1.5">
                              <span className="truncate text-sm font-medium">{node.name}</span>
                              {isOffline ? (
                                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                                  Offline
                                </span>
                              ) : null}
                            </span>

                            {nodeTags.length > 0 ? (
                              <span className="mt-1 flex flex-wrap items-center gap-1">
                                {nodeTags.map((tagItem) => (
                                  <CompactTag key={`${node.id}-${tagItem.id}`} name={tagItem.name} color={tagItem.color} />
                                ))}
                              </span>
                            ) : null}

                            <span className="text-muted-foreground mt-1 block text-[11px]">
                              {node.type === "folder" ? "Folder" : formatSize(node.size)} · {formatDate(node.modifiedTime)}
                            </span>
                          </span>
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="File options" />}>
                            <EllipsisVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                setTagSheetFileId(node.id);
                              }}
                            >
                              <Tag className="size-4" />
                              Add tags
                            </DropdownMenuItem>

                            {node.type === "file" ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  void downloadFile(node);
                                }}
                              >
                                <HardDriveDownload className="size-4" />
                                Download
                              </DropdownMenuItem>
                            ) : null}

                            {node.type === "file" && !isOffline ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  void saveFileOffline(node).then((result) => {
                                    if (result.ok) {
                                      toast.message("Saved for offline use");
                                    } else {
                                      toast.error(result.error ?? "Unable to save offline");
                                    }
                                  });
                                }}
                              >
                                <WifiOff className="size-4" />
                                Save offline
                              </DropdownMenuItem>
                            ) : null}

                            {node.type === "file" && isOffline ? (
                              <DropdownMenuItem
                                onClick={() => {
                                  void removeOfflineEntry(node.id);
                                  toast.message("Removed from offline");
                                }}
                              >
                                <WifiOff className="size-4" />
                                Remove offline
                              </DropdownMenuItem>
                            ) : null}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {viewMode === "offline" ? (
          <section className="space-y-2 py-2">
            <div className="px-4 py-2">
              <p className="text-xs text-muted-foreground">Storage used: {formatStorageUsage(offlineBytes)}</p>
              <Button
                size="sm"
                variant="outline"
                className="mt-2"
                disabled={offlineList.length === 0}
                onClick={() => {
                  void clearOfflineEntries();
                  toast.message("Offline storage cleared");
                }}
              >
                Clear all
              </Button>
            </div>

            {offlineList.length === 0 ? (
              <EmptyState title="No offline files" body="Save files offline from Browse." />
            ) : (
              <ul>
                {offlineList.map((entry) => {
                  const node: FileNode = {
                    id: entry.driveFileId,
                    name: entry.name,
                    type: "file",
                    size: entry.size,
                    modifiedTime: entry.savedAt,
                    mimeType: entry.mimeType,
                    tags: [],
                  };
                  const visual = getFileVisual(node);
                  return (
                    <li key={entry.driveFileId} className="px-4 py-1">
                      <div className="flex min-h-[66px] items-center gap-3 rounded-lg border border-border/70 px-3 py-3">
                        <button
                          type="button"
                          className="flex min-w-0 flex-1 items-center gap-3 text-left"
                          onClick={() => {
                            void openFile(node);
                          }}
                        >
                          <span className={cn("inline-flex size-9 items-center justify-center rounded-md", visual.wrapperClass)}>
                            <visual.Icon className={cn("size-4", visual.iconClass)} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="truncate text-sm font-medium">{entry.name}</span>
                            <span className="text-muted-foreground mt-1 block text-[11px]">
                              {formatSize(entry.size)} · saved {formatDate(entry.savedAt)}
                            </span>
                          </span>
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Offline actions" />}>
                            <EllipsisVertical className="size-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => {
                                void removeOfflineEntry(entry.driveFileId);
                                toast.message("Removed offline file");
                              }}
                            >
                              Remove
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        ) : null}

        {viewMode === "tags" ? (
          <section className="space-y-3 px-4 py-3">
            <div className="space-y-2 rounded-lg border p-3">
              <Label htmlFor="new-tag-name">Create Tag</Label>
              <div className="flex items-center gap-2">
                <Input
                  id="new-tag-name"
                  value={newTagName}
                  onChange={(event) => setNewTagName(event.target.value)}
                  placeholder="Tag name"
                  className="h-9"
                />
                <Input
                  type="color"
                  value={newTagColor}
                  onChange={(event) => setNewTagColor(event.target.value)}
                  className="h-9 w-11 p-1"
                  aria-label="Choose tag color"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    void createTag(newTagName, newTagColor).then((created) => {
                      if (!created) return;
                      setNewTagName("");
                      toast.message("Tag created");
                    });
                  }}
                >
                  Add
                </Button>
              </div>
            </div>

            {tags.length === 0 ? (
              <EmptyState title="No tags" body="Create tags to organize files." />
            ) : (
              <ul className="space-y-1">
                {tags.map((tagItem) => (
                  <li key={tagItem.id} className="rounded-lg border px-3 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="size-2.5 rounded-full" style={{ backgroundColor: tagItem.color }} />
                          <p className="truncate text-sm font-medium">{tagItem.name}</p>
                        </div>
                        <p className="text-muted-foreground mt-1 text-[11px]">
                          Used on {tagUsageCount.get(tagItem.id) ?? 0} files
                        </p>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            setEditTagId(tagItem.id);
                            setEditTagName(tagItem.name);
                            setEditTagColor(tagItem.color);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="xs"
                          onClick={() => {
                            void deleteTag(tagItem.id);
                            toast.message("Tag deleted");
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ) : null}

        {viewMode === "settings" ? (
          <section className="space-y-3 px-4 py-3">
            <div className="space-y-2 rounded-lg border p-3">
              <Label htmlFor="storage-mode">Storage mode</Label>
              <Select
                value={storageMode}
                onValueChange={(value) => {
                  if (value !== "web" && value !== "device") return;
                  void setStorageMode(value);
                }}
              >
                <SelectTrigger id="storage-mode" className="h-9 w-full">
                  <SelectValue placeholder="Select storage mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="web">Web Storage</SelectItem>
                  <SelectItem value="device">Device Folder</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-muted-foreground text-[11px]">
                {canUseDeviceStorage
                  ? deviceStorageReady
                    ? "Device folder connected."
                    : "Device mode available. Folder permission is required."
                  : "Device folder mode is not supported in this browser."}
              </p>
            </div>

            <div className="space-y-2 rounded-lg border p-3">
              <p className="text-sm font-medium">Device folder controls</p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void setStorageMode("device");
                  }}
                  disabled={!canUseDeviceStorage}
                >
                  Reconnect folder
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void resetFileManagerDeviceAccess().then(() => {
                      toast.message("Folder access cleared");
                    });
                  }}
                >
                  Clear folder access
                </Button>
              </div>
            </div>
          </section>
        ) : null}

        <nav className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur">
          <div className="mx-auto grid h-16 w-full max-w-[430px] grid-cols-4 gap-1 px-3 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1">
            {navItems.map((item) => {
              const active = item.id === viewMode;
              return (
                <Link
                  key={item.id}
                  href={item.href}
                  className={cn(
                    "flex items-center justify-center rounded-md text-xs font-medium",
                    active ? "bg-secondary text-foreground" : "text-muted-foreground",
                  )}
                  onClick={() => setViewMode(item.id)}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </nav>

        <Sheet open={scopeSheetOpen || !selectedCourse} onOpenChange={setScopeSheetOpen}>
          <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto px-4 pb-6 pt-3">
            <SheetHeader className="px-0 py-0">
              <SheetTitle>Choose Course Folder</SheetTitle>
              <SheetDescription>Department, semester, and course decide your Drive root folder.</SheetDescription>
            </SheetHeader>

            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="department">Department</Label>
                <Select
                  value={scope.departmentId || "none"}
                  onValueChange={(value) => {
                    if (!value || value === "none") {
                      setScope({ departmentId: "", semesterId: "", courseId: "" });
                      return;
                    }
                    setScope({ departmentId: value, semesterId: "", courseId: "" });
                  }}
                >
                  <SelectTrigger id="department" className="h-9 w-full">
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select department</SelectItem>
                    {(filtersQuery.data?.departments ?? []).map((department) => (
                      <SelectItem key={department} value={department}>
                        {department}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="semester">Semester</Label>
                <Select
                  value={scope.semesterId || "none"}
                  onValueChange={(value) => {
                    if (!value || value === "none") {
                      setScope((previous) => ({ ...previous, semesterId: "", courseId: "" }));
                      return;
                    }
                    setScope((previous) => ({ ...previous, semesterId: value, courseId: "" }));
                  }}
                >
                  <SelectTrigger id="semester" className="h-9 w-full" disabled={!scope.departmentId}>
                    <SelectValue placeholder="Select semester" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select semester</SelectItem>
                    {(semestersQuery.data?.semesters ?? []).map((semester) => (
                      <SelectItem key={semester} value={String(semester)}>
                        Semester {semester}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="course">Course</Label>
                <Select
                  value={scope.courseId || "none"}
                  onValueChange={(value) => {
                    if (!value || value === "none") {
                      setScope((previous) => ({ ...previous, courseId: "" }));
                      return;
                    }
                    setScope((previous) => ({ ...previous, courseId: value }));
                    setScopeSheetOpen(false);
                  }}
                >
                  <SelectTrigger id="course" className="h-9 w-full" disabled={!scope.semesterId || coursesQuery.isLoading}>
                    <SelectValue placeholder="Select course" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Select course</SelectItem>
                    {(coursesQuery.data ?? []).map((course) => (
                      <SelectItem key={course.courseID} value={course.courseID}>
                        {course.courseName ?? course.courseID}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </SheetContent>
        </Sheet>

        <Sheet open={Boolean(tagSheetFileId)} onOpenChange={(open) => !open && setTagSheetFileId(null)}>
          <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto px-4 pb-6 pt-3">
            <SheetHeader className="px-0 py-0">
              <SheetTitle>Add Tags</SheetTitle>
              <SheetDescription>{activeTagFile?.name ?? "Select tags for this file"}</SheetDescription>
            </SheetHeader>

            {activeTagFile ? (
              <div className="mt-4 space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {tags.map((tagItem) => {
                    const hasTag = (fileTags[activeTagFile.id] ?? []).includes(tagItem.id);
                    return (
                      <Button
                        key={tagItem.id}
                        size="xs"
                        variant={hasTag ? "secondary" : "outline"}
                        onClick={() => {
                          void toggleTagForFile(activeTagFile.id, tagItem.id);
                        }}
                        style={{
                          borderColor: hasTag ? tagItem.color : undefined,
                          color: hasTag ? tagItem.color : undefined,
                        }}
                      >
                        {tagItem.name}
                      </Button>
                    );
                  })}
                </div>

                <div className="space-y-2 rounded-lg border p-3">
                  <p className="text-xs font-medium">Create new tag</p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={newTagName}
                      onChange={(event) => setNewTagName(event.target.value)}
                      placeholder="Tag name"
                      className="h-9"
                    />
                    <Input
                      type="color"
                      value={newTagColor}
                      onChange={(event) => setNewTagColor(event.target.value)}
                      className="h-9 w-11 p-1"
                      aria-label="Tag color"
                    />
                    <Button
                      size="sm"
                      onClick={() => {
                        void createTag(newTagName, newTagColor).then((created) => {
                          if (!created || !activeTagFile) return;
                          setNewTagName("");
                          void toggleTagForFile(activeTagFile.id, created.id);
                        });
                      }}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            ) : null}
          </SheetContent>
        </Sheet>

        <Sheet open={Boolean(editTagId)} onOpenChange={(open) => !open && setEditTagId(null)}>
          <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto px-4 pb-6 pt-3">
            <SheetHeader className="px-0 py-0">
              <SheetTitle>Edit Tag</SheetTitle>
              <SheetDescription>Update tag name and color.</SheetDescription>
            </SheetHeader>
            <div className="mt-4 space-y-3">
              <div className="space-y-1">
                <Label htmlFor="edit-tag-name">Tag name</Label>
                <Input
                  id="edit-tag-name"
                  value={editTagName}
                  onChange={(event) => setEditTagName(event.target.value)}
                  className="h-9"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="edit-tag-color">Color</Label>
                <Input
                  id="edit-tag-color"
                  type="color"
                  value={editTagColor}
                  onChange={(event) => setEditTagColor(event.target.value)}
                  className="h-9 w-14 p-1"
                />
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  if (!editTagId) return;
                  void editTag(editTagId, { name: editTagName.trim(), color: editTagColor }).then(() => {
                    setEditTagId(null);
                    toast.message("Tag updated");
                  });
                }}
              >
                Save changes
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
