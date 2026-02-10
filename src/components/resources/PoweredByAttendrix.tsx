import { cn } from "@/lib/utils";

export function PoweredByAttendrix({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mt-10 flex items-center justify-center pb-10",
        className,
      )}
    >
      <span className="border-2 border-black bg-white px-3 py-1 text-[10px] font-black uppercase tracking-wide shadow-[2px_2px_0px_0px_#000]">
        Powered by Attendrix
      </span>
    </div>
  );
}
