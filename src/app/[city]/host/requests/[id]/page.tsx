"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useId, useState, type ReactNode } from "react";
import { AppShell } from "@/components/AppShell";
import { TrustCard } from "@/components/TrustCard";
import { ListingMap } from "@/components/ListingMap";
import { RequestPhoto } from "@/components/RequestCard";
import { directionsUrl, downloadIcs, penaltyFor } from "@/components/host/helpers";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Field, Textarea } from "@/components/ui/Field";
import { Modal } from "@/components/ui/Modal";
import { OFFER_META, OfferChip } from "@/components/ui/OfferChip";
import { Skeleton, SkeletonCard } from "@/components/ui/Skeleton";
import { StatusPill, UrgentPill } from "@/components/ui/StatusPill";
import { useToast } from "@/components/ui/Toast";
import {
  AlertIcon, BedIcon, BathIcon, BoltIcon, CalendarIcon, CarIcon, CheckCircleIcon, ChevronDownIcon,
  ClipboardIcon, ClockIcon, KeyIcon, LockIcon, MapPinIcon,
} from "@/components/ui/icons";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { cn } from "@/lib/cn";
import { formatCurrency, formatDuration, formatPhone, formatWindow, offerLabel, relativeTime } from "@/lib/format";
import { useAsync, useMutation, useRequest, useUser } from "@/lib/hooks";
import {
  agreementTerms, canViewAccessDetails, canViewContact, canViewFullAddress, displayAddress, hoursUntil,
} from "@/lib/rules";
import type { OpenHouseRequest, User } from "@/lib/types";

export default function Page() {
  const { path } = useCity();
  return (
    <AppShell role="host" title="Request details" back={path("/host")}>
      <Detail />
    </AppShell>
  );
}

const ACCESS_LABEL = { lockbox: "Lockbox", meet: "Meet the Lister on site", "key-pickup": "Key pickup" } as const;

function offerExplainer(r: OpenHouseRequest): { gets: string; detail: string } {
  const o = r.offer;
  switch (o.type) {
    case "lead":
      return {
        gets: "You keep the leads",
        detail: "Any visitors who sign in as unrepresented are yours to follow up with. No payment changes hands. The Lister keeps the seller relationship.",
      };
    case "flat":
      return {
        gets: `${formatCurrency(o.amount ?? 0)} paid by the Lister`,
        detail: "A fixed fee settled outside CoOpenHouse (Venmo or a brokerage check) after the event is completed. The leads stay with the Lister.",
      };
    case "referral":
      return {
        gets: `${o.percent ?? 0}% referral split`,
        detail: `If a lead you generate converts, you share ${o.percent ?? 0}% of the commission with the Lister, per the agreement. You may follow up with unrepresented visitors.`,
      };
    case "credit":
      return {
        gets: `${o.credits ?? 1} cover credit${(o.credits ?? 1) === 1 ? "" : "s"}`,
        detail: "A favor swap. Credits are added to your balance on completion and can be spent when you need someone to cover your own open house.",
      };
  }
}

