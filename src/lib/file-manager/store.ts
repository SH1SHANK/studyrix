"use client";

import { createWithEqualityFn } from "zustand/traditional";
import type { FileNode } from "@/types/resources";
import {
  clearOfflineFiles,
  createTag,
  deleteTag,
  getOfflineFileBlob,
  getSetting,
  listFileTags,
  listOfflineFiles,
  listTags,
  putOfflineFile,
  removeOfflineFile,
  setFileTagIds,
  setSetting,
  updateTag,
  type LocalOfflineFile,
  type LocalTag,
  type StorageMode,
} from "@/lib/file-manager/db";
import {
  clearOfflineFolderHandle,
  getOfflineFolderHandle,
  hasFolderAccessSupport,
  initOfflineFolderHandle,
  removeOfflineFolderFile,
  requestOfflineFolderAccess,
  writeOfflineFolderFile,
} from "@/lib/resources/offline-folder";

const FOLDER_CACHE_TTL_MS = 2 * 60_000;
const SEARCH_DEBOUNCE_MS = 220;
const CHILD_PREFETCH_LIMIT = 2;
const STORAGE_MODE_SETTING_KEY = "storageMode";

const GOOGLE_DOC = "application/vnd.google-apps.document";
const GOOGLE_SHEET = "application/vnd.google-apps.spreadsheet";
const GOOGLE_SLIDES = "application/vnd.google-apps.presentation";

export type ViewMode = "browse" | "offline" | "tags" | "settings";

export type FolderStackItem = {
  id: string;
  name: string;
};

type OfflineFileIndexEntry = Omit<LocalOfflineFile, "blob">;

type FolderCacheEntry = {
  nodes: FileNode[];
  fetchedAt: number;
  childFolderIds: string[];
  isLoading: boolean;
  error: string | null;
};

type LoadFolderOptions = {
  force?: boolean;
  prefetch?: boolean;
  folderName?: string;
};

