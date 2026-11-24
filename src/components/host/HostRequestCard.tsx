import Link from "next/link";
import { cn } from "@/lib/cn";
import { dayLabel, formatCurrency, formatDistance, formatTime } from "@/lib/format";
import { displayAddress } from "@/lib/rules";
import type { OpenHouseRequest, User } from "@/lib/types";
import { RequestPhoto } from "@/components/RequestCard";
import { Badge } from "@/components/ui/Badge";
import { OfferChip } from "@/components/ui/OfferChip";
import { Stars } from "@/components/ui/Stars";
import { UrgentPill } from "@/components/ui/StatusPill";
import { BoltIcon, ClockIcon, LockIcon, MapPinIcon } from "@/components/ui/icons";

export function HostRequestCard({
  request: r,
  lister,
  viewerId,
  restrictedReason,
  myStatus,
}: {
  request: OpenHouseRequest;
  lister?: User;
  viewerId: string;
  restrictedReason?: string;
  myStatus?: string;
}) {
  return (
    <Link
      href={`/host/requests/${r.id}`}
      className={cn(
        "block rounded-card border bg-surface p-3.5 shadow-card transition hover:shadow-pop active:scale-[0.995]",
        r.urgent ? "border-danger-600/40" : "border-line",
        restrictedReason && "opacity-80",
      )}
    >
      <div className="flex gap-3">
        <RequestPhoto request={r} className="h-20 w-20" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="truncate font-semibold text-ink">{displayAddress(r, viewerId).split(",")[0]}</p>
            <span className="shrink-0 text-sm font-semibold text-ink">{formatCurrency(r.price)}</span>
          </div>
          <p className="flex items-center gap-1 truncate text-xs text-muted">
            <MapPinIcon size={13} className="shrink-0" />
            {r.neighborhood}
            {r.distanceMiles !== undefined && <span> · {formatDistance(r.distanceMiles)}</span>}
          </p>
          <p className="mt-1 flex items-center gap-1 text-sm text-ink-soft">
            <ClockIcon size={14} className="shrink-0 text-muted" />
            {dayLabel(r.startsAt)}, {formatTime(r.startsAt)} - {formatTime(r.endsAt)}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            {r.urgent && <UrgentPill size="sm" />}
            <OfferChip offer={r.offer} size="sm" />
            {r.instantAccept && !restrictedReason && (
              <Badge tone="accent" size="sm" icon={<BoltIcon size={12} />}>Claim now</Badge>
            )}
            {myStatus && <Badge tone="success" size="sm">{myStatus}</Badge>}
          </div>
        </div>
      </div>
      {lister && (
        <div className="mt-2.5 flex items-center justify-between gap-2 border-t border-line pt-2.5 text-xs text-ink-soft">
          <span className="truncate">Listed by {lister.name}</span>
          <Stars value={lister.stats.rating} count={lister.stats.ratingCount} />
        </div>
      )}
      {restrictedReason && (
        <p className="mt-2 flex items-start gap-1.5 rounded-lg bg-ink/5 px-2.5 py-1.5 text-xs text-ink-soft">
          <LockIcon size={13} className="mt-0.5 shrink-0" />
          Restricted: {restrictedReason}
        </p>
      )}
    </Link>
  );
}
