"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { RequestCard } from "@/components/RequestCard";
import { TrustCard } from "@/components/TrustCard";
import { ApplicantsPanel, ApplicantsSkeleton } from "@/components/lister/ApplicantsPanel";
import { CancelModal, EditModal, RaiseCompModal } from "@/components/lister/ManageDialogs";
import { Badge, Button, Card, EmptyState, LIFECYCLE_STEPS, SectionTitle, Skeleton, SkeletonCard, Stepper, Textarea, lifecycleIndex, useToast } from "@/components/ui";
import { AlertIcon, BoltIcon, CalendarIcon, CheckCircleIcon, ClipboardIcon, InfoIcon, MailIcon, PhoneIcon, SendIcon, UsersIcon } from "@/components/ui/icons";
import { deleteRequest, publishRequest, sendMessage, updateRequest } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApplicants, useMutation, useRequest, useUser } from "@/lib/hooks";
import { hoursUntil } from "@/lib/rules";
import { ListingMap } from "@/components/ListingMap";
import { formatCurrency,formatPhone, formatWindow, offerLabel, relativeTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { OpenHouseRequest } from "@/lib/types";

const CLOSED = ["completed", "settled", "cancelled-lister", "cancelled-host", "expired", "disputed"];

function Banner({ tone, icon, title, children, actions }: { tone: "warn" | "danger" | "info"; icon: ReactNode; title: string; children: ReactNode; actions?: ReactNode }) {
  return (
    <div
      role="status"
      className={cn(
        "rounded-card border p-3.5",
        tone === "warn" && "border-warn-600/25 bg-warn-50 text-warn-700",
        tone === "danger" && "border-danger-600/25 bg-danger-50 text-danger-700",
        tone === "info" && "border-brand-100 bg-brand-50 text-brand-800",
      )}
    >
      <div className="flex gap-2.5">
        <span className="mt-0.5 shrink-0">{icon}</span>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{title}</p>
          <div className="text-sm opacity-90">{children}</div>
          {actions && <div className="mt-3 flex flex-wrap gap-2">{actions}</div>}
        </div>
      </div>
    </div>
  );
}

function PageSkeleton() {
  return (
    <div className="mx-auto max-w-4xl space-y-4" role="status" aria-label="Loading request">
      <Skeleton className="h-16" />
      <SkeletonCard />
      <ApplicantsSkeleton />
    </div>
  );
}

function Messages({ request, hostName, userId }: { request: OpenHouseRequest; hostName: string; userId: string }) {
  const toast = useToast();
  const [text, setText] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const send = useMutation((t: string) => sendMessage(request.id, userId, t), {
    onSuccess: () => setText(""),
    onError: (e) => toast.error(e.message, "Message not sent"),
  });
  const count = request.messages.length;
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [count]);
  return (
    <section aria-label="Messages">
      <SectionTitle>Messages with {hostName.split(" ")[0]}</SectionTitle>
      <Card padded={false}>
        <div className="max-h-72 space-y-2 overflow-y-auto p-3.5" aria-live="polite">
          {count === 0 && <p className="py-4 text-center text-sm text-muted">No messages yet. Say hello and share anything about the day.</p>}
          {request.messages.map((m) => {
            const mine = m.senderId === userId;
            return (
              <div key={m.id} className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
                <p className={cn("max-w-[85%] rounded-2xl px-3.5 py-2 text-sm", mine ? "rounded-br-md bg-brand-700 text-white" : "rounded-bl-md bg-black/[0.06] text-ink")}>{m.text}</p>
                <span className="mt-0.5 text-[11px] text-muted">{mine ? "You" : hostName.split(" ")[0]} · {relativeTime(m.sentAt)}</span>
              </div>
            );
          })}
          <div ref={end} />
        </div>
        <form
          className="flex items-end gap-2 border-t border-line p-2.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (text.trim()) void send.mutate(text);
          }}
        >
          <label htmlFor="msg" className="sr-only">
            Message
          </label>
          <Textarea id="msg" rows={1} value={text} onChange={(e) => setText(e.target.value)} placeholder="Write a message" className="min-h-11 flex-1 resize-none" />
          <Button type="submit" loading={send.loading} disabled={!text.trim()} icon={<SendIcon size={16} />} aria-label="Send message">
            Send
          </Button>
        </form>
      </Card>
    </section>
  );
}

