"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";

const EXTERNAL_LINKS = {
  attendrix: "https://attendrix.app",
  github: "https://github.com/attendrix/studyrix",
};

export function StudyrixFooter({ className }: { className?: string }) {
  const linkClass =
    "border border-black bg-white px-2.5 py-1 shadow-[1px_1px_0_#000] hover:bg-[#FFF8E1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1 transition-colors duration-100";

  return (
    <footer
      className={cn(
        "mt-6 border-t-2 border-black bg-stone-50 px-3 py-4 sm:px-5",
        className,
      )}
      aria-label="Studyrix footer"
    >
      <div className="mx-auto w-full max-w-5xl space-y-3">
        <p className="text-[10px] font-bold uppercase text-stone-500">
          Materials shared by the student community · Built by Team Attendrix
        </p>
        <div className="flex flex-wrap gap-2 text-[10px] font-black uppercase">
          <Link href="/launchpad" className={linkClass}>
            Launchpad
          </Link>
          <a
            href={EXTERNAL_LINKS.attendrix}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            Attendrix
          </a>
          <a
            href={EXTERNAL_LINKS.github}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            GitHub
          </a>
          <Link href="/privacy" className={linkClass}>
            Privacy
          </Link>
        </div>
      </div>
    </footer>
  );
}
