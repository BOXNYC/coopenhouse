"use client";
import { useState } from "react";
import { Avatar, Badge, Button, Card, CheckCircleIcon, DollarIcon, FlagIcon, LockIcon, Modal, SectionTitle, SparkleIcon, StarInput, StarRow, Textarea, AlertIcon, useToast } from "@/components/ui";
import { markPaid, openDispute, sendMessage, submitRating } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { formatDateTime, offerLabel, relativeTime } from "@/lib/format";
import { visibleRatings } from "@/lib/rules";
import type { Rating } from "@/lib/types";
import type { EventCtx } from "./shared";

function RatingLine({ who, user, rating, highlight }: { who: string; user?: { initials: string; avatarColor: string; name: string }; rating: Rating; highlight?: boolean }) {
  return (
    <div className={`rounded-xl p-3 ${highlight ? "bg-accent-50" : "bg-paper"}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-ink">
          {user && <Avatar user={user} size="xs" />}
          {who}
        </span>
        <StarRow value={rating.stars} />
      </div>
      {rating.comment && <p className="mt-1.5 text-sm text-ink-soft">&ldquo;{rating.comment}&rdquo;</p>}
    </div>
  );
}

export function RatingsCard({ ctx }: { ctx: EventCtx }) {
  const { req, me, other, isHost, now } = ctx;
  const toast = useToast();
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState("");
  const [revealed, setRevealed] = useState(req.status === "settled");
  const submit = useMutation(submitRating, {
    onSuccess: () => toast.success("Your rating is locked in.", "Thank you"),
    onError: (e) => toast.error(e.message),
  });
  const v = visibleRatings(req, me.id);
  const otherFirst = other?.name.split(" ")[0] ?? "them";
  const rawTheirs = isHost ? req.ratings.listerToHost : req.ratings.hostToLister;

  return (
    <Card>
      <SectionTitle>{isHost ? "Rate the Lister" : "Confirm completion and rate"}</SectionTitle>
      {!v.mine ? (
        <div className="space-y-3">
          <p className="text-sm text-ink-soft">
            {isHost
              ? `How was working with ${other?.name ?? "the Lister"}? Ratings stay hidden until you both submit, so neither is influenced by the other.`
              : `Confirm ${other?.name ?? "the host"} covered the event as reported, then rate them. Ratings stay hidden until you both submit.`}
          </p>
          {rawTheirs && (
            <p className="flex items-center gap-1.5 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800">
              <LockIcon size={14} /> {otherFirst} already rated you. Submit yours to reveal it.
            </p>
          )}
          <div>
            <StarInput value={stars} onChange={setStars} />
            {stars === 0 && <p className="mt-1 text-xs text-muted">Tap a star to rate.</p>}
          </div>
          <Textarea aria-label="Comment" rows={3} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a short comment (optional)" maxLength={400} />
          <Button fullWidth disabled={stars === 0} loading={submit.loading} icon={<CheckCircleIcon size={18} />} onClick={() => submit.mutate(req.id, me.id, { stars, comment: comment.trim() })}>
            {isHost ? "Submit rating" : "Confirm completion and submit rating"}
          </Button>
        </div>
      ) : !v.bothSubmitted ? (
        <div className="space-y-3">
          <RatingLine who="Your rating" rating={v.mine} />
          <p className="flex items-center gap-2 rounded-xl bg-paper px-3 py-3 text-sm text-ink-soft">
            <LockIcon size={16} className="shrink-0 text-muted" />
            Waiting for {otherFirst} to rate. Both ratings are revealed at the same time.
          </p>
        </div>
      ) : !revealed ? (
        <div className="py-2 text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent-50 text-accent-600">
            <SparkleIcon size={24} />
          </div>
          <p className="font-semibold text-ink">Both ratings are in</p>
          <p className="mb-3 text-sm text-muted">See what {otherFirst} said about you.</p>
          <Button variant="accent" onClick={() => setRevealed(true)}>
            Reveal ratings
          </Button>
        </div>
      ) : (
        <div className="animate-pop-in space-y-2">
          {v.theirs && <RatingLine who={`${other?.name ?? "They"} rated you`} user={other} rating={v.theirs} highlight />}
          {v.mine && <RatingLine who="Your rating" rating={v.mine} />}
          <p className="pt-1 text-center text-xs text-muted">Revealed {relativeTime(new Date(Math.max(new Date(v.mine.submittedAt).getTime(), new Date(v.theirs?.submittedAt ?? 0).getTime())).toISOString(), now)}. These now appear on both profiles.</p>
        </div>
      )}
    </Card>
  );
}

const PAYMENT_BADGE = {
  unpaid: { tone: "warn", label: "Unpaid" },
  paid: { tone: "success", label: "Paid" },
  disputed: { tone: "danger", label: "Disputed" },
  "n/a": { tone: "neutral", label: "No payment due" },
} as const;

export function CompensationCard({ ctx }: { ctx: EventCtx }) {
  const { req, me, other, isHost } = ctx;
  const toast = useToast();
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [reason, setReason] = useState("");
  const paid = useMutation(markPaid, { onSuccess: () => toast.success("Marked as paid.", "Payment recorded"), onError: (e) => toast.error(e.message) });
  const nudge = useMutation(sendMessage, { onSuccess: () => toast.success("Reminder sent in your message thread."), onError: (e) => toast.error(e.message) });
  const dispute = useMutation(openDispute, {
    onSuccess: () => {
      setDisputeOpen(false);
      setReason("");
      toast.info("A reviewer will check the signed terms and the record.", "Dispute opened");
    },
    onError: (e) => toast.error(e.message),
  });
  const pay = PAYMENT_BADGE[req.payment];
  const termsLead = req.agreement.terms.split("\n\n")[0];
  const canDispute = ["completed", "settled"].includes(req.status);
  const hostFirst = other?.name.split(" ")[0] ?? "the host";
  const listerFirst = other?.name.split(" ")[0] ?? "the Lister";

  return (
    <Card>
      <SectionTitle action={<Badge tone={pay.tone}>{pay.label}</Badge>}>Compensation record</SectionTitle>
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent-50 text-accent-600">
          <DollarIcon size={20} />
        </span>
        <div>
          <p className="font-semibold text-ink">{offerLabel(req.offer)}</p>
          <p className="text-xs text-muted">{req.agreement.acceptedByHost && req.agreement.acceptedByLister ? "Both agents signed the agreement" : "Agreement not fully signed"}</p>
        </div>
      </div>
      <p className="mt-3 rounded-xl bg-paper p-3 text-[13px] leading-relaxed text-ink-soft">{termsLead}</p>

      {req.payment === "unpaid" && (
        <div className="mt-3 rounded-xl bg-warn-50 p-3 text-sm">
          {isHost ? (
            <>
              <p className="font-medium text-warn-700">Not marked as paid yet</p>
              <p className="mt-0.5 text-ink-soft">If it&apos;s been a few days, a friendly nudge usually does it. Persistent non-payment affects the Lister&apos;s rating.</p>
              <Button className="mt-2" size="sm" variant="outline" loading={nudge.loading} onClick={() => nudge.mutate(req.id, me.id, `Hi ${listerFirst}, friendly reminder about the ${offerLabel(req.offer)} for ${req.address}. Thanks again!`)}>
                Send a friendly reminder
              </Button>
            </>
          ) : (
            <>
              <p className="font-medium text-warn-700">Payment due to {hostFirst}</p>
              <p className="mt-0.5 text-ink-soft">Settle outside CoOpenHouse (Venmo or brokerage check), then mark it paid here so the record is clean.</p>
            </>
          )}
        </div>
      )}
      {req.payment === "disputed" && (
        <p className="mt-3 flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger-700">
          <AlertIcon size={16} className="mt-0.5 shrink-0" /> Payment is under dispute. A reviewer will decide based on the signed terms and the record.
        </p>
      )}
      {req.payment === "paid" && (
        <p className="mt-3 flex items-center gap-1.5 text-sm text-success-700">
          <CheckCircleIcon size={16} /> Marked as paid.
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {!isHost && (req.payment === "unpaid" || req.payment === "disputed") && (
          <Button loading={paid.loading} onClick={() => paid.mutate(req.id, me.id)} icon={<CheckCircleIcon size={16} />}>
            {req.payment === "disputed" ? "Mark as paid and resolve" : "Mark as paid"}
          </Button>
        )}
        {canDispute && (
          <Button variant="ghost" icon={<FlagIcon size={15} />} onClick={() => setDisputeOpen(true)}>
            Open dispute
          </Button>
        )}
      </div>

      {req.disputes.length > 0 && (
        <ul className="mt-3 space-y-1.5">
          {req.disputes.map((d) => (
            <li key={d.id} className="rounded-xl bg-paper p-3 text-sm">
              <p className="text-xs text-muted">
                Opened by {d.openedBy === me.id ? "you" : (other?.name ?? "the other agent")} · {formatDateTime(d.createdAt)} · {d.status}
              </p>
              <p className="mt-0.5 text-ink-soft">{d.reason}</p>
            </li>
          ))}
        </ul>
      )}

      <Modal
        open={disputeOpen}
        onClose={() => setDisputeOpen(false)}
        title="Open a dispute"
        description="A reviewer compares the signed terms, check-in record and sign-in sheet."
        footer={
          <Button fullWidth variant="danger" loading={dispute.loading} disabled={reason.trim().length < 5} onClick={() => dispute.mutate(req.id, me.id, reason.trim())}>
            Open dispute
          </Button>
        }
      >
        <label htmlFor="dispute-reason" className="mb-1.5 block text-sm font-medium text-ink">
          What&apos;s the disagreement?
        </label>
        <Textarea id="dispute-reason" rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="For example: payment not received, lead conflict, terms not followed." />
        <p className="mt-2 text-xs text-muted">Try messaging first. Disputes pause settlement until a reviewer decides.</p>
      </Modal>
    </Card>
  );
}