function Recap({ r, hostName }: { r: OpenHouseRequest; hostName?: string }) {
  const eventLink = r.confirmedHostId || r.checkIn || r.summary;
  const rows: [string, ReactNode][] = [];
  if (r.status === "cancelled-lister" || r.status === "cancelled-host" || r.status === "expired") {
    rows.push(["Outcome", { "cancelled-lister": "You cancelled this request", "cancelled-host": "The Host cancelled", expired: "Expired with no taker" }[r.status]]);
    if (r.cancelReason) rows.push(["Reason", r.cancelReason]);
  } else {
    if (hostName) rows.push(["Host", hostName]);
    if (r.summary) rows.push(["Attendance", `${r.summary.attendance} visitors, ${r.summary.leads.length} sign-in${r.summary.leads.length === 1 ? "" : "s"}`]);
    rows.push(["Compensation", offerLabel(r.offer)]);
    if (r.payment !== "n/a") rows.push(["Payment", r.payment]);
    if (r.ratings.listerToHost) rows.push(["Your rating", `${r.ratings.listerToHost.stars} of 5`]);
  }
  return (
    <section aria-label="Recap" className="space-y-3">
      <SectionTitle>Recap</SectionTitle>
      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-5 gap-y-2 text-sm">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="font-medium capitalize text-ink first-letter:uppercase">{v}</dd>
            </div>
          ))}
        </dl>
        {r.status === "disputed" && <p className="mt-3 rounded-xl bg-warn-50 p-3 text-sm text-warn-700">A reviewer is looking at the signed terms and the event record. You will be notified of the outcome.</p>}
      </Card>
      <div className="flex flex-wrap gap-2">
        {r.status !== "cancelled-lister" && r.status !== "cancelled-host" && r.status !== "expired" && eventLink && (
          <Button href={`/events/${r.id}`} variant="primary" icon={<ClipboardIcon size={18} />}>
            Open event record
          </Button>
        )}
      </div>
    </section>
  );
}

