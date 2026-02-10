"use client";

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Menu } from "@/components/ui/Menu";

export type ViewOption = {
  id: string;
  label: string;
  count?: number;
};

type ViewSwitcherProps = {
  views: ViewOption[];
  activeId: string;
  onChange: (id: string) => void;
  label?: string;
};

export function ViewSwitcher({
  views,
  activeId,
  onChange,
  label = "Views",
}: ViewSwitcherProps) {
  const [open, setOpen] = useState(false);
  const active = useMemo(
    () => views.find((view) => view.id === activeId) ?? views[0],
    [activeId, views],
  );

  return (
    <div className="flex items-center gap-1.5">
      {/* Desktop: inline pill tabs */}
      <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto whitespace-nowrap">
        {views.map((view) => {
          const isActive = view.id === activeId;
          return (
            <button
              key={view.id}
              type="button"
              onClick={() => onChange(view.id)}
              aria-pressed={isActive}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "shrink-0 h-8 border-2 border-black px-2.5 text-[10px] font-black uppercase tracking-wide transition-all duration-150 active:scale-95 motion-reduce:transition-none",
                isActive
                  ? "bg-stone-900 text-white shadow-[2px_2px_0_#000]"
                  : "bg-white text-stone-600 shadow-[1px_1px_0_#000] hover:bg-[#FFF8E1] hover:text-stone-900",
              )}
            >
              <span className="flex items-center gap-1.5">
                {view.label}
                {typeof view.count === "number" && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[16px] h-4 px-1 border border-black text-[8px] font-black leading-none",
                      isActive
                        ? "bg-white text-black"
                        : "bg-[#FFF8E1] text-stone-700",
                    )}
                  >
                    {view.count}
                  </span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {/* Mobile: dropdown */}
      <div className="sm:hidden w-full">
        <Menu open={open} onOpenChange={setOpen}>
          <Menu.Trigger asChild>
            <button
              type="button"
              aria-label={label}
              aria-expanded={open}
              className="w-full h-9 border-2 border-black bg-white px-3 text-[11px] font-black uppercase shadow-[2px_2px_0_#000] flex items-center justify-between"
            >
              <span className="flex items-center gap-2">
                {active?.label ?? label}
                {typeof active?.count === "number" && (
                  <span className="inline-flex items-center justify-center min-w-[16px] h-4 px-1 border border-black bg-[#FFF8E1] text-[8px] font-black leading-none">
                    {active.count}
                  </span>
                )}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform duration-150",
                  open && "rotate-180",
                )}
                aria-hidden="true"
              />
            </button>
          </Menu.Trigger>
          <Menu.Content
            align="start"
            sideOffset={4}
            className="border-2 border-black bg-white shadow-[3px_3px_0_#000] min-w-[180px] max-w-[calc(100vw-2rem)]"
          >
            {views.map((view) => (
              <Menu.Item
                key={view.id}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 text-[11px] font-black uppercase tracking-wide hover:bg-[#FFF8E1] focus:bg-[#FFF8E1]",
                  view.id === activeId &&
                    "bg-stone-900 text-white hover:bg-stone-800 focus:bg-stone-800",
                )}
                onSelect={() => {
                  onChange(view.id);
                  setOpen(false);
                }}
              >
                <span>{view.label}</span>
                {typeof view.count === "number" && (
                  <span
                    className={cn(
                      "inline-flex items-center justify-center min-w-[16px] h-4 px-1 border border-black text-[8px] font-black leading-none",
                      view.id === activeId
                        ? "bg-white text-black"
                        : "bg-[#FFF8E1]",
                    )}
                  >
                    {view.count}
                  </span>
                )}
              </Menu.Item>
            ))}
          </Menu.Content>
        </Menu>
      </div>
    </div>
  );
}
