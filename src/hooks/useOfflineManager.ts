"use client";

import { useCallback, useEffect, useRef } from "react";
import { toast } from "sonner";
import {
  getOfflineBlob,
  getOfflineEntry,
  getTotalOfflineBytes,
  isOfflineStoreAvailable,
  listOfflineEntries,
  putOfflineEntry,
  removeOfflineEntry,
  touchOfflineEntry,
} from "@/lib/resources/offline-store";
import {
  clearOfflineFolderHandle,
  getOfflineFolderHandle,
  hasFolderAccessSupport,
  initOfflineFolderHandle,
  readOfflineFolderFile,
  removeOfflineFolderFile,
  requestOfflineFolderAccess,
  writeOfflineFolderFile,
} from "@/lib/resources/offline-folder";
import { OFFLINE_CACHE_NAME } from "@/lib/resources/offline-cache";
import type { OfflineFileMeta } from "@/hooks/useStudyMaterialsPreferences";

const MB = 1024 * 1024;
const STORAGE_VERSION = 1;
const DOWNLOAD_TIMEOUT_MS = 20_000;

type OfflineManagerOptions = {
  loaded: boolean;
  offlineFiles: Record<string, OfflineFileMeta>;
  offlineStorageMode: "web" | "folder";
  cacheLimitMb?: number | null;
  setOfflineFile: (resourceId: string, meta: OfflineFileMeta | null) => void;
  removeOfflineFiles: (resourceIds: string[]) => void;
  replaceOfflineFiles?: (nextMap: Record<string, OfflineFileMeta>) => void;
  updateOfflineStorageMode?: (mode: "web" | "folder") => void;
  onHaptic?: () => void;
};

type OfflineSaveInput = {
  resourceId: string;
  fileId: string;
  name: string;
  size?: number;
  mimeType?: string;
  courseId?: string;
  path?: string;
  exportMime?: string | null;
};

type OfflineOpenInput = {
  resourceId: string;
  fileId?: string;
};

const inflightDownloads = new Map<string, Promise<Blob>>();
let initPromise: Promise<void> | null = null;
let initCompleted = false;

const fetchWithTimeout = async (url: string, timeoutMs: number) => {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    window.clearTimeout(timer);
  }
};

const downloadBlob = async (fileId: string, exportMime?: string | null) => {
  const params = new URLSearchParams();
  params.set("fileId", fileId);
  if (exportMime) {
    params.set("export", exportMime);
  }
  const response = await fetchWithTimeout(
    `/api/resources/drive/file?${params.toString()}`,
    DOWNLOAD_TIMEOUT_MS,
  );
  if (!response.ok) {
    throw new Error("download_failed");
  }
  return await response.blob();
};

const downloadBlobWithRetry = async (
  key: string,
  fileId: string,
  exportMime?: string | null,
) => {
  if (inflightDownloads.has(key)) {
    return inflightDownloads.get(key) as Promise<Blob>;
  }
  const promise = (async () => {
    let attempts = 0;
    while (attempts < 2) {
      try {
        return await downloadBlob(fileId, exportMime);
      } catch (error) {
        attempts += 1;
        if (attempts >= 2) throw error;
      }
    }
    throw new Error("download_failed");
  })().finally(() => {
    inflightDownloads.delete(key);
  });
  inflightDownloads.set(key, promise);
  return promise;
};

const normalizeMeta = (
  meta: OfflineFileMeta,
  overrides?: Partial<OfflineFileMeta>,
) => {
  const now = new Date().toISOString();
  return {
    ...meta,
    ...overrides,
    cachedAt: overrides?.cachedAt ?? meta.cachedAt ?? now,
    lastAccessed: overrides?.lastAccessed ?? meta.lastAccessed ?? now,
    storageMode: overrides?.storageMode ?? meta.storageMode ?? "web",
    storageVersion: overrides?.storageVersion ?? STORAGE_VERSION,
  } as OfflineFileMeta;
};

const buildMapFromEntries = (
  entries: Array<{ resourceId: string } & OfflineFileMeta>,
) => {
  const nextMap: Record<string, OfflineFileMeta> = {};
  entries.forEach(({ resourceId, ...meta }) => {
    nextMap[resourceId] = meta;
  });
  return nextMap;
};

