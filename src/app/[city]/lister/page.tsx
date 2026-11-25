"use client";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { RequestCard } from "@/components/RequestCard";
import { Button } from "@/components/ui/Button";
import { AvatarStack } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonCard } from "@/components/ui/Skeleton";
import { Tabs } from "@/components/ui/Tabs";
import { HomeIcon, PlusIcon, UsersIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { useAsync, useRequests } from "@/lib/hooks";
import { listUsers } from "@/lib/api";
import { ACTIVE_STATUSES } from "@/lib/rules";
import type { OpenHouseRequest } from "@/lib/types";
import { cn } from "@/lib/cn";

type Tab = "active" | "past";

function Tile({ label, value, tone }: { label: string; value: number; tone?: "accent" }) {
  return (
    <div className={cn("rounded-card border p-3", tone === "accent" && value > 0 ? "border-accent-100 bg-accent-50" : "border-line bg-surface")}>
      <p className={cn("text-2xl font-semibold", tone === "accent" && value > 0 ? "text-accent-700" : "text-ink")}>{value}</p>
      <p className="text-xs text-muted">{label}</p>
    </div>
  );
}

export default function ListerDashboard() {
  const { path, key: cityKey } = useCity();
  const { currentUser } = useAuth();
  const [tab, setTab] = useState<Tab>("active");
  const { data, loading } = useRequests({ listerId: currentUser?.id ?? "", cityKey });
  const users = useAsync(listUsers, "users");

  const { active, past, needsReview, confirmed, open } = useMemo(() => {
    const all = data ?? [];
    const active = all.filter((r) => ACTIVE_STATUSES.includes(r.status)).sort((a, b) => a.startsAt.localeCompare(b.startsAt));
    const past = all.filter((r) => !ACTIVE_STATUSES.includes(r.status)).sort((a, b) => b.startsAt.localeCompare(a.startsAt));
    return {
      active, past,
      needsReview: active.filter((r) => r.status === "applied").length,
      confirmed: active.filter((r) => r.status === "confirmed" || r.status === "checked-in").length,
      open: active.filter((r) => r.status === "open").length,
    };
  }, [data]);

  const list = tab === "active" ? active : past;
  const userMap = new Map((users.data ?? []).map((u) => [u.id, u]));

  const footer = (r: OpenHouseRequest) => {
    const pending = r.applicants.filter((a) => a.status === "pending");
    if (r.status === "applied" && pending.length) {
      return (
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 font-medium text-accent-700">
            <AvatarStack users={pending.map((a) => userMap.get(a.hostId)).filter((u) => !!u)} />
            {pending.length} applicant{pending.length === 1 ? "" : "s"} to review
          </span>
          <span className="font-semibold text-brand-700">Review</span>
        </div>
      );
    }
    if (r.status === "completed" && !r.ratings.listerToHost) return <p className="text-sm font-medium text-brand-700">Event done. Rate your host to close it out.</p>;
    if (r.status === "completed" && r.payment === "unpaid") return <p className="text-sm font-medium text-warn-700">Payment is still marked unpaid.</p>;
    if (r.urgent && r.status === "open") return <p className="text-sm font-medium text-danger-600">Urgent: no host yet. Consider raising the offer.</p>;
    return null;
  };

  return (
    <AppShell
      role="lister"
      title={currentUser ? `Hi, ${currentUser.name.split(" ")[0]}` : "Requests"}
      subtitle="Your open house requests"
      actions={<Button href={path("/lister/new")} size="sm" icon={<PlusIcon size={16} />} className="hidden md:inline-flex">New request</Button>}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-2.5">
          <Tile label="Need review" value={needsReview} tone="accent" />
          <Tile label="Confirmed" value={confirmed} />
          <Tile label="Awaiting hosts" value={open} />
        </div>

        <Tabs<Tab> tabs={[{ id: "active", label: "Active", count: active.length }, { id: "past", label: "Past", count: past.length }]} value={tab} onChange={setTab} />

        <div className="space-y-3">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : list.length === 0 ? (
            <EmptyState
              icon={tab === "active" ? <HomeIcon size={22} /> : <UsersIcon size={22} />}
              title={tab === "active" ? "No active requests" : "Nothing here yet"}
              description={tab === "active" ? "Need coverage? Post an open house in under two minutes." : "Completed and closed requests show up here."}
              action={tab === "active" ? <Button href={path("/lister/new")} icon={<PlusIcon size={16} />}>New request</Button> : undefined}
            />
          ) : (
            list.map((r) => <RequestCard key={r.id} request={r} href={path(`/lister/requests/${r.id}`)} viewerId={currentUser?.id} footer={footer(r)} />)
          )}
        </div>
      </div>
    </AppShell>
  );
}
