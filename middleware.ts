import { NextRequest, NextResponse } from "next/server";

type RateLimitState = {
  count: number;
  resetAt: number;
};

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;
const rateLimitStore = new Map<string, RateLimitState>();

function getClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp.trim();

  const cfConnecting = request.headers.get("cf-connecting-ip");
  if (cfConnecting) return cfConnecting.trim();

  return "unknown";
}

function checkRateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const state = rateLimitStore.get(key);

  if (!state || now > state.resetAt) {
    rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, resetAfterSeconds: Math.ceil(windowMs / 1000) };
  }

  if (state.count >= limit) {
    return {
      allowed: false,
      resetAfterSeconds: Math.ceil((state.resetAt - now) / 1000),
    };
  }

  state.count += 1;
  rateLimitStore.set(key, state);
  return {
    allowed: true,
    resetAfterSeconds: Math.ceil((state.resetAt - now) / 1000),
  };
}

function base64Encode(bytes: Uint8Array) {
  let binary = "";
  bytes.forEach((value) => {
    binary += String.fromCharCode(value);
  });
  return btoa(binary);
}

function generateNonce() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return base64Encode(bytes);
}

function buildCsp(nonce: string, isDev: boolean) {
  const supabaseOrigin = (() => {
    const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!raw) return null;
    try {
      return new URL(raw).origin;
    } catch {
      return null;
    }
  })();

  const connectSrc = ["'self'", "https://www.googleapis.com", "https://drive.google.com"];
  if (supabaseOrigin) connectSrc.push(supabaseOrigin);

  const scriptSrc = ["'self'", `'nonce-${nonce}'`];
  if (isDev) scriptSrc.push("'unsafe-eval'");

  return [
    "default-src 'self'",
    `script-src ${scriptSrc.join(" ")}`,
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https://lh3.googleusercontent.com https://*.googleusercontent.com https://drive.google.com",
    `connect-src ${connectSrc.join(" ")}`,
    "media-src 'self' blob:",
    "worker-src 'self' blob:",
    "manifest-src 'self'",
    "frame-src 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");
}

export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const reportOnly = process.env.CSP_REPORT_ONLY === "true" || isDev;
  const headerName = reportOnly
    ? "content-security-policy-report-only"
    : "content-security-policy";
  const nonce = generateNonce();
  const csp = buildCsp(nonce, isDev);

  const pathname = request.nextUrl.pathname;
  const isRateLimitedRoute =
    pathname.startsWith("/api/resources/drive") ||
    pathname === "/api/resources/search";

  if (isRateLimitedRoute) {
    const ip = getClientIp(request);
    const rate = checkRateLimit(`edge:${pathname}:${ip}`, RATE_LIMIT_MAX, RATE_LIMIT_WINDOW_MS);
    if (!rate.allowed) {
      const response = new NextResponse(
        JSON.stringify({
          error: { code: "RATE_LIMITED", message: "Too many requests" },
        }),
        {
          status: 429,
          headers: { "Content-Type": "application/json" },
        },
      );
      response.headers.set("Retry-After", rate.resetAfterSeconds.toString());
      response.headers.set("Cache-Control", "private, no-store");
      response.headers.set(headerName, csp);
      return response;
    }
  }

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(headerName, csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });
  response.headers.set(headerName, csp);
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
