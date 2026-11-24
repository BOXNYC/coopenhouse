import type { Offer } from "./types";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });

export function formatCurrency(n: number): string {
  return usd.format(n);
}

/** $1.2M / $785K compact price. */
export function formatPriceCompact(n: number): string {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 2).replace(/0$/, "")}M`;
  return `$${Math.round(n / 1000)}K`;
}

function timeShort(d: Date): string {
  return d.toLocaleTimeString("en-US", { hour: "numeric", minute: d.getMinutes() ? "2-digit" : undefined }).replace(" ", " ");
}

/** "Sat, Nov 28" */
export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

/** "1 PM" / "1:30 PM" */
export function formatTime(iso: string): string {
  return timeShort(new Date(iso));
}

/** "Sat, Nov 28 · 1-4 PM" */
export function formatWindow(startIso: string, endIso: string): string {
  return `${formatDate(startIso)} · ${formatTime(startIso)} - ${formatTime(endIso)}`;
}

export function formatDateTime(iso: string): string {
  return `${formatDate(iso)} · ${formatTime(iso)}`;
}

/** "in 2 days", "3 hours ago", "just now" */
export function relativeTime(iso: string, now: number = Date.now()): string {
  const diffMs = new Date(iso).getTime() - now;
  const abs = Math.abs(diffMs);
  const min = 60_000;
  const hr = 60 * min;
  const day = 24 * hr;
  let text: string;
  if (abs < min) return "just now";
  if (abs < hr) text = plural(Math.round(abs / min), "min");
  else if (abs < day) text = plural(Math.round(abs / hr), "hour");
  else text = plural(Math.round(abs / day), "day");
  return diffMs > 0 ? `in ${text}` : `${text} ago`;
}

function plural(n: number, unit: string): string {
  if (unit === "min") return `${n} min`;
  return `${n} ${unit}${n === 1 ? "" : "s"}`;
}

/** "Starts in 5 hours" / "Today" helper for cards. */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const start = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((start(d) - start(now)) / 86_400_000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return formatDate(iso);
}

export function formatDistance(miles?: number): string {
  if (miles === undefined) return "";
  if (miles < 0.2) return "Nearby";
  return `${miles.toFixed(miles < 10 ? 1 : 0)} mi`;
}

export function formatDuration(startIso: string, endIso: string): string {
  const h = (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3_600_000;
  return `${Number.isInteger(h) ? h : h.toFixed(1)} hr${h === 1 ? "" : "s"}`;
}

export function offerLabel(offer: Offer): string {
  switch (offer.type) {
    case "lead":
      return "Lead sharing";
    case "flat":
      return `${formatCurrency(offer.amount ?? 0)} flat fee`;
    case "referral":
      return `${offer.percent ?? 0}% referral split`;
    case "credit":
      return `${offer.credits ?? 1} cover credit${(offer.credits ?? 1) === 1 ? "" : "s"}`;
  }
}

export function offerShortLabel(offer: Offer): string {
  switch (offer.type) {
    case "lead":
      return "Keep leads";
    case "flat":
      return formatCurrency(offer.amount ?? 0);
    case "referral":
      return `${offer.percent ?? 0}% referral`;
    case "credit":
      return `${offer.credits ?? 1} credit${(offer.credits ?? 1) === 1 ? "" : "s"}`;
  }
}

export function formatPhone(p: string): string {
  const d = p.replace(/\D/g, "");
  if (d.length === 10) return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  return p;
}
