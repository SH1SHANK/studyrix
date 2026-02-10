/* eslint-disable @next/next/no-page-custom-font */
import type { Metadata } from "next";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/QueryProvider";
import { ClientPerformanceObserver } from "@/components/metrics/ClientPerformanceObserver";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://studyrix.app",
  ),
  title: {
    default: "Studyrix",
    template: "%s | Studyrix",
  },
  description: "Study Materials, Reimagined.",
  applicationName: "Studyrix",
  authors: [{ name: "Attendrix Team", url: "https://attendrix.app" }],
  generator: "Next.js",
  keywords: [
    "study materials",
    "academic resources",
    "course notes",
    "offline study",
    "drive-backed resources",
    "studyrix",
  ],
  referrer: "origin-when-cross-origin",
  creator: "Studyrix",
  publisher: "Studyrix",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Studyrix",
    description: "Study Materials, Reimagined.",
    url: "https://studyrix.app",
    siteName: "Studyrix",
    locale: "en_US",
    type: "website",
    // images: [{ url: '/og.png' }], // TODO: Add OG Image
  },
  twitter: {
    card: "summary_large_image",
    title: "Studyrix",
    description: "Study Materials, Reimagined.",
    creator: "@studyrix", // Placeholder
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=JetBrains+Mono:wght@100..800&family=Unbounded:wght@400..900&display=swap"
        />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="mask-icon" href="/window.svg" color="#FFD700" />
        <meta name="theme-color" content="#FFD700" />
      </head>
      <body className="antialiased font-sans overflow-x-hidden" suppressHydrationWarning>
        <QueryProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:bg-white focus:text-black focus:px-4 focus:py-2 focus:border-2 focus:border-black focus:shadow-[3px_3px_0px_0px_#000]"
          >
            Skip to content
          </a>
          <main id="main-content">
            {children}
          </main>
          <Toaster />
          <ClientPerformanceObserver />
        </QueryProvider>
      </body>
    </html>
  );
}
