"use client";
import Link from "next/link";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { FeedMap } from "@/components/host/FeedMap";
import { HostRequestCard } from "@/components/host/HostRequestCard";
import { Badge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Select } from "@/components/ui/Field";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { OFFER_META } from "@/components/ui/OfferChip";
import { CalendarIcon, SearchIcon, SlidersIcon } from "@/components/ui/icons";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/cn";
import { dayLabel, formatTime } from "@/lib/format";
import { useAsync, useRequests } from "@/lib/hooks";
import { hostEligibility } from "@/lib/rules";
import type { OfferType, OpenHouseRequest, User } from "@/lib/types";

type Sort = "soonest" | "nearest" | "newest";
type DateRange = "any" | "today" | "3days" | "week";
const OFFER_TYPES: OfferType[] = ["lead", "flat", "referral", "credit"];

function inRange(iso: string, range: DateRange): boolean {
  if (range === "any") return true;
  const days = range === "today" ? 1 : range === "3days" ? 3 : 7;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const t = new Date(iso).getTime();
  return t < startOfToday.getTime() + days * 86_400_000;
}

function RadiusGraphic({ miles, shown }: { miles: number; shown: number }) {
  return (
    <svg viewBox="0 0 64 64" className="h-14 w-14 shrink-0" role="img" aria-label={`${miles} mile radius with ${shown} nearby`}>
      <circle cx="32" cy="32" r="29" className="fill-brand-50 stroke-brand-200" strokeWidth="1.5" />
      <circle cx="32" cy="32" r="18" className="fill-none stroke-brand-200" strokeDasharray="3 3" />
      <circle cx="32" cy="32" r="5" className="fill-brand-700" />
      {[[16, 20], [46, 24], [40, 46], [20, 44]].slice(0, Math.min(4, shown)).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="3" className="fill-accent-500" />
      ))}
    </svg>
  );
}

export default function Page() {
  return (
    <AppShell role="host" title="Nearby open houses">
      <Feed />
    </AppShell>
  );
}

