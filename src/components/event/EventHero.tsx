"use client";
import { Avatar, Card, ClockIcon, MapPinIcon, StatusPill } from "@/components/ui";
import { formatDuration, formatWindow, offerLabel } from "@/lib/format";
import { displayAddress } from "@/lib/rules";
import { formatCountdown } from "./clock";
import type { EventCtx } from "./shared";

export function EventHero({ ctx }: { ctx: EventCtx }) {
  const { req, me, now, other, isHost } = ctx;
  const start = new Date(req.startsAt).getTime();
  const end = new Date(req.endsAt).getTime();
  const live = req.status === "checked-in";
  let countdown: { label: string; value: string } | null = null;
  if (req.status === "confirmed" || live) {
    if (now < start) countdown = { label: "Starts in", value: formatCountdown(start - now) };
    else if (now < end) countdown = { label: live ? "Event in progress, ends in" : "Started, ends in", value: formatCountdown(end - now) };
    else countdown = { label: "Event window ended", value: "00:00:00" };
  }
  return (
    <Card padded={false} className="overflow-hidden">
      <div className="h-24 w-full" style={{ background: req.photo.url ? `url(${req.photo.url}) center/cover` : req.photo.gradient }} aria-hidden="true" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="flex items-start gap-1.5 text-lg font-semibold leading-snug text-ink">
              <MapPinIcon size={18} className="mt-0.5 shrink-0 text-brand-700" />
              <span>{displayAddress(req, me.id)}</span>
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-soft">
              <ClockIcon size={15} className="shrink-0" />
              {formatWindow(req.startsAt, req.endsAt)} · {formatDuration(req.startsAt, req.endsAt)}
            </p>
          </div>
          <StatusPill status={req.status} />
        </div>
        {countdown && (
          <div className="rounded-xl bg-brand-50 px-4 py-3 text-center" role="timer" aria-live="off">
            <div className="text-xs font-medium uppercase tracking-wide text-brand-700">{countdown.label}</div>
            <div className="mt-0.5 text-3xl font-semibold tabular-nums text-brand-900">{countdown.value}</div>
          </div>
        )}
        <div className="flex items-center justify-between gap-3 border-t border-line pt-3 text-sm">
          {other ? (
            <span className="flex min-w-0 items-center gap-2">
              <Avatar user={other} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{other.name}</span>
                <span className="block text-xs text-muted">{isHost ? "Lister" : "Host"} · {other.brokerage}</span>
              </span>
            </span>
          ) : (
            <span className="text-muted">No host assigned</span>
          )}
          <span className="shrink-0 rounded-full bg-accent-50 px-2.5 py-1 text-xs font-medium text-accent-700">{offerLabel(req.offer)}</span>
        </div>
      </div>
    </Card>
  );
}
