import "server-only";

type RateLimitState = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAfterSeconds: number;
};

const store = new Map<string, RateLimitState>();

export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number,
): RateLimitResult {
  const now = Date.now();
  const state = store.get(key);

  if (!state || now > state.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return {
      allowed: true,
      remaining: Math.max(0, limit - 1),
      resetAfterSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (state.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAfterSeconds: Math.ceil((state.resetAt - now) / 1000),
    };
  }

  state.count += 1;
  store.set(key, state);
  return {
    allowed: true,
    remaining: Math.max(0, limit - state.count),
    resetAfterSeconds: Math.ceil((state.resetAt - now) / 1000),
  };
}

export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnecting = headers.get("cf-connecting-ip");
  if (cfConnecting) return cfConnecting.trim();

  return "unknown";
}
