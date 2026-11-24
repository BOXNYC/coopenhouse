"use client";
import { useEffect, useState } from "react";
import { Badge, Button, Card, CameraIcon, CheckCircleIcon, ClockIcon, Field, Input, MapPinIcon, PlusIcon, SectionTitle, Spinner, Textarea, UsersIcon, XIcon, AlertIcon, useToast } from "@/components/ui";
import { checkIn, checkOut } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { formatDateTime, formatPhone, formatTime } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { Lead } from "@/lib/types";
import { HOUR, MIN, NO_SHOW_MINUTES } from "./clock";
import type { EventCtx } from "./shared";

interface Draft {
  attendance: string;
  leads: Lead[];
  notes: string;
  issues: string;
  photos: number;
}
const EMPTY: Draft = { attendance: "", leads: [], notes: "", issues: "", photos: 0 };
const key = (id: string) => `coopenhouse.summaryDraft.${id}`;

/** Summary draft that survives a refresh (per-viewer convenience; storage may be unavailable). */
function useSummaryDraft(id: string) {
  const [draft, setDraft] = useState<Draft>(() => {
    try {
      const raw = window.localStorage.getItem(key(id));
      return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) } : EMPTY;
    } catch {
      return EMPTY;
    }
  });
  useEffect(() => {
    try {
      window.localStorage.setItem(key(id), JSON.stringify(draft));
    } catch {
      /* ignore */
    }
  }, [id, draft]);
  const clear = () => {
    try {
      window.localStorage.removeItem(key(id));
    } catch {
      /* ignore */
    }
  };
  return { draft, setDraft, clear };
}

/** Fake "confirming location" step. Resolves after a short delay. */
function useFakeLocation() {
  const [phase, setPhase] = useState<"idle" | "locating" | "matching" | "done">("idle");
  const run = async () => {
    setPhase("locating");
    await new Promise((r) => setTimeout(r, 1100));
    setPhase("matching");
    await new Promise((r) => setTimeout(r, 900));
    setPhase("done");
  };
  const reset = () => setPhase("idle");
  return { phase, run, reset, busy: phase === "locating" || phase === "matching" };
}

function LocationStatus({ phase }: { phase: "idle" | "locating" | "matching" | "done" }) {
  if (phase === "idle") return null;
  return (
    <div className={cn("flex items-center gap-2 rounded-xl px-3 py-2 text-sm", phase === "done" ? "bg-success-50 text-success-700" : "bg-brand-50 text-brand-800")} role="status">
      {phase === "done" ? <CheckCircleIcon size={16} /> : <Spinner />}
      {phase === "locating" && "Confirming location…"}
      {phase === "matching" && "Matching to the property address…"}
      {phase === "done" && "Location confirmed, within 30 m of the property"}
    </div>
  );
}

function PhotoPlaceholder({ count, onAdd, onRemove, max = 8, label }: { count: number; onAdd: () => void; onRemove?: () => void; max?: number; label: string }) {
  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-brand-100 to-brand-200 text-brand-700" aria-label={`Photo ${i + 1} placeholder`}>
            <CameraIcon size={20} />
          </div>
        ))}
        {count < max && (
          <button type="button" onClick={onAdd} className="flex h-16 w-16 flex-col items-center justify-center gap-0.5 rounded-xl border border-dashed border-line-strong text-[11px] text-muted hover:bg-black/[0.03]" aria-label={label}>
            <PlusIcon size={16} />
            Photo
          </button>
        )}
      </div>
      {count > 0 && onRemove && (
        <button type="button" onClick={onRemove} className="mt-1.5 text-xs text-muted underline">
          Remove last
        </button>
      )}
    </div>
  );
}

