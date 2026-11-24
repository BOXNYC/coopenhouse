"use client";
import { cn } from "@/lib/cn";
import { useTheme, type ThemePref } from "@/lib/theme";

const OPTIONS: { id: ThemePref; label: string; icon: React.ReactNode }[] = [
  {
    id: "dark",
    label: "Dark",
    icon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />,
  },
  {
    id: "light",
    label: "Light",
    icon: (
      <>
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
      </>
    ),
  },
  {
    id: "auto",
    label: "Auto",
    icon: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 3v18" />
        <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
      </>
    ),
  },
];

/** Dark / Light / Auto (follows the system) segmented control. */
export function ThemeToggle({ className, showLabels = true }: { className?: string; showLabels?: boolean }) {
  const { pref, setPref } = useTheme();
  return (
    <div role="radiogroup" aria-label="Color theme" className={cn("inline-flex rounded-full bg-ink/[0.07] p-0.5", className)}>
      {OPTIONS.map((o) => {
        const on = pref === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            aria-label={o.label}
            onClick={() => setPref(o.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-xs font-medium transition",
              on ? "bg-surface text-ink shadow-card" : "text-muted hover:text-ink",
            )}
          >
            <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {o.icon}
            </svg>
            {showLabels && o.label}
          </button>
        );
      })}
    </div>
  );
}
