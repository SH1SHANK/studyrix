import Link from "next/link";
import {
  ArrowLeft,
  HeartHandshake,
  MessageSquare,
  Sparkles,
  Users,
} from "lucide-react";
import DotPatternBackground from "@/components/ui/DotPatternBackground";
import { StudyrixFooter } from "@/components/resources/StudyrixFooter";

const GROUPS = [
  {
    id: "launchpad-announcements",
    name: "Launchpad Announcements",
    description: "Official drops, maintenance notices, and new collections.",
    href: "https://wa.me/?text=Please%20share%20the%20Launchpad%20Announcements%20invite%20link.",
  },
  {
    id: "launchpad-materials",
    name: "Launchpad Study Materials",
    description: "Curated notes, guides, and consolidated study packs.",
    href: "https://wa.me/?text=Please%20share%20the%20Launchpad%20Study%20Materials%20invite%20link.",
  },
  {
    id: "launchpad-pyq",
    name: "Launchpad PYQ + Exams",
    description: "Past papers, exam prep tips, and revision checklists.",
    href: "https://wa.me/?text=Please%20share%20the%20Launchpad%20PYQ%20invite%20link.",
  },
  {
    id: "launchpad-peer",
    name: "Launchpad Peer Support",
    description: "Ask questions, share resources, and coordinate study sessions.",
    href: "https://wa.me/?text=Please%20share%20the%20Launchpad%20Peer%20Support%20invite%20link.",
  },
];

export default function LaunchpadCommunityPage() {
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
                Launchpad Community
              </h1>
              <p className="text-xs sm:text-sm font-bold uppercase tracking-wide text-stone-500">
                The people behind the study materials.
              </p>
            </div>
          </div>
        </header>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_0px_#0a0a0a]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="border-2 border-black bg-yellow-50 px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <Users className="h-4 w-4" aria-hidden="true" />
                What is Launchpad?
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
                Launchpad is a student-led community that organizes and
                maintains Studyrix materials. Every folder is curated by
                volunteers who keep content accurate and up to date.
              </p>
            </div>
            <div className="border-2 border-black bg-white px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <HeartHandshake className="h-4 w-4" aria-hidden="true" />
                Why community matters
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
                The community shares, reviews, and refreshes materials together.
                It keeps access open and knowledge portable.
              </p>
            </div>
            <div className="border-2 border-black bg-white px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <Sparkles className="h-4 w-4" aria-hidden="true" />
                Community ownership
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
                Materials are owned and maintained by contributors. Studyrix
                simply surfaces the Drive folders the community has approved.
              </p>
            </div>
            <div className="border-2 border-black bg-white px-4 py-4 shadow-[2px_2px_0px_0px_#000]">
              <div className="flex items-center gap-2 text-xs font-black uppercase text-stone-700">
                <MessageSquare className="h-4 w-4" aria-hidden="true" />
                How to contribute
              </div>
              <p className="mt-2 text-[11px] font-bold uppercase text-stone-600">
                Share verified notes, flag outdated folders, or help organize
                tags. Join a group below to request contributor access.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-white border-b-4 border-black px-4 py-6 sm:px-6 shadow-[0_6px_0px_0px_#0a0a0a]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wide text-stone-700">
                Official WhatsApp Groups
              </h2>
              <p className="text-[11px] font-bold uppercase text-stone-500">
                Request an invite through WhatsApp to join.
              </p>
            </div>
            <span className="border-2 border-black bg-yellow-50 px-2 py-1 text-[9px] font-black uppercase shadow-[2px_2px_0px_0px_#000]">
              Community-run
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
                <a
                  href={group.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center border-2 border-black bg-[#FFD700] px-3 py-2 text-[10px] font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  Request Invite
                </a>
              </div>
            ))}
          </div>
        </section>
      </div>

      <StudyrixFooter />
    </div>
  );
}
