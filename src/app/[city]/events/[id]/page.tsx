"use client";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Badge, Button, Card, EmptyState, LIFECYCLE_STEPS, Skeleton, SkeletonText, Stepper, lifecycleIndex, AlertIcon, CalendarIcon } from "@/components/ui";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { useRequest, useUser } from "@/lib/hooks";
import { ActivityTimeline } from "@/components/event/ActivityTimeline";
import { useEventClock } from "@/components/event/clock";
import { DemoControls } from "@/components/event/DemoControls";
import { EventHero } from "@/components/event/EventHero";
import { AccessCard, AgreementCard, ChecklistCard, EmergencyContactCard, TalkingPointsCard } from "@/components/event/HandoffPanels";
import { HostLivePanel, SummaryRecap } from "@/components/event/HostLivePanel";
import { ListerLivePanel } from "@/components/event/ListerLivePanel";
import { MessageThread } from "@/components/event/MessageThread";
import { CompensationCard, RatingsCard } from "@/components/event/PostEventPanel";
import { ReportProblemButton } from "@/components/event/ReportProblem";
import type { EventCtx } from "@/components/event/shared";

function LoadingState() {
  return (
    <div className="space-y-4" role="status" aria-label="Loading event">
      <Skeleton className="h-10 w-full" />
      <Skeleton className="h-52 w-full rounded-card" />
      <Card>
        <SkeletonText lines={4} />
      </Card>
      <Card>
        <SkeletonText lines={3} />
      </Card>
    </div>
  );
}

export default function EventPage() {
  const { path } = useCity();
  const { id } = useParams<{ id: string }>();
  const { currentUser, ready } = useAuth();
  const { data: req, loading, error } = useRequest(id);
  const clock = useEventClock();

  const meId = currentUser?.id;
  const isLister = !!req && req.listerId === meId;
  const isConfirmedHost = !!req && req.confirmedHostId === meId;
  const otherId = req ? (isLister ? (req.confirmedHostId ?? req.cancelledHostIds[req.cancelledHostIds.length - 1]) : req.listerId) : undefined;
  const { data: other } = useUser(req && (isLister || isConfirmedHost || req.cancelledHostIds.includes(meId ?? "")) ? otherId : undefined);
  const { data: lister } = useUser(req?.listerId);
  const { data: host } = useUser(req?.confirmedHostId);

  const back = path(isLister ? `/lister/requests/${id}` : `/host/requests/${id}`);
  const shell = (children: React.ReactNode) => (
    <AppShell title="Day of event" back={req ? back : "/"}>
      <div className="space-y-4 pb-8">{children}</div>
    </AppShell>
  );

  if (!ready || loading || clock.now === null || !currentUser) return shell(<LoadingState />);
  if (error || !req) {
    return shell(
      <EmptyState icon={<AlertIcon size={22} />} title="Event not found" description="This request doesn't exist or was removed." action={<Button href="/">Go home</Button>} />,
    );
  }

  const nameOf = (uid: string) => (uid === lister?.id ? lister.name : uid === host?.id ? host.name : uid === other?.id ? other.name : uid === currentUser.id ? currentUser.name : "An agent");
  const now = clock.now;
  const wasHost = req.cancelledHostIds.includes(currentUser.id);

  if (!isLister && !isConfirmedHost && !wasHost) {
    return shell(
      <EmptyState
        icon={<AlertIcon size={22} />}
        title="This event isn't yours"
        description="Day-of tools are only available to the Lister and the confirmed Host."
        action={<Button href={path(`/host/requests/${id}`)}>View request</Button>}
      />,
    );
  }

  const ctx: EventCtx = { req, me: currentUser, isHost: !isLister, now, other };
  const status = req.status;
  const started = now >= new Date(req.startsAt).getTime();
  const demo = <DemoControls req={req} now={now} offsetMs={clock.offsetMs} setOffsetMs={clock.setOffsetMs} />;
  const timeline = <ActivityTimeline req={req} nameOf={nameOf} />;

  // Not a live event: reopened, never confirmed, cancelled, expired.
  if (["draft", "open", "applied", "expired", "cancelled-lister", "cancelled-host"].includes(status)) {
    const cancelled = status.startsWith("cancelled");
    return shell(
      <>
        <EventHero ctx={ctx} />
        <Card tone={cancelled ? "warn" : "default"}>
          <div className="flex items-start gap-3">
            <Badge tone={cancelled ? "danger" : "neutral"}>{cancelled ? (status === "cancelled-host" ? "Cancelled by Host" : "Cancelled by Lister") : status === "expired" ? "Expired" : "Not confirmed"}</Badge>
          </div>
          <p className="mt-2 text-sm text-ink-soft">
            {cancelled
              ? `This event was cancelled${req.cancelReason ? `: ${req.cancelReason}` : "."}`
              : status === "expired"
                ? "No host was confirmed before the event, so this request expired."
                : req.urgent
                  ? "This request was reopened and is waiting for a new host. Day-of tools return once someone is confirmed."
                  : "Day-of tools unlock once a host is confirmed."}
          </p>
          <Button className="mt-3" size="sm" variant="outline" icon={<CalendarIcon size={15} />} href={back}>
            View request
          </Button>
        </Card>
        {timeline}
        {demo}
      </>,
    );
  }

  const stepper = status !== "disputed" ? <Stepper steps={LIFECYCLE_STEPS} current={lifecycleIndex(status)} className="px-1" /> : null;
  const showHandoff = status === "confirmed" || status === "checked-in";

  return shell(
    <>
      {stepper}
      {status === "disputed" && (
        <Card tone="warn" role="status">
          <p className="flex items-center gap-2 text-sm font-semibold text-warn-700">
            <AlertIcon size={16} /> This event is in dispute
          </p>
          <p className="mt-1 text-sm text-ink-soft">A reviewer is checking the signed terms and the record. The Lister can resolve by marking payment complete.</p>
        </Card>
      )}
      <EventHero ctx={ctx} />

      {showHandoff && (
        <>
          {ctx.isHost ? <HostLivePanel ctx={ctx} /> : <ListerLivePanel ctx={ctx} />}
          <AccessCard ctx={ctx} />
          <ChecklistCard ctx={ctx} />
          <TalkingPointsCard ctx={ctx} />
          {ctx.isHost && <EmergencyContactCard ctx={ctx} />}
          <MessageThread ctx={ctx} />
          <AgreementCard ctx={ctx} />
          {(started || status === "checked-in") && <ReportProblemButton ctx={ctx} />}
          {timeline}
        </>
      )}

      {(status === "completed" || status === "disputed" || status === "settled") && (
        <>
          <SummaryRecap ctx={ctx} />
          <RatingsCard ctx={ctx} />
          <CompensationCard ctx={ctx} />
          <ReportProblemButton ctx={ctx} />
          <MessageThread ctx={ctx} readOnly={status === "settled"} />
          <AgreementCard ctx={ctx} />
          {timeline}
        </>
      )}
      {demo}
    </>,
  );
}
