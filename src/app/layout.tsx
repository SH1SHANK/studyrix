import type { Metadata } from "next";
import { Geist, Geist_Mono, Outfit } from "next/font/google";
import { Toaster } from "sonner";
import { QueryProvider } from "@/providers/QueryProvider";
import { ClientPerformanceObserver } from "@/components/metrics/ClientPerformanceObserver";
import "./globals.css";

const outfit = Outfit({ subsets: ["latin"], variable: "--font-sans" });
const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

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
    <html lang="en" className={outfit.variable} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased overflow-x-hidden`}
        suppressHydrationWarning
      >
        <QueryProvider>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-background focus:text-foreground focus:px-4 focus:py-2 focus:ring-2 focus:ring-ring"
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
