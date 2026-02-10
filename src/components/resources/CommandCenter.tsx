"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { cn } from "@/lib/utils";

export type CommandItem = {
  id: string;
  label: string;
  description?: string;
  keywords?: string;
  group?: string;
  onSelect?: () => void;
  href?: string;
};

type CommandCenterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandItem[];
  placeholder?: string;
  emptyLabel?: string;
  onOpenShortcuts?: () => void;
};

const normalize = (value: string) => value.toLowerCase().trim();

export function CommandCenter({
  open,
  onOpenChange,
  items,
  placeholder = "Search files or tags",
  emptyLabel = "No matches found.",
  onOpenShortcuts,
}: CommandCenterProps) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const router = useRouter();

  const filtered = useMemo(() => {
    const q = normalize(query);
    if (!q) return items;
    return items.filter((item) => {
      const haystack = `${item.label} ${item.description ?? ""} ${
        item.keywords ?? ""
      }`.toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query]);

  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => inputRef.current?.focus(), 50);
  }, [open]);

  const grouped = useMemo(() => {
    const groups: Array<{ name: string; items: CommandItem[] }> = [];
    filtered.forEach((item) => {
      const groupName = item.group ?? "Commands";
      const existing = groups.find((group) => group.name === groupName);
      if (existing) {
        existing.items.push(item);
      } else {
        groups.push({ name: groupName, items: [item] });
      }
    });
    return groups;
  }, [filtered]);

  const flatItems = useMemo(
    () => grouped.flatMap((group) => group.items),
    [grouped],
  );

  const clampedActiveIndex = Math.min(
    activeIndex,
    Math.max(0, flatItems.length - 1),
  );

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => Math.min(prev + 1, flatItems.length - 1));
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => Math.max(prev - 1, 0));
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const target = flatItems[clampedActiveIndex];
      if (target) {
        if (target.href) {
          router.push(target.href);
        } else {
          target.onSelect?.();
        }
        onOpenChange(false);
      }
    }
    if (event.key === "Escape") {
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 !left-0 !right-0 !bottom-0 !top-auto !translate-x-0 !translate-y-0 w-full sm:!left-[50%] sm:!right-auto sm:!bottom-auto sm:!top-[50%] sm:!translate-x-[-50%] sm:!translate-y-[-50%] sm:w-[90vw]">
        <DialogHeader className="flex-row items-center justify-between gap-2 p-3 border-b-4 border-black bg-[#FFD700]">
          <DialogTitle className="text-lg font-black uppercase">
            Quick Search
          </DialogTitle>
          {onOpenShortcuts && (
            <button
              type="button"
              onClick={onOpenShortcuts}
              className="ml-auto mr-12 inline-flex items-center gap-1.5 border-2 border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase shadow-[2px_2px_0_#000] transition-all duration-150 hover:-translate-y-0.5 hover:shadow-[3px_3px_0_#000] active:translate-y-0 active:shadow-[1px_1px_0_#000] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-1"
              aria-label="View keyboard shortcuts"
            >
              Shortcuts
              <span className="border-2 border-black bg-yellow-300 px-1 text-[9px] leading-none font-black">
                ?
              </span>
            </button>
          )}
        </DialogHeader>
        <div className="p-3 border-b-4 border-black bg-white">
          <input
            type="search"
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-label={placeholder}
            name="command-search"
            autoComplete="off"
            className="w-full border-2 border-black px-3 py-2 text-[13px] font-black uppercase shadow-neo-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
          />
        </div>
        <div className="max-h-[60vh] overflow-y-auto overscroll-contain bg-white">
          {flatItems.length === 0 ? (
            <div className="p-6 text-sm font-bold uppercase text-stone-500">
              {emptyLabel}
            </div>
          ) : (
            grouped.map((group) => (
              <div key={group.name}>
                <div className="px-4 py-2 text-[10px] font-black uppercase text-stone-500 border-b border-stone-200">
                  {group.name}
                </div>
                <div>
                  {group.items.map((item) => {
                    const index = flatItems.findIndex(
                      (entry) => entry.id === item.id,
                    );
                    const isActive = index === clampedActiveIndex;
                    const itemClass = cn(
                      "w-full text-left px-4 py-3 border-b border-stone-200 transition-colors",
                      isActive ? "bg-black text-white" : "hover:bg-yellow-100",
                    );
                    const content = (
                      <>
                        <div className="text-sm font-black uppercase">
                          {item.label}
                        </div>
                        {item.description && (
                          <div
                            className={cn(
                              "text-[11px] font-bold uppercase",
                              isActive ? "text-white/80" : "text-stone-500",
                            )}
                          >
                            {item.description}
                          </div>
                        )}
                      </>
                    );

                    if (item.href) {
                      return (
                        <Link
                          key={item.id}
                          href={item.href}
                          className={itemClass}
                          onClick={() => {
                            item.onSelect?.();
                            onOpenChange(false);
                          }}
                        >
                          {content}
                        </Link>
                      );
                    }
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          item.onSelect?.();
                          onOpenChange(false);
                        }}
                        className={itemClass}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
