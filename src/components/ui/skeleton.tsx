import { cn } from "@/lib/utils";

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer rounded-md border-2 border-transparent motion-reduce:animate-pulse motion-reduce:bg-stone-200/80", // Shimmer with reduced motion fallback
        className,
      )}
      {...props}
    />
  );
}

function RetroSkeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer border-2 border-black shadow-[4px_4px_0px_0px_#000] rounded-none motion-reduce:animate-pulse motion-reduce:bg-neutral-200", // Shimmer with brutalist styling
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton, RetroSkeleton };