type FileManagerState = {
  currentFolder: FolderStackItem | null;
  folderStack: FolderStackItem[];
  driveFiles: FileNode[];
  tags: LocalTag[];
  fileTags: Record<string, string[]>;
  offlineFiles: Record<string, OfflineFileIndexEntry>;
  viewMode: ViewMode;
  storageMode: StorageMode;

  searchQuery: string;
  debouncedSearchQuery: string;
  selectedTagId: string | null;
  isLoading: boolean;
  error: string | null;

  rootFolderId: string | null;
  rootFolderName: string;
  folderCache: Record<string, FolderCacheEntry>;

  canUseDeviceStorage: boolean;
  deviceStorageReady: boolean;

  initialize: () => Promise<void>;
  setViewMode: (mode: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setTagFilter: (tagId: string | null) => void;

  setRootFolder: (folderId: string, folderName: string) => Promise<void>;
  loadFolder: (folderId: string, options?: LoadFolderOptions) => Promise<FileNode[]>;
  openFolder: (node: FileNode) => Promise<void>;
  goBack: () => Promise<void>;
  navigateToStackIndex: (index: number) => Promise<void>;
  refreshCurrentFolder: () => Promise<void>;
  clearFolderCache: (folderId?: string) => void;

  createTag: (name: string, color: string) => Promise<LocalTag | null>;
  editTag: (tagId: string, patch: Partial<Pick<LocalTag, "name" | "color">>) => Promise<void>;
  deleteTag: (tagId: string) => Promise<void>;
  toggleTagForFile: (driveFileId: string, tagId: string) => Promise<void>;
  setTagsForFile: (driveFileId: string, tagIds: string[]) => Promise<void>;

  setStorageMode: (mode: StorageMode) => Promise<void>;
  saveFileOffline: (node: FileNode) => Promise<{ ok: boolean; error?: string }>;
  removeOfflineEntry: (driveFileId: string) => Promise<void>;
  clearOfflineEntries: () => Promise<void>;

  openFile: (node: FileNode) => Promise<void>;
  downloadFile: (node: FileNode) => Promise<void>;
};

const inflightByFolder = new Map<string, Promise<FileNode[]>>();
const controllerByFolder = new Map<string, AbortController>();
let activeVisibleFolderId: string | null = null;
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function mapFileTags(entries: Awaited<ReturnType<typeof listFileTags>>) {
  const next: Record<string, string[]> = {};
  for (const entry of entries) {
    if (!entry.driveFileId || !entry.tagId) continue;
    const existing = next[entry.driveFileId] ?? [];
    if (!existing.includes(entry.tagId)) {
      next[entry.driveFileId] = [...existing, entry.tagId];
    }
  }
  return next;
}

function mapOfflineEntries(entries: Awaited<ReturnType<typeof listOfflineFiles>>) {
  const next: Record<string, OfflineFileIndexEntry> = {};
  for (const entry of entries) {
    next[entry.driveFileId] = {
      driveFileId: entry.driveFileId,
      name: entry.name,
      mimeType: entry.mimeType,
      size: entry.size,
      savedAt: entry.savedAt,
      storageMode: entry.storageMode,
    };
  }
  return next;
}

function normalizeTagIds(tagIds: string[]) {
  const set = new Set<string>();
  for (const tagId of tagIds) {
    const normalized = tagId.trim();
    if (!normalized) continue;
    set.add(normalized);
  }
  return Array.from(set);
}

function getTagNameMap(tags: LocalTag[]) {
  const nameMap = new Map<string, string>();
  for (const tag of tags) {
    nameMap.set(tag.id, tag.name);
  }
  return nameMap;
}

function mergeNodesWithLocalTags(
  nodes: FileNode[],
  tags: LocalTag[],
  fileTags: Record<string, string[]>,
) {
  const tagNameById = getTagNameMap(tags);
  return nodes.map((node) => {
    const tagIds = fileTags[node.id] ?? [];
    const resolvedTags: string[] = [];
    for (const tagId of tagIds) {
      const name = tagNameById.get(tagId);
      if (name) {
        resolvedTags.push(name);
      }
    }
    return {
      ...node,
      tags: resolvedTags,
    };
  });
}

function resolveDriveFileList(state: Pick<FileManagerState, "currentFolder" | "folderCache" | "tags" | "fileTags">) {
  const folderId = state.currentFolder?.id;
  if (!folderId) return [];
  const entry = state.folderCache[folderId];
  if (!entry) return [];
  return mergeNodesWithLocalTags(entry.nodes, state.tags, state.fileTags);
}

async function fetchFolderNodes(folderId: string, signal: AbortSignal) {
  const response = await fetch(`/api/resources/drive?folderId=${encodeURIComponent(folderId)}`, {
    method: "GET",
    signal,
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("FOLDER_LOAD_FAILED");
  }
  const payload = (await response.json()) as { data?: unknown };
  return Array.isArray(payload.data) ? (payload.data as FileNode[]) : [];
}

function getExportMime(mimeType: string) {
  if (mimeType === GOOGLE_DOC || mimeType === GOOGLE_SHEET || mimeType === GOOGLE_SLIDES) {
    return "application/pdf";
  }
  return null;
}

function buildDownloadFileName(node: FileNode, exportMime: string | null) {
  if (!exportMime) return node.name;
  if (node.name.toLowerCase().endsWith(".pdf")) return node.name;
  return `${node.name}.pdf`;
}

async function fetchFileBlob(node: FileNode) {
  const params = new URLSearchParams({ fileId: node.id });
  const exportMime = getExportMime(node.mimeType);
  if (exportMime) params.set("export", exportMime);

  const response = await fetch(`/api/resources/drive/file?${params.toString()}`, {
    method: "GET",
    cache: "no-store",
  });
  if (!response.ok) {
    throw new Error("FILE_FETCH_FAILED");
  }

  const blob = await response.blob();
  return {
    blob,
    exportMime,
    fileName: buildDownloadFileName(node, exportMime),
  };
}

function openBlob(blob: Blob) {
  const objectUrl = URL.createObjectURL(blob);
  const opened = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!opened) {
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.target = "_blank";
    anchor.rel = "noreferrer";
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }
  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 10_000);
}

function downloadBlob(blob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = fileName;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(objectUrl);
}

