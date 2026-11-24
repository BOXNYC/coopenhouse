"use client";
import { useEffect, useState } from "react";

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const NO_SHOW_MINUTES = 15;

/**
 * Client-side clock with a demo offset. `now` is null until mounted so nothing
 * time-dependent renders during prerender.
 */
export function useEventClock(): { now: number | null; offsetMs: number; setOffsetMs: (n: number) => void } {
  const [offsetMs, setOffsetMs] = useState(0);
  const [tick, setTick] = useState<number | null>(null);
  useEffect(() => {
    const update = () => setTick(Date.now());
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, []);
  return { now: tick === null ? null : tick + offsetMs, offsetMs, setOffsetMs };
}

export function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const d = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  if (d > 0) return `${d}d ${h}h ${pad(m)}m`;
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}
