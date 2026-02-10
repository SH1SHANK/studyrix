"use client";

import { useCallback, useMemo, useState } from "react";

export type DownloadCenterEntry = {
  id: string;
  name: string;
  downloadedAt: string;
  size?: number;
  courseId?: string;
  itemId?: string;
  mimeType?: string;
  path?: string;
};

const STORAGE_KEY = "studyrix.download-center.v1";
const MAX_ENTRIES = 200;

const readStored = () => {
  if (typeof window === "undefined") return [] as DownloadCenterEntry[];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DownloadCenterEntry[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry) => entry && typeof entry.id === "string");
  } catch {
    return [] as DownloadCenterEntry[];
  }
};

const persist = (entries: DownloadCenterEntry[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    return;
  }
};

export function useDownloadCenter() {
  const [entries, setEntries] = useState<DownloadCenterEntry[]>(() =>
    readStored(),
  );

  const addDownload = useCallback((entry: DownloadCenterEntry) => {
    setEntries((prev) => {
      const filtered = prev.filter((item) => item.id !== entry.id);
      const next = [entry, ...filtered].slice(0, MAX_ENTRIES);
      persist(next);
      return next;
    });
  }, []);

  const removeDownload = useCallback((id: string) => {
    setEntries((prev) => {
      const next = prev.filter((entry) => entry.id !== id);
      persist(next);
      return next;
    });
  }, []);

  const clearDownloads = useCallback(() => {
    setEntries([]);
    persist([]);
  }, []);

  return useMemo(
    () => ({
      entries,
      addDownload,
      removeDownload,
      clearDownloads,
    }),
    [entries, addDownload, removeDownload, clearDownloads],
  );
}
