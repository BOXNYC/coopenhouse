"use client";
import { useId } from "react";
import { cn } from "@/lib/cn";
import type { Offer, OfferType } from "@/lib/types";
import { OFFER_META } from "@/components/ui/OfferChip";
import { CheckCircleIcon } from "@/components/ui/icons";
import { Field, Input } from "@/components/ui/Field";

export interface OfferDraft {
  type: OfferType;
  amount: string;
  percent: string;
  credits: string;
}

export const DEFAULT_OFFER: OfferDraft = { type: "lead", amount: "100", percent: "25", credits: "1" };

export function offerFromDraft(d: OfferDraft): Offer {
  switch (d.type) {
    case "lead":
      return { type: "lead" };
    case "flat":
      return { type: "flat", amount: Number(d.amount) };
    case "referral":
      return { type: "referral", percent: Number(d.percent) };
    case "credit":
      return { type: "credit", credits: Number(d.credits) };
  }
}

export function draftFromOffer(o: Offer): OfferDraft {
  return {
    type: o.type,
    amount: String(o.amount ?? 100),
    percent: String(o.percent ?? 25),
    credits: String(o.credits ?? 1),
  };
}

export function validateOffer(d: OfferDraft): string | undefined {
  if (d.type === "flat" && !(Number(d.amount) > 0)) return "Enter a flat fee above $0.";
  if (d.type === "referral" && !(Number(d.percent) > 0 && Number(d.percent) <= 50)) return "Enter a referral percent between 1 and 50.";
  if (d.type === "credit" && !(Number(d.credits) >= 1)) return "Enter at least 1 cover credit.";
  return undefined;
}

const EXPLAIN: Record<OfferType, { who: string; detail: string; badge?: string }> = {
  lead: {
    who: "Costs you nothing",
    detail: "The Host keeps buyer leads they meet who sign in as unrepresented. You keep the seller, always.",
    badge: "Default",
  },
  flat: {
    who: "You pay the Host",
    detail: "A fixed amount, typically $75 to $150, paid by you after the event. Settled outside the app.",
  },
  referral: {
    who: "Paid only if a lead closes",
    detail: "If a buyer the Host brings converts to a sale, you share a pre-agreed percent of the commission, broker to broker.",
  },
  credit: {
    who: "Trade a favor",
    detail: "The Host earns cover credits they can spend when they need someone to cover for them.",
  },
};

const ORDER: OfferType[] = ["lead", "flat", "referral", "credit"];

function Quick({ options, current, format, onPick }: { options: number[]; current: string; format: (n: number) => string; onPick: (n: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {options.map((n) => (
        <button key={n} type="button" onClick={() => onPick(n)} className={cn("rounded-full px-3 py-1 text-xs font-medium", current === String(n) ? "bg-brand-700 text-white" : "bg-black/5 text-ink-soft hover:bg-black/10")}>
          {format(n)}
        </button>
      ))}
    </div>
  );
}

export function OfferPicker({ value, onChange, error }: { value: OfferDraft; onChange: (v: OfferDraft) => void; error?: string }) {
  const groupId = useId();
  return (
    <div>
      <div role="radiogroup" aria-label="Compensation offer" className="grid gap-3 sm:grid-cols-2">
        {ORDER.map((type) => {
          const meta = OFFER_META[type];
          const selected = value.type === type;
          const ex = EXPLAIN[type];
          return (
            <div
              key={type}
              className={cn(
                "rounded-card border bg-surface p-3.5 transition",
                selected ? "border-brand-500 ring-2 ring-brand-500/25 shadow-card" : "border-line-strong hover:border-brand-300",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onChange({ ...value, type })}
                className="flex w-full items-start gap-3 text-left focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-brand-500"
              >
                <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", selected ? "bg-brand-700 text-white" : "bg-brand-50 text-brand-700")}>
                  <meta.Icon size={18} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-semibold text-ink">{meta.name}</span>
                    {ex.badge && <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[11px] font-medium text-accent-700">{ex.badge}</span>}
                  </span>
                  <span className="block text-xs font-medium text-brand-700">{ex.who}</span>
                  <span className="mt-1 block text-sm text-ink-soft">{ex.detail}</span>
                </span>
                {selected && <CheckCircleIcon size={20} className="shrink-0 text-brand-700" />}
              </button>
              {selected && type === "flat" && (
                <Field label="Flat fee" className="mt-3" htmlFor={`${groupId}-amt`}>
                  <Input id={`${groupId}-amt`} inputMode="numeric" leading="$" value={value.amount} onChange={(e) => onChange({ ...value, amount: e.target.value.replace(/\D/g, "") })} />
                  <Quick options={[75, 100, 125, 150]} current={value.amount} format={(n) => `$${n}`} onPick={(n) => onChange({ ...value, amount: String(n) })} />
                </Field>
              )}
              {selected && type === "referral" && (
                <Field label="Referral percent of commission" className="mt-3" htmlFor={`${groupId}-pct`} hint="Applies only to leads the Host brings that convert.">
                  <div className="relative">
                    <Input id={`${groupId}-pct`} inputMode="numeric" value={value.percent} onChange={(e) => onChange({ ...value, percent: e.target.value.replace(/\D/g, "").slice(0, 2) })} />
                    <span className="pointer-events-none absolute inset-y-0 right-3.5 flex items-center text-muted">%</span>
                  </div>
                  <Quick options={[20, 25, 30, 35]} current={value.percent} format={(n) => `${n}%`} onPick={(n) => onChange({ ...value, percent: String(n) })} />
                </Field>
              )}
              {selected && type === "credit" && (
                <Field label="Cover credits" className="mt-3" htmlFor={`${groupId}-crd`} hint="1 credit = 1 covered open house you owe.">
                  <Input id={`${groupId}-crd`} inputMode="numeric" value={value.credits} onChange={(e) => onChange({ ...value, credits: e.target.value.replace(/\D/g, "").slice(0, 1) })} />
                </Field>
              )}
            </div>
          );
        })}
      </div>
      {error && (
        <p className="mt-2 text-sm text-danger-600" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