function Row({ icon, children, className }: { icon: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5 text-sm text-ink-soft", className)}>
      <span className="mt-0.5 shrink-0 text-muted">{icon}</span>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

function Detail() {
  const { path } = useCity();
  const { id } = useParams<{ id: string }>();
  const { currentUser: me } = useAuth();
  const req = useRequest(id, me?.id);
  const lister = useUser(req.data?.listerId);
  const elig = useAsync(() => api.getEligibility(id, me!.id), `elig:${id}:${me?.id}`, { enabled: !!me });

  if (req.loading || !me) {
    return (
      <div className="space-y-4" aria-busy="true">
        <Skeleton className="h-44 w-full rounded-card" />
        <SkeletonCard />
        <SkeletonCard />
      </div>
    );
  }
  if (req.error || !req.data) {
    return (
      <EmptyState
        icon={<AlertIcon size={22} />}
        title="Request not found"
        description="It may have been removed."
        action={<Button href={path("/host")} variant="secondary">Back to feed</Button>}
      />
    );
  }
  return <Body r={req.data} me={me} lister={lister.data} eligible={elig.data} />;
}

function Body({ r, me, lister, eligible }: { r: OpenHouseRequest; me: User; lister?: User; eligible?: { ok: boolean; reasons: string[] } }) {
  const app = r.applicants.find((a) => a.hostId === me.id && a.status !== "withdrawn");
  const confirmed = r.confirmedHostId === me.id;
  const fullAddr = canViewFullAddress(r, me.id);
  const closed = ["completed", "settled", "cancelled-lister", "cancelled-host", "expired", "disputed"].includes(r.status);
  const filledByOther = !!r.confirmedHostId && !confirmed;
  const explain = offerExplainer(r);
  const hoursOut = hoursUntil(r.startsAt);
  const canApply = !app && !closed && !filledByOther && (r.status === "open" || r.status === "applied") && eligible?.ok;
  const restricted = !app && !closed && !filledByOther && eligible && !eligible.ok;

  return (
    <div className="space-y-4">
      {/* Hero */}
      <div className="overflow-hidden rounded-card border border-line bg-surface shadow-card">
        <RequestPhoto request={r} className="h-44 w-full rounded-none" />
        <ListingMap id={r.id} lat={r.lat} lng={r.lng} precise={fullAddr} className="h-52 border-y border-line" />
        <div className="space-y-2 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusPill status={r.status} />
            {r.urgent && <UrgentPill />}
            {r.instantAccept && (
              <Badge tone="accent" icon={<BoltIcon size={13} />}>Claim now</Badge>
            )}
          </div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-xl font-semibold leading-tight text-ink">{displayAddress(r, me.id)}</h2>
            <span className="shrink-0 text-lg font-semibold text-ink">{formatCurrency(r.price)}</span>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-soft">
            <span className="inline-flex items-center gap-1"><BedIcon size={15} /> {r.beds} bd</span>
            <span className="inline-flex items-center gap-1"><BathIcon size={15} /> {r.baths} ba</span>
            {r.sqft && <span>{r.sqft.toLocaleString()} sqft</span>}
            {r.distanceMiles !== undefined && <span className="inline-flex items-center gap-1"><MapPinIcon size={15} /> {r.distanceMiles} mi from you</span>}
          </div>
          {!fullAddr && (
            <p className="flex items-start gap-1.5 rounded-lg bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <LockIcon size={15} className="mt-0.5 shrink-0" />
              Full address unlocked after you apply. Only the neighborhood is shown until then.
            </p>
          )}
        </div>
      </div>

      {/* State banners */}
      <StateBanner r={r} me={me} app={app} confirmed={confirmed} closed={closed} filledByOther={filledByOther} restrictedReasons={restricted ? eligible?.reasons : undefined} />

      {confirmed && <ConfirmedPanel r={r} me={me} lister={lister} />}

      {/* Terms */}
      <Card>
        <SectionTitle>When and what</SectionTitle>
        <div className="space-y-2.5">
          <Row icon={<CalendarIcon size={16} />}>{formatWindow(r.startsAt, r.endsAt)} ({formatDuration(r.startsAt, r.endsAt)})</Row>
          <Row icon={<ClockIcon size={16} />}>Starts {relativeTime(r.startsAt)}</Row>
          <Row icon={<ClipboardIcon size={16} />}>
            Included: running the open house, sign-in sheet, talking points and a short close-out summary with condition photos.
          </Row>
        </div>
      </Card>

      {/* Offer */}
      <Card tone="tint">
        <SectionTitle>The offer</SectionTitle>
        <div className="flex items-center gap-2">
          <OfferChip offer={r.offer} variant="full" />
        </div>
        <p className="mt-2 text-sm font-semibold text-ink">What you get: {explain.gets}</p>
        <p className="mt-1 text-sm text-ink-soft">{explain.detail}</p>
        <p className="mt-2 text-xs text-muted">{OFFER_META[r.offer.type].blurb}</p>
      </Card>

      {/* Lister trust */}
      {lister ? (
        <div>
          <SectionTitle>Listed by</SectionTitle>
          <TrustCard user={lister} variant="compact" />
        </div>
      ) : (
        <SkeletonCard />
      )}

      {/* Handoff */}
      <Card>
        <SectionTitle>Handoff expectations</SectionTitle>
        <div className="space-y-2.5">
          <Row icon={<KeyIcon size={16} />}>
            Access: <strong className="text-ink">{ACCESS_LABEL[r.handoff.access]}</strong>.{" "}
            {confirmed ? "Access details are released to you shortly before the event." : "Details are shared only after you are confirmed."}
          </Row>
          <Row icon={<ClipboardIcon size={16} />}>Sign-in: {r.handoff.signInExpectations}</Row>
          {confirmed ? (
            <>
              <Row icon={<ClipboardIcon size={16} />}>Talking points: {r.handoff.talkingPoints}</Row>
              {r.handoff.sensitivities && <Row icon={<AlertIcon size={16} />}>Sensitivities: {r.handoff.sensitivities}</Row>}
              {r.handoff.doNotDiscuss.length > 0 && (
                <Row icon={<AlertIcon size={16} />}>Do not discuss: {r.handoff.doNotDiscuss.join(", ")}</Row>
              )}
            </>
          ) : (
            <Row icon={<LockIcon size={16} />}>Talking points, sensitivities and contact details unlock when you are confirmed.</Row>
          )}
        </div>
      </Card>

      {canApply && <ApplyPanel r={r} me={me} />}
      {app && !confirmed && !closed && <ApplicantPanel r={r} status={app.status} />}
      {confirmed && !closed && <HostCancel r={r} hoursOut={hoursOut} />}
    </div>
  );
}

function StateBanner({
  r, me, app, confirmed, closed, filledByOther, restrictedReasons,
}: {
  r: OpenHouseRequest; me: User; app?: OpenHouseRequest["applicants"][number]; confirmed: boolean; closed: boolean; filledByOther: boolean; restrictedReasons?: string[];
}) {
  if (closed) {
    const text = r.status.startsWith("cancelled") ? "This request was cancelled." : r.status === "expired" ? "This request expired." : "This event is finished.";
    return <Banner tone="neutral" title="Closed" text={text} />;
  }
  if (confirmed) {
    return r.pendingChange && !r.pendingChange.acknowledged ? <ChangePanel r={r} me={me} /> : null;
  }
  if (app?.status === "backup") return <Banner tone="warn" title="You are a backup" text="Another host was confirmed. You will be notified if the spot opens up again." />;
  if (app?.status === "declined") return <Banner tone="neutral" title="Not selected" text="The Lister chose another host for this one." />;
  if (filledByOther) return <Banner tone="neutral" title="Filled" text="A host has already been confirmed for this open house." />;
  if (restrictedReasons) {
    return (
      <Card tone="warn">
        <p className="flex items-center gap-2 font-semibold text-warn-700"><LockIcon size={16} /> You can&apos;t apply to this one</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-warn-700">
          {restrictedReasons.map((x) => <li key={x}>{x}</li>)}
        </ul>
        <p className="mt-2 text-xs text-warn-700">Some restrictions widen after a while. Check back later.</p>
      </Card>
    );
  }
  return null;
}

function Banner({ tone, title, text }: { tone: "neutral" | "warn" | "success"; title: string; text: string }) {
  return (
    <Card tone={tone === "warn" ? "warn" : tone === "success" ? "tint" : "default"}>
      <p className="font-semibold text-ink">{title}</p>
      <p className="mt-0.5 text-sm text-ink-soft">{text}</p>
    </Card>
  );
}

function ApplyPanel({ r, me }: { r: OpenHouseRequest; me: User }) {
  const { path } = useCity();
  const toast = useToast();
  const [agree, setAgree] = useState(false);
  const [broker, setBroker] = useState(false);
  const [note, setNote] = useState("");
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<"applied" | "claimed" | null>(null);
  const agreeId = useId();
  const brokerId = useId();
  const noteId = useId();
  const ready = agree && broker;

  const apply = useMutation(() => api.applyToRequest(r.id, me.id, note.trim()), {
    onSuccess: () => {
      setDone("applied");
      toast.success("Application sent. The full address is now unlocked.");
    },
    onError: (e) => toast.error(e.message),
  });
  const claim = useMutation(() => api.claimNow(r.id, me.id), {
    onSuccess: () => {
      setDone("claimed");
      toast.success("You're confirmed!");
    },
    onError: (e) => toast.error(e.message),
  });

  if (done) {
    return (
      <Card tone="tint" className="text-center">
        <CheckCircleIcon size={36} className="mx-auto text-success-600" />
        <p className="mt-2 text-lg font-semibold text-ink">{done === "claimed" ? "You're confirmed" : "Application sent"}</p>
        <p className="mt-1 text-sm text-ink-soft">
          {done === "claimed"
            ? "Contact details and the handoff are unlocked. Add it to your calendar below."
            : "The Lister has been notified. You'll hear back soon."}
        </p>
        <div className="mt-3 flex justify-center gap-2">
          <Button href={path("/host")} variant="outline" size="sm">Back to feed</Button>
          {done === "claimed" && <Button href={path(`/events/${r.id}`)} size="sm">Open event</Button>}
        </div>
      </Card>
    );
  }

  return (
    <Card className="space-y-4">
      <SectionTitle className="mb-0">Apply</SectionTitle>

      <div className="rounded-xl bg-paper p-3 text-sm text-ink-soft">
        <p className="font-semibold text-ink">Lead ownership</p>
        <p className="mt-0.5">
          You may follow up with visitors who sign in as unrepresented. You may not solicit the seller or represent the listing. The Lister keeps the seller relationship.
        </p>
        <button
          type="button"
          className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-brand-700"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? "Hide" : "Read"} the full agreement <ChevronDownIcon size={14} className={cn("transition", open && "rotate-180")} />
        </button>
        {open && <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-relaxed text-ink-soft">{r.agreement.terms || agreementTerms(offerLabel(r.offer))}</pre>}
      </div>

      <label htmlFor={agreeId} className="flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input id={agreeId} type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700" />
        I agree to the lead-ownership rule and the agreement terms.
      </label>
      <label htmlFor={brokerId} className="flex cursor-pointer items-start gap-3 text-sm text-ink">
        <input id={brokerId} type="checkbox" checked={broker} onChange={(e) => setBroker(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand-700" />
        I confirm my brokerage ({me.brokerage}) permits me to host this open house.
      </label>

      <Field label="Note to the Lister" optional htmlFor={noteId}>
        <Textarea id={noteId} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything that helps them say yes, e.g. your experience in this area." maxLength={400} />
      </Field>

      {!ready && <p className="text-xs text-muted">Tick both boxes to continue.</p>}
      <div className="space-y-2">
        {r.instantAccept && (
          <Button variant="accent" size="lg" fullWidth icon={<BoltIcon size={18} />} disabled={!ready || apply.loading} loading={claim.loading} onClick={() => claim.mutate()}>
            Claim now
          </Button>
        )}
        <Button variant={r.instantAccept ? "outline" : "primary"} size="lg" fullWidth disabled={!ready || claim.loading} loading={apply.loading} onClick={() => apply.mutate()}>
          {r.instantAccept ? "Apply and wait for review" : "Apply with one tap"}
        </Button>
        {r.instantAccept && <p className="text-center text-xs text-muted">Claim now confirms you instantly if you are first.</p>}
      </div>
    </Card>
  );
}

function ApplicantPanel({ r, status }: { r: OpenHouseRequest; status: string }) {
  const toast = useToast();
  const { currentUser: me } = useAuth();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const withdraw = useMutation(() => api.withdrawApplication(r.id, me!.id), {
    onSuccess: (res) => {
      setConfirmOpen(false);
      toast.success(res.message);
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2">
        <CheckCircleIcon size={20} className="text-success-600" />
        <p className="font-semibold text-ink">{status === "backup" ? "You are a backup" : "You applied"}</p>
      </div>
      <p className="text-sm text-ink-soft">The full address is unlocked. The Lister is reviewing applicants, and you can withdraw any time without penalty.</p>
      <Button variant="outline" fullWidth onClick={() => setConfirmOpen(true)}>Withdraw application</Button>
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Withdraw application?"
        description="No penalty applies before you are confirmed."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setConfirmOpen(false)}>Keep it</Button>
            <Button variant="danger" fullWidth loading={withdraw.loading} onClick={() => withdraw.mutate()}>Withdraw</Button>
          </div>
        }
      >
        <p className="text-sm text-ink-soft">You will lose your place in line, and the address goes back to neighborhood only.</p>
      </Modal>
    </Card>
  );
}

function ChangePanel({ r, me }: { r: OpenHouseRequest; me: User }) {
  const toast = useToast();
  const change = r.pendingChange!;
  const ack = useMutation((accept: boolean) => api.acknowledgeChange(r.id, me.id, accept), {
    onSuccess: () => toast.success("Updated."),
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card tone="warn" className="space-y-3">
      <p className="flex items-center gap-2 font-semibold text-warn-700">
        <AlertIcon size={18} /> {change.significant ? "Significant change" : "Details changed"} {relativeTime(change.at)}
      </p>
      <p className="text-sm text-warn-700">The Lister updated: {change.fields.join(", ")}. Please review and acknowledge.</p>
      <Button fullWidth loading={ack.loading} onClick={() => ack.mutate(true)}>Acknowledge and keep my spot</Button>
      {change.significant && (
        <Button variant="outline" fullWidth disabled={ack.loading} onClick={() => ack.mutate(false)}>
          Drop out without penalty
        </Button>
      )}
    </Card>
  );
}

function ConfirmedPanel({ r, me, lister }: { r: OpenHouseRequest; me: User; lister?: User }) {
  const { path } = useCity();
  const showAccess = canViewAccessDetails(r, me.id);
  const showContact = canViewContact(r, me.id);
  const total = r.checklist.length;
  return (
    <Card tone="tint" className="space-y-3">
      <p className="flex items-center gap-2 text-lg font-semibold text-ink">
        <CheckCircleIcon size={22} className="text-success-600" /> You&apos;re confirmed
      </p>
      <div className="space-y-2">
        <Row icon={<MapPinIcon size={16} />}>
          {r.address}, {r.city}, {r.state}
        </Row>
        <Row icon={<KeyIcon size={16} />}>
          {showAccess ? (r.handoff.accessDetails ?? "Details will be shared by the Lister.") : "Access details unlock 48 hours before the event."}
        </Row>
        {showContact && lister && (
          <Row icon={<ClipboardIcon size={16} />}>
            {lister.name} · {formatPhone(lister.phone)} · {lister.email}
          </Row>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" icon={<CalendarIcon size={15} />} onClick={() => downloadIcs(r, me.id)}>Add to calendar</Button>
        <a
          href={directionsUrl(r)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line-strong bg-surface px-3 text-sm font-semibold text-ink hover:bg-paper"
        >
          <CarIcon size={15} /> Directions
        </a>
        <Button size="sm" href={path(`/events/${r.id}`)}>Open event page</Button>
      </div>
      <div className="rounded-xl bg-surface p-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted">Handoff checklist</p>
        <ul className="mt-2 space-y-1.5 text-sm text-ink-soft">
          {r.checklist.slice(0, 4).map((c) => (
            <li key={c.id} className="flex items-center gap-2">
              <CheckCircleIcon size={15} className={c.done ? "text-success-600" : "text-line-strong"} /> {c.label}
            </li>
          ))}
        </ul>
        {total > 4 && (
          <Link href={path(`/events/${r.id}`)} className="mt-2 inline-block text-xs font-semibold text-brand-700">
            See all {total} steps
          </Link>
        )}
      </div>
    </Card>
  );
}

function HostCancel({ r, hoursOut }: { r: OpenHouseRequest; hoursOut: number }) {
  const toast = useToast();
  const { currentUser: me } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const pen = penaltyFor(hoursOut);
  const cancel = useMutation(() => api.cancelRequest(r.id, me!.id, reason.trim()), {
    onSuccess: (res) => {
      setOpen(false);
      toast.info(res.message);
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Card className="space-y-2">
      <SectionTitle className="mb-0">Can&apos;t make it?</SectionTitle>
      <p className="text-sm text-ink-soft">
        Cancelling now would cost <strong>{pen.points} completion-rate point{pen.points === 1 ? "" : "s"}</strong> ({pen.tier.toLowerCase()}). The request reopens
        {hoursOut < 48 ? " as Urgent" : ""} for other hosts.
      </p>
      <Button variant="outline" fullWidth onClick={() => setOpen(true)}>Cancel as host</Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel your confirmation?"
        footer={
          <div className="flex gap-2">
            <Button variant="outline" fullWidth onClick={() => setOpen(false)}>Keep it</Button>
            <Button variant="danger" fullWidth loading={cancel.loading} onClick={() => cancel.mutate()}>Cancel hosting</Button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-ink-soft">
          <div className="rounded-xl bg-danger-50 p-3 text-danger-700">
            <p className="font-semibold">Penalty: -{pen.points} completion points</p>
            <p className="mt-0.5 text-xs">Scale: 72h+ = 1, 24-72h = 3, under 24h = 8, under 2h = 15. Repeated no-shows can suspend your account.</p>
          </div>
          <Field label="Reason for the Lister" optional htmlFor="cancel-reason">
            <Textarea id="cancel-reason" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </Card>
  );
}
