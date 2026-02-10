"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const EXTERNAL_LINKS = {
  attendrix: "https://attendrix.app",
  github: "https://github.com/attendrix/studyrix",
};

export function StudyrixFooter({ className }: { className?: string }) {
  return (
    <footer
      className={cn(
        "mt-12 border-t-2 border-black bg-stone-50 px-4 py-8 sm:px-6 shadow-[0_-3px_0px_0px_#0a0a0a]",
        className,
      )}
      aria-label="Studyrix footer"
    >
      <div className="mx-auto w-full max-w-5xl space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="border-2 border-black bg-yellow-50 px-4 py-3 text-[11px] font-bold uppercase text-stone-700 shadow-[1px_1px_0px_0px_#000]">
            Study materials are shared by the student community.
          </div>
          <div className="text-[11px] font-bold uppercase text-stone-600">
            Built and maintained by Team Attendrix. Powered by Attendrix.
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-[11px] font-black uppercase">
          <Link
            href="/launchpad"
            className="border-2 border-black bg-white px-3 py-1.5 shadow-[1px_1px_0px_0px_#000] hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            Launchpad Community
          </Link>
          <a
            href={EXTERNAL_LINKS.attendrix}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-black bg-white px-3 py-1.5 shadow-[1px_1px_0px_0px_#000] hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            Attendrix Website
          </a>
          <a
            href={EXTERNAL_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-black bg-white px-3 py-1.5 shadow-[1px_1px_0px_0px_#000] hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            GitHub Repository
          </a>
          <Link
            href="/privacy"
            className="border-2 border-black bg-white px-3 py-1.5 shadow-[1px_1px_0px_0px_#000] hover:bg-yellow-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          >
            Privacy / Disclaimer
          </Link>
        </div>
      </div>
    </footer>
  );
}
