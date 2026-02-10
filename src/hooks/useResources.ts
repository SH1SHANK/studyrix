import { useQuery } from "@tanstack/react-query";
import {
  fetchDriveFolder,
  fetchResourceCourses,
  fetchResourceFilters,
} from "@/lib/query/fetchers";
import { getCacheConfig } from "@/lib/query/cache-config";
import { queryKeys } from "@/lib/query/keys";
import type { DriveItem, ResourceCourse } from "@/types/resources";
import type { ResourceFilters } from "@/lib/query/fetchers";

export function useResourceCourses(options: {
  uid?: string | null;
  departmentId?: string | null;
  semesterId?: number | null;
}) {
  const cache = getCacheConfig("resourceCourses");
  const scope = options.uid ?? "public";
  const departmentId = options.departmentId ?? null;
  const semesterId = options.semesterId ?? null;
  const hasFilters =
    Boolean(departmentId) && typeof semesterId === "number" &&
    Number.isFinite(semesterId);

  return useQuery<ResourceCourse[], Error>({
    queryKey: queryKeys.resourceCourses(scope, departmentId, semesterId),
    staleTime: cache.staleTimeMs,
    gcTime: cache.gcTimeMs,
    refetchOnWindowFocus: cache.refetchOnWindowFocus ?? false,
    enabled: hasFilters,
    queryFn: ({ signal }) =>
      fetchResourceCourses({ signal, departmentId, semesterId }),
  });
}

export function useResourceFilters(departmentId: string | null) {
  const cache = getCacheConfig("resourceCourses");

  return useQuery<ResourceFilters, Error>({
    queryKey: queryKeys.resourceFilters(departmentId),
    staleTime: cache.staleTimeMs,
    gcTime: cache.gcTimeMs,
    refetchOnWindowFocus: cache.refetchOnWindowFocus ?? false,
    queryFn: ({ signal }) =>
      fetchResourceFilters({ signal, departmentId }),
  });
}

export function useDriveFolder(folderId: string | null) {
  const cache = getCacheConfig("driveFolder");

  return useQuery<DriveItem[], Error>({
    queryKey: queryKeys.driveFolder(folderId),
    enabled: Boolean(folderId),
    staleTime: cache.staleTimeMs,
    gcTime: cache.gcTimeMs,
    refetchOnWindowFocus: cache.refetchOnWindowFocus ?? false,
    retry: 2,
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 8000),
    queryFn: ({ signal }) =>
      fetchDriveFolder({ folderId: folderId ?? "", signal }),
  });
}
