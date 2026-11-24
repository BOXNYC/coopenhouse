"use client";
import { useState } from "react";
import { Badge, Button, FlagIcon, Modal, Textarea, AlertIcon, useToast } from "@/components/ui";
import { reportProblem } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { ReportCategory } from "@/lib/types";
import type { EventCtx } from "./shared";

const CATEGORIES: { value: ReportCategory; label: string; hint: string; serious?: boolean }[] = [
  { value: "theft", label: "Theft", hint: "Something is missing", serious: true },
  { value: "damage", label: "Damage", hint: "Property was damaged" },
  { value: "misconduct", label: "Misconduct", hint: "Unprofessional or rule-breaking behavior", serious: true },
  { value: "safety", label: "Unsafe visitor", hint: "A visitor made you feel unsafe" },
  { value: "other", label: "Other", hint: "Anything else" },
];

export function ReportProblemButton({ ctx }: { ctx: EventCtx }) {
  const { req, me } = ctx;
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<ReportCategory | null>(null);
  const [details, setDetails] = useState("");
  const submit = useMutation(reportProblem, {
    onSuccess: () => {
      toast.success("Your report was sent to a human reviewer.", "Report submitted");
      setOpen(false);
      setCategory(null);
      setDetails("");
    },
    onError: (e) => toast.error(e.message),
  });
  const serious = CATEGORIES.find((c) => c.value === category)?.serious;
  const canSubmit = !!category && details.trim().length >= 5;
  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-card border border-line bg-surface px-4 py-3 shadow-card">
        <div className="text-sm">
          <p className="font-medium text-ink">Something wrong?</p>
          <p className="text-muted">Reports go to a human reviewer and the other agent is alerted.</p>
        </div>
        <Button variant="outline" size="sm" icon={<FlagIcon size={15} />} onClick={() => setOpen(true)} className="shrink-0">
          Report a problem
        </Button>
      </div>
      {req.reports.length > 0 && (
        <ul className="space-y-1.5" aria-label="Reports on this event">
          {req.reports.map((r) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-warn-50 px-3 py-2 text-sm">
              <span className="min-w-0 truncate">
                <strong className="capitalize">{r.category === "safety" ? "Unsafe visitor" : r.category}</strong> reported {r.reporterId === me.id ? "by you" : ""} · {formatDateTime(r.createdAt)}
              </span>
              <Badge tone="warn" size="sm">
                {r.status === "under-review" ? "Under review" : r.status}
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Report a problem"
        description="Tell us what happened. A reviewer will look at the check-in record and photos."
        footer={
          <Button fullWidth variant={serious ? "danger" : "primary"} loading={submit.loading} disabled={!canSubmit} onClick={() => category && submit.mutate(req.id, me.id, { category, details: details.trim() })}>
            Submit report
          </Button>
        }
      >
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-medium text-ink">What kind of problem?</legend>
          {CATEGORIES.map((c) => (
            <label key={c.value} className={cn("flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2", category === c.value ? "border-brand-500 bg-brand-50" : "border-line-strong bg-surface")}>
              <input type="radio" name="report-category" className="h-4 w-4 accent-brand-700" checked={category === c.value} onChange={() => setCategory(c.value)} />
              <span className="text-sm">
                <span className="block font-medium text-ink">{c.label}</span>
                <span className="block text-xs text-muted">{c.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <div className="mt-4">
          <label htmlFor="report-details" className="mb-1.5 block text-sm font-medium text-ink">
            What happened?
          </label>
          <Textarea id="report-details" rows={4} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Include times, names and anything you saw." />
        </div>
        {serious && (
          <div className="mt-3 flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
            <AlertIcon size={16} className="mt-0.5 shrink-0" />
            <p>Serious reports (theft, misconduct) pause the other agent&apos;s account while a reviewer investigates. Only submit what you believe is true.</p>
          </div>
        )}
        <p className="mt-3 text-xs text-muted">If anyone is in immediate danger, call 911 first.</p>
      </Modal>
    </>
  );
}
