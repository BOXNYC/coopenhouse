import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { displayAddress } from "@/lib/rules";
import { dayLabel, formatCurrency, formatDistance, formatTime } from "@/lib/format";
import type { OpenHouseRequest } from "@/lib/types";
import { OfferChip } from "./ui/OfferChip";
import { StatusPill, UrgentPill } from "./ui/StatusPill";
import { BedIcon, BathIcon, ClockIcon, MapPinIcon } from "./ui/icons";

export function RequestPhoto({ request, className }: { request: OpenHouseRequest; className?: string }) {
  return (
    <div
      className={cn("relative shrink-0 overflow-hidden rounded-t-xl", className)}
      style={{ background: request.photo.url ? `center/cover url(${request.photo.url})` : request.photo.gradient }}
      aria-hidden="true"
    >
      <HouseGlyph />
    </div>
  );
}

function HouseGlyph() {
  return (
    <svg viewBox="0 0 48 48" className="absolute inset-0 m-auto h-1/2 w-1/2 text-white/60" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 23L24 8l18 15M10 20v20h28V20M20 40V28h8v12" />
    </svg>
  );
}

export interface RequestCardProps {
  request: OpenHouseRequest;
  href?: string;
  /** Used to mask the address until the viewer has applied (§5.2). */
  viewerId?: string | null;
  showStatus?: boolean;
  footer?: ReactNode;
  className?: string;
}

export function RequestCard({ request: r, href, viewerId, showStatus = true, footer, className }: RequestCardProps) {
  const body = (
    <div className={cn("rounded-card border border-line bg-surface p-3.5 shadow-card transition", href && "hover:shadow-pop active:scale-[0.995]", className)}>
      <div className="flex gap-3">
        <RequestPhoto request={r} className="h-20 w-20" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-ink">{displayAddress(r, viewerId).split(",")[0]}</p>
            <span className="shrink-0 text-sm font-semibold text-ink">{formatCurrency(r.price)}</span>
          </div>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            <MapPinIcon size={13} className="shrink-0" />
            {r.neighborhood}, {r.city}
            {r.distanceMiles !== undefined && <span> · {formatDistance(r.distanceMiles)}</span>}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
            <ClockIcon size={14} className="shrink-0 text-muted" />
            {dayLabel(r.startsAt)}, {formatTime(r.startsAt)} - {formatTime(r.endsAt)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {showStatus && <StatusPill status={r.status} size="sm" />}
            {r.urgent && <UrgentPill size="sm" />}
            <OfferChip offer={r.offer} size="sm" />
            <span className="inline-flex items-center gap-1 text-xs text-muted">
              <BedIcon size={13} />
              {r.beds}
              <BathIcon size={13} className="ml-1" />
              {r.baths}
            </span>
          </div>
        </div>
      </div>
      {footer && <div className="mt-3 border-t border-line pt-3">{footer}</div>}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}
