import Link from "next/link";
import { FileQuestion } from "lucide-react";
import { OfflineFallbackButton } from "@/components/resources/OfflineFallbackButton";

export const metadata = {
  title: "404 - Sector Not Found",
  description: "The path you are looking for has been moved or destroyed.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-neutral-50 relative font-sans text-black">
      {/* Background Pattern */}
      <div className="absolute inset-0 z-0 bg-[radial-gradient(#00000026_1px,transparent_1px)] bg-size-[20px_20px] pointer-events-none opacity-50" />

      {/* Main Card */}
      <div className="relative z-10 w-full max-w-lg bg-white border-2 border-black shadow-[8px_8px_0px_0px_#000] p-12 text-center">
        {/* Floating Icon */}
        <div className="mb-6 flex justify-center">
          <FileQuestion className="w-24 h-24 text-black stroke-[1.5]" />
        </div>

        {/* Error Code */}
        <h1 className="text-8xl font-black text-[#FFD02F] drop-shadow-[4px_4px_0px_rgba(0,0,0,1)] select-none mb-2 tracking-tighter">
          404
        </h1>

        {/* Message */}
        <h2 className="text-2xl font-black uppercase tracking-tight mb-2">
          Sector Not Found
        </h2>
        <p className="text-neutral-600 font-medium text-lg leading-snug">
          The path you are looking for has been moved or destroyed.
        </p>

        {/* Actions */}
        <div className="mt-10 space-y-3">
          <Link
            href="/"
            className="block w-full bg-black text-[#FFD02F] font-black uppercase py-4 border-2 border-black hover:bg-neutral-800 transition-colors"
          >
            Return to Studyrix
          </Link>
          <div className="flex justify-center">
            <OfflineFallbackButton />
          </div>
          <Link
            href="/"
            className="block w-full bg-white text-black font-bold uppercase py-4 border-2 border-black hover:bg-neutral-50 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
