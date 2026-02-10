"use client";

import Link from "next/link";
import { WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

type OfflineFallbackButtonProps = {
  className?: string;
  label?: string;
};

export function OfflineFallbackButton({
  className,
  label = "Go to Offline Study Materials",
}: OfflineFallbackButtonProps) {
  return (
    <Link
      href="/offline"
      className={cn(
        "inline-flex items-center gap-2 border-2 border-black bg-white px-4 py-2 text-xs font-black uppercase shadow-[3px_3px_0px_0px_#000] transition-transform active:scale-95 motion-reduce:transition-none",
        className,
      )}
    >
      <WifiOff className="h-4 w-4" />
      {label}
    </Link>
  );
}
