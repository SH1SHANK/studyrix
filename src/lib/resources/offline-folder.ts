import {
  clearStoredFolderHandle,
  getStoredFolderHandle,
  storeFolderHandle,
} from "@/lib/resources/offline-store";

type FolderPermissionDescriptor = { mode?: "read" | "readwrite" };

let folderHandle: FileSystemDirectoryHandle | null = null;

export function hasFolderAccessSupport() {
  return typeof window !== "undefined" && "showDirectoryPicker" in window;
}

export function getOfflineFolderHandle() {
  return folderHandle;
}

const queryFolderPermission = async (
  handle: FileSystemDirectoryHandle,
  mode: "read" | "readwrite" = "readwrite",
) => {
  if (!("queryPermission" in handle)) return "granted" as PermissionState;
  try {
    return await (
      handle as FileSystemDirectoryHandle & {
        queryPermission?: (
          descriptor?: FolderPermissionDescriptor,
        ) => Promise<PermissionState>;
      }
    ).queryPermission?.({ mode });
  } catch {
    return "denied" as PermissionState;
  }
};

export async function initOfflineFolderHandle() {
  if (!hasFolderAccessSupport()) return null;
  const stored = await getStoredFolderHandle();
  if (!stored) return null;
  const permission = await queryFolderPermission(stored, "readwrite");
  if (permission && permission !== "granted") {
    await clearStoredFolderHandle();
    folderHandle = null;
    return null;
  }
  folderHandle = stored;
  return stored;
}

export async function readOfflineFolderFile(fileKey: string) {
  const handle = getOfflineFolderHandle();
  if (!handle) return null;
  try {
    const fileHandle = await handle.getFileHandle(fileKey);
    return await fileHandle.getFile();
  } catch {
    return null;
  }
}

export async function writeOfflineFolderFile(fileKey: string, blob: Blob) {
  const handle = getOfflineFolderHandle();
  if (!handle) return false;
  try {
    const fileHandle = await handle.getFileHandle(fileKey, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(blob);
    await writable.close();
    return true;
  } catch {
    return false;
  }
}

export async function removeOfflineFolderFile(fileKey: string) {
  const handle = getOfflineFolderHandle();
  if (!handle) return false;
  try {
    await handle.removeEntry(fileKey);
    return true;
  } catch {
    return false;
  }
}

export async function requestOfflineFolderAccess() {
  if (!hasFolderAccessSupport()) return null;
  try {
    const picker = (window as Window & { showDirectoryPicker?: () => Promise<FileSystemDirectoryHandle> })
      .showDirectoryPicker;
    if (!picker) return null;
    const handle = await picker();
    const permission =
      "requestPermission" in handle
        ? await (
            handle as FileSystemDirectoryHandle & {
              requestPermission?: (
                descriptor?: FolderPermissionDescriptor,
              ) => Promise<PermissionState>;
            }
          ).requestPermission?.({ mode: "readwrite" })
        : null;
    if (permission && permission !== "granted") {
      return null;
    }
    folderHandle = handle;
    await storeFolderHandle(handle);
    return handle;
  } catch {
    return null;
  }
}

export async function clearOfflineFolderHandle() {
  folderHandle = null;
  await clearStoredFolderHandle();
}
