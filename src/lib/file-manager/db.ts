"use client";

import Dexie, { type Table } from "dexie";

export type StorageMode = "web" | "device";

export type LocalTag = {
  id: string;
  name: string;
  color: string;
  createdAt: string;
};

export type LocalFileTag = {
  id?: number;
  driveFileId: string;
  tagId: string;
};

export type LocalOfflineFile = {
  driveFileId: string;
  name: string;
  mimeType: string;
  size: number;
  blob: Blob;
  savedAt: string;
  storageMode: StorageMode;
};

type LocalSetting = {
  key: string;
  value: string;
};

class FileManagerDexie extends Dexie {
  tags!: Table<LocalTag, string>;
  fileTags!: Table<LocalFileTag, number>;
  offlineFiles!: Table<LocalOfflineFile, string>;
  settings!: Table<LocalSetting, string>;

  constructor() {
    super("studyrix-file-manager");

    this.version(1).stores({
      tags: "++id,name,createdAt",
      fileTags: "++id,driveFileId,tagId",
      offlineFiles: "driveFileId,name,mimeType,savedAt",
    });

    this.version(2)
      .stores({
        tags: "id,name,createdAt",
        fileTags: "++id,driveFileId,tagId,[driveFileId+tagId]",
        offlineFiles: "driveFileId,savedAt",
        settings: "key",
      })
      .upgrade(async (tx) => {
        const legacyTags = await tx.table("tags").toArray();
        const migratedTags: LocalTag[] = legacyTags.map((tag) => {
          const rawId = typeof tag.id === "number" ? String(tag.id) : "";
          const fallbackId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
          return {
            id: rawId || fallbackId,
            name: typeof tag.name === "string" ? tag.name : "",
            color: typeof tag.color === "string" ? tag.color : "#64748B",
            createdAt:
              typeof tag.createdAt === "string"
                ? tag.createdAt
                : new Date().toISOString(),
          };
        });

        await tx.table("tags").clear();
        if (migratedTags.length > 0) {
          await tx.table("tags").bulkAdd(migratedTags);
        }

        const fileTags = await tx.table("fileTags").toArray();
        const migratedFileTags: LocalFileTag[] = fileTags
          .map((entry) => ({
            id: typeof entry.id === "number" ? entry.id : undefined,
            driveFileId: typeof entry.driveFileId === "string" ? entry.driveFileId : "",
            tagId: typeof entry.tagId === "number" ? String(entry.tagId) : String(entry.tagId ?? ""),
          }))
          .filter((entry) => entry.driveFileId.length > 0 && entry.tagId.length > 0);

        await tx.table("fileTags").clear();
        if (migratedFileTags.length > 0) {
          await tx.table("fileTags").bulkAdd(migratedFileTags);
        }
      });
  }
}

export const fileManagerDb = new FileManagerDexie();

export function createLocalTagId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function listTags() {
  return fileManagerDb.tags.orderBy("createdAt").toArray();
}

export async function listFileTags() {
  return fileManagerDb.fileTags.toArray();
}

export async function listOfflineFiles() {
  return fileManagerDb.offlineFiles.orderBy("savedAt").reverse().toArray();
}

export async function createTag(input: Omit<LocalTag, "id" | "createdAt">) {
  const tag: LocalTag = {
    id: createLocalTagId(),
    name: input.name,
    color: input.color,
    createdAt: new Date().toISOString(),
  };
  await fileManagerDb.tags.put(tag);
  return tag;
}

export async function updateTag(tagId: string, patch: Partial<Pick<LocalTag, "name" | "color">>) {
  await fileManagerDb.tags.update(tagId, patch);
}

export async function deleteTag(tagId: string) {
  await fileManagerDb.transaction("rw", fileManagerDb.tags, fileManagerDb.fileTags, async () => {
    await fileManagerDb.tags.delete(tagId);
    await fileManagerDb.fileTags.where("tagId").equals(tagId).delete();
  });
}

export async function setFileTagIds(driveFileId: string, tagIds: string[]) {
  await fileManagerDb.transaction("rw", fileManagerDb.fileTags, async () => {
    await fileManagerDb.fileTags.where("driveFileId").equals(driveFileId).delete();
    if (tagIds.length === 0) return;

    await fileManagerDb.fileTags.bulkAdd(
      tagIds.map((tagId) => ({
        driveFileId,
        tagId,
      })),
    );
  });
}

export async function putOfflineFile(file: LocalOfflineFile) {
  await fileManagerDb.offlineFiles.put(file);
}

export async function getOfflineFileBlob(driveFileId: string) {
  const offline = await fileManagerDb.offlineFiles.get(driveFileId);
  return offline?.blob ?? null;
}

export async function removeOfflineFile(driveFileId: string) {
  await fileManagerDb.offlineFiles.delete(driveFileId);
}

export async function clearOfflineFiles() {
  await fileManagerDb.offlineFiles.clear();
}

export async function setSetting(key: string, value: string) {
  await fileManagerDb.settings.put({ key, value });
}

export async function getSetting(key: string) {
  const entry = await fileManagerDb.settings.get(key);
  return entry?.value ?? null;
}
