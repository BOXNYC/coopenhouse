import { cn } from "@/lib/cn";

export function Logo({ className, light }: { className?: string; light?: boolean }) {
  return (
    <span className={cn("inline-flex items-center gap-2 font-semibold tracking-tight", light ? "text-white" : "text-brand-800", className)}>
      <span className={cn("flex h-8 w-8 items-center justify-center rounded-lg", light ? "bg-white/15" : "bg-brand-700")}>
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 11l8-7 8 7" />
          <path d="M6 10v10h12V10" />
          <path d="M10 20v-5h4v5" className="text-accent-500" stroke="#e07a3f" />
        </svg>
      </span>
      <span className="text-[17px]">CoOpenHouse</span>
    </span>
  );
}
