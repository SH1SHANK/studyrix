import type { OfflineFileMeta } from "@/hooks/useStudyMaterialsPreferences";

const DB_NAME = "studyrix-offline";
const DB_VERSION = 1;
const ENTRIES_STORE = "entries";
const BLOBS_STORE = "blobs";
const HANDLES_STORE = "handles";
const HANDLE_KEY = "folder-handle";

export type OfflineEntryRecord = OfflineFileMeta & {
  resourceId: string;
  lastAccessed?: string;
  storageVersion?: number;
};

type OfflineBlobRecord = {
  resourceId: string;
  blob: Blob;
};

type OfflineHandleRecord = {
  key: string;
  handle: FileSystemDirectoryHandle;
};

let dbPromise: Promise<IDBDatabase | null> | null = null;

export const isOfflineStoreAvailable = () =>
  typeof window !== "undefined" && "indexedDB" in window;

const getDb = () => {
  if (!isOfflineStoreAvailable()) return Promise.resolve(null);
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(ENTRIES_STORE)) {
        const entries = db.createObjectStore(ENTRIES_STORE, {
          keyPath: "resourceId",
        });
        entries.createIndex("cachedAt", "cachedAt", { unique: false });
        entries.createIndex("lastAccessed", "lastAccessed", { unique: false });
      }
      if (!db.objectStoreNames.contains(BLOBS_STORE)) {
        db.createObjectStore(BLOBS_STORE, { keyPath: "resourceId" });
      }
      if (!db.objectStoreNames.contains(HANDLES_STORE)) {
        db.createObjectStore(HANDLES_STORE, { keyPath: "key" });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => resolve(null);
  });
  return dbPromise;
};

const requestToPromise = <T>(request: IDBRequest<T>) =>
  new Promise<T | null>((resolve) => {
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => resolve(null);
  });

export async function getOfflineEntry(resourceId: string) {
  const db = await getDb();
  if (!db) return null;
  const tx = db.transaction(ENTRIES_STORE, "readonly");
  const store = tx.objectStore(ENTRIES_STORE);
  const request = store.get(resourceId);
  const result = await requestToPromise<OfflineEntryRecord>(request);
  return result ?? null;
}

export async function listOfflineEntries() {
  const db = await getDb();
  if (!db) return [];
  const tx = db.transaction(ENTRIES_STORE, "readonly");
  const store = tx.objectStore(ENTRIES_STORE);
  const request = store.getAll();
  const result = await requestToPromise<OfflineEntryRecord[]>(request);
  return Array.isArray(result) ? result : [];
}

export async function getOfflineBlob(resourceId: string) {
  const db = await getDb();
  if (!db) return null;
  const tx = db.transaction(BLOBS_STORE, "readonly");
  const store = tx.objectStore(BLOBS_STORE);
  const request = store.get(resourceId);
  const result = await requestToPromise<OfflineBlobRecord>(request);
  return result?.blob ?? null;
}

type PutOptions = {
  clearBlob?: boolean;
};

export async function putOfflineEntry(
  resourceId: string,
  meta: OfflineEntryRecord,
  blob?: Blob | null,
  options?: PutOptions,
) {
  const db = await getDb();
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction([ENTRIES_STORE, BLOBS_STORE], "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    const entries = tx.objectStore(ENTRIES_STORE);
    entries.put({ ...meta, resourceId });
    const blobs = tx.objectStore(BLOBS_STORE);
    if (blob instanceof Blob) {
      blobs.put({ resourceId, blob });
    } else if (options?.clearBlob) {
      blobs.delete(resourceId);
    }
  });
}

export async function removeOfflineEntry(resourceId: string) {
  const db = await getDb();
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction([ENTRIES_STORE, BLOBS_STORE], "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.objectStore(ENTRIES_STORE).delete(resourceId);
    tx.objectStore(BLOBS_STORE).delete(resourceId);
  });
}

export async function touchOfflineEntry(resourceId: string, timestamp?: string) {
  const entry = await getOfflineEntry(resourceId);
  if (!entry) return false;
  const now = timestamp ?? new Date().toISOString();
  return putOfflineEntry(
    resourceId,
    { ...entry, lastAccessed: now },
    null,
    { clearBlob: false },
  );
}

export async function updateOfflineEntry(
  resourceId: string,
  patch: Partial<OfflineEntryRecord>,
) {
  const entry = await getOfflineEntry(resourceId);
  if (!entry) return false;
  return putOfflineEntry(
    resourceId,
    { ...entry, ...patch },
    null,
    { clearBlob: false },
  );
}

export async function getTotalOfflineBytes() {
  const entries = await listOfflineEntries();
  return entries.reduce(
    (total, entry) => total + (Number(entry.size) || 0),
    0,
  );
}

export async function storeFolderHandle(handle: FileSystemDirectoryHandle) {
  const db = await getDb();
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(HANDLES_STORE, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.objectStore(HANDLES_STORE).put({ key: HANDLE_KEY, handle });
  });
}

export async function getStoredFolderHandle() {
  const db = await getDb();
  if (!db) return null;
  const tx = db.transaction(HANDLES_STORE, "readonly");
  const store = tx.objectStore(HANDLES_STORE);
  const request = store.get(HANDLE_KEY);
  const result = await requestToPromise<OfflineHandleRecord>(request);
  return result?.handle ?? null;
}

export async function clearStoredFolderHandle() {
  const db = await getDb();
  if (!db) return false;
  return new Promise<boolean>((resolve) => {
    const tx = db.transaction(HANDLES_STORE, "readwrite");
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => resolve(false);
    tx.objectStore(HANDLES_STORE).delete(HANDLE_KEY);
  });
}
