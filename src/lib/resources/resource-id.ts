export const RESOURCE_ID_SEPARATOR = "::";

export function buildResourcePath(folderIds: string[]) {
  return folderIds.filter(Boolean).join("/");
}

export function buildResourceId(params: {
  courseId: string;
  path: string;
  itemId: string;
}) {
  return [
    params.courseId,
    params.path || "root",
    params.itemId,
  ].join(RESOURCE_ID_SEPARATOR);
}

export function parseResourceId(resourceId: string) {
  const parts = resourceId.split(RESOURCE_ID_SEPARATOR);
  if (parts.length < 3) return null;
  const [courseId, path, itemId] = parts;
  if (!courseId || !itemId) return null;
  return {
    courseId,
    path: path === "root" ? "" : path,
    itemId,
  };
}
