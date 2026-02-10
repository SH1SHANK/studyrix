"use client";

import { useEffect } from "react";
import { getMetricsSnapshot, recordMetric } from "@/lib/metrics/client-metrics";

export function ClientPerformanceObserver() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const navEntry = performance.getEntriesByType(
      "navigation",
    )[0] as PerformanceNavigationTiming | undefined;

    if (navEntry) {
      recordMetric("web-vitals.ttfb", navEntry.responseStart);
    }

    if (typeof PerformanceObserver === "undefined") return;

    let latestLcp = 0;
    const observer = new PerformanceObserver((entryList) => {
      for (const entry of entryList.getEntries()) {
        if (entry.entryType === "largest-contentful-paint") {
          latestLcp = entry.startTime;
        }
      }
    });

    try {
      observer.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // Ignore browsers without LCP support
    }

    const handleVisibility = () => {
      if (document.visibilityState === "hidden" && latestLcp) {
        recordMetric("web-vitals.lcp", latestLcp);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);

    if (process.env.NODE_ENV !== "production") {
      const snapshot = getMetricsSnapshot();
      if (Object.keys(snapshot.counters).length > 0) {
        console.table(snapshot.counters);
      }
    }

    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  return null;
}
