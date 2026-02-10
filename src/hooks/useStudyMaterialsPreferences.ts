"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

export type OfflineFileMeta = {
  fileId: string;
  size: number;
  cachedAt: string;
  lastAccessed?: string;
  name?: string;
  courseId?: string;
  path?: string;
  mimeType?: string;
  storageMode?: "web" | "folder";
  storageVersion?: number;
};

export type TagMeta = {
  label: string;
  color: string;
};

export type StudyMaterialsPreferences = {
  favorites?: Record<string, true>;
  tags?: Record<string, string[]>;
  tagPalette?: Record<string, TagMeta>;
  tagPins?: string[];
  lastOpened?: Record<string, string>;
  sectionOrder?: string[];
  offlineFiles?: Record<string, OfflineFileMeta>;
  departmentId?: string | null;
  semesterId?: number | null;
  courseViewMode?: "grid" | "list" | "compact";
  courseViewSize?: "sm" | "md" | "lg";
  cacheConfig?: {
    limitMb?: number | null;
  };
  offlineStorageMode?: "web" | "folder";
};

type CacheState = {
  key: string | null;
  loaded: boolean;
  data: StudyMaterialsPreferences;
  loadPromise: Promise<StudyMaterialsPreferences> | null;
};

const DEFAULT_SECTION_ORDER = [
  "favorites",
  "recent",
  "offline",
  "tagged",
  "all",
];
const OPENED_THRESHOLD_MS = 30 * 1000;
const WRITE_DEBOUNCE_MS = 6000;

const STORAGE_NAMESPACE = "studyrix.study-materials.preferences";
const FALLBACK_STORAGE_PREFIX = "studyrix.study-materials.preferences.local";
const DB_NAME = "studyrix";
const DB_STORE = "study-materials-preferences";
const DB_VERSION = 1;

const cacheState: CacheState = {
  key: null,
  loaded: false,
  data: {},
  loadPromise: null,
};

const subscribers = new Set<(data: StudyMaterialsPreferences) => void>();
let pendingData: StudyMaterialsPreferences | null = null;
let pendingKey: string | null = null;
let pendingFallbackKey: string | null = null;
let writeTimer: ReturnType<typeof setTimeout> | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

const notify = (data: StudyMaterialsPreferences) => {
  subscribers.forEach((callback) => callback(data));
};

const getStorageKey = (uid: string | null) => {
  const scope = uid && uid.trim().length > 0 ? uid.trim() : "public";
  return `${STORAGE_NAMESPACE}.${scope}`;
};

const getFallbackKey = (uid: string | null) => {
  const scope = uid && uid.trim().length > 0 ? uid.trim() : "public";
  return `${FALLBACK_STORAGE_PREFIX}.${scope}`;
};

const isIndexedDbAvailable = () =>
  typeof window !== "undefined" && "indexedDB" in window;

const getDb = () => {
  if (!isIndexedDbAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DB_STORE)) {
        db.createObjectStore(DB_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
};

const readFromIndexedDb = async (key: string) => {
  const db = await getDb();
  if (!db) return null;
  return new Promise<StudyMaterialsPreferences | null>((resolve) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const store = tx.objectStore(DB_STORE);
    const request = store.get(key);
    request.onsuccess = () => {
      const result = request.result as
        | { key: string; value: StudyMaterialsPreferences }
        | undefined;
      resolve(result?.value ?? null);
    };
    request.onerror = () => resolve(null);
  });
};

const writeToIndexedDb = async (key: string, value: StudyMaterialsPreferences) => {
  const db = await getDb();
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    const store = tx.objectStore(DB_STORE);
    store.put({ key, value, updatedAt: new Date().toISOString() });
  });
};

const readFromLocalStorage = (key: string) => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StudyMaterialsPreferences;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
};

const writeToLocalStorage = (key: string, value: StudyMaterialsPreferences) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    return;
  }
};

const normalizePrefs = (raw: unknown): StudyMaterialsPreferences => {
  if (!raw || typeof raw !== "object") return {};
  return raw as StudyMaterialsPreferences;
};

const mergePreferences = (
  stored: StudyMaterialsPreferences,
  local: StudyMaterialsPreferences,
): StudyMaterialsPreferences => {
  return {
    ...stored,
    ...local,
    favorites: { ...stored.favorites, ...local.favorites },
    tags: { ...stored.tags, ...local.tags },
    tagPalette: { ...stored.tagPalette, ...local.tagPalette },
    tagPins: local.tagPins ?? stored.tagPins,
    lastOpened: { ...stored.lastOpened, ...local.lastOpened },
    offlineFiles: { ...stored.offlineFiles, ...local.offlineFiles },
    sectionOrder: local.sectionOrder ?? stored.sectionOrder,
    departmentId: local.departmentId ?? stored.departmentId,
    semesterId: local.semesterId ?? stored.semesterId,
    courseViewMode: local.courseViewMode ?? stored.courseViewMode,
    courseViewSize: local.courseViewSize ?? stored.courseViewSize,
  };
};

