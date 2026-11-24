import { cn } from "@/lib/cn";
import { CheckIcon } from "./icons";

/** Horizontal step indicator. `current` is the zero-based active step. */
export function Stepper({ steps, current, className, compact }: { steps: string[]; current: number; className?: string; compact?: boolean }) {
  return (
    <ol className={cn("flex items-center", className)} aria-label="Progress">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className={cn("flex items-center", i < steps.length - 1 && "flex-1")} aria-current={active ? "step" : undefined}>
            <span className="flex flex-col items-center gap-1">
              <span className={cn("flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold", done && "bg-brand-700 text-white", active && "bg-accent-500 text-white ring-4 ring-accent-100", !done && !active && "bg-ink/[0.07] text-muted")}>
                {done ? <CheckIcon size={14} /> : i + 1}
              </span>
              {!compact && <span className={cn("max-w-16 text-center text-[11px] leading-tight", active ? "font-semibold text-ink" : "text-muted")}>{label}</span>}
            </span>
            {i < steps.length - 1 && <span className={cn("mx-1.5 h-0.5 flex-1 rounded", compact ? "" : "-mt-5", done ? "bg-brand-700" : "bg-line")} />}
          </li>
        );
      })}
    </ol>
  );
}

export const LIFECYCLE_STEPS = ["Open", "Applied", "Confirmed", "Checked in", "Completed", "Settled"];
/** Map a request status to a step index for <Stepper steps={LIFECYCLE_STEPS}>. */
export function lifecycleIndex(status: string): number {
  return ({ draft: 0, open: 0, applied: 1, confirmed: 2, "checked-in": 3, completed: 4, disputed: 4, settled: 5 } as Record<string, number>)[status] ?? 0;
}
