"use client";
import { useState } from "react";
import { Button, Field, Input, LabeledInput, Modal, Select, Textarea, useToast } from "@/components/ui";
import { AlertIcon, InfoIcon } from "@/components/ui/icons";
import { OfferPicker, draftFromOffer, offerFromDraft, validateOffer, type OfferDraft } from "./OfferPicker";
import { splitISO, toISO } from "./datetime";
import { cancelRequest, updateRequest, type RequestPatch } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { CITIES } from "@/lib/cities";
import { hoursUntil } from "@/lib/rules";
import { formatCurrency, offerLabel } from "@/lib/format";
import type { OpenHouseRequest } from "@/lib/types";

/** Raise compensation (used by the "nobody applied" nudges). */
export function RaiseCompModal({ open, onClose, request, userId }: { open: boolean; onClose: () => void; request: OpenHouseRequest; userId: string }) {
  const toast = useToast();
  const [draft, setDraft] = useState<OfferDraft>(() => {
    const d = draftFromOffer(request.offer);
    // Suggest something more generous than the current offer.
    return request.offer.type === "lead" ? { ...d, type: "flat", amount: "100" } : d;
  });
  const [err, setErr] = useState<string>();
  const save = useMutation((o: ReturnType<typeof offerFromDraft>) => updateRequest(request.id, { offer: o }, userId), {
    onSuccess: () => {
      toast.success("Hosts nearby are seeing the new offer.", "Compensation updated");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Raise compensation"
      description={`Currently: ${offerLabel(request.offer)}`}
      footer={
        <Button
          fullWidth
          loading={save.loading}
          onClick={() => {
            const e = validateOffer(draft);
            setErr(e);
            if (!e) void save.mutate(offerFromDraft(draft));
          }}
        >
          Update offer
        </Button>
      }
    >
      <OfferPicker value={draft} onChange={setDraft} error={err} />
    </Modal>
  );
}

/** Edit details. Changes after confirmation require host acknowledgement (§8). */
export function EditModal({ open, onClose, request, userId }: { open: boolean; onClose: () => void; request: OpenHouseRequest; userId: string }) {
  const toast = useToast();
  const s = splitISO(request.startsAt);
  const e = splitISO(request.endsAt);
  const [f, setF] = useState({
    address: request.address,
    neighborhood: request.neighborhood,
    date: s.date,
    start: s.time,
    end: e.time,
    accessDetails: request.handoff.accessDetails ?? "",
    talking: request.handoff.talkingPoints,
    price: String(request.price),
  });
  const [error, setError] = useState<string>();
  const committed = request.status === "confirmed" || request.status === "checked-in";
  const startsAt = f.date && f.start ? toISO(f.date, f.start) : request.startsAt;
  const endsAt = f.date && f.end ? toISO(f.date, f.end) : request.endsAt;
  const significant = f.address !== request.address || f.neighborhood !== request.neighborhood || startsAt !== request.startsAt || endsAt !== request.endsAt;

  const save = useMutation((patch: RequestPatch) => updateRequest(request.id, patch, userId), {
    onSuccess: () => {
      toast.success(committed ? "Your Host has been asked to review and acknowledge the change." : "Details updated.", "Saved");
      onClose();
    },
    onError: (err) => toast.error(err.message),
  });

  const submit = () => {
    if (f.address.trim().length < 5) return setError("Enter the street address.");
    if (endsAt <= startsAt) return setError("End time must be after the start.");
    if (!(Number(f.price) > 0)) return setError("Enter a list price.");
    setError(undefined);
    void save.mutate({
      address: f.address.trim(),
      neighborhood: f.neighborhood,
      price: Number(f.price),
      startsAt,
      endsAt,
      handoff: { ...request.handoff, accessDetails: f.accessDetails.trim() || undefined, talkingPoints: f.talking.trim() },
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Edit details"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Discard
          </Button>
          <Button fullWidth loading={save.loading} onClick={submit}>
            {committed && significant ? "Save and ask Host to re-acknowledge" : "Save changes"}
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {committed && (
          <div className={`flex gap-2 rounded-xl p-3 text-sm ${significant ? "bg-warn-50 text-warn-700" : "bg-brand-50 text-brand-800"}`} role="status">
            {significant ? <AlertIcon size={16} className="mt-0.5 shrink-0" /> : <InfoIcon size={16} className="mt-0.5 shrink-0" />}
            <p>
              {significant
                ? "Changing the address or time is a significant change. Your Host must acknowledge it and may drop out without penalty."
                : "Your Host will be asked to acknowledge any edits after confirmation."}
            </p>
          </div>
        )}
        <LabeledInput label="Street address" value={f.address} onChange={(ev) => setF({ ...f, address: ev.target.value })} />
        <Field label="Neighborhood" htmlFor="en">
          <Select id="en" value={f.neighborhood} onChange={(ev) => setF({ ...f, neighborhood: ev.target.value })}>
            {[...new Set([request.neighborhood, ...Object.keys(CITIES[request.cityKey].neighborhoods)])].map((n) => (
              <option key={n}>{n}</option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Date" htmlFor="ed">
            <Input id="ed" type="date" value={f.date} onChange={(ev) => setF({ ...f, date: ev.target.value })} />
          </Field>
          <Field label="Starts" htmlFor="es">
            <Input id="es" type="time" value={f.start} onChange={(ev) => setF({ ...f, start: ev.target.value })} />
          </Field>
          <Field label="Ends" htmlFor="ee">
            <Input id="ee" type="time" value={f.end} onChange={(ev) => setF({ ...f, end: ev.target.value })} />
          </Field>
        </div>
        <Field label="List price" htmlFor="ep" hint={Number(f.price) ? formatCurrency(Number(f.price)) : undefined}>
          <Input id="ep" inputMode="numeric" leading="$" value={f.price} onChange={(ev) => setF({ ...f, price: ev.target.value.replace(/\D/g, "") })} />
        </Field>
        <Field label="Access instructions" htmlFor="ea" optional>
          <Input id="ea" value={f.accessDetails} onChange={(ev) => setF({ ...f, accessDetails: ev.target.value })} />
        </Field>
        <Field label="Talking points" htmlFor="et" optional>
          <Textarea id="et" value={f.talking} onChange={(ev) => setF({ ...f, talking: ev.target.value })} />
        </Field>
        {error && (
          <p className="text-sm text-danger-600" role="alert">
            {error}
          </p>
        )}
      </div>
    </Modal>
  );
}

/** Cancel with a plain explanation of the consequences (§8). */
export function CancelModal({ open, onClose, request, userId, onDone }: { open: boolean; onClose: () => void; request: OpenHouseRequest; userId: string; onDone?: () => void }) {
  const toast = useToast();
  const [reason, setReason] = useState("");
  const hasHost = !!request.confirmedHostId;
  const late = hasHost && hoursUntil(request.startsAt) < 24;
  const cancel = useMutation(() => cancelRequest(request.id, userId, reason.trim()), {
    onSuccess: (res) => {
      toast.info(res.message, "Request cancelled");
      onClose();
      onDone?.();
    },
    onError: (e) => toast.error(e.message),
  });
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Cancel this open house?"
      footer={
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Keep it
          </Button>
          <Button fullWidth variant="danger" loading={cancel.loading} onClick={() => void cancel.mutate()}>
            Cancel request
          </Button>
        </div>
      }
    >
      <div className="space-y-4 text-sm">
        <div className={`rounded-xl p-3 ${late ? "bg-danger-50 text-danger-700" : hasHost ? "bg-warn-50 text-warn-700" : "bg-paper text-ink-soft"}`}>
          {!hasHost && <p>No Host is committed yet, so cancelling is free. Any applicants are notified.</p>}
          {hasHost && !late && <p>Your confirmed Host is notified right away. More than 24 hours out, there is no fee, but repeated cancellations are visible on your profile.</p>}
          {late && (
            <p>
              This is a <strong>late cancellation</strong> (under 24 hours). Your Host has already committed, so per the signed agreement{" "}
              {request.offer.type === "flat" ? `part of the ${formatCurrency(request.offer.amount ?? 0)} flat fee may be owed` : request.offer.type === "credit" ? "a cover credit may be granted to them" : "they may be owed a credit"}.
            </p>
          )}
        </div>
        <p className="text-muted">Need a different Host instead? Ask your Host to withdraw, or cancel and repost to reach new agents.</p>
        <Field label="Reason" htmlFor="cr" optional hint="Shared with anyone who applied.">
          <Textarea id="cr" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Seller changed plans" />
        </Field>
      </div>
    </Modal>
  );
}
