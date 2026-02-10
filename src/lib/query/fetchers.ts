import { fetchJson } from "@/lib/api/fetch-json";
import type { DriveItem, ResourceCourse } from "@/types/resources";

export type ResourceFilters = {
  departments: string[];
  semesters: number[];
};

export async function fetchResourceCourses(options?: {
  signal?: AbortSignal;
  departmentId?: string | null;
  semesterId?: number | null;
}) {
  const params = new URLSearchParams();
  if (options?.departmentId) {
    params.set("departmentId", options.departmentId);
  }
  if (
    typeof options?.semesterId === "number" &&
    Number.isFinite(options.semesterId)
  ) {
    params.set("semesterId", String(options.semesterId));
  }
  return fetchJson<ResourceCourse[]>(
    `/api/resources/courses${params.toString() ? `?${params.toString()}` : ""}`,
    { signal: options?.signal },
    { metricName: "resource-courses" },
  );
}

export async function fetchResourceFilters(options?: {
  signal?: AbortSignal;
  departmentId?: string | null;
}) {
  const params = new URLSearchParams();
  if (options?.departmentId) {
    params.set("departmentId", options.departmentId);
  }
  return fetchJson<ResourceFilters>(
    `/api/resources/filters${params.toString() ? `?${params.toString()}` : ""}`,
    { signal: options?.signal },
    { metricName: "resource-filters" },
  );
}

export async function fetchDriveFolder(options: {
  signal?: AbortSignal;
  folderId: string;
}) {
  const params = new URLSearchParams();
  params.set("folderId", options.folderId);
  return fetchJson<DriveItem[]>(
    `/api/resources/drive?${params.toString()}`,
    { signal: options.signal },
    { metricName: "drive-folder" },
  );
}
