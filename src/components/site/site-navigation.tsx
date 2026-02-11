"use client";

import Link from "next/link";
import { IconBook2, IconMenu2 } from "@tabler/icons-react";
import { APP_NAV_LINKS } from "@/lib/revamp-data";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export function SiteNavigation({ currentPath = "/" }: { currentPath?: string }) {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur-sm">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link href="/" className="inline-flex items-center gap-2">
          <span className="inline-flex size-8 items-center justify-center rounded-md border bg-primary text-primary-foreground">
            <IconBook2 />
          </span>
          <div className="flex flex-col leading-none">
            <span className="text-sm font-medium">Studyrix</span>
            <span className="text-muted-foreground text-[11px]">Shadcn Revamp</span>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          {APP_NAV_LINKS.map((link) => {
            const isActive =
              link.href === "/"
                ? currentPath === "/"
                : currentPath === link.href || currentPath.startsWith(`${link.href}/`);

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  buttonVariants({
                    variant: isActive ? "secondary" : "ghost",
                    size: "sm",
                  }),
                )}
              >
                {link.label}
              </Link>
            );
          })}
          <Badge variant="outline" className="ml-2">
            Mira
          </Badge>
        </nav>

        <div className="md:hidden">
          <Sheet>
            <SheetTrigger render={<Button variant="outline" size="icon-sm" aria-label="Open navigation" />}>
              <IconMenu2 />
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Navigate Studyrix</SheetTitle>
                <SheetDescription>Browse every section of the revamped website.</SheetDescription>
              </SheetHeader>
              <Separator />
              <div className="space-y-2 px-6 pb-6">
                {APP_NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      buttonVariants({
                        variant:
                          currentPath === link.href || currentPath.startsWith(`${link.href}/`)
                            ? "secondary"
                            : "outline",
                        size: "lg",
                      }),
                      "w-full justify-start",
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
