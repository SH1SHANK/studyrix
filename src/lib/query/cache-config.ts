export type CacheProfileName = "balanced" | "fresh" | "relaxed";

export type CacheKey = "resourceCourses" | "driveFolder";

export type CacheConfig = {
  staleTimeMs: number;
  gcTimeMs: number;
  refetchOnWindowFocus?: boolean;
};

export type CacheOverrides = Partial<Record<CacheKey, Partial<CacheConfig>>>;

const PROFILE_DEFAULTS: Record<CacheProfileName, Record<CacheKey, CacheConfig>> =
  {
    balanced: {
      resourceCourses: {
        staleTimeMs: 30 * 60_000,
        gcTimeMs: 6 * 60 * 60_000,
      },
      driveFolder: {
        staleTimeMs: 20 * 60_000,
        gcTimeMs: 2 * 60 * 60_000,
      },
    },
    fresh: {
      resourceCourses: {
        staleTimeMs: 10 * 60_000,
        gcTimeMs: 2 * 60 * 60_000,
      },
      driveFolder: {
        staleTimeMs: 8 * 60_000,
        gcTimeMs: 60 * 60_000,
      },
    },
    relaxed: {
      resourceCourses: {
        staleTimeMs: 2 * 60 * 60_000,
        gcTimeMs: 8 * 60 * 60_000,
      },
      driveFolder: {
        staleTimeMs: 60 * 60_000,
        gcTimeMs: 6 * 60 * 60_000,
      },
    },
  };

const CACHE_OVERRIDE_KEY = "studyrix.cacheOverrides";
const DEFAULT_PROFILE: CacheProfileName = "balanced";

function isCacheProfile(value: string | undefined): value is CacheProfileName {
  return value === "balanced" || value === "fresh" || value === "relaxed";
}

function safeParseOverrides(raw: string | null): CacheOverrides | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as CacheOverrides;
    if (!parsed || typeof parsed !== "object") return null;
    return parsed;
  } catch {
    return null;
  }
}

function getLocalOverrides(): CacheOverrides | null {
  if (typeof window === "undefined") return null;
  if (process.env.NODE_ENV === "production") return null;
  return safeParseOverrides(window.localStorage.getItem(CACHE_OVERRIDE_KEY));
}

export const CACHE_PROFILE: CacheProfileName = isCacheProfile(
  process.env.NEXT_PUBLIC_CACHE_PROFILE,
)
  ? process.env.NEXT_PUBLIC_CACHE_PROFILE
  : DEFAULT_PROFILE;

export function getCacheConfig(key: CacheKey): CacheConfig {
  const base = PROFILE_DEFAULTS[CACHE_PROFILE][key];
  const overrides = getLocalOverrides();
  const override = overrides?.[key];

  if (!override) return base;

  return {
    ...base,
    ...override,
  };
}

export function getCacheOverridesKey() {
  return CACHE_OVERRIDE_KEY;
}

export function getCacheProfileDefaults() {
  return PROFILE_DEFAULTS[CACHE_PROFILE];
}
