import Link from "next/link";
import { IconBrandGithub, IconShieldCheck, IconUsersGroup } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function SiteFooter() {
  return (
    <footer className="mx-auto mt-16 w-full max-w-6xl px-4 pb-10 sm:px-6">
      <Card className="bg-muted/40">
        <CardContent className="space-y-4 pt-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">Study Materials</Badge>
            <Badge variant="outline">Shadcn UI</Badge>
            <Badge variant="outline">Preset: Mira</Badge>
          </div>
          <Separator />
          <div className="flex flex-col gap-3 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <div className="inline-flex items-center gap-2">
              <IconUsersGroup className="size-4" />
              Student-led platform for structured course resources.
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link href="/privacy" className="inline-flex items-center gap-1 hover:text-foreground">
                <IconShieldCheck className="size-4" />
                Privacy
              </Link>
              <a
                href="https://github.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 hover:text-foreground"
              >
                <IconBrandGithub className="size-4" />
                Source
              </a>
            </div>
          </div>
        </CardContent>
      </Card>
    </footer>
  );
}

