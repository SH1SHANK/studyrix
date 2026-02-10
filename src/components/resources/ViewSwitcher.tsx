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
    <div className="flex items-center gap-2">
      <div className="hidden sm:flex items-center gap-2 overflow-x-auto whitespace-nowrap">
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
                "shrink-0 min-h-[44px] border-2 border-black px-3 py-2 text-[10px] font-black uppercase shadow-[1px_1px_0px_0px_#000] transition-colors duration-150 transition-transform active:scale-95 motion-reduce:transition-none",
                isActive ? "bg-black text-white" : "bg-white hover:bg-yellow-50",
              )}
            >
              <span className="flex items-center gap-2">
                {view.label}
                {typeof view.count === "number" && (
                  <span
                    className={cn(
                      "border-2 border-black px-1.5 py-0.5 text-[9px] leading-none shadow-[1px_1px_0px_0px_#000]",
                      isActive ? "bg-white text-black" : "bg-yellow-50",
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
      <div className="sm:hidden w-full">
        <Menu open={open} onOpenChange={setOpen}>
          <Menu.Trigger asChild>
            <button
              type="button"
              aria-label={label}
              aria-expanded={open}
              className="w-full h-11 min-h-[44px] border-2 border-black bg-white px-3 text-xs font-black uppercase shadow-[2px_2px_0px_0px_#000] flex items-center justify-between"
            >
              <span>{active?.label ?? label}</span>
              <ChevronDown className="h-4 w-4" aria-hidden="true" />
            </button>
          </Menu.Trigger>
          <Menu.Content
            align="start"
            sideOffset={6}
            className="border-2 border-black bg-white shadow-[2px_2px_0px_0px_#000] min-w-[200px] max-w-[calc(100vw-2rem)]"
          >
            {views.map((view) => (
              <Menu.Item
                key={view.id}
                className={cn(
                  "flex items-center justify-between gap-2 px-3 py-2 text-xs font-black uppercase tracking-wide hover:bg-yellow-100 focus:bg-yellow-100",
                  view.id === activeId && "bg-yellow-50",
                )}
                onSelect={() => {
                  onChange(view.id);
                  setOpen(false);
                }}
              >
                <span>{view.label}</span>
                {typeof view.count === "number" && (
                  <span className="border border-black bg-white px-1.5 py-0.5 text-[9px] shadow-[1px_1px_0px_0px_#000]">
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