const isSameArray = (a: string[] | undefined, b: string[]) => {
  if (!a) return b.length === 0;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    if (a[i] !== b[i]) return false;
  }
  return true;
};

const isSameOfflineMap = (
  a: Record<string, OfflineFileMeta>,
  b: Record<string, OfflineFileMeta>,
) => {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    const entryA = a[key];
    const entryB = b[key];
    if (!entryA || !entryB) return false;
    if (entryA.fileId !== entryB.fileId) return false;
    if (entryA.size !== entryB.size) return false;
    if (entryA.cachedAt !== entryB.cachedAt) return false;
    if (entryA.lastAccessed !== entryB.lastAccessed) return false;
    if (entryA.name !== entryB.name) return false;
    if (entryA.courseId !== entryB.courseId) return false;
    if (entryA.path !== entryB.path) return false;
    if (entryA.mimeType !== entryB.mimeType) return false;
    if (entryA.storageMode !== entryB.storageMode) return false;
    if (entryA.storageVersion !== entryB.storageVersion) return false;
  }
  return true;
};

const getDefaultOrder = () => DEFAULT_SECTION_ORDER.slice();

async function loadPreferences(key: string, fallbackKey: string) {
  if (cacheState.key === key && cacheState.loaded) {
    return cacheState.data;
  }

  if (cacheState.loadPromise) {
    return cacheState.loadPromise;
  }

  cacheState.key = key;
  cacheState.loaded = false;
  cacheState.data = {};
  notify(cacheState.data);

  cacheState.loadPromise = (async () => {
    const stored = (await readFromIndexedDb(key)) ??
      readFromLocalStorage(fallbackKey);
    const normalized = normalizePrefs(stored);
    const merged = mergePreferences(normalized, cacheState.data);

    cacheState.data = merged;
    cacheState.loaded = true;
    cacheState.loadPromise = null;
    notify(cacheState.data);
    return cacheState.data;
  })();

  return cacheState.loadPromise;
}

const persistPreferences = async (
  key: string,
  fallbackKey: string,
  data: StudyMaterialsPreferences,
) => {
  const stored = await writeToIndexedDb(key, data);
  if (!stored) {
    writeToLocalStorage(fallbackKey, data);
  } else {
    writeToLocalStorage(fallbackKey, data);
  }
};

const scheduleFlush = () => {
  if (writeTimer) return;
  writeTimer = setTimeout(() => {
    if (!pendingKey || !pendingData) {
      writeTimer = null;
      return;
    }

    const data = pendingData;
    const key = pendingKey;
    const fallbackKey = pendingFallbackKey ?? getFallbackKey(null);
    pendingData = null;
    pendingFallbackKey = null;
    writeTimer = null;

    void persistPreferences(key, fallbackKey, data);
  }, WRITE_DEBOUNCE_MS);
};

const enqueuePersist = (key: string, fallbackKey: string, data: StudyMaterialsPreferences) => {
  pendingKey = key;
  pendingFallbackKey = fallbackKey;
  pendingData = data;
  writeToLocalStorage(fallbackKey, data);
  scheduleFlush();
};