export function HostLivePanel({ ctx }: { ctx: EventCtx }) {
  const { req, me, now, other } = ctx;
  const toast = useToast();
  const { draft, setDraft, clear } = useSummaryDraft(req.id);
  const loc = useFakeLocation();
  const [arrivalPhoto, setArrivalPhoto] = useState(false);
  const doCheckIn = useMutation(checkIn, { onSuccess: () => { loc.reset(); toast.success("You're checked in. Lister notified.", "Checked in"); }, onError: (e) => { toast.error(e.message); loc.reset(); } });
  const doCheckOut = useMutation(checkOut, { onSuccess: () => { clear(); toast.success("Summary sent to the Lister.", "Checked out"); }, onError: (e) => { toast.error(e.message); loc.reset(); } });

  const start = new Date(req.startsAt).getTime();
  const end = new Date(req.endsAt).getTime();
  const lateMin = Math.floor((now - start) / MIN);
  const opensAt = start - HOUR;

  // ---------- Not yet checked in ----------
  if (req.status === "confirmed") {
    const canCheckIn = now >= opensAt;
    const late = lateMin >= NO_SHOW_MINUTES;
    const startCheckIn = async () => {
      await loc.run();
      await doCheckIn.mutate(req.id, me.id, { locationConfirmed: true });
    };
    return (
      <Card className={cn(late && "border-danger-600/40")}>
        <SectionTitle>Check in</SectionTitle>
        {late && (
          <div className="mb-3 flex items-start gap-2 rounded-xl bg-danger-50 p-3 text-sm text-danger-700" role="alert">
            <AlertIcon size={16} className="mt-0.5 shrink-0" />
            <p>
              You&apos;re {lateMin} minutes late. {other?.name ?? "The Lister"} has been alerted and can reopen this request. Check in now or message them.
            </p>
          </div>
        )}
        {!late && lateMin > 0 && (
          <p className="mb-3 flex items-center gap-1.5 text-sm text-warn-700">
            <ClockIcon size={15} /> The event started {lateMin} min ago. Check in within {NO_SHOW_MINUTES - lateMin} min to avoid an alert to the Lister.
          </p>
        )}
        <p className="mb-3 text-sm text-ink-soft">Check in on arrival. We confirm you&apos;re at the property and notify the Lister.</p>
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted">Arrival condition photo (optional)</p>
          <PhotoPlaceholder count={arrivalPhoto ? 1 : 0} max={1} onAdd={() => setArrivalPhoto(true)} onRemove={() => setArrivalPhoto(false)} label="Add arrival photo" />
        </div>
        <LocationStatus phase={loc.phase} />
        <Button
          size="lg"
          fullWidth
          variant="accent"
          className="mt-3"
          disabled={!canCheckIn || loc.busy || doCheckIn.loading}
          loading={loc.busy || doCheckIn.loading}
          icon={<MapPinIcon size={18} />}
          onClick={startCheckIn}
        >
          {loc.busy ? "Confirming location…" : "Check in"}
        </Button>
        {!canCheckIn && <p className="mt-2 text-center text-xs text-muted">Check-in opens at {formatTime(new Date(opensAt).toISOString())}, an hour before start.</p>}
      </Card>
    );
  }

  // ---------- Checked in: visitor capture + check-out ----------
  if (req.status === "checked-in") {
    return (
      <>
        {req.checkIn && (
          <Card tone="tint">
            <p className="flex items-center gap-2 text-sm font-medium text-brand-800">
              <CheckCircleIcon size={18} /> Checked in at {formatTime(req.checkIn.time)}
              {req.checkIn.locationConfirmed && <Badge tone="success" size="sm">Location confirmed</Badge>}
            </p>
          </Card>
        )}
        <VisitorCapture draft={draft} setDraft={setDraft} signInNote={req.handoff.signInExpectations} />
        <CheckOutForm
          draft={draft}
          setDraft={setDraft}
          loc={loc}
          pastEnd={now >= end}
          submitting={loc.busy || doCheckOut.loading}
          onSubmit={async () => {
            await loc.run();
            await doCheckOut.mutate(
              req.id,
              me.id,
              { attendance: Math.max(0, parseInt(draft.attendance || "0", 10) || 0), leads: draft.leads, notes: draft.notes.trim(), issues: draft.issues.trim(), photos: draft.photos },
              { locationConfirmed: true },
            );
          }}
        />
      </>
    );
  }
  return null;
}