function scheduleIdlePrefetch(run: () => void) {
  if (typeof window === "undefined") return;

  const withIdle = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (withIdle.requestIdleCallback) {
    const handle = withIdle.requestIdleCallback(run, { timeout: 1200 });
    return () => {
      withIdle.cancelIdleCallback?.(handle);
    };
  }

  const timeout = window.setTimeout(run, 300);
  return () => {
    window.clearTimeout(timeout);
  };
}

function setDebouncedSearch(
  set: (partial: Partial<FileManagerState>) => void,
  query: string,
) {
  if (searchDebounceTimer) {
    clearTimeout(searchDebounceTimer);
  }

  searchDebounceTimer = setTimeout(() => {
    set({ debouncedSearchQuery: query });
  }, SEARCH_DEBOUNCE_MS);
}

async function ensureDeviceFolderAccess() {
  const existing = getOfflineFolderHandle();
  if (existing) return true;

  const initialized = await initOfflineFolderHandle();
  if (initialized) return true;

  const requested = await requestOfflineFolderAccess();
  return Boolean(requested);
}

export const useFileManagerStore = createWithEqualityFn<FileManagerState>((set, get) => ({
  currentFolder: null,
  folderStack: [],
  driveFiles: [],
  tags: [],
  fileTags: {},
  offlineFiles: {},
  viewMode: "browse",
  storageMode: "web",

  searchQuery: "",
  debouncedSearchQuery: "",
  selectedTagId: null,
  isLoading: false,
  error: null,

  rootFolderId: null,
  rootFolderName: "Root",
  folderCache: {},

  canUseDeviceStorage: false,
  deviceStorageReady: false,

  initialize: async () => {
    const [tags, fileTags, offlineFiles, storageSetting] = await Promise.all([
      listTags(),
      listFileTags(),
      listOfflineFiles(),
      getSetting(STORAGE_MODE_SETTING_KEY),
    ]);

    const canUseDevice = hasFolderAccessSupport();
    const readyDeviceHandle = canUseDevice ? Boolean(await initOfflineFolderHandle()) : false;
    const storageMode = storageSetting === "device" && canUseDevice ? "device" : "web";

    set((state) => ({
      tags,
      fileTags: mapFileTags(fileTags),
      offlineFiles: mapOfflineEntries(offlineFiles),
      storageMode,
      canUseDeviceStorage: canUseDevice,
      deviceStorageReady: readyDeviceHandle,
      driveFiles: resolveDriveFileList({
        currentFolder: state.currentFolder,
        folderCache: state.folderCache,
        tags,
        fileTags: mapFileTags(fileTags),
      }),
    }));
  },

  setViewMode: (mode) => {
    set({ viewMode: mode });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
    setDebouncedSearch(set, query);
  },

  setTagFilter: (tagId) => {
    set({ selectedTagId: tagId });
  },

  setRootFolder: async (folderId, folderName) => {
    const normalizedId = folderId.trim();
    if (!normalizedId) return;

    const rootItem: FolderStackItem = {
      id: normalizedId,
      name: folderName || "Root",
    };

    set({
      rootFolderId: normalizedId,
      rootFolderName: rootItem.name,
      currentFolder: rootItem,
      folderStack: [rootItem],
      error: null,
      searchQuery: "",
      debouncedSearchQuery: "",
      selectedTagId: null,
    });

    await get().loadFolder(normalizedId, { folderName: rootItem.name, force: false });
  },

  loadFolder: async (folderId, options) => {
    const normalizedId = folderId.trim();
    if (!normalizedId) return [];

    const state = get();
    const cached = state.folderCache[normalizedId];
    const now = Date.now();
    const isFresh = cached && now - cached.fetchedAt < FOLDER_CACHE_TTL_MS && !options?.force;

    if (isFresh) {
      const merged = mergeNodesWithLocalTags(cached.nodes, state.tags, state.fileTags);
      if (!options?.prefetch) {
        set((prev) => ({
          currentFolder: {
            id: normalizedId,
            name: options?.folderName || prev.currentFolder?.name || cached.nodes[0]?.name || prev.rootFolderName,
          },
          driveFiles: merged,
          isLoading: false,
          error: cached.error,
        }));
      }
      return merged;
    }

    if (!options?.force && inflightByFolder.has(normalizedId)) {
      return inflightByFolder.get(normalizedId) as Promise<FileNode[]>;
    }

    if (!options?.prefetch && activeVisibleFolderId && activeVisibleFolderId !== normalizedId) {
      const activeController = controllerByFolder.get(activeVisibleFolderId);
      activeController?.abort();
    }

    if (controllerByFolder.has(normalizedId)) {
      controllerByFolder.get(normalizedId)?.abort();
      controllerByFolder.delete(normalizedId);
    }

    const controller = new AbortController();
    controllerByFolder.set(normalizedId, controller);

    if (!options?.prefetch) {
      activeVisibleFolderId = normalizedId;
      set((prev) => ({
        isLoading: true,
        error: null,
        folderCache: {
          ...prev.folderCache,
          [normalizedId]: {
            nodes: prev.folderCache[normalizedId]?.nodes ?? [],
            fetchedAt: prev.folderCache[normalizedId]?.fetchedAt ?? 0,
            childFolderIds: prev.folderCache[normalizedId]?.childFolderIds ?? [],
            isLoading: true,
            error: null,
          },
        },
      }));
    }

    const pending = (async () => {
      try {
        const nodes = await fetchFolderNodes(normalizedId, controller.signal);
        const childFolderIds = nodes.filter((node) => node.type === "folder").map((node) => node.id);

        const latestState = get();
        const merged = mergeNodesWithLocalTags(nodes, latestState.tags, latestState.fileTags);

        set((prev) => {
          const nextFolderCache: Record<string, FolderCacheEntry> = {
            ...prev.folderCache,
            [normalizedId]: {
              nodes,
              fetchedAt: Date.now(),
              childFolderIds,
              isLoading: false,
              error: null,
            },
          };

          if (options?.prefetch) {
            return {
              folderCache: nextFolderCache,
            };
          }

          const currentFolder: FolderStackItem = {
            id: normalizedId,
            name: options?.folderName || prev.currentFolder?.name || prev.rootFolderName,
          };

          return {
            currentFolder,
            driveFiles: merged,
            folderCache: nextFolderCache,
            isLoading: false,
            error: null,
          };
        });

        if (!options?.prefetch && childFolderIds.length > 0) {
          scheduleIdlePrefetch(() => {
            childFolderIds.slice(0, CHILD_PREFETCH_LIMIT).forEach((childId) => {
              void get().loadFolder(childId, { prefetch: true });
            });
          });
        }

        return merged;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return [];
        }

        if (!options?.prefetch) {
          set((prev) => ({
            isLoading: false,
            error: "Unable to load folder",
            folderCache: {
              ...prev.folderCache,
              [normalizedId]: {
                nodes: prev.folderCache[normalizedId]?.nodes ?? [],
                fetchedAt: prev.folderCache[normalizedId]?.fetchedAt ?? 0,
                childFolderIds: prev.folderCache[normalizedId]?.childFolderIds ?? [],
                isLoading: false,
                error: "Unable to load folder",
              },
            },
          }));
        }

        return [];
      } finally {
        inflightByFolder.delete(normalizedId);
        controllerByFolder.delete(normalizedId);
      }
    })();

    inflightByFolder.set(normalizedId, pending);
    return pending;
  },

  openFolder: async (node) => {
    if (node.type !== "folder") return;

    const stack = get().folderStack;
    const existingIndex = stack.findIndex((entry) => entry.id === node.id);
    const nextStack =
      existingIndex >= 0
        ? stack.slice(0, existingIndex + 1)
        : [...stack, { id: node.id, name: node.name }];

    set({
      folderStack: nextStack,
      currentFolder: nextStack[nextStack.length - 1] ?? null,
      error: null,
    });

    await get().loadFolder(node.id, { folderName: node.name });
  },

  goBack: async () => {
    const stack = get().folderStack;
    if (stack.length <= 1) return;
    await get().navigateToStackIndex(stack.length - 2);
  },

  navigateToStackIndex: async (index) => {
    const stack = get().folderStack;
    if (index < 0 || index >= stack.length) return;

    const nextStack = stack.slice(0, index + 1);
    const target = nextStack[nextStack.length - 1];
    if (!target) return;

    set({
      folderStack: nextStack,
      currentFolder: target,
      error: null,
    });

    await get().loadFolder(target.id, { folderName: target.name });
  },

  refreshCurrentFolder: async () => {
    const current = get().currentFolder;
    if (!current) return;
    await get().loadFolder(current.id, { force: true, folderName: current.name });
  },

  clearFolderCache: (folderId) => {
    if (!folderId) {
      set({ folderCache: {} });
      return;
    }

    set((state) => {
      const next = { ...state.folderCache };
      delete next[folderId];
      return {
        folderCache: next,
      };
    });
  },

  createTag: async (name, color) => {
    const normalizedName = name.trim();
    if (!normalizedName) return null;

    const tag = await createTag({ name: normalizedName, color });
    set((state) => {
      const tags = [...state.tags, tag].sort((a, b) => a.name.localeCompare(b.name));
      return {
        tags,
        driveFiles: resolveDriveFileList({
          currentFolder: state.currentFolder,
          folderCache: state.folderCache,
          tags,
          fileTags: state.fileTags,
        }),
      };
    });

    return tag;
  },

  editTag: async (tagId, patch) => {
    await updateTag(tagId, patch);

    set((state) => {
      const tags = state.tags
        .map((tag) => (tag.id === tagId ? { ...tag, ...patch } : tag))
        .sort((a, b) => a.name.localeCompare(b.name));

      return {
        tags,
        driveFiles: resolveDriveFileList({
          currentFolder: state.currentFolder,
          folderCache: state.folderCache,
          tags,
          fileTags: state.fileTags,
        }),
      };
    });
  },

  deleteTag: async (tagId) => {
    await deleteTag(tagId);

    set((state) => {
      const nextFileTags: Record<string, string[]> = {};
      for (const [driveFileId, tagIds] of Object.entries(state.fileTags)) {
        const filtered = tagIds.filter((id) => id !== tagId);
        if (filtered.length > 0) {
          nextFileTags[driveFileId] = filtered;
        }
      }

      const tags = state.tags.filter((tag) => tag.id !== tagId);
      return {
        tags,
        fileTags: nextFileTags,
        selectedTagId: state.selectedTagId === tagId ? null : state.selectedTagId,
        driveFiles: resolveDriveFileList({
          currentFolder: state.currentFolder,
          folderCache: state.folderCache,
          tags,
          fileTags: nextFileTags,
        }),
      };
    });
  },

  toggleTagForFile: async (driveFileId, tagId) => {
    const currentTagIds = get().fileTags[driveFileId] ?? [];
    const hasTag = currentTagIds.includes(tagId);
    const nextTagIds = hasTag
      ? currentTagIds.filter((id) => id !== tagId)
      : [...currentTagIds, tagId];

    await get().setTagsForFile(driveFileId, nextTagIds);
  },

  setTagsForFile: async (driveFileId, tagIds) => {
    const normalizedTagIds = normalizeTagIds(tagIds);

    set((state) => {
      const nextFileTags = { ...state.fileTags };
      if (normalizedTagIds.length === 0) {
        delete nextFileTags[driveFileId];
      } else {
        nextFileTags[driveFileId] = normalizedTagIds;
      }

      return {
        fileTags: nextFileTags,
        driveFiles: resolveDriveFileList({
          currentFolder: state.currentFolder,
          folderCache: state.folderCache,
          tags: state.tags,
          fileTags: nextFileTags,
        }),
      };
    });

    await setFileTagIds(driveFileId, normalizedTagIds);
  },

  setStorageMode: async (mode) => {
    if (mode === "web") {
      await setSetting(STORAGE_MODE_SETTING_KEY, "web");
      set({ storageMode: "web" });
      return;
    }

    if (!hasFolderAccessSupport()) {
      set({ storageMode: "web", canUseDeviceStorage: false, deviceStorageReady: false });
      await setSetting(STORAGE_MODE_SETTING_KEY, "web");
      return;
    }

    const ready = await ensureDeviceFolderAccess();
    if (!ready) {
      set({ storageMode: "web", canUseDeviceStorage: true, deviceStorageReady: false });
      await setSetting(STORAGE_MODE_SETTING_KEY, "web");
      return;
    }

    set({ storageMode: "device", canUseDeviceStorage: true, deviceStorageReady: true });
    await setSetting(STORAGE_MODE_SETTING_KEY, "device");
  },

  saveFileOffline: async (node) => {
    if (node.type !== "file") {
      return { ok: false, error: "Only files can be saved offline" };
    }

    try {
      const { blob } = await fetchFileBlob(node);
      let resolvedMode: StorageMode = get().storageMode;

      if (resolvedMode === "device") {
        const ready = await ensureDeviceFolderAccess();
        if (!ready) {
          resolvedMode = "web";
          await setSetting(STORAGE_MODE_SETTING_KEY, "web");
          set({ storageMode: "web", deviceStorageReady: false });
        } else {
          const wrote = await writeOfflineFolderFile(node.id, blob);
          if (!wrote) {
            resolvedMode = "web";
            await setSetting(STORAGE_MODE_SETTING_KEY, "web");
            set({ storageMode: "web", deviceStorageReady: false });
          } else {
            set({ deviceStorageReady: true });
          }
        }
      }

      const record: LocalOfflineFile = {
        driveFileId: node.id,
        name: node.name,
        mimeType: node.mimeType,
        size: Number.isFinite(node.size) ? Number(node.size) : blob.size,
        blob,
        savedAt: new Date().toISOString(),
        storageMode: resolvedMode,
      };

      await putOfflineFile(record);

      set((state) => ({
        offlineFiles: {
          ...state.offlineFiles,
          [node.id]: {
            driveFileId: node.id,
            name: node.name,
            mimeType: node.mimeType,
            size: record.size,
            savedAt: record.savedAt,
            storageMode: resolvedMode,
          },
        },
      }));

      return { ok: true };
    } catch {
      return { ok: false, error: "Unable to save file offline" };
    }
  },

  removeOfflineEntry: async (driveFileId) => {
    const offlineEntry = get().offlineFiles[driveFileId];

    await removeOfflineFile(driveFileId);

    if (offlineEntry?.storageMode === "device") {
      await removeOfflineFolderFile(driveFileId);
    }

    set((state) => {
      const next = { ...state.offlineFiles };
      delete next[driveFileId];
      return {
        offlineFiles: next,
      };
    });
  },

  clearOfflineEntries: async () => {
    const offlineEntries = Object.values(get().offlineFiles);
    await clearOfflineFiles();

    const removeDeviceTasks = offlineEntries
      .filter((entry) => entry.storageMode === "device")
      .map((entry) => removeOfflineFolderFile(entry.driveFileId));

    await Promise.allSettled(removeDeviceTasks);

    set({ offlineFiles: {} });
  },

  openFile: async (node) => {
    if (node.type !== "file") return;

    try {
      const offlineEntry = get().offlineFiles[node.id];
      const offlineBlob = offlineEntry ? await getOfflineFileBlob(node.id) : null;

      if (offlineBlob) {
        openBlob(offlineBlob);
        return;
      }

      const { blob } = await fetchFileBlob(node);
      openBlob(blob);
    } catch {
      // noop: keep UI non-blocking
    }
  },

  downloadFile: async (node) => {
    if (node.type !== "file") return;

    try {
      const offlineEntry = get().offlineFiles[node.id];
      const offlineBlob = offlineEntry ? await getOfflineFileBlob(node.id) : null;

      if (offlineBlob) {
        downloadBlob(offlineBlob, node.name);
        return;
      }

      const { blob, fileName } = await fetchFileBlob(node);
      downloadBlob(blob, fileName);
    } catch {
      // noop: keep UI non-blocking
    }
  },
}));

export async function resetFileManagerDeviceAccess() {
  await clearOfflineFolderHandle();
}
