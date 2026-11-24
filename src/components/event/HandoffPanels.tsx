"use client";
import { Badge, Button, Card, CarIcon, CheckCircleIcon, ClipboardIcon, KeyIcon, LockIcon, PhoneIcon, SectionTitle, ShieldCheckIcon, AlertIcon, useToast } from "@/components/ui";
import { acceptAgreement, toggleChecklistItem } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { formatPhone } from "@/lib/format";
import { ACCESS_REVEAL_HOURS, canViewAccessDetails, hoursUntil } from "@/lib/rules";
import { cn } from "@/lib/cn";
import { mapsLink, type EventCtx } from "./shared";

const ACCESS_LABEL = { lockbox: "Lockbox", meet: "Meet in person", "key-pickup": "Key pickup" } as const;

export function AccessCard({ ctx }: { ctx: EventCtx }) {
  const { req, me, now } = ctx;
  const full = `${req.address}, ${req.city}, ${req.state}`;
  const unlocked = canViewAccessDetails(req, me.id, now);
  const hoursToUnlock = hoursUntil(req.startsAt, now) - ACCESS_REVEAL_HOURS;
  return (
    <Card>
      <SectionTitle>Address and access</SectionTitle>
      <p className="font-medium text-ink">{full}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button size="sm" variant="outline" href={mapsLink(full)} icon={<CarIcon size={16} />}>
          Get directions
        </Button>
        <Badge tone="brand" icon={<KeyIcon size={13} />}>
          {ACCESS_LABEL[req.handoff.access]}
        </Badge>
      </div>
      <div className="mt-3">
        {unlocked ? (
          <div className="rounded-xl border border-success-600/25 bg-success-50 p-3">
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-success-700">
              <KeyIcon size={14} /> Access details
            </p>
            <p className="mt-1 text-sm text-ink">{req.handoff.accessDetails || "No access details were added. Message the Lister."}</p>
          </div>
        ) : (
          <div className="flex items-start gap-3 rounded-xl border border-line bg-paper p-3">
            <LockIcon size={18} className="mt-0.5 shrink-0 text-muted" />
            <div className="text-sm">
              <p className="font-medium text-ink">Access details unlock {ACCESS_REVEAL_HOURS}h before the event</p>
              <p className="text-muted">
                {hoursToUnlock > 24 ? `About ${Math.ceil(hoursToUnlock / 24)} days from now.` : `In about ${Math.max(1, Math.ceil(hoursToUnlock))} hour${Math.ceil(hoursToUnlock) === 1 ? "" : "s"}.`} This keeps lockbox codes private until the day is close.
              </p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

export function ChecklistCard({ ctx }: { ctx: EventCtx }) {
  const { req } = ctx;
  const toast = useToast();
  const toggle = useMutation(toggleChecklistItem, { onError: (e) => toast.error(e.message) });
  const editable = req.status === "confirmed" || req.status === "checked-in";
  const done = req.checklist.filter((c) => c.done).length;
  return (
    <Card>
      <SectionTitle action={<span className="text-xs text-muted">{done}/{req.checklist.length} done</span>}>Handoff checklist</SectionTitle>
      <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-black/[0.07]" role="progressbar" aria-valuemin={0} aria-valuemax={req.checklist.length} aria-valuenow={done} aria-label="Checklist progress">
        <div className="h-full rounded-full bg-brand-500 transition-all" style={{ width: `${req.checklist.length ? (done / req.checklist.length) * 100 : 0}%` }} />
      </div>
      <ul className="space-y-1">
        {req.checklist.map((c) => (
          <li key={c.id}>
            <label className={cn("flex min-h-11 items-center gap-3 rounded-lg px-1 py-1.5", editable && "cursor-pointer hover:bg-black/[0.03]")}>
              <input
                type="checkbox"
                className="h-5 w-5 shrink-0 accent-brand-700"
                checked={c.done}
                disabled={!editable || toggle.loading}
                onChange={() => toggle.mutate(req.id, c.id)}
              />
              <span className={cn("text-sm", c.done ? "text-muted line-through" : "text-ink")}>{c.label}</span>
            </label>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function TalkingPointsCard({ ctx }: { ctx: EventCtx }) {
  const { handoff } = ctx.req;
  return (
    <Card>
      <SectionTitle>Talking points</SectionTitle>
      <p className="text-sm leading-relaxed text-ink-soft">{handoff.talkingPoints || "No talking points were added."}</p>
      {handoff.signInExpectations && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">Sign-in expectations</p>
          <p className="mt-0.5 text-sm text-ink-soft">{handoff.signInExpectations}</p>
        </div>
      )}
      {handoff.sensitivities && (
        <div className="mt-3 rounded-xl bg-warn-50 p-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-warn-700">
            <AlertIcon size={14} /> Client sensitivities
          </p>
          <p className="mt-0.5 text-sm text-ink-soft">{handoff.sensitivities}</p>
        </div>
      )}
      {handoff.doNotDiscuss.length > 0 && (
        <div className="mt-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-danger-700">Do not discuss</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {handoff.doNotDiscuss.map((d) => (
              <li key={d}>
                <Badge tone="danger">{d}</Badge>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

export function EmergencyContactCard({ ctx }: { ctx: EventCtx }) {
  const ec = ctx.req.handoff.emergencyContact;
  return (
    <Card tone="tint">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-brand-700">Emergency contact</p>
          <p className="truncate font-medium text-ink">{ec.name}</p>
          <p className="text-sm text-ink-soft">{formatPhone(ec.phone)}</p>
        </div>
        <a href={`tel:${ec.phone}`} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-700 px-4 text-[15px] font-semibold text-white hover:bg-brand-800" aria-label={`Call ${ec.name}`}>
          <PhoneIcon size={16} /> Call
        </a>
      </div>
    </Card>
  );
}

export function AgreementCard({ ctx }: { ctx: EventCtx }) {
  const { req, me, isHost } = ctx;
  const toast = useToast();
  const accept = useMutation(acceptAgreement, { onSuccess: () => toast.success("Agreement accepted."), onError: (e) => toast.error(e.message) });
  const a = req.agreement;
  const mineAccepted = isHost ? a.acceptedByHost : a.acceptedByLister;
  const both = a.acceptedByHost && a.acceptedByLister;
  return (
    <Card>
      <SectionTitle>Agreement</SectionTitle>
      <div className="flex flex-wrap gap-2">
        <Badge tone={a.acceptedByLister ? "success" : "warn"} icon={a.acceptedByLister ? <CheckCircleIcon size={13} /> : undefined}>
          Lister {a.acceptedByLister ? "signed" : "not signed"}
        </Badge>
        <Badge tone={a.acceptedByHost ? "success" : "warn"} icon={a.acceptedByHost ? <CheckCircleIcon size={13} /> : undefined}>
          Host {a.acceptedByHost ? "signed" : "not signed"}
        </Badge>
        {both && (
          <Badge tone="brand" icon={<ShieldCheckIcon size={13} />}>
            In force
          </Badge>
        )}
      </div>
      {!mineAccepted && (
        <Button className="mt-3" size="sm" loading={accept.loading} onClick={() => accept.mutate(req.id, me.id)}>
          Accept agreement
        </Button>
      )}
      <details className="group mt-3">
        <summary className="flex cursor-pointer list-none items-center gap-1.5 text-sm font-medium text-brand-700">
          <ClipboardIcon size={15} /> Read signed terms
        </summary>
        <div className="mt-2 space-y-2 whitespace-pre-line rounded-xl bg-paper p-3 text-[13px] leading-relaxed text-ink-soft">{a.terms}</div>
      </details>
    </Card>
  );
}