function Feed() {
  const { currentUser: me } = useAuth();
  const [view, setView] = useState<"feed" | "map" | "schedule">("feed");
  const [offers, setOffers] = useState<OfferType[]>([]);
  const [sort, setSort] = useState<Sort>("soonest");
  const [range, setRange] = useState<DateRange>("any");
  const [maxMiles, setMaxMiles] = useState<number | null>(null);
  const radius = me?.radiusMiles ?? 10;
  const miles = maxMiles ?? radius;

  const feed = useRequests({
    hostId: me?.id,
    offerTypes: offers.length ? offers : undefined,
    maxDistanceMiles: miles,
    ignoreRadius: true,
    sort,
  });
  const schedule = useRequests({ participantId: me?.id, upcomingOnly: true, sort: "soonest" });
  const users = useAsync(() => api.listUsers(), "users");

  const userById = useMemo(() => new Map<string, User>((users.data ?? []).map((u) => [u.id, u])), [users.data]);

  if (!me) return null;

  const feedList = (feed.data ?? []).filter((r) => inRange(r.startsAt, range));
  const mySchedule = (schedule.data ?? []).filter((r) => {
    if (r.listerId === me.id) return false;
    const app = r.applicants.find((a) => a.hostId === me.id);
    return !!app && ["pending", "confirmed", "backup"].includes(app.status) && ["open", "applied", "confirmed", "checked-in"].includes(r.status);
  });

  const reasonFor = (r: OpenHouseRequest) => {
    const e = hostEligibility(r, me, userById.get(r.listerId));
    return e.ok ? undefined : e.reasons[0];
  };
  const eligible = feedList.filter((r) => !reasonFor(r));
  const urgent = eligible.filter((r) => r.urgent);
  const rest = eligible.filter((r) => !r.urgent);
  const restricted = feedList.filter((r) => reasonFor(r));

  const toggleOffer = (t: OfferType) => setOffers((o) => (o.includes(t) ? o.filter((x) => x !== t) : [...o, t]));
  const filtersActive = offers.length > 0 || range !== "any" || maxMiles !== null;

  const card = (r: OpenHouseRequest) => (
    <HostRequestCard key={r.id} request={r} lister={userById.get(r.listerId)} viewerId={me.id} restrictedReason={reasonFor(r)} />
  );

  if (view === "map") {
    return (
      <FeedMap
        requests={feedList}
        me={me}
        radiusMiles={miles}
        loading={feed.loading}
        restrictedReasons={new Map(restricted.map((r) => [r.id, reasonFor(r)!]))}
        renderCard={card}
        overlay={
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setView("feed")}
                className="flex h-11 items-center gap-1.5 rounded-full bg-surface px-4 text-sm font-semibold text-ink shadow-pop"
              >
                <span aria-hidden="true">←</span> List
              </button>
              <div className="flex h-11 min-w-0 flex-1 items-center gap-2 rounded-full bg-surface px-4 shadow-pop">
                <SearchIcon size={16} />
                <span className="truncate text-sm text-ink-soft">
                  {miles} mi around {me.homeArea}
                </span>
                <input
                  aria-label="Max distance"
                  type="range"
                  min={1}
                  max={30}
                  value={miles}
                  onChange={(e) => setMaxMiles(Number(e.target.value))}
                  className="ml-auto w-24 shrink-0 accent-brand-700"
                />
              </div>
            </div>
            <div className="-mx-3 flex gap-2 overflow-x-auto px-3 pb-1" role="group" aria-label="Offer type">
              {OFFER_TYPES.map((t) => {
                const on = offers.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleOffer(t)}
                    className={cn(
                      "shrink-0 rounded-full px-3.5 py-2 text-sm font-medium shadow-card transition",
                      on ? "bg-brand-700 text-white" : "bg-surface text-ink-soft",
                    )}
                  >
                    {OFFER_META[t].name}
                  </button>
                );
              })}
            </div>
          </div>
        }
        sections={[
          { key: "Urgent", title: <SectionTitle>Urgent: needs a host fast</SectionTitle>, items: urgent, className: "rounded-card bg-danger-50 p-2" },
          { key: "Open requests", title: <SectionTitle>{urgent.length ? "More nearby" : "Open requests"}</SectionTitle>, items: rest },
          { key: "Restricted", title: <SectionTitle>Restricted for you</SectionTitle>, items: restricted },
        ]}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3" padded>
        <RadiusGraphic miles={radius} shown={feedList.length} />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-ink">{radius} mile radius around {me.homeArea}</p>
          <p className="text-sm text-muted">
            {me.availability.alertsEnabled ? "Alerts on" : "Alerts off"} · {me.availability.days.length} days a week
          </p>
        </div>
        <Link href="/profile" className="shrink-0 text-sm font-semibold text-brand-700 hover:underline">
          Edit
        </Link>
      </Card>

      <Tabs
        value={view}
        onChange={setView}
        tabs={[
          { id: "feed", label: "List", count: feed.data ? feedList.length : undefined },
          { id: "map", label: "Map" },
          { id: "schedule", label: "My schedule", count: schedule.data ? mySchedule.length : undefined },
        ]}
      />

      {view === "schedule" ? (
        <section aria-label="My schedule" className="space-y-3">
          {schedule.loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : mySchedule.length === 0 ? (
            <EmptyState
              icon={<CalendarIcon size={22} />}
              title="Nothing on your calendar"
              description="Apply to a nearby open house and it will show up here."
            />
          ) : (
            mySchedule.map((r) => {
              const app = r.applicants.find((a) => a.hostId === me.id)!;
              const confirmed = r.confirmedHostId === me.id;
              return (
                <div key={r.id} className="space-y-1.5">
                  <HostRequestCard
                    request={r}
                    lister={userById.get(r.listerId)}
                    viewerId={me.id}
                    myStatus={confirmed ? "You're confirmed" : app.status === "backup" ? "Backup" : "Applied"}
                  />
                  <div className="flex items-center justify-between px-1 text-xs text-muted">
                    <span>
                      {dayLabel(r.startsAt)} at {formatTime(r.startsAt)}
                    </span>
                    <span className="flex gap-3 font-semibold text-brand-700">
                      <Link href={`/host/requests/${r.id}`} className="hover:underline">Details</Link>
                      {confirmed && <Link href={`/events/${r.id}`} className="hover:underline">Event page</Link>}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </section>
      ) : (
        <>
          <Card className="space-y-3" aria-label="Filters">
            <div className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-wide text-muted">
              <SlidersIcon size={15} /> Filters
              {filtersActive && (
                <button
                  type="button"
                  className="ml-auto text-xs font-semibold normal-case tracking-normal text-brand-700"
                  onClick={() => {
                    setOffers([]);
                    setRange("any");
                    setMaxMiles(null);
                  }}
                >
                  Reset
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Offer type">
              {OFFER_TYPES.map((t) => {
                const on = offers.includes(t);
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleOffer(t)}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-sm font-medium transition",
                      on ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-surface text-ink-soft hover:bg-paper",
                    )}
                  >
                    {OFFER_META[t].name}
                  </button>
                );
              })}
            </div>
            <Field label={`Max distance: ${miles} mi`} htmlFor="dist">
              <input
                id="dist"
                type="range"
                min={1}
                max={30}
                value={miles}
                onChange={(e) => setMaxMiles(Number(e.target.value))}
                className="w-full accent-brand-700"
              />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="When" htmlFor="when">
                <Select id="when" value={range} onChange={(e) => setRange(e.target.value as DateRange)}>
                  <option value="any">Any date</option>
                  <option value="today">Today</option>
                  <option value="3days">Next 3 days</option>
                  <option value="week">Next 7 days</option>
                </Select>
              </Field>
              <Field label="Sort by" htmlFor="sort">
                <Select id="sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)}>
                  <option value="soonest">Soonest</option>
                  <option value="nearest">Nearest</option>
                  <option value="newest">Newest</option>
                </Select>
              </Field>
            </div>
          </Card>

          {feed.loading ? (
            <div className="space-y-3" aria-busy="true">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : feed.error ? (
            <EmptyState title="Couldn't load the feed" description={feed.error.message} />
          ) : feedList.length === 0 ? (
            <EmptyState
              icon={<SearchIcon size={22} />}
              title="No open houses match"
              description="Try a wider distance or fewer filters, or grow your radius in your profile."
            />
          ) : (
            <>
              {urgent.length > 0 && (
                <section aria-label="Urgent">
                  <SectionTitle action={<Badge tone="danger" size="sm">{urgent.length}</Badge>}>Urgent: needs a host fast</SectionTitle>
                  <div className="space-y-3 rounded-card bg-danger-50 p-2">{urgent.map(card)}</div>
                </section>
              )}
              {rest.length > 0 && (
                <section aria-label="Open requests">
                  <SectionTitle>{urgent.length ? "More nearby" : "Open requests"}</SectionTitle>
                  <div className="space-y-3">{rest.map(card)}</div>
                </section>
              )}
              {restricted.length > 0 && (
                <section aria-label="Restricted">
                  <SectionTitle>Restricted for you</SectionTitle>
                  <div className="space-y-3">{restricted.map(card)}</div>
                </section>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
