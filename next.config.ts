import type { NextConfig } from "next";
import type { RuntimeCaching } from "workbox-build";
import withPWAInit from "next-pwa";
import withBundleAnalyzerInit from "@next/bundle-analyzer";

const runtimeCaching: RuntimeCaching[] = [
  // Never cache Supabase traffic
  {
    urlPattern: /^https?:\/\/.*\.supabase\.co\//i,
    handler: "NetworkOnly",
  },
  // Never cache authenticated or mutable API routes
  {
    urlPattern: /^\/api\//,
    handler: "NetworkOnly",
  },
  // Fonts
  {
    urlPattern: /^https:\/\/fonts\.(?:gstatic)\.com\/.*$/i,
    handler: "CacheFirst",
    options: {
      cacheName: "google-fonts-webfonts",
      expiration: { maxEntries: 4, maxAgeSeconds: 31536000 },
    },
  },
  {
    urlPattern: /^https:\/\/fonts\.(?:googleapis)\.com\/.*$/i,
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "google-fonts-stylesheets",
      expiration: { maxEntries: 4, maxAgeSeconds: 604800 },
    },
  },
  // Static assets
  {
    urlPattern: ({ request }: { request: { destination: string } }) =>
      request.destination === "style" ||
      request.destination === "script" ||
      request.destination === "worker",
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-resources",
      expiration: { maxEntries: 64, maxAgeSeconds: 86400 },
    },
  },
  {
    urlPattern: ({ request }: { request: { destination: string } }) =>
      request.destination === "image",
    handler: "StaleWhileRevalidate",
    options: {
      cacheName: "static-images",
      expiration: { maxEntries: 64, maxAgeSeconds: 86400 },
    },
  },
  // Documents (public pages only)
  {
    urlPattern: ({ request }: { request: { destination: string } }) =>
      request.destination === "document",
    handler: "NetworkFirst",
    options: {
      cacheName: "pages",
      networkTimeoutSeconds: 10,
      expiration: { maxEntries: 32, maxAgeSeconds: 86400 },
    },
  },
];

// 1. Configure PWA
const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching,
});

// 2. Configure Bundle Analyzer
const withBundleAnalyzer = withBundleAnalyzerInit({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  reactStrictMode: true,

  turbopack: {},

  experimental: {
    optimizePackageImports: [
      "lucide-react",
      "@supabase/supabase-js",
      "clsx",
      "tailwind-merge",
    ],
  },

  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

// 3. Compose Plugins

export default withBundleAnalyzer(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  withPWA(nextConfig as any) as unknown as NextConfig,
);
