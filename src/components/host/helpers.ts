import type { OpenHouseRequest } from "@/lib/types";
import { displayAddress } from "@/lib/rules";

/** Mirrors the §8 lateness scale used by the API for host cancellations. */
export function penaltyFor(hoursOut: number): { points: number; tier: string } {
  if (hoursOut < 2) return { points: 15, tier: "Under 2 hours before start" };
  if (hoursOut < 24) return { points: 8, tier: "Under 24 hours before start" };
  if (hoursOut < 72) return { points: 3, tier: "1 to 3 days before start" };
  return { points: 1, tier: "More than 3 days before start" };
}

function icsDate(iso: string): string {
  return new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}
function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
}

export function buildIcs(r: OpenHouseRequest, viewerId: string): string {
  const where = displayAddress(r, viewerId);
  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//CoOpenHouse//Demo//EN",
    "BEGIN:VEVENT",
    `UID:${r.id}@coopenhouse.com`,
    `DTSTAMP:${icsDate(new Date().toISOString())}`,
    `DTSTART:${icsDate(r.startsAt)}`,
    `DTEND:${icsDate(r.endsAt)}`,
    `SUMMARY:${esc(`Open house: ${where.split(",")[0]}`)}`,
    `LOCATION:${esc(where)}`,
    `DESCRIPTION:${esc("Hosting via CoOpenHouse. Handoff details are in the app.")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
}

export function downloadIcs(r: OpenHouseRequest, viewerId: string): void {
  const blob = new Blob([buildIcs(r, viewerId)], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `open-house-${r.id}.ics`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function directionsUrl(r: OpenHouseRequest): string {
  const q = encodeURIComponent(`${r.address}, ${r.city}, ${r.state}`);
  return `https://www.google.com/maps/dir/?api=1&destination=${q}`;
}
