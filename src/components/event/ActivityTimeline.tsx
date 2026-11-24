"use client";
import { Card, SectionTitle } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import type { OpenHouseRequest } from "@/lib/types";

interface Entry {
  at: string;
  label: string;
}

/** Vertical activity timeline derived from the request record. */
export function ActivityTimeline({ req, nameOf }: { req: OpenHouseRequest; nameOf: (id: string) => string }) {
  const entries: Entry[] = [...req.timeline];
  const has = (needle: RegExp) => entries.some((e) => needle.test(e.label));
  if (req.checkIn && !has(/checked in/i)) entries.push({ at: req.checkIn.time, label: "Host checked in" });
  if (req.checkOut && !has(/checked out/i)) entries.push({ at: req.checkOut.time, label: "Host checked out" });
  for (const r of req.reports) entries.push({ at: r.createdAt, label: `${nameOf(r.reporterId)} reported a problem (${r.category === "safety" ? "unsafe visitor" : r.category})` });
  for (const d of req.disputes) entries.push({ at: d.createdAt, label: `${nameOf(d.openedBy)} opened a dispute` });
  if (req.ratings.listerToHost) entries.push({ at: req.ratings.listerToHost.submittedAt, label: `${nameOf(req.listerId)} submitted a rating` });
  if (req.ratings.hostToLister && req.confirmedHostId) entries.push({ at: req.ratings.hostToLister.submittedAt, label: `${nameOf(req.confirmedHostId)} submitted a rating` });
  entries.sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  return (
    <Card>
      <SectionTitle>Activity</SectionTitle>
      {entries.length === 0 ? (
        <p className="text-sm text-muted">Nothing has happened yet.</p>
      ) : (
        <ol className="relative ml-1.5 border-l-2 border-line">
          {entries.map((e, i) => {
            const last = i === entries.length - 1;
            return (
              <li key={`${e.at}-${i}`} className="relative pb-4 pl-5 last:pb-0">
                <span className={`absolute -left-[7px] top-1 h-3 w-3 rounded-full border-2 border-surface ${last ? "bg-accent-500" : "bg-brand-500"}`} aria-hidden="true" />
                <p className="text-sm text-ink">{e.label}</p>
                <p className="text-xs text-muted">{formatDateTime(e.at)}</p>
              </li>
            );
          })}
        </ol>
      )}
    </Card>
  );
}
