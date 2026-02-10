import Link from "next/link";
import { ArrowLeft, Info, Shield, UserX } from "lucide-react";
import DotPatternBackground from "@/components/ui/DotPatternBackground";
import { StudyrixFooter } from "@/components/resources/StudyrixFooter";

export default function PrivacyDisclaimerPage() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
      <DotPatternBackground />
      <div className="mx-auto max-w-5xl relative z-10">
        <header className="bg-white border-b-4 border-black px-4 py-4 sm:px-6 shadow-[0_6px_0_#0a0a0a]">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="h-10 w-10 border-2 border-black bg-white flex items-center justify-center shadow-[3px_3px_0_#0a0a0a] transition-transform transition-shadow transition-colors duration-150 hover:-translate-y-0.5 hover:shadow-[4px_4px_0_#0a0a0a] hover:bg-yellow-50 active:translate-y-0 active:shadow-[2px_2px_0_#0a0a0a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
              aria-label="Back to Study Materials"
            >
              <ArrowLeft className="h-5 w-5" aria-hidden="true" />
            </Link>
            <div>
              <h1 className="font-display text-2xl sm:text-3xl font-black uppercase text-stone-900 tracking-tight">
                Privacy & Disclaimer
              </h1>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-stone-500">
                Clear, simple, and easy to understand.
              </p>
            </div>
          </div>
        </header>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_0px_#0a0a0a]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-2 border-black bg-yellow-50 px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <UserX className="h-4 w-4" aria-hidden="true" />
                Start right away
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
                Open Studyrix and start browsing materials right away.
              </p>
            </div>
            <div className="border-2 border-black bg-white px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <Shield className="h-4 w-4" aria-hidden="true" />
                Local-only preferences
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
                Favorites, tags, view settings, and offline files are stored
                locally in your browser. You can clear them anytime in settings.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_0px_#0a0a0a]">
          <div className="border-2 border-black bg-white px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
              <Info className="h-4 w-4" aria-hidden="true" />
              Content & sources
            </div>
            <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
              Studyrix shows community-shared Drive materials and course lists.
              When you open files, Google Drive policies apply.
            </p>
          </div>
          <div className="mt-4 border-2 border-black bg-yellow-50 px-4 py-3 text-[11px] font-bold uppercase text-stone-700 shadow-[2px_2px_0px_0px_#000]">
            Community materials are provided as-is. If something looks outdated
            or should be removed, contact the Launchpad Community.
          </div>
          <div className="mt-3">
            <Link
              href="/launchpad"
              className="inline-flex items-center border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
            >
              Visit Launchpad Community
            </Link>
          </div>
        </section>
      </div>

      <StudyrixFooter />
    </div>
  );
}
