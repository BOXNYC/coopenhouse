import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { mutualConnections, trustScore, type Mutuals } from "@/lib/rules";
import { relativeTime } from "@/lib/format";
import type { User } from "@/lib/types";
import { Avatar } from "./ui/Avatar";
import { Badge, VerificationBadges } from "./ui/Badge";
import { Stars, StarRow } from "./ui/Stars";
import { BuildingIcon, CheckCircleIcon, ShieldCheckIcon, UsersIcon } from "./ui/icons";

export interface TrustCardProps {
  user: User;
  variant?: "compact" | "expanded";
  /** The Lister viewing the card; enables the mutual-connections line. */
  viewer?: User;
  /** Precomputed mutuals (otherwise derived from viewer). */
  mutuals?: Mutuals;
  /** Right-aligned slot in the header, e.g. a Confirm button. */
  action?: ReactNode;
  className?: string;
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "bad" }) {
  return (
    <div className="rounded-xl bg-paper px-3 py-2 text-center">
      <div className={cn("text-lg font-semibold leading-tight", tone === "bad" ? "text-danger-600" : "text-ink")}>{value}</div>
      <div className="text-[11px] text-muted">{label}</div>
    </div>
  );
}

export function TrustCard({ user, variant = "compact", viewer, mutuals, action, className }: TrustCardProps) {
  const m = mutuals ?? mutualConnections(viewer, user);
  const isNew = user.stats.covered === 0 && user.stats.ratingCount === 0;
  const score = trustScore(user);
  const hasMutual = m.sameBrokerage || m.workedWithLister;

  if (variant === "compact") {
    return (
      <div className={cn("rounded-card border border-line bg-surface p-3.5 shadow-card", className)}>
        <div className="flex items-start gap-3">
          <Avatar user={user} size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate font-semibold text-ink">{user.name}</p>
              {isNew && <Badge tone="warn" size="sm">New</Badge>}
            </div>
            <p className="truncate text-xs text-muted">
              {user.brokerage} · {user.yearsLicensed === 0 ? "Newly licensed" : `${user.yearsLicensed} yr${user.yearsLicensed === 1 ? "" : "s"} licensed`}
            </p>
          </div>
          {action}
        </div>
        <div className="mt-2.5">
          <VerificationBadges badges={user.badges} compact />
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-soft">
          <Stars value={user.stats.rating} count={user.stats.ratingCount} />
          <span>{user.stats.covered} covered</span>
          <span>{user.stats.completionRate}% completion</span>
          {user.stats.noShows > 0 && <span className="font-medium text-danger-600">{user.stats.noShows} no-show</span>}
          {hasMutual && (
            <span className="inline-flex items-center gap-1 text-brand-700">
              <UsersIcon size={13} />
              {m.workedWithLister ? "Worked with you" : "Same brokerage"}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-card border border-line bg-surface p-4 shadow-card", className)}>
      <div className="flex items-start gap-3">
        <Avatar user={user} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-lg font-semibold leading-tight text-ink">{user.name}</p>
          <p className="text-sm text-muted">{user.brokerage}</p>
          <p className="mt-0.5 text-xs text-muted">
            {user.licenseState} license {user.licenseNumber.replace(/^[A-Z]+-/, "#")} · {user.yearsLicensed === 0 ? "newly licensed" : `${user.yearsLicensed} yrs licensed`}
          </p>
        </div>
        {action}
      </div>

      <div className="mt-3">
        <VerificationBadges badges={user.badges} showMissing />
      </div>

      {isNew && (
        <div className="mt-3 rounded-xl bg-warn-50 px-3 py-2.5 text-sm text-warn-700">
          New host with no history yet. Consider a lower-stakes listing to help them build a record.
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2">
        <Stat label="Covered" value={user.stats.covered} />
        <Stat label="Completion" value={`${user.stats.completionRate}%`} />
        <Stat label="No-shows" value={user.stats.noShows} tone={user.stats.noShows > 0 ? "bad" : undefined} />
        <Stat label="Rating" value={user.stats.ratingCount ? user.stats.rating.toFixed(1) : "-"} />
      </div>

      <ul className="mt-4 space-y-2 text-sm text-ink-soft">
        <li className="flex items-center gap-2">
          <ShieldCheckIcon size={16} className={user.eoInsured ? "text-success-600" : "text-muted"} />
          {user.eoInsured ? "E&O insurance (self-attested)" : "No E&O insurance on file"}
        </li>
        {m.sameBrokerage && (
          <li className="flex items-center gap-2 text-brand-700">
            <BuildingIcon size={16} /> Same brokerage as you
          </li>
        )}
        {m.workedWithLister && (
          <li className="flex items-center gap-2 text-brand-700">
            <UsersIcon size={16} /> Has covered for you before
          </li>
        )}
        {!hasMutual && viewer && (
          <li className="flex items-center gap-2 text-muted">
            <UsersIcon size={16} /> No mutual connections
          </li>
        )}
        <li className="flex items-center gap-2">
          <CheckCircleIcon size={16} className="text-muted" /> Trust score {score}/100
        </li>
      </ul>

      {user.reviews.length > 0 && (
        <div className="mt-4 border-t border-line pt-3">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted">Recent reviews</p>
          <ul className="space-y-3">
            {user.reviews.slice(0, 3).map((r) => (
              <li key={r.id}>
                <div className="flex items-center gap-2">
                  <StarRow value={r.stars} size={13} />
                  <span className="text-xs text-muted">
                    {r.fromName} · {relativeTime(r.createdAt)}
                  </span>
                </div>
                <p className="mt-0.5 text-sm text-ink-soft">&ldquo;{r.comment}&rdquo;</p>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
