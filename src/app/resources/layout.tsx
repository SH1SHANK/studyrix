import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Study Materials | Studyrix",
  description: "Study materials, reimagined for offline-first access.",
  keywords: ["resources", "courses", "study", "academic"],
  openGraph: {
    title: "Study Materials | Studyrix",
    description: "Drive-backed study materials with offline-first access",
    type: "website",
  },
};

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <main className="min-h-screen">{children}</main>
    </>
  );
}
