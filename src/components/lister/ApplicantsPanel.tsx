"use client";
import { useState } from "react";
import { TrustCard } from "@/components/TrustCard";
import { Badge, Button, Card, EmptyState, Modal, SectionTitle, Skeleton, useToast } from "@/components/ui";
import { CheckCircleIcon, ClockIcon, InfoIcon, LockIcon, MessageIcon, UsersIcon } from "@/components/ui/icons";
import { confirmApplicant, declineApplicant, type ApplicantWithTrust } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { formatPhone, offerLabel, relativeTime } from "@/lib/format";
import type { ApplicationStatus, OpenHouseRequest } from "@/lib/types";

const STATUS_BADGE: Partial<Record<ApplicationStatus, { label: string; tone: "neutral" | "warn" | "danger" }>> = {
  backup: { label: "Backup", tone: "warn" },
  declined: { label: "Declined", tone: "neutral" },
};

export function ApplicantsSkeleton() {
  return (
    <div className="flex flex-col gap-3 md:flex-row" role="status" aria-label="Loading applicants">
      {[0, 1].map((i) => (
        <div key={i} className="w-full rounded-card border border-line bg-surface p-4 shadow-card md:w-80">
          <div className="flex gap-3">
            <Skeleton className="h-14 w-14 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          </div>
          <Skeleton className="mt-4 h-20" />
          <Skeleton className="mt-3 h-11" />
        </div>
      ))}
    </div>
  );
}

export function ApplicantsPanel({ request, applicants, listerId, viewer }: { request: OpenHouseRequest; applicants: ApplicantWithTrust[]; listerId: string; viewer: Parameters<typeof TrustCard>[0]["viewer"] }) {
  const toast = useToast();
  const [confirming, setConfirming] = useState<ApplicantWithTrust | null>(null);
  const [declining, setDeclining] = useState<string | null>(null);

  const confirm = useMutation((hostId: string) => confirmApplicant(request.id, listerId, hostId), {
    onSuccess: () => {
      toast.success("Contact details and the handoff checklist are now shared with your Host. Other applicants are kept as backups.", "Host confirmed");
      setConfirming(null);
    },
    onError: (e) => {
      toast.error(e.message, "Could not confirm");
      setConfirming(null);
    },
  });
  const decline = useMutation(async (hostId: string) => {
    setDeclining(hostId);
    try {
      return await declineApplicant(request.id, listerId, hostId);
    } finally {
      setDeclining(null);
    }
  }, {
    onSuccess: () => toast.info("The applicant has been notified."),
    onError: (e) => toast.error(e.message),
  });

  const actionable = applicants.filter((a) => a.application.status === "pending" || a.application.status === "backup");
  const sorted = [...applicants];

  if (applicants.length === 0) {
    return (
      <EmptyState
        icon={<UsersIcon size={22} />}
        title="No applicants yet"
        description={request.instantAccept ? "Instant accept is on, so the first eligible Host to claim it is confirmed automatically." : "Verified agents nearby have been alerted. You will be notified the moment someone applies."}
      />
    );
  }

  return (
    <div>
      <SectionTitle action={<span className="text-xs text-muted">{actionable.length} to review</span>}>Applicants ({applicants.length})</SectionTitle>
      <p className="mb-3 text-xs text-muted">Sorted by trust score. Compare side by side, scroll sideways on larger screens.</p>
      <div className="-mx-4 flex snap-x flex-col gap-3 px-4 md:flex-row md:overflow-x-auto md:pb-3">
        {sorted.map((a) => {
          const st = STATUS_BADGE[a.application.status];
          const canAct = a.application.status === "pending" || a.application.status === "backup";
          return (
            <div key={a.application.id} className="w-full shrink-0 snap-start md:w-[22rem]">
              <article aria-label={`Applicant ${a.user.name}`} className="flex h-full flex-col gap-3">
                <TrustCard
                  user={a.user}
                  variant="expanded"
                  viewer={viewer}
                  mutuals={a.mutuals}
                  className="flex-1"
                  action={
                    <div className="flex flex-col items-end gap-1">
                      <Badge tone={a.trustScore >= 70 ? "success" : a.trustScore >= 45 ? "warn" : "danger"}>Trust {a.trustScore}</Badge>
                      {st && <Badge tone={st.tone} size="sm">{st.label}</Badge>}
                    </div>
                  }
                />
                <Card className="space-y-3">
                  <div>
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted">
                      <MessageIcon size={13} /> Note · {relativeTime(a.application.appliedAt)}
                    </p>
                    <p className="mt-1 text-sm text-ink-soft">{a.application.note ? `“${a.application.note}”` : "No note added."}</p>
                  </div>
                  {canAct && (
                    <div className="flex gap-2">
                      <Button fullWidth variant="accent" onClick={() => setConfirming(a)} icon={<CheckCircleIcon size={18} />} aria-label={`Confirm ${a.user.name}`}>
                        Confirm
                      </Button>
                      <Button variant="outline" onClick={() => decline.mutate(a.user.id)} loading={declining === a.user.id} aria-label={`Decline ${a.user.name}`}>
                        Decline
                      </Button>
                    </div>
                  )}
                </Card>
              </article>
            </div>
          );
        })}
      </div>

      <Modal
        open={!!confirming}
        onClose={() => !confirm.loading && setConfirming(null)}
        title={confirming ? `Confirm ${confirming.user.name}?` : ""}
        description="First confirmed wins. This is the one-tap commit."
        footer={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setConfirming(null)} disabled={confirm.loading}>
              Not yet
            </Button>
            <Button fullWidth variant="accent" loading={confirm.loading} onClick={() => confirming && confirm.mutate(confirming.user.id)}>
              Confirm and sign agreement
            </Button>
          </div>
        }
      >
        {confirming && (
          <div className="space-y-4 text-sm">
            <div className="rounded-xl bg-success-50 p-3 text-success-700">
              <p className="mb-1 flex items-center gap-1.5 font-semibold">
                <LockIcon size={15} /> What gets released to {confirming.user.name.split(" ")[0]}
              </p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>Your contact details, including {request.handoff.emergencyContact.name} at {formatPhone(request.handoff.emergencyContact.phone)} as emergency contact</li>
                <li>The full address and handoff checklist</li>
                <li>Lockbox or access details, 48 hours before the event</li>
                <li>In-app messaging with you</li>
              </ul>
            </div>
            <div className="flex gap-2 rounded-xl bg-paper p-3 text-ink-soft">
              <InfoIcon size={16} className="mt-0.5 shrink-0 text-brand-700" />
              <p>Other applicants are told right away and kept as backups. If your Host cancels, the request reopens and you can pick a backup.</p>
            </div>
            <div>
              <p className="mb-1 flex items-center gap-1.5 font-semibold text-ink">
                <ClockIcon size={14} className="text-muted" /> Agreement · {offerLabel(request.offer)}
              </p>
              <div className="max-h-52 space-y-2 overflow-y-auto whitespace-pre-line rounded-xl border border-line p-3 text-xs text-ink-soft">{request.agreement.terms}</div>
              <p className="mt-1.5 text-xs text-muted">
                {confirming.application.agreedToTerms ? `${confirming.user.name.split(" ")[0]} already accepted these terms.` : "The Host will be asked to accept these terms."}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