const isQuotaError = (error: unknown) => {
  if (!error || typeof error !== "object") return false;
  const name = (error as { name?: string }).name;
  if (name && name.toLowerCase().includes("quota")) return true;
  const message = (error as { message?: string }).message;
  return Boolean(message && message.toLowerCase().includes("quota"));
};

const ensureFolderAccess = async (allowPrompt: boolean) => {
  if (!hasFolderAccessSupport()) return null;
  let handle = getOfflineFolderHandle();
  if (!handle) {
    handle = await initOfflineFolderHandle();
  }
  if (!handle && allowPrompt) {
    handle = await requestOfflineFolderAccess();
  }
  return handle ?? null;
};

const migrateLegacyCache = async (
  offlineFiles: Record<string, OfflineFileMeta>,
) => {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const cache = await caches.open(OFFLINE_CACHE_NAME);
    const entries = Object.entries(offlineFiles).filter(
      ([, meta]) => (meta.storageMode ?? "web") === "web",
    );
    for (const [resourceId, meta] of entries) {
      const existing = await getOfflineEntry(resourceId);
      if (existing) continue;
      const cached = await cache.match(resourceId);
      if (!cached) continue;
      const blob = await cached.clone().blob();
      const normalized = normalizeMeta(
        { ...meta, size: blob.size },
        { storageMode: "web" },
      );
      await putOfflineEntry(
        resourceId,
        { ...normalized, resourceId },
        blob,
      );
      await cache.delete(resourceId);
    }
  } catch {
    return;
  }
};

const ensureFolderEntries = async (
  offlineFiles: Record<string, OfflineFileMeta>,
) => {
  const entries = Object.entries(offlineFiles).filter(
    ([, meta]) => meta.storageMode === "folder",
  );
  for (const [resourceId, meta] of entries) {
    const existing = await getOfflineEntry(resourceId);
    if (existing) continue;
    const normalized = normalizeMeta(meta, { storageMode: "folder" });
    await putOfflineEntry(
      resourceId,
      { ...normalized, resourceId },
      null,
      { clearBlob: true },
    );
  }
};

