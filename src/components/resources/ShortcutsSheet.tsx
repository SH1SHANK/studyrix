"use client";

import { Drawer } from "@/components/ui/Drawer";
import { cn } from "@/lib/utils";

export type ShortcutItem = {
  keys: string;
  label: string;
  hint?: string;
};

type ShortcutsSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shortcuts: ShortcutItem[];
  title?: string;
  description?: string;
};

export function ShortcutsSheet({
  open,
  onOpenChange,
  shortcuts,
  title = "Keyboard Shortcuts",
  description = "Quick actions for faster navigation",
}: ShortcutsSheetProps) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content className="border-2 border-black bg-white shadow-[4px_4px_0px_0px_#000] w-full max-w-none max-h-[calc(100svh-1rem)] overflow-hidden">
        <Drawer.Header>
          <Drawer.Title className="text-lg font-black uppercase">
            {title}
          </Drawer.Title>
          <Drawer.Description className="text-sm font-bold text-neutral-600">
            {description}
          </Drawer.Description>
        </Drawer.Header>
        <div className="px-4 pb-4">
          <div className="max-h-[calc(100svh-12rem)] overflow-y-auto">
            {shortcuts.length === 0 ? (
              <p className="text-xs font-bold uppercase text-stone-500">
                No shortcuts available.
              </p>
            ) : (
              <div className="space-y-2">
                {shortcuts.map((shortcut) => (
                  <div
                    key={`${shortcut.keys}-${shortcut.label}`}
                    className="flex items-center justify-between gap-3 border-2 border-black bg-white px-3 py-2 shadow-[2px_2px_0px_0px_#000]"
                  >
                    <div className="min-w-0">
                      <p className="text-[11px] font-black uppercase text-stone-700">
                        {shortcut.label}
                      </p>
                      {shortcut.hint && (
                        <p className="text-[10px] font-bold uppercase text-stone-500">
                          {shortcut.hint}
                        </p>
                      )}
                    </div>
                    <span
                      className={cn(
                        "shrink-0 border-2 border-black bg-white px-2 py-0.5 text-[9px] font-black uppercase leading-none shadow-[2px_2px_0px_0px_#000]",
                      )}
                    >
                      {shortcut.keys}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Drawer.Content>
    </Drawer>
  );
}
