"use client";
import { cn } from "@/lib/cn";

export interface TabItem<T extends string = string> {
  id: T;
  label: string;
  count?: number;
}

export function Tabs<T extends string>({ tabs, value, onChange, className, fullWidth = true }: { tabs: TabItem<T>[]; value: T; onChange: (id: T) => void; className?: string; fullWidth?: boolean }) {
  return (
    <div role="tablist" className={cn("inline-flex rounded-xl bg-ink/[0.06] p-1", fullWidth && "w-full", className)}>
      {tabs.map((t) => {
        const active = t.id === value;
        return (
          <button
            key={t.id}
            role="tab"
            type="button"
            aria-selected={active}
            onClick={() => onChange(t.id)}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition",
              active ? "bg-surface text-ink shadow-sm" : "text-muted hover:text-ink-soft",
            )}
          >
            {t.label}
            {t.count !== undefined && <span className={cn("rounded-full px-1.5 text-[11px]", active ? "bg-brand-50 text-brand-800" : "bg-ink/5")}>{t.count}</span>}
          </button>
        );
      })}
    </div>
  );
}