function Timeline({ r }: { r: OpenHouseRequest }) {
  if (!r.timeline.length) return null;
  return (
    <section aria-label="Activity">
      <SectionTitle>Activity</SectionTitle>
      <Card>
        <ol className="space-y-2.5 border-l border-line pl-4">
          {[...r.timeline].reverse().slice(0, 8).map((t, i) => (
            <li key={i} className="relative text-sm">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-300" />
              <span className="text-ink">{t.label}</span>
              <span className="ml-2 text-xs text-muted">{relativeTime(t.at)}</span>
            </li>
          ))}
        </ol>
      </Card>
    </section>
  );
}

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const toast = useToast();
  const { currentUser } = useAuth();
  const { data: r, loading, error } = useRequest(id);
  const { data: applicants, loading: appsLoading } = useApplicants(id);
  const { data: host } = useUser(r?.confirmedHostId);
  const [dlg, setDlg] = useState<null | "edit" | "cancel" | "raise">(null);
  const close = () => setDlg(null);
  const uid = currentUser?.id ?? "";

  const widen = useMutation(() => updateRequest(id, { audience: { ...r!.audience, mode: "verified", widenAfterHours: 0 } }, uid), {
    onSuccess: () => toast.success("Your request now reaches all verified agents in range.", "Audience widened"),
    onError: (e) => toast.error(e.message),
  });
  const publish = useMutation(() => publishRequest(id, uid), {
    onSuccess: () => toast.success("Your request is live.", "Published"),
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation(() => deleteRequest(id, uid), {
    onSuccess: () => {
      toast.info("Draft deleted.");
      router.replace("/lister");
    },
    onError: (e) => toast.error(e.message),
  });

  const shell = (children: ReactNode, title = "Request") => (
    <AppShell role="lister" title={title} back="/lister">
      {children}
    </AppShell>
  );

  if (loading || !currentUser) return shell(<PageSkeleton />);
  if (error || !r) {
    return shell(<EmptyState icon={<AlertIcon size={22} />} title="Request not found" description={error?.message ?? "It may have been deleted."} action={<Button href="/lister" variant="outline">Back to dashboard</Button>} />);
  }
  if (r.listerId !== currentUser.id) {
    return shell(<EmptyState icon={<AlertIcon size={22} />} title="Not your request" description="Only the Lister who posted this can manage it." action={<Button href="/lister" variant="outline">Back to dashboard</Button>} />);
  }

  const hrs = hoursUntil(r.startsAt);
  const closed = CLOSED.includes(r.status);
  const cancelledish = r.status === "cancelled-lister" || r.status === "cancelled-host" || r.status === "expired";
  const confirmed = r.status === "confirmed" || r.status === "checked-in";
  const reviewing = r.status === "open" || r.status === "applied";
  const pending = (applicants ?? []).filter((a) => a.application.status === "pending" || a.application.status === "backup");
  const title = r.address.split(",")[0];
  const noApplicants = reviewing && !appsLoading && pending.length === 0;

  return shell(
    <div className="mx-auto max-w-4xl space-y-5 pb-6">
      <RequestCard request={r} viewerId={uid} />

      <ListingMap id={r.id} lat={r.lat} lng={r.lng} precise className="h-52 rounded-card border border-line shadow-card" />

      {!cancelledish && r.status !== "draft" && <Stepper steps={LIFECYCLE_STEPS} current={lifecycleIndex(r.status)} className="px-1" />}

      {/* Edge-case banners (§8) */}
      {r.urgent && !closed && (
        <Banner tone="danger" icon={<BoltIcon size={18} />} title="Urgent: pushed to nearby Hosts">
          {r.cancelReason ? `Your previous Host cancelled (${r.cancelReason}). ` : "Your previous Host cancelled. "}
          This request is reopened with an Urgent flag.{pending.length > 0 ? ` ${pending.length} backup${pending.length === 1 ? " is" : "s are"} ready to confirm below.` : ""}
        </Banner>
      )}
      {r.pendingChange && !r.pendingChange.acknowledged && (
        <Banner tone="warn" icon={<AlertIcon size={18} />} title={r.pendingChange.significant ? "Waiting for your Host to acknowledge a significant change" : "Waiting for your Host to acknowledge changes"}>
          You changed {r.pendingChange.fields.join(", ")} {relativeTime(r.pendingChange.at)}.
          {r.pendingChange.significant && " Your Host may drop out without penalty. If they do, the request reopens as Urgent."}
        </Banner>
      )}
      {noApplicants && hrs > 0 && (
        <Banner
          tone={hrs <= 12 ? "danger" : hrs <= 48 ? "warn" : "info"}
          icon={hrs <= 48 ? <AlertIcon size={18} /> : <InfoIcon size={18} />}
          title={hrs <= 12 ? `Only ${Math.max(1, Math.round(hrs))}h to go and nobody has applied` : hrs <= 48 ? "Under 48 hours out and nobody has applied" : "No applicants yet"}
          actions={
            hrs <= 48 ? (
              <>
                <Button size="sm" variant="accent" onClick={() => setDlg("raise")}>
                  Raise compensation
                </Button>
                <Button size="sm" variant="outline" onClick={() => widen.mutate()} loading={widen.loading}>
                  Widen audience
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDlg("cancel")}>
                  Cancel
                </Button>
              </>
            ) : undefined
          }
        >
          {hrs <= 48
            ? "Hosts usually respond to a stronger offer or a wider audience. Pick a quick fix, or cancel if the seller can wait."
            : r.audience.widenAfterHours !== undefined
              ? `We will auto-widen to all verified agents after ${r.audience.widenAfterHours} hours, and nudge you at 48h and 12h before the event.`
              : "Verified agents nearby have been alerted. We will nudge you at 48h and 12h before the event."}
        </Banner>
      )}
      {noApplicants && hrs <= 0 && (
        <Banner tone="danger" icon={<AlertIcon size={18} />} title="The start time has passed">
          Nobody was confirmed. Cancel this request and repost it for a new time.
        </Banner>
      )}

      {r.status === "draft" && (
        <Card tone="tint" className="space-y-3">
          <p className="font-semibold text-brand-900">This is a draft</p>
          <p className="text-sm text-brand-800">Hosts cannot see it yet. Publishing signs the agreement on your behalf and alerts nearby verified agents.</p>
          <div className="flex gap-2">
            <Button variant="accent" loading={publish.loading} onClick={() => publish.mutate()}>
              Publish
            </Button>
            <Button variant="outline" onClick={() => setDlg("edit")}>
              Edit
            </Button>
            <Button variant="ghost" loading={del.loading} onClick={() => del.mutate()}>
              Delete
            </Button>
          </div>
        </Card>
      )}

      {reviewing && (
        <>
          {appsLoading || !applicants ? <ApplicantsSkeleton /> : <ApplicantsPanel request={r} applicants={applicants} listerId={uid} viewer={currentUser} />}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDlg("edit")}>
              Edit details
            </Button>
            <Button variant="outline" size="sm" onClick={() => setDlg("raise")}>
              Raise compensation
            </Button>
            <Button variant="outline" size="sm" onClick={() => widen.mutate()} loading={widen.loading} disabled={r.audience.mode === "verified" && r.audience.widenAfterHours === 0}>
              Widen audience
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDlg("cancel")} className="text-danger-600">
              Cancel request
            </Button>
          </div>
        </>
      )}

      {confirmed && (
        <>
          {r.pendingChange && r.pendingChange.acknowledged && (
            <Banner tone="info" icon={<CheckCircleIcon size={18} />} title="Your Host acknowledged your latest changes">
              {r.pendingChange.fields.join(", ")} updated.
            </Banner>
          )}
          <section aria-label="Your Host">
            <SectionTitle>Your Host</SectionTitle>
            {host ? (
              <div className="space-y-3">
                <TrustCard user={host} variant="compact" viewer={currentUser} />
                <Card className="flex flex-wrap items-center gap-x-5 gap-y-2 text-sm">
                  <a href={`tel:${host.phone}`} className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                    <PhoneIcon size={16} /> {formatPhone(host.phone)}
                  </a>
                  <a href={`mailto:${host.email}`} className="inline-flex items-center gap-1.5 font-medium text-brand-700">
                    <MailIcon size={16} /> {host.email}
                  </a>
                  <Badge tone={r.agreement.acceptedByHost ? "success" : "warn"}>{r.agreement.acceptedByHost ? "Agreement signed by both" : "Awaiting Host signature"}</Badge>
                </Card>
              </div>
            ) : (
              <SkeletonCard />
            )}
          </section>

          <section aria-label="Handoff checklist">
            <SectionTitle action={<span className="text-xs text-muted">{r.checklist.filter((c) => c.done).length}/{r.checklist.length} done</span>}>Handoff checklist</SectionTitle>
            <Card>
              <ul className="space-y-2">
                {r.checklist.map((c) => (
                  <li key={c.id} className="flex items-center gap-2.5 text-sm">
                    <span className={cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full", c.done ? "bg-success-600 text-white" : "border border-line-strong")}>{c.done && <CheckCircleIcon size={14} />}</span>
                    <span className={cn(c.done ? "text-muted line-through" : "text-ink")}>{c.label}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-muted">Your Host completes these on their side. You will see progress here.</p>
            </Card>
          </section>

          <Messages request={r} hostName={host?.name ?? "Host"} userId={uid} />

          <Card tone="tint" className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="flex items-center gap-1.5 font-semibold text-brand-900">
                <CalendarIcon size={16} /> {formatWindow(r.startsAt, r.endsAt)}
              </p>
              <p className="text-sm text-brand-800">Check-in, summary and ratings happen on the event page.</p>
            </div>
            <Button href={`/events/${r.id}`} variant="primary" icon={<ClipboardIcon size={18} />}>
              Open day-of view
            </Button>
          </Card>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => setDlg("edit")}>
              Edit details
            </Button>
            <Button variant="ghost" size="sm" className="text-danger-600" onClick={() => setDlg("cancel")}>
              Cancel request
            </Button>
          </div>
          {hrs > 0 && hrs < 24 && <p className="text-xs text-muted">Starts {relativeTime(r.startsAt)}. Cancelling now counts as a late cancellation.</p>}
        </>
      )}

      {closed && <Recap r={r} hostName={host?.name} />}
      {closed && cancelledish && (
        <Card className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-semibold text-ink">Want to try again?</p>
            <p className="text-sm text-muted">Start a new request with a fresh time. {formatCurrency(r.price)} listing at {title}.</p>
          </div>
          <Button href="/lister/new" variant="accent" icon={<UsersIcon size={18} />}>
            Repost
          </Button>
        </Card>
      )}
      {closed && !cancelledish && (
        <p className="text-sm text-muted">
          <Link href={`/events/${r.id}`} className="font-medium text-brand-700 underline">
            View the full event record
          </Link>{" "}
          for the summary, leads and payment status.
        </p>
      )}

      <Timeline r={r} />

      {dlg === "edit" && <EditModal open onClose={close} request={r} userId={uid} />}
      {dlg === "raise" && <RaiseCompModal open onClose={close} request={r} userId={uid} />}
      {dlg === "cancel" && <CancelModal open onClose={close} request={r} userId={uid} />}
    </div>,
    title,
  );
}
