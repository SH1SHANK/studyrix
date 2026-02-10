"use client";

import { useEffect, useMemo, useState } from "react";
import { getTotalOfflineBytes, isOfflineStoreAvailable } from "@/lib/resources/offline-store";
import type { OfflineFileMeta } from "@/hooks/useStudyMaterialsPreferences";

const MB = 1024 * 1024;

const sumOfflineBytes = (offlineFiles: Record<string, OfflineFileMeta>) =>
  Object.values(offlineFiles).reduce(
    (total, meta) => total + (Number(meta.size) || 0),
    0,
  );

export function useOfflineStorageUsage(
  offlineFiles: Record<string, OfflineFileMeta>,
  limitMb?: number | null,
) {
  const fallbackBytes = useMemo(
    () => sumOfflineBytes(offlineFiles),
    [offlineFiles],
  );
  const [usedBytes, setUsedBytes] = useState(() => fallbackBytes);
  const hasStoreSupport = isOfflineStoreAvailable();

  useEffect(() => {
    let active = true;
    if (!hasStoreSupport) {
      return () => {
        active = false;
      };
    }

    const compute = async () => {
      try {
        const total = await getTotalOfflineBytes();
        if (active) setUsedBytes(Number.isFinite(total) ? total : fallbackBytes);
      } catch {
        if (active) setUsedBytes(fallbackBytes);
      }
    };

    void compute();

    return () => {
      active = false;
    };
  }, [fallbackBytes, hasStoreSupport, offlineFiles]);

  const limitBytes = useMemo(() => {
    if (limitMb === null) return Infinity;
    if (!Number.isFinite(Number(limitMb))) return 0;
    return Number(limitMb) * MB;
  }, [limitMb]);

  return {
    usedBytes: hasStoreSupport ? usedBytes : fallbackBytes,
    limitBytes,
    usedMb:
      Math.round(
        ((hasStoreSupport ? usedBytes : fallbackBytes) / MB) * 10,
      ) / 10,
    limitMb: limitBytes === Infinity ? null : Math.round(limitBytes / MB),
  };
}