export function useOfflineManager({
  loaded,
  offlineFiles,
  offlineStorageMode,
  cacheLimitMb,
  setOfflineFile,
  removeOfflineFiles,
  replaceOfflineFiles,
  updateOfflineStorageMode,
  onHaptic,
}: OfflineManagerOptions) {
  const offlineFilesRef = useRef(offlineFiles);
  useEffect(() => {
    offlineFilesRef.current = offlineFiles;
  }, [offlineFiles]);

  useEffect(() => {
    if (!loaded) return;
    if (!isOfflineStoreAvailable()) return;
    if (initCompleted) return;
    if (!initPromise) {
      initPromise = (async () => {
        await initOfflineFolderHandle();
        await ensureFolderEntries(offlineFilesRef.current);
        await migrateLegacyCache(offlineFilesRef.current);
        const entries = await listOfflineEntries();
        const nextMap = buildMapFromEntries(
          entries.map((entry) => ({
            ...entry,
            storageMode: entry.storageMode ?? "web",
          })),
        );
        replaceOfflineFiles?.(nextMap);
        initCompleted = true;
      })();
    }
  }, [loaded, replaceOfflineFiles]);

  const updateAccessTimestamp = useCallback(
    async (resourceId: string, meta: OfflineFileMeta) => {
      const now = new Date().toISOString();
      await touchOfflineEntry(resourceId, now);
      setOfflineFile(resourceId, {
        ...meta,
        lastAccessed: now,
      });
    },
    [setOfflineFile],
  );

  const removeOfflineResource = useCallback(
    async (
      resourceId: string,
      silent = false,
      metaOverride?: OfflineFileMeta,
    ) => {
      const meta = metaOverride ?? offlineFilesRef.current[resourceId];
      if (!meta) {
        await removeOfflineEntry(resourceId);
        return false;
      }
      if (meta.storageMode === "folder") {
        await removeOfflineFolderFile(meta.fileId ?? resourceId);
      }
      await removeOfflineEntry(resourceId);
      removeOfflineFiles([resourceId]);
      if (!silent) {
        toast.message("Removed from offline.");
        onHaptic?.();
      }
      return true;
    },
    [onHaptic, removeOfflineFiles],
  );

  const openOfflineResource = useCallback(
    async ({ resourceId, fileId }: OfflineOpenInput) => {
      const meta = offlineFilesRef.current[resourceId];
      if (!meta) return null;
      if (meta.storageMode === "folder") {
        const file = await readOfflineFolderFile(meta.fileId ?? fileId ?? resourceId);
        if (!file) {
          await removeOfflineResource(resourceId, true);
          toast.error(
            "This offline file was removed. Save it again when you're online.",
          );
          return null;
        }
        await updateAccessTimestamp(resourceId, meta);
        return file;
      }

      const blob = await getOfflineBlob(resourceId);
      if (!blob) {
        await removeOfflineResource(resourceId, true);
        toast.error(
          "This offline file was removed. Save it again when you're online.",
        );
        return null;
      }
      await updateAccessTimestamp(resourceId, meta);
      return blob;
    },
    [removeOfflineResource, updateAccessTimestamp],
  );

  const getOfflineBlobForResource = useCallback(
    async (resourceId: string, fileId?: string) => {
      const meta = offlineFilesRef.current[resourceId];
      if (!meta) return null;
      if (meta.storageMode === "folder") {
        const file = await readOfflineFolderFile(meta.fileId ?? fileId ?? resourceId);
        if (!file) {
          await removeOfflineResource(resourceId, true);
          toast.error(
            "This offline file was removed. Save it again when you're online.",
          );
          return null;
        }
        return file;
      }
      const blob = await getOfflineBlob(resourceId);
      if (!blob) {
        await removeOfflineResource(resourceId, true);
        toast.error(
          "This offline file was removed. Save it again when you're online.",
        );
        return null;
      }
      return blob;
    },
    [removeOfflineResource],
  );

  const evictToFit = useCallback(
    async (limitBytes: number, incomingBytes = 0) => {
      if (!Number.isFinite(limitBytes) || limitBytes <= 0) return;
      const entries = await listOfflineEntries();
      let total = entries.reduce(
        (sum, entry) => sum + (Number(entry.size) || 0),
        0,
      );
      if (total + incomingBytes <= limitBytes) return;
      const sorted = entries
        .map((entry) => ({
          ...entry,
          lastTouched:
            new Date(entry.lastAccessed ?? entry.cachedAt ?? 0).getTime() || 0,
        }))
        .sort((a, b) => a.lastTouched - b.lastTouched);
      const evicted: string[] = [];
      for (const entry of sorted) {
        if (total + incomingBytes <= limitBytes) break;
        total -= Number(entry.size) || 0;
        evicted.push(entry.resourceId);
        await removeOfflineResource(entry.resourceId, true, entry);
      }
    },
    [removeOfflineResource],
  );

  const saveOfflineResource = useCallback(
    async (input: OfflineSaveInput, isOnline: boolean) => {
      if (!isOfflineStoreAvailable()) {
        toast.error("Offline saving isn't available on this device.");
        return false;
      }

      const existing = offlineFilesRef.current[input.resourceId];
      if (existing) return true;

      let storageMode = offlineStorageMode;
      if (storageMode === "folder") {
        const handle = await ensureFolderAccess(true);
        if (!handle) {
          toast.error("Folder access required. Saving in the app instead.");
          updateOfflineStorageMode?.("web");
          storageMode = "web";
        }
      }

      const limitMb = cacheLimitMb ?? null;
      const limitBytes =
        limitMb === null || !Number.isFinite(limitMb)
          ? Infinity
          : Math.max(0, limitMb) * MB;
      const knownSize = Number(input.size ?? 0);
      if (Number.isFinite(knownSize) && limitBytes !== Infinity) {
        if (limitBytes > 0 && knownSize > limitBytes) {
          toast.error("File exceeds your save limit.");
          return false;
        }
      }

      let blob: Blob | null = null;
      let size = Number.isFinite(knownSize) ? knownSize : 0;

      if (storageMode === "folder") {
        const file = await readOfflineFolderFile(input.fileId);
        if (file) {
          blob = file;
          size = file.size;
        }
      } else {
        const cached = await getOfflineBlob(input.resourceId);
        if (cached) {
          blob = cached;
          size = cached.size;
        }
      }

      if (!blob) {
        if (!isOnline) {
          toast.error("Connect to the internet to save files for later.");
          return false;
        }
        const key = `${input.fileId}:${input.exportMime ?? ""}`;
        try {
          blob = await downloadBlobWithRetry(key, input.fileId, input.exportMime);
          size = blob.size;
        } catch (error) {
          if (isQuotaError(error)) {
            toast.error("Not enough storage space. Try reducing your save limit.");
          } else {
            toast.error("Unable to save file. Please try again.");
          }
          return false;
        }
      }

      if (limitBytes !== Infinity && size > limitBytes) {
        toast.error("File exceeds your save limit.");
        return false;
      }

      if (limitBytes !== Infinity) {
        await evictToFit(limitBytes, size);
      }

      let meta: OfflineFileMeta | null = null;
      try {
        if (storageMode === "folder") {
          const handle = await ensureFolderAccess(false);
          if (!handle) {
            toast.error("Folder access was lost. Saving in the app instead.");
            updateOfflineStorageMode?.("web");
            storageMode = "web";
          }
        }

        const now = new Date().toISOString();
        meta = normalizeMeta(
          {
            fileId: input.fileId,
            size: Number.isFinite(size) ? size : 0,
            cachedAt: now,
            name: input.name,
            courseId: input.courseId,
            path: input.path,
            mimeType: input.mimeType,
            storageMode,
          },
          { cachedAt: now, lastAccessed: now, storageMode },
        );

        if (storageMode === "folder") {
          const success = await writeOfflineFolderFile(input.fileId, blob);
          if (!success) {
            toast.error("Unable to save to the selected folder.");
            return false;
          }
          const stored = await putOfflineEntry(
            input.resourceId,
            { ...meta, resourceId: input.resourceId, storageMode: "folder" },
            null,
            { clearBlob: true },
          );
          if (!stored) {
            toast.error("Unable to save file. Please try again.");
            return false;
          }
        } else {
          const stored = await putOfflineEntry(
            input.resourceId,
            { ...meta, resourceId: input.resourceId, storageMode: "web" },
            blob,
          );
          if (!stored) {
            toast.error("Unable to save file. Please try again.");
            return false;
          }
        }
      } catch (error) {
        if (isQuotaError(error)) {
          toast.error("Not enough storage space. Try reducing your save limit.");
        } else {
          toast.error("Unable to save file. Please try again.");
        }
        return false;
      }

      if (meta) {
        setOfflineFile(input.resourceId, meta);
      }
      toast.message("Available offline.");
      onHaptic?.();
      return true;
    },
    [
      cacheLimitMb,
      evictToFit,
      offlineStorageMode,
      onHaptic,
      setOfflineFile,
      updateOfflineStorageMode,
    ],
  );

  const clearAllOffline = useCallback(async () => {
    const entries = Object.entries(offlineFilesRef.current);
    if (entries.length === 0) return;
    for (const [resourceId, meta] of entries) {
      if (meta.storageMode === "folder") {
        await removeOfflineFolderFile(meta.fileId ?? resourceId);
      }
      await removeOfflineEntry(resourceId);
    }
    removeOfflineFiles(entries.map(([resourceId]) => resourceId));
  }, [removeOfflineFiles]);

  const enforceCacheLimit = useCallback(
    async (limitMb: number | null) => {
      if (limitMb === null || !Number.isFinite(limitMb)) return;
      const limitBytes = Math.max(0, limitMb) * MB;
      await evictToFit(limitBytes, 0);
    },
    [evictToFit],
  );

  const resetFolderAccess = useCallback(async () => {
    await clearOfflineFolderHandle();
  }, []);

  const getOfflineUsageBytes = useCallback(async () => {
    if (!isOfflineStoreAvailable()) return 0;
    return await getTotalOfflineBytes();
  }, []);

  return {
    saveOfflineResource,
    openOfflineResource,
    removeOfflineResource,
    getOfflineBlobForResource,
    clearAllOffline,
    enforceCacheLimit,
    resetFolderAccess,
    getOfflineUsageBytes,
  };
}
