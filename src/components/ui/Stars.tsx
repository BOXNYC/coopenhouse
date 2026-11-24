"use client";
import { cn } from "@/lib/cn";
import { StarIcon } from "./icons";

export function Stars({ value, count, size = 14, showValue = true, className }: { value: number; count?: number; size?: number; showValue?: boolean; className?: string }) {
  if (count === 0) return <span className={cn("text-xs text-muted", className)}>No ratings yet</span>;
  return (
    <span className={cn("inline-flex items-center gap-1 text-sm", className)} aria-label={`${value} out of 5 stars`}>
      <StarIcon size={size} className="text-accent-500" />
      {showValue && <span className="font-semibold text-ink">{value.toFixed(1)}</span>}
      {count !== undefined && <span className="text-muted">({count})</span>}
    </span>
  );
}

/** Row of 5 filled/empty stars (read-only). */
export function StarRow({ value, size = 16 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex" aria-label={`${value} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon key={n} size={size} className={n <= Math.round(value) ? "text-accent-500" : "text-line-strong"} />
      ))}
    </span>
  );
}

export function StarInput({ value, onChange, size = 32 }: { value: number; onChange: (v: number) => void; size?: number }) {
  return (
    <span className="inline-flex gap-1" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} type="button" role="radio" aria-checked={value === n} aria-label={`${n} star${n > 1 ? "s" : ""}`} onClick={() => onChange(n)} className="p-0.5 transition-transform active:scale-90">
          <StarIcon size={size} className={n <= value ? "text-accent-500" : "text-line-strong"} />
        </button>
      ))}
    </span>
  );
}
