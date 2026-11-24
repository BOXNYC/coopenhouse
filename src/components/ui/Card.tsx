import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  padded?: boolean;
  /** Adds hover/press affordance for clickable cards. */
  interactive?: boolean;
  tone?: "default" | "tint" | "warn";
}

export function Card({ padded = true, interactive, tone = "default", className, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border shadow-card",
        tone === "default" && "bg-surface border-line",
        tone === "tint" && "bg-brand-50 border-brand-100",
        tone === "warn" && "bg-warn-50 border-warn-600/25",
        padded && "p-4",
        interactive && "transition hover:shadow-pop hover:-translate-y-px active:translate-y-0",
        className,
      )}
      {...rest}
    />
  );
}

export function SectionTitle({ children, action, className }: { children: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 mb-2", className)}>
      <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{children}</h2>
      {action}
    </div>
  );
}