export function useStudyMaterialsPreferences(uid: string | null) {
  const storageKey = useMemo(() => getStorageKey(uid), [uid]);
  const fallbackKey = useMemo(() => getFallbackKey(uid), [uid]);

  const [prefs, setPrefs] = useState<StudyMaterialsPreferences>(() => {
    if (cacheState.key === storageKey && cacheState.loaded) {
      return cacheState.data;
    }
    return {};
  });

  useEffect(() => {
    let active = true;

    const handleUpdate = (data: StudyMaterialsPreferences) => {
      if (!active) return;
      setPrefs(data);
    };

    subscribers.add(handleUpdate);

    void loadPreferences(storageKey, fallbackKey).then((data) => {
      if (active) setPrefs(data);
    });

    return () => {
      active = false;
      subscribers.delete(handleUpdate);
    };
  }, [storageKey, fallbackKey]);

  useEffect(() => {
    const flush = () => {
      if (!pendingKey || !pendingData) return;
      const data = pendingData;
      const key = pendingKey;
      const fallback = pendingFallbackKey ?? fallbackKey;
      pendingData = null;
      pendingFallbackKey = null;
      void persistPreferences(key, fallback, data);
    };

    if (typeof window !== "undefined") {
      window.addEventListener("beforeunload", flush);
      return () => window.removeEventListener("beforeunload", flush);
    }
    return undefined;
  }, [fallbackKey]);

  const updateLocal = useCallback(
    (next: StudyMaterialsPreferences) => {
      cacheState.data = next;
      notify(next);
      enqueuePersist(storageKey, fallbackKey, next);
    },
    [storageKey, fallbackKey],
  );

  const favorites = useMemo(() => prefs.favorites ?? {}, [prefs.favorites]);
  const tags = useMemo(() => prefs.tags ?? {}, [prefs.tags]);
  const tagPalette = useMemo(
    () => prefs.tagPalette ?? {},
    [prefs.tagPalette],
  );
  const tagPins = useMemo(() => prefs.tagPins ?? [], [prefs.tagPins]);
  const lastOpened = useMemo(
    () => prefs.lastOpened ?? {},
    [prefs.lastOpened],
  );
  const offlineFiles = useMemo(
    () => prefs.offlineFiles ?? {},
    [prefs.offlineFiles],
  );
  const sectionOrder = useMemo(
    () => prefs.sectionOrder ?? getDefaultOrder(),
    [prefs.sectionOrder],
  );
  const departmentId = useMemo(
    () => (prefs.departmentId ? prefs.departmentId : null),
    [prefs.departmentId],
  );
  const semesterId = useMemo(() => {
    const value = prefs.semesterId;
    return typeof value === "number" && Number.isFinite(value) ? value : null;
  }, [prefs.semesterId]);
  const courseViewMode = useMemo(
    () => prefs.courseViewMode ?? "list",
    [prefs.courseViewMode],
  );
  const courseViewSize = useMemo(
    () => prefs.courseViewSize ?? "md",
    [prefs.courseViewSize],
  );
  const cacheConfig = useMemo(
    () => prefs.cacheConfig ?? {},
    [prefs.cacheConfig],
  );
  const offlineStorageMode = useMemo(
    () => prefs.offlineStorageMode ?? "web",
    [prefs.offlineStorageMode],
  );

  const toggleFavorite = useCallback(
    (resourceId: string) => {
      const current = Boolean(favorites[resourceId]);
      const nextFavorites = { ...favorites };
      if (current) {
        delete nextFavorites[resourceId];
      } else {
        nextFavorites[resourceId] = true;
      }

      updateLocal({ ...prefs, favorites: nextFavorites });
    },
    [favorites, prefs, updateLocal],
  );

  const setTags = useCallback(
    (resourceId: string, nextTags: string[]) => {
      const normalized = Array.from(
        new Set(
          nextTags
            .map((tag) => tag.trim())
            .filter((tag) => tag.length > 0),
        ),
      );

      const current = tags[resourceId] ?? [];
      if (isSameArray(current, normalized)) return;

      const nextMap = { ...tags };
      if (normalized.length === 0) {
        delete nextMap[resourceId];
      } else {
        nextMap[resourceId] = normalized;
      }

      updateLocal({ ...prefs, tags: nextMap });
    },
    [prefs, tags, updateLocal],
  );

  const setTagsBatch = useCallback(
    (updates: Record<string, string[]>) => {
      const entries = Object.entries(updates);
      if (entries.length === 0) return;
      const nextMap = { ...tags };
      let changed = false;

      entries.forEach(([resourceId, nextTags]) => {
        const normalized = Array.from(
          new Set(
            nextTags
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0),
          ),
        );
        const current = tags[resourceId] ?? [];
        if (isSameArray(current, normalized)) return;
        changed = true;
        if (normalized.length === 0) {
          delete nextMap[resourceId];
        } else {
          nextMap[resourceId] = normalized;
        }
      });

      if (!changed) return;
      updateLocal({ ...prefs, tags: nextMap });
    },
    [prefs, tags, updateLocal],
  );

  const upsertTagPalette = useCallback(
    (key: string, meta: TagMeta) => {
      const nextPalette = { ...tagPalette, [key]: meta };
      updateLocal({ ...prefs, tagPalette: nextPalette });
    },
    [prefs, tagPalette, updateLocal],
  );

  const toggleTagPin = useCallback(
    (key: string) => {
      const normalized = key.trim().toLowerCase();
      if (!normalized) return;
      const nextPins = tagPins.includes(normalized)
        ? tagPins.filter((item) => item !== normalized)
        : [...tagPins, normalized];
      updateLocal({ ...prefs, tagPins: nextPins });
    },
    [prefs, tagPins, updateLocal],
  );

  const markOpened = useCallback(
    (resourceId: string) => {
      const now = new Date();
      const current = lastOpened[resourceId];
      if (current) {
        const last = new Date(current).getTime();
        if (Number.isFinite(last) && now.getTime() - last < OPENED_THRESHOLD_MS) {
          return;
        }
      }

      const nextMap = {
        ...lastOpened,
        [resourceId]: now.toISOString(),
      };

      updateLocal({ ...prefs, lastOpened: nextMap });
    },
    [lastOpened, prefs, updateLocal],
  );

  const updateSectionOrder = useCallback(
    (nextOrder: string[]) => {
      if (isSameArray(sectionOrder, nextOrder)) return;
      updateLocal({ ...prefs, sectionOrder: nextOrder });
    },
    [prefs, sectionOrder, updateLocal],
  );

  const updateDepartmentSemester = useCallback(
    (nextDepartmentId: string | null, nextSemesterId: number | null) => {
      updateLocal({
        ...prefs,
        departmentId: nextDepartmentId?.trim() || null,
        semesterId:
          typeof nextSemesterId === "number" && Number.isFinite(nextSemesterId)
            ? nextSemesterId
            : null,
      });
    },
    [prefs, updateLocal],
  );

  const updateCourseView = useCallback(
    (nextMode: "grid" | "list" | "compact", nextSize: "sm" | "md" | "lg") => {
      updateLocal({
        ...prefs,
        courseViewMode: nextMode,
        courseViewSize: nextSize,
      });
    },
    [prefs, updateLocal],
  );

  const updateCacheConfig = useCallback(
    (nextLimitMb: number | null) => {
      const current = cacheConfig.limitMb ?? null;
      if (current === nextLimitMb) return;
      updateLocal({
        ...prefs,
        cacheConfig: { ...cacheConfig, limitMb: nextLimitMb },
      });
    },
    [cacheConfig, prefs, updateLocal],
  );

  const updateOfflineStorageMode = useCallback(
    (nextMode: "web" | "folder") => {
      if (offlineStorageMode === nextMode) return;
      updateLocal({ ...prefs, offlineStorageMode: nextMode });
    },
    [offlineStorageMode, prefs, updateLocal],
  );

  const setOfflineFile = useCallback(
    (resourceId: string, meta: OfflineFileMeta | null) => {
      const nextMap = { ...offlineFiles };
      if (!meta) {
        if (!nextMap[resourceId]) return;
        delete nextMap[resourceId];
      } else {
        nextMap[resourceId] = meta;
      }

      updateLocal({ ...prefs, offlineFiles: nextMap });
    },
    [offlineFiles, prefs, updateLocal],
  );

  const removeOfflineFiles = useCallback(
    (resourceIds: string[]) => {
      if (resourceIds.length === 0) return;
      const nextMap = { ...offlineFiles };
      let changed = false;
      resourceIds.forEach((resourceId) => {
        if (nextMap[resourceId]) {
          delete nextMap[resourceId];
          changed = true;
        }
      });
      if (!changed) return;

      updateLocal({ ...prefs, offlineFiles: nextMap });
    },
    [offlineFiles, prefs, updateLocal],
  );

  const replaceOfflineFiles = useCallback(
    (nextMap: Record<string, OfflineFileMeta>) => {
      if (isSameOfflineMap(offlineFiles, nextMap)) return;
      updateLocal({ ...prefs, offlineFiles: nextMap });
    },
    [offlineFiles, prefs, updateLocal],
  );

  return useMemo(
    () => ({
      loaded: cacheState.loaded && cacheState.key === storageKey,
      favorites,
      tags,
      tagPalette,
      tagPins,
      lastOpened,
      offlineFiles,
      sectionOrder,
      departmentId,
      semesterId,
      courseViewMode,
      courseViewSize,
      cacheConfig,
      offlineStorageMode,
      toggleFavorite,
      setTags,
      setTagsBatch,
      upsertTagPalette,
      toggleTagPin,
      markOpened,
      updateSectionOrder,
      updateDepartmentSemester,
      updateCourseView,
      setOfflineFile,
      removeOfflineFiles,
      replaceOfflineFiles,
      updateCacheConfig,
      updateOfflineStorageMode,
    }),
    [
      favorites,
      lastOpened,
      offlineFiles,
      sectionOrder,
      cacheConfig,
      offlineStorageMode,
      tags,
      tagPalette,
      tagPins,
      departmentId,
      semesterId,
      courseViewMode,
      courseViewSize,
      toggleFavorite,
      setTags,
      setTagsBatch,
      upsertTagPalette,
      toggleTagPin,
      markOpened,
      updateSectionOrder,
      updateDepartmentSemester,
      updateCourseView,
      setOfflineFile,
      removeOfflineFiles,
      replaceOfflineFiles,
      updateCacheConfig,
      updateOfflineStorageMode,
      storageKey,
    ],
  );
}
