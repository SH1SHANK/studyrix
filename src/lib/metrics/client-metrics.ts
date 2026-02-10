"use client";

type MetricEntry = {
  name: string;
  value: number;
  ts: number;
};

type MetricsSnapshot = {
  counters: Record<string, number>;
  recent: MetricEntry[];
};

const STORAGE_KEY = "studyrix.metrics";
const MAX_ENTRIES = 200;
const TTL_MS = 7 * 24 * 60 * 60 * 1000;

const counters: Record<string, number> = {};
let cachedEntries: MetricEntry[] | null = null;

function loadEntries(): MetricEntry[] {
  if (cachedEntries) return cachedEntries;
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      cachedEntries = [];
      return cachedEntries;
    }
    const parsed = JSON.parse(raw) as MetricEntry[];
    cachedEntries = Array.isArray(parsed) ? parsed : [];
  } catch {
    cachedEntries = [];
  }

  cachedEntries = pruneEntries(cachedEntries);
  return cachedEntries;
}

function pruneEntries(entries: MetricEntry[]) {
  const now = Date.now();
  const filtered = entries.filter((entry) => now - entry.ts <= TTL_MS);
  if (filtered.length > MAX_ENTRIES) {
    return filtered.slice(filtered.length - MAX_ENTRIES);
  }
  return filtered;
}

function persistEntries(entries: MetricEntry[]) {
  if (typeof window === "undefined") return;
  cachedEntries = entries;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // ignore storage errors
  }
}

export function recordMetric(name: string, value: number) {
  if (typeof window === "undefined") return;

  counters[name] = (counters[name] ?? 0) + value;

  const entries = loadEntries();
  const nextEntries = pruneEntries([
    ...entries,
    {
      name,
      value,
      ts: Date.now(),
    },
  ]);

  persistEntries(nextEntries);
}

export function getMetricsSnapshot(): MetricsSnapshot {
  return {
    counters: { ...counters },
    recent: loadEntries(),
  };
}

export function resetMetrics() {
  Object.keys(counters).forEach((key) => delete counters[key]);
  cachedEntries = [];
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(STORAGE_KEY);
  }
}
