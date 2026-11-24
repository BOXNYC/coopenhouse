"use client";
import { useState } from "react";
import type { OpenHouseRequest } from "@/lib/types";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Button, ChevronDownIcon, SlidersIcon } from "@/components/ui";
import { HOUR, MIN } from "./clock";

/** Reviewer-only panel: shift the page's notion of "now" (client-side only, API untouched). */
export function DemoControls({ req, now, offsetMs, setOffsetMs }: { req: OpenHouseRequest; now: number; offsetMs: number; setOffsetMs: (n: number) => void }) {
  const [open, setOpen] = useState(false);
  const start = new Date(req.startsAt).getTime();
  const end = new Date(req.endsAt).getTime();
  const presets: { label: string; target: number | null }[] = [
    { label: "Real time", target: null },
    { label: "47h before (access unlocks)", target: start - 47 * HOUR },
    { label: "Pretend it's event start", target: start + MIN },
    { label: "Pretend 15 min late", target: start + 16 * MIN },
    { label: "Pretend event is over", target: end + MIN },
  ];
  return (
    <div className="rounded-card border border-dashed border-line-strong bg-surface/60">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-2 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-medium text-ink-soft">
          <SlidersIcon size={16} /> Demo controls
          <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-normal text-muted">reviewer only</span>
        </span>
        <ChevronDownIcon size={16} className={cn("text-muted transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="space-y-3 border-t border-line px-4 pb-4 pt-3">
          <p className="text-xs text-muted">
            Simulate time passing to exercise day-of states. This only changes what this page treats as &quot;now&quot;; no stored data is modified.
          </p>
          <p className="text-sm text-ink">
            Page clock: <strong>{formatDateTime(new Date(now).toISOString())}</strong>
            {offsetMs !== 0 && <span className="text-muted"> (simulated)</span>}
          </p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant={p.target === null && offsetMs === 0 ? "secondary" : "outline"}
                onClick={() => (p.target === null ? setOffsetMs(0) : setOffsetMs(p.target - Date.now()))}
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