function VisitorCapture({ draft, setDraft, signInNote }: { draft: Draft; setDraft: (f: (d: Draft) => Draft) => void; signInNote: string }) {
  const [form, setForm] = useState<Lead>({ name: "", email: "", phone: "", unrepresented: true });
  const [error, setError] = useState("");
  const add = () => {
    if (!form.name.trim()) return setError("Enter the visitor's name.");
    if (!form.email.trim() && !form.phone.trim()) return setError("Add an email or phone so the Lister can follow up.");
    if (form.email.trim() && !/^\S+@\S+\.\S+$/.test(form.email.trim())) return setError("That email doesn't look right.");
    setError("");
    setDraft((d) => ({ ...d, leads: [...d.leads, { ...form, name: form.name.trim(), email: form.email.trim(), phone: form.phone.trim() }], attendance: String(Math.max(parseInt(d.attendance || "0", 10) || 0, d.leads.length + 1)) }));
    setForm({ name: "", email: "", phone: "", unrepresented: true });
  };
  return (
    <Card>
      <SectionTitle action={<Badge tone="brand" icon={<UsersIcon size={13} />}>{draft.leads.length} signed in</Badge>}>Visitor sign-in</SectionTitle>
      <p className="mb-3 text-sm text-muted">{signInNote}</p>
      <div className="space-y-2.5">
        <Input aria-label="Visitor name" placeholder="Visitor name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <div className="grid grid-cols-2 gap-2">
          <Input aria-label="Visitor email" type="email" inputMode="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input aria-label="Visitor phone" type="tel" inputMode="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </div>
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl bg-paper px-3 py-2 text-sm">
          <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={form.unrepresented} onChange={(e) => setForm({ ...form, unrepresented: e.target.checked })} />
          <span>
            <span className="font-medium text-ink">Not working with an agent</span>
            <span className="block text-xs text-muted">Unrepresented visitors are follow-up leads under the agreement.</span>
          </span>
        </label>
        {error && <p className="text-xs text-danger-600" role="alert">{error}</p>}
        <Button fullWidth variant="secondary" icon={<PlusIcon size={16} />} onClick={add}>
          Add visitor
        </Button>
      </div>
      {draft.leads.length > 0 && (
        <ul className="mt-4 divide-y divide-line" aria-label="Signed-in visitors">
          {draft.leads.map((l, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-2">
              <div className="min-w-0 text-sm">
                <p className="truncate font-medium text-ink">{l.name}</p>
                <p className="truncate text-xs text-muted">{[l.email, l.phone && formatPhone(l.phone)].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1">
                <Badge tone={l.unrepresented ? "accent" : "neutral"} size="sm">{l.unrepresented ? "Unrepresented" : "Has agent"}</Badge>
                <button type="button" aria-label={`Remove ${l.name}`} className="rounded-full p-1.5 text-muted hover:bg-black/5" onClick={() => setDraft((d) => ({ ...d, leads: d.leads.filter((_, j) => j !== i) }))}>
                  <XIcon size={14} />
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function CheckOutForm({ draft, setDraft, loc, pastEnd, submitting, onSubmit }: { draft: Draft; setDraft: (f: (d: Draft) => Draft) => void; loc: ReturnType<typeof useFakeLocation>; pastEnd: boolean; submitting: boolean; onSubmit: () => void }) {
  const [touched, setTouched] = useState(false);
  const attendanceValid = draft.attendance !== "" && /^\d+$/.test(draft.attendance);
  return (
    <Card>
      <SectionTitle>Check out and summary</SectionTitle>
      <div className="space-y-3">
        <Field label="Total attendance" htmlFor="attendance" error={touched && !attendanceValid ? "Enter the number of visitors (0 or more)." : undefined} hint={`${draft.leads.length} signed in so far`}>
          <Input id="attendance" inputMode="numeric" value={draft.attendance} invalid={touched && !attendanceValid} onChange={(e) => setDraft((d) => ({ ...d, attendance: e.target.value.replace(/\D/g, "") }))} placeholder="e.g. 12" />
        </Field>
        <Field label="Notable feedback and notes" htmlFor="notes" optional>
          <Textarea id="notes" value={draft.notes} onChange={(e) => setDraft((d) => ({ ...d, notes: e.target.value }))} placeholder="What did visitors say? Any showings requested?" />
        </Field>
        <Field label="Issues" htmlFor="issues" optional hint="Anything the Lister should know: damage, safety, access trouble.">
          <Textarea id="issues" rows={2} value={draft.issues} onChange={(e) => setDraft((d) => ({ ...d, issues: e.target.value }))} />
        </Field>
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Condition photos at close</p>
          <PhotoPlaceholder count={draft.photos} onAdd={() => setDraft((d) => ({ ...d, photos: d.photos + 1 }))} onRemove={() => setDraft((d) => ({ ...d, photos: Math.max(0, d.photos - 1) }))} label="Add condition photo" />
        </div>
        <LocationStatus phase={loc.phase} />
        {!pastEnd && <p className="text-xs text-muted">The event window is still open. Check out once you have locked up.</p>}
        <Button
          size="lg"
          fullWidth
          loading={submitting}
          icon={<CheckCircleIcon size={18} />}
          onClick={() => {
            setTouched(true);
            if (attendanceValid) onSubmit();
          }}
        >
          {loc.busy ? "Confirming location…" : "Check out and send summary"}
        </Button>
      </div>
    </Card>
  );
}

/** Read-only recap of what the host submitted. */
export function SummaryRecap({ ctx }: { ctx: EventCtx }) {
  const { req } = ctx;
  const s = req.summary;
  if (!s) return null;
  return (
    <Card>
      <SectionTitle>Event summary</SectionTitle>
      <div className="grid grid-cols-3 gap-2 text-center">
        {[
          ["Visitors", s.attendance],
          ["Sign-ins", s.leads.length],
          ["Photos", s.photos],
        ].map(([label, v]) => (
          <div key={label} className="rounded-xl bg-paper px-2 py-2">
            <div className="text-lg font-semibold text-ink">{v}</div>
            <div className="text-[11px] text-muted">{label}</div>
          </div>
        ))}
      </div>
      {req.checkIn && req.checkOut && (
        <p className="mt-3 text-xs text-muted">
          Checked in {formatDateTime(req.checkIn.time)} · out {formatTime(req.checkOut.time)}
          {req.checkIn.locationConfirmed && req.checkOut.locationConfirmed ? " · location confirmed both times" : ""}
        </p>
      )}
      {s.notes && <p className="mt-3 text-sm text-ink-soft"><strong className="text-ink">Notes: </strong>{s.notes}</p>}
      {s.issues ? (
        <p className="mt-2 rounded-xl bg-warn-50 p-3 text-sm text-ink-soft"><strong className="text-warn-700">Issues: </strong>{s.issues}</p>
      ) : (
        <p className="mt-2 text-sm text-muted">No issues reported.</p>
      )}
      {s.leads.length > 0 && (
        <ul className="mt-3 divide-y divide-line">
          {s.leads.map((l, i) => (
            <li key={i} className="flex items-center justify-between gap-2 py-2 text-sm">
              <span className="min-w-0">
                <span className="block truncate font-medium text-ink">{l.name}</span>
                <span className="block truncate text-xs text-muted">{[l.email, l.phone && formatPhone(l.phone)].filter(Boolean).join(" · ")}</span>
              </span>
              <Badge tone={l.unrepresented ? "accent" : "neutral"} size="sm">{l.unrepresented ? "Unrepresented" : "Has agent"}</Badge>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
