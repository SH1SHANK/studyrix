"use client";

import { HelpCircle } from "lucide-react";
import { Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/utils";

export type CommandShortcut = {
  keys: string;
  label: string;
  hint?: string;
};

type CommandCenterHelpProps = {
  shortcuts: CommandShortcut[];
  className?: string;
  label?: string;
  panelTitle?: string;
};

export function CommandCenterHelp({
  shortcuts,
  className,
  label = "Shortcuts",
  panelTitle = "Quick Search",
}: CommandCenterHelpProps) {
  return (
    <Menu>
      <Menu.Trigger asChild>
        <button
          type="button"
          aria-label="Quick search shortcuts"
          className={cn(
            "inline-flex items-center gap-2 border-2 border-black bg-white px-2 py-1 text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_#000] transition-colors duration-150 transition-transform hover:bg-yellow-50 active:scale-95 motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2",
            className,
          )}
        >
          <HelpCircle className="h-3.5 w-3.5" />
          {label}
        </button>
      </Menu.Trigger>
      <Menu.Content
        align="start"
        sideOffset={6}
        className="border-2 border-black bg-white shadow-[3px_3px_0px_0px_#000] max-w-[min(90vw,320px)] max-h-[min(60svh,320px)] overflow-y-auto"
      >
        <div className="px-3 py-2 text-[10px] font-black uppercase text-stone-500 border-b border-stone-200">
          {panelTitle} shortcuts
        </div>
        <div className="px-3 py-3 space-y-2">
          {shortcuts.map((shortcut) => (
            <div
              key={`${shortcut.keys}-${shortcut.label}`}
              className="flex items-center justify-between gap-3 text-[10px] font-black uppercase"
            >
              <span className="truncate text-stone-700">{shortcut.label}</span>
              <span className="shrink-0 border border-black bg-white px-1.5 py-0.5 text-[9px] font-black uppercase leading-none shadow-[2px_2px_0px_0px_#000]">
                {shortcut.keys}
              </span>
            </div>
          ))}
        </div>
      </Menu.Content>
    </Menu>
  );
}
