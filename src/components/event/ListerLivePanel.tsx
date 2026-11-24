"use client";
import { useState } from "react";
import { AlertIcon, Badge, Button, Card, CheckCircleIcon, ClockIcon, Modal, PhoneIcon, SectionTitle, useToast } from "@/components/ui";
import { markNoShow } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { formatPhone, formatTime } from "@/lib/format";
import { MIN, NO_SHOW_MINUTES, formatCountdown } from "./clock";
import type { EventCtx } from "./shared";

/** Lister's live view: waiting for check-in, no-show escalation (§8), or host on site. */
export function ListerLivePanel({ ctx }: { ctx: EventCtx }) {
  const { req, now, other } = ctx;
  const toast = useToast();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const reopen = useMutation(markNoShow, {
    onSuccess: () => {
      setConfirmOpen(false);
      toast.success("The request is open again and nearby hosts were alerted.", "Reopened as urgent");
    },
    onError: (e) => toast.error(e.message),
  });
  const start = new Date(req.startsAt).getTime();
  const hostName = other?.name ?? "The host";

  if (req.status === "checked-in" && req.checkIn) {
    return (
      <Card tone="tint">
        <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-brand-800">
          <CheckCircleIcon size={18} /> {hostName} checked in at {formatTime(req.checkIn.time)}
          {req.checkIn.locationConfirmed && <Badge tone="success" size="sm">Location confirmed</Badge>}
        </p>
        <p className="mt-1 text-sm text-ink-soft">The host is on site. You&apos;ll get their summary when they check out.</p>
      </Card>
    );
  }

  if (req.status !== "confirmed" || now < start) return null;

  const lateMs = now - start;
  const escalated = lateMs >= NO_SHOW_MINUTES * MIN;

  if (!escalated) {
    return (
      <Card tone="warn">
        <p className="flex items-center gap-2 text-sm font-medium text-warn-700">
          <ClockIcon size={16} /> Waiting for {hostName} to check in
        </p>
        <p className="mt-1 text-sm text-ink-soft">
          The event has started. If there&apos;s no check-in in {formatCountdown(NO_SHOW_MINUTES * MIN - lateMs).slice(3)} we&apos;ll ping the host, then let you reopen the request.
        </p>
      </Card>
    );
  }

  return (
    <>
      <Card className="border-danger-600/40 bg-danger-50">
        <p className="flex items-center gap-2 font-semibold text-danger-700" role="alert">
          <AlertIcon size={18} /> {hostName} hasn&apos;t checked in
        </p>
        <p className="mt-1 text-sm text-ink-soft">It&apos;s been {Math.floor(lateMs / MIN)} minutes since the start. We&apos;ve already pinged them. Call to find out what&apos;s happening, or reopen the request for another host.</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {other ? (
            <a href={`tel:${other.phone}`} aria-label={`Call ${other.name} at ${formatPhone(other.phone)}`} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-[15px] font-semibold text-white hover:brightness-110">
              <PhoneIcon size={16} /> Call host
            </a>
          ) : (
            <Button disabled>Call host</Button>
          )}
          <Button variant="danger" onClick={() => setConfirmOpen(true)}>
            Reopen request
          </Button>
        </div>
      </Card>
      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Reopen as a no-show?"
        description="This is recorded on the host's reliability history."
        footer={
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => setConfirmOpen(false)}>
              Keep waiting
            </Button>
            <Button variant="danger" loading={reopen.loading} onClick={() => reopen.mutate(req.id, req.listerId)}>
              Reopen
            </Button>
          </div>
        }
      >
        <ul className="list-disc space-y-1.5 pl-5 text-sm text-ink-soft">
          <li>{hostName} gets a no-show strike. Repeat strikes suspend an account.</li>
          <li>The request returns to the feed marked Urgent for nearby hosts.</li>
          <li>The current agreement with {hostName} is voided.</li>
        </ul>
      </Modal>
    </>
  );
}

export function WaitingNote() {
  return (
    <Card>
      <SectionTitle>Day-of</SectionTitle>
      <p className="text-sm text-muted">Live tools appear here when the event starts.</p>
    </Card>
  );
}
