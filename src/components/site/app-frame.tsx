import { SiteFooter } from "@/components/site/site-footer";
import { SiteNavigation } from "@/components/site/site-navigation";
import { cn } from "@/lib/utils";

export function AppFrame({
  children,
  currentPath,
  className,
}: {
  children: React.ReactNode;
  currentPath: string;
  className?: string;
}) {
  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,oklch(0.94_0.04_277)_0,transparent_35%),radial-gradient(circle_at_bottom_right,oklch(0.96_0.02_272)_0,transparent_30%)]">
      <SiteNavigation currentPath={currentPath} />
      <main className={cn("mx-auto w-full max-w-6xl px-4 pt-8 sm:px-6", className)}>{children}</main>
      <SiteFooter />
    </div>
  );
}

