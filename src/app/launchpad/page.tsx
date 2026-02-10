import Link from "next/link";
import {
  ArrowLeft,
  BookOpen,
  HeartHandshake,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import DotPatternBackground from "@/components/ui/DotPatternBackground";
import { StudyrixFooter } from "@/components/resources/StudyrixFooter";

const GROUPS = [
  {
    id: "launchpad-b25-academics",
    name: "B25 • Academics",
    description: "Midsems, endsems, and study help from seniors and peers.",
    href: "https://chat.whatsapp.com/HPK5NuYpPl9FXr8NIOlhd3?mode=gi_t",
  },
  {
    id: "launchpad-b25-software",
    name: "B25 • Software",
    description: "DSA, web dev, app dev, and AI/ML discussions.",
    href: "https://chat.whatsapp.com/EnjBGSzZN6DHLiozCAYGzh?mode=gi_t",
  },
  {
    id: "launchpad-3.0-community",
    name: "Launchpad 3.0 [B25s] Community",
    description: "Announcements and community updates for B25s.",
    href: "https://chat.whatsapp.com/LPo58YtgH4dFcq5m4xw8jK?mode=gi_t",
  },
  {
    id: "launchpad-2.0-community",
    name: "Launchpad 2.0 [B24s] Community",
    description: "Cross‑batch updates and ongoing resources.",
    href: "https://chat.whatsapp.com/K4I15LoO2QiABWaDGIGDcL?mode=gi_t",
  },
];

export default function LaunchpadCommunityPage() {
  return (
    <div className="min-h-screen bg-neutral-50 pb-24 transition-colors duration-300 relative isolate overflow-x-hidden">
      <DotPatternBackground />
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 border-2 border-black bg-white px-3 py-2 text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000]"
      >
        Skip to Content
      </a>
      <div
        id="main-content"
        tabIndex={-1}
        className="mx-auto max-w-5xl relative z-10"
      >
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
                Launchpad Community
              </h1>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-stone-500">
                NIT Calicut • B25s welcome
              </p>
            </div>
          </div>
        </header>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_0px_#0a0a0a]">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="border-2 border-black bg-yellow-50 px-5 py-5 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <Users className="h-4 w-4" aria-hidden="true" />
                Hey B25s
              </div>
              <p className="mt-3 text-[12px] font-bold uppercase text-stone-700">
                Launchpad is a student‑led space by NITC B23s, built so you can
                learn, ask, and grow with the right people from day one.
              </p>
              <p className="mt-3 text-[11px] font-bold uppercase text-stone-600">
                This is your one‑stop place for academics, career prep, and
                college life guidance. Invite your friends so no one misses out.
              </p>
            </div>
            <div className="border-2 border-black bg-white px-5 py-5 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                What you get
              </div>
              <ul className="mt-3 space-y-2 text-[11px] font-bold uppercase text-stone-600">
                <li>Guidance from seniors</li>
                <li>Academic help for midsems and endsems</li>
                <li>Software group for coding enthusiasts</li>
                <li>More groups based on demand</li>
              </ul>
            </div>
          </div>
          <div className="mt-4 border-2 border-black bg-white px-5 py-4 shadow-[2px_2px_0px_0px_#000]">
            <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
              <HeartHandshake className="h-4 w-4" aria-hidden="true" />
              Community note
            </div>
            <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
              “Alone we can do little, together we can do so much.” — Helen Keller
            </p>
          </div>
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_0px_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-stone-700">
                WhatsApp Groups
              </h2>
              <p className="text-[11px] font-bold uppercase text-stone-500">
                Join a group to get help and share resources.
              </p>
            </div>
            <span className="border-2 border-black bg-yellow-50 px-2 py-1 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
              Community‑run
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {GROUPS.map((group) => (
              <div
                key={group.id}
                className="border-2 border-black bg-white px-4 py-4 shadow-[2px_2px_0px_0px_#000] flex flex-col gap-3"
              >
                <div>
                  <h3 className="text-sm font-black uppercase text-stone-900">
                    {group.name}
                  </h3>
                  <p className="text-[11px] font-bold uppercase text-stone-600">
                    {group.description}
                  </p>
                </div>
                {group.href ? (
                  <a
                    href={group.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center border-2 border-black bg-[#FFD700] px-3 py-2 text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                  >
                    Request Invite
                  </a>
                ) : (
                  <div className="border-2 border-black bg-neutral-100 px-3 py-2 text-[10px] font-black uppercase text-stone-500 shadow-[3px_3px_0px_0px_#000]">
                    Invite link shared in announcements
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_0px_#0a0a0a]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-2 border-black bg-white px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <BookOpen className="h-4 w-4" aria-hidden="true" />
                How to join
              </div>
              <ol className="mt-2 space-y-2 text-[11px] font-bold uppercase text-stone-600 list-decimal list-inside">
                <li>Pick a group above</li>
                <li>Join with the invite link</li>
                <li>Introduce yourself and say hello</li>
              </ol>
            </div>
            <div className="border-2 border-black bg-yellow-50 px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                How to contribute
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
                Share verified notes, flag outdated folders, and help organize
                tags. We build this together.
              </p>
            </div>
          </div>
        </section>
      </div>

      <StudyrixFooter />
    </div>
  );
}
