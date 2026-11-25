"use client";
import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { RequestCard } from "@/components/RequestCard";
import { DEFAULT_OFFER, OfferPicker, offerFromDraft, validateOffer, type OfferDraft } from "@/components/lister/OfferPicker";
import { TIME_PRESETS, quickDates, toISO } from "@/components/lister/datetime";
import { Badge, Button, Card, Field, Input, LabeledInput, Select, Stepper, Textarea, useToast } from "@/components/ui";
import { BuildingIcon, ClockIcon, InfoIcon, KeyIcon, LockIcon, UsersIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { createRequest, type NewRequestInput } from "@/lib/api";
import { useMutation } from "@/lib/hooks";
import { agreementTerms } from "@/lib/rules";
import { CITIES, type CityKey } from "@/lib/cities";
import { cn } from "@/lib/cn";
import { formatCurrency, offerLabel, formatWindow } from "@/lib/format";
import type { AccessMethod, AudienceMode, BadgeKind, OpenHouseRequest, User } from "@/lib/types";

const STEPS = ["Listing", "Offer", "Handoff", "Audience"];

interface Form {
  address: string;
  neighborhood: string;
  price: string;
  beds: string;
  baths: string;
  date: string;
  start: string;
  end: string;
  offer: OfferDraft;
  access: AccessMethod;
  accessDetails: string;
  signIn: string;
  talking: string;
  sensitivities: string;
  doNot: string;
  ecName: string;
  ecPhone: string;
  mode: AudienceMode;
  radius: string;
  widen: string;
  badges: BadgeKind[];
  instant: boolean;
}

type Errors = Partial<Record<string, string>>;

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("rounded-full border px-3 py-1.5 text-sm font-medium transition", active ? "border-brand-700 bg-brand-700 text-white" : "border-line-strong bg-surface text-ink-soft hover:border-brand-300")}
    >
      {children}
    </button>
  );
}

function Segment<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: { id: T; title: string; desc: string; icon: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" aria-label={label} className="grid gap-2 sm:grid-cols-3">
      {options.map((o) => (
        <button
          key={o.id}
          type="button"
          role="radio"
          aria-checked={value === o.id}
          onClick={() => onChange(o.id)}
          className={cn("rounded-xl border p-3 text-left transition", value === o.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-500/25" : "border-line-strong bg-surface hover:border-brand-300")}
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="text-brand-700">{o.icon}</span>
            {o.title}
          </span>
          <span className="mt-1 block text-xs text-muted">{o.desc}</span>
        </button>
      ))}
    </div>
  );
}

function Toggle({ checked, onChange, label, desc }: { checked: boolean; onChange: (v: boolean) => void; label: string; desc?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-line-strong bg-surface p-3 text-left">
      <span>
        <span className="block text-sm font-semibold text-ink">{label}</span>
        {desc && <span className="block text-xs text-muted">{desc}</span>}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-brand-700" : "bg-ink/20")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[22px]" : "left-0.5")} />
      </span>
    </button>
  );
}

function buildPreview(f: Form, user: User, cityKey: CityKey): OpenHouseRequest {
  const cfg = CITIES[cityKey];
  const valid = f.date && f.start && f.end;
  const startsAt = valid ? toISO(f.date, f.start) : new Date(Date.now() + 86_400_000).toISOString();
  const endsAt = valid ? toISO(f.date, f.end) : new Date(Date.now() + 86_400_000 + 3 * 3_600_000).toISOString();
  const offer = offerFromDraft(f.offer);
  return {
    id: "preview",
    listerId: user.id,
    address: f.address.trim() || "Your listing address",
    neighborhood: f.neighborhood || "Neighborhood",
    cityKey,
    city: cfg.cityName,
    state: cfg.state,
    price: Number(f.price) || 0,
    beds: Number(f.beds) || 0,
    baths: Number(f.baths) || 0,
    photo: { gradient: "linear-gradient(135deg,#0f5565 0%,#3b8fa0 55%,#e8c9a0 100%)" },
    lat: 0,
    lng: 0,
    startsAt,
    endsAt,
    offer,
    handoff: { access: f.access, signInExpectations: f.signIn, talkingPoints: f.talking, sensitivities: f.sensitivities, doNotDiscuss: [], emergencyContact: { name: f.ecName, phone: f.ecPhone } },
    audience: { mode: f.mode, requireBadges: f.badges },
    instantAccept: f.instant,
    status: "open",
    urgent: false,
    createdAt: new Date().toISOString(),
    applicants: [],
    confirmedHostId: null,
    checklist: [],
    checkIn: null,
    checkOut: null,
    summary: null,
    ratings: { listerToHost: null, hostToLister: null },
    agreement: { acceptedByLister: false, acceptedByHost: false, terms: agreementTerms(offerLabel(offer)) },
    payment: "n/a",
    messages: [],
    reports: [],
    disputes: [],
    timeline: [],
    pendingChange: null,
    cancelledHostIds: [],
  };
}

function validateStep(step: number, f: Form): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (f.address.trim().length < 5) e.address = "Enter the street address.";
    if (!f.neighborhood) e.neighborhood = "Pick a neighborhood.";
    if (!(Number(f.price) >= 50_000)) e.price = "Enter a list price.";
    if (!f.date) e.date = "Pick a date.";
    else if (f.start && f.end) {
      if (f.end <= f.start) e.end = "End time must be after the start.";
      else if (new Date(toISO(f.date, f.start)).getTime() < Date.now()) e.date = "That time is in the past.";
    }
    if (!f.start) e.start = "Pick a start time.";
    if (!f.end && !e.end) e.end = "Pick an end time.";
  }
  if (step === 1) {
    const o = validateOffer(f.offer);
    if (o) e.offer = o;
  }
  if (step === 2) {
    if (!f.ecName.trim()) e.ecName = "Who should the Host call?";
    if (f.ecPhone.replace(/\D/g, "").length < 10) e.ecPhone = "Enter a 10-digit phone number.";
  }
  return e;
}

export default function Page() {
  const { path, key: cityKey, city } = useCity();
  const { currentUser } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [form, setForm] = useState<Form>(() => ({
    address: "",
    neighborhood: "",
    price: "",
    beds: "3",
    baths: "2",
    date: "",
    start: "13:00",
    end: "16:00",
    offer: DEFAULT_OFFER,
    access: "lockbox",
    accessDetails: "",
    signIn: "Please have every visitor sign in, with a note on whether they are working with an agent.",
    talking: "",
    sensitivities: "",
    doNot: "",
    ecName: currentUser?.name ?? "",
    ecPhone: currentUser?.phone ?? "",
    mode: "verified",
    radius: "10",
    widen: "24",
    badges: ["license"],
    instant: false,
  }));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => (e[k as string] ? { ...e, [k]: undefined } : e));
  };

  const dates = useMemo(() => quickDates(), []);
  const submit = useMutation(
    async (draft: boolean) => {
      const input: NewRequestInput = {
        address: form.address.trim(),
        neighborhood: form.neighborhood,
        cityKey,
        price: Number(form.price),
        beds: Number(form.beds) || 0,
        baths: Number(form.baths) || 0,
        startsAt: toISO(form.date, form.start),
        endsAt: toISO(form.date, form.end),
        offer: offerFromDraft(form.offer),
        handoff: {
          access: form.access,
          accessDetails: form.accessDetails.trim() || undefined,
          signInExpectations: form.signIn.trim(),
          talkingPoints: form.talking.trim(),
          sensitivities: form.sensitivities.trim(),
          doNotDiscuss: form.doNot.split("\n").map((s) => s.trim()).filter(Boolean),
          emergencyContact: { name: form.ecName.trim(), phone: form.ecPhone.trim() },
        },
        audience: { mode: form.mode, widenAfterHours: form.widen === "off" ? undefined : Number(form.widen), requireBadges: form.badges },
        instantAccept: form.instant,
        draft,
      };
      const r = await createRequest(input, currentUser!.id);
      return { r, draft };
    },
    {
      onSuccess: ({ r, draft }) => {
        toast.success(draft ? "Draft saved. Publish it whenever you are ready." : "Your request is live. Nearby verified agents are being alerted.", draft ? "Draft saved" : "Published");
        router.push(path(`/lister/requests/${r.id}`));
      },
      onError: (e) => toast.error(e.message, "Could not save"),
    },
  );

  const preview = useMemo(() => (currentUser ? buildPreview(form, currentUser, cityKey) : null), [form, currentUser, cityKey]);

  const next = () => {
    const e = validateStep(step, form);
    setErrors(e);
    if (Object.values(e).some(Boolean)) {
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setStep((s) => s + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const publish = (draft: boolean) => {
    // Drafts only need the basics; publishing validates everything.
    const steps = draft ? [0] : [0, 1, 2];
    for (const s of steps) {
      const e = validateStep(s, form);
      if (Object.values(e).some(Boolean)) {
        setErrors(e);
        setStep(s);
        toast.error(draft ? "Add the address, price and time first." : "Some details are missing.");
        return;
      }
    }
    void submit.mutate(draft);
  };

  const isLast = step === STEPS.length - 1;

  return (
    <AppShell role="lister" title="New request" subtitle={`Step ${step + 1} of ${STEPS.length}`} back={path("/lister")}>
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-5">
          <Stepper steps={STEPS} current={step} />

          {step === 0 && (
            <Card className="space-y-4">
              <h2 className="text-lg font-semibold text-ink">Listing and time</h2>
              <LabeledInput label="Street address" placeholder={cityKey === "nyc" ? "245 W 74th St, Apt 6B" : "1204 W 6th St"} value={form.address} error={errors.address} onChange={(e) => set("address", e.target.value)} autoComplete="street-address" hint="Hosts only see your neighborhood until they apply." />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Neighborhood" htmlFor="nb" error={errors.neighborhood}>
                  <Select id="nb" value={form.neighborhood} invalid={!!errors.neighborhood} onChange={(e) => set("neighborhood", e.target.value)}>
                    <option value="">Select...</option>
                    {Object.keys(city.neighborhoods).map((n) => (
                      <option key={n}>{n}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="List price" htmlFor="price" error={errors.price}>
                  <Input id="price" inputMode="numeric" leading="$" placeholder="750000" value={form.price} invalid={!!errors.price} onChange={(e) => set("price", e.target.value.replace(/\D/g, ""))} />
                </Field>
                <Field label="Beds" htmlFor="beds">
                  <Select id="beds" value={form.beds} onChange={(e) => set("beds", e.target.value)}>
                    {[0, 1, 2, 3, 4, 5, 6].map((n) => (
                      <option key={n} value={n}>{n === 0 ? "Studio" : n}</option>
                    ))}
                  </Select>
                </Field>
                <Field label="Baths" htmlFor="baths">
                  <Select id="baths" value={form.baths} onChange={(e) => set("baths", e.target.value)}>
                    {[1, 1.5, 2, 2.5, 3, 3.5, 4, 5].map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </Select>
                </Field>
              </div>

              <div className="space-y-3 border-t border-line pt-4">
                <p className="flex items-center gap-1.5 text-sm font-medium text-ink">
                  <ClockIcon size={16} className="text-muted" /> When
                </p>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Quick date picks">
                  {dates.map((d) => (
                    <Chip key={d.label} active={form.date === d.value} onClick={() => set("date", d.value)}>
                      {d.label}
                    </Chip>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Quick time picks">
                  {TIME_PRESETS.map((t) => (
                    <Chip
                      key={t.label}
                      active={form.start === t.start && form.end === t.end}
                      onClick={() => setForm((f) => ({ ...f, start: t.start, end: t.end }))}
                    >
                      {t.label}
                    </Chip>
                  ))}
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field label="Date" htmlFor="date" error={errors.date}>
                    <Input id="date" type="date" value={form.date} invalid={!!errors.date} onChange={(e) => set("date", e.target.value)} />
                  </Field>
                  <Field label="Starts" htmlFor="start" error={errors.start}>
                    <Input id="start" type="time" value={form.start} invalid={!!errors.start} onChange={(e) => set("start", e.target.value)} />
                  </Field>
                  <Field label="Ends" htmlFor="end" error={errors.end}>
                    <Input id="end" type="time" value={form.end} invalid={!!errors.end} onChange={(e) => set("end", e.target.value)} />
                  </Field>
                </div>
              </div>
            </Card>
          )}

          {step === 1 && (
            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-ink">What does the Host get?</h2>
                <p className="text-sm text-muted">Agents think in leads and favors, not hourly pay. Hosts see all four options side by side, so pick what fits. You can raise it later if nobody applies.</p>
              </div>
              <OfferPicker value={form.offer} onChange={(v) => set("offer", v)} error={errors.offer} />
              <Card tone="tint" className="flex gap-2.5 text-sm text-brand-900">
                <InfoIcon size={18} className="mt-0.5 shrink-0 text-brand-700" />
                <p>CoOpenHouse records the agreed terms in a signed agreement. It does not move money, so settle any fee outside the app (Venmo or brokerage check).</p>
              </Card>
            </div>
          )}

          {step === 2 && (
            <Card className="space-y-4">
              <div>
                <h2 className="text-lg font-semibold text-ink">Handoff details</h2>
                <p className="text-sm text-muted">Shared only with the Host you confirm. Access details are revealed 48 hours before the event.</p>
              </div>
              <Segment
                label="Access method"
                value={form.access}
                onChange={(v) => set("access", v)}
                options={[
                  { id: "lockbox", title: "Lockbox", desc: "Code shared before the event", icon: <LockIcon size={16} /> },
                  { id: "meet", title: "Meet in person", desc: "You hand over the keys on site", icon: <UsersIcon size={16} /> },
                  { id: "key-pickup", title: "Key pickup", desc: "Collect from a set location", icon: <KeyIcon size={16} /> },
                ]}
              />
              <Field label="Access instructions" htmlFor="acc" optional hint="Lockbox code, meeting spot, or pickup address.">
                <Input id="acc" value={form.accessDetails} onChange={(e) => set("accessDetails", e.target.value)} placeholder={form.access === "lockbox" ? "Lockbox on the front gate, code 4821" : form.access === "meet" ? "I'll meet you at the front door at 12:45" : "Key at the Zilker office front desk"} />
              </Field>
              <Field label="Sign-in sheet expectations" htmlFor="si" optional>
                <Textarea id="si" value={form.signIn} onChange={(e) => set("signIn", e.target.value)} />
              </Field>
              <Field label="Talking points" htmlFor="tp" optional hint="What makes this home special.">
                <Textarea id="tp" value={form.talking} onChange={(e) => set("talking", e.target.value)} placeholder="New roof (2023), walkable to the park, seller motivated for a 30-day close." />
              </Field>
              <Field label="Client sensitivities" htmlFor="se" optional>
                <Textarea id="se" value={form.sensitivities} onChange={(e) => set("sensitivities", e.target.value)} placeholder="Seller has two cats. Please keep doors closed." />
              </Field>
              <Field label="Do not discuss" htmlFor="dn" optional hint="One item per line.">
                <Textarea id="dn" value={form.doNot} onChange={(e) => set("doNot", e.target.value)} placeholder={"Seller's reason for moving\nPrice flexibility"} />
              </Field>
              <div className="grid gap-4 border-t border-line pt-4 sm:grid-cols-2">
                <LabeledInput label="Emergency contact" value={form.ecName} error={errors.ecName} onChange={(e) => set("ecName", e.target.value)} hint="That is you, by default." />
                <LabeledInput label="Phone" type="tel" value={form.ecPhone} error={errors.ecPhone} onChange={(e) => set("ecPhone", e.target.value)} />
              </div>
            </Card>
          )}

          {step === 3 && (
            <>
              <Card className="space-y-4">
                <div>
                  <h2 className="text-lg font-semibold text-ink">Who can apply</h2>
                  <p className="text-sm text-muted">Start narrow if you like, then widen automatically.</p>
                </div>
                <Segment
                  label="Audience"
                  value={form.mode}
                  onChange={(v) => set("mode", v)}
                  options={[
                    { id: "verified", title: "Verified nearby", desc: `Verified agents within ${form.radius} miles`, icon: <ShieldCheckIcon size={16} /> },
                    { id: "brokerage", title: "My brokerage", desc: "Agents at your brokerage first", icon: <BuildingIcon size={16} /> },
                    { id: "worked-with", title: "Worked with", desc: "Agents who have covered for you", icon: <UsersIcon size={16} /> },
                  ]}
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Radius" htmlFor="rad">
                    <Select id="rad" value={form.radius} onChange={(e) => set("radius", e.target.value)}>
                      {[3, 5, 10, 15, 25].map((n) => (
                        <option key={n} value={n}>{n} miles</option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Widen to all verified agents" htmlFor="wid" hint="Auto-widen if nobody applies.">
                    <Select id="wid" value={form.widen} onChange={(e) => set("widen", e.target.value)}>
                      <option value="off">Never</option>
                      <option value="6">After 6 hours</option>
                      <option value="12">After 12 hours</option>
                      <option value="24">After 24 hours</option>
                      <option value="48">After 48 hours</option>
                    </Select>
                  </Field>
                </div>
                <fieldset>
                  <legend className="mb-1.5 text-sm font-medium text-ink">Require badges</legend>
                  <div className="flex flex-wrap gap-2">
                    {(["license", "brokerage", "id"] as BadgeKind[]).map((b) => (
                      <Chip key={b} active={form.badges.includes(b)} onClick={() => set("badges", form.badges.includes(b) ? form.badges.filter((x) => x !== b) : [...form.badges, b])}>
                        {{ license: "License verified", brokerage: "Brokerage verified", id: "ID verified" }[b]}
                      </Chip>
                    ))}
                  </div>
                  {form.badges.length === 0 && <p className="mt-1.5 text-xs text-warn-700">With no required badges, unverified agents can apply. Consider keeping License verified.</p>}
                </fieldset>
                <Toggle checked={form.instant} onChange={(v) => set("instant", v)} label="Instant accept" desc="The first eligible Host to claim it is confirmed automatically. Best for trusted audiences." />
              </Card>

              <Card className="space-y-3">
                <h2 className="text-lg font-semibold text-ink">Review</h2>
                <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm">
                  <dt className="text-muted">Listing</dt>
                  <dd className="text-ink">{form.address}, {form.neighborhood} · {formatCurrency(Number(form.price))}</dd>
                  <dt className="text-muted">When</dt>
                  <dd className="text-ink">{preview && formatWindow(preview.startsAt, preview.endsAt)}</dd>
                  <dt className="text-muted">Offer</dt>
                  <dd className="text-ink">{offerLabel(offerFromDraft(form.offer))}</dd>
                  <dt className="text-muted">Access</dt>
                  <dd className="text-ink">{{ lockbox: "Lockbox", meet: "Meet in person", "key-pickup": "Key pickup" }[form.access]}</dd>
                  <dt className="text-muted">Audience</dt>
                  <dd className="text-ink">
                    {{ verified: `Verified within ${form.radius} mi`, brokerage: "My brokerage first", "worked-with": "Agents I've worked with first" }[form.mode]}
                    {form.widen !== "off" && form.mode !== "verified" ? `, widening after ${form.widen}h` : ""}
                    {form.instant ? ", instant accept" : ""}
                  </dd>
                </dl>
                <div className="rounded-xl bg-accent-50 p-3 text-sm text-accent-700">
                  <p className="font-semibold">Lead ownership</p>
                  <p>The Host may follow up with open house visitors who sign in as unrepresented, and may not solicit the seller or represent the listing. You keep the seller relationship, full stop.</p>
                </div>
                <details className="rounded-xl border border-line p-3 text-sm">
                  <summary className="cursor-pointer font-medium text-ink">Preview agreement</summary>
                  <div className="mt-2 space-y-2 whitespace-pre-line text-ink-soft">{preview?.agreement.terms}</div>
                  <p className="mt-2 text-xs text-muted">Publishing signs this on your behalf. The Host accepts when applying.</p>
                </details>
              </Card>
            </>
          )}

          <div className="sticky bottom-20 z-10 -mx-1 flex items-center gap-2 rounded-2xl border border-line bg-surface/95 p-2 shadow-card backdrop-blur md:bottom-4">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)} disabled={submit.loading}>
                Back
              </Button>
            )}
            <Button variant="ghost" onClick={() => publish(true)} disabled={submit.loading} className="ml-auto">
              Save draft
            </Button>
            {isLast ? (
              <Button variant="accent" onClick={() => publish(false)} loading={submit.loading}>
                Publish request
              </Button>
            ) : (
              <Button onClick={next}>Continue</Button>
            )}
          </div>
        </div>

        <aside className="space-y-2 lg:sticky lg:top-20 lg:self-start" aria-label="Host preview">
          <div className="flex items-center justify-between">
            <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">How Hosts will see it</h2>
            <Badge tone="neutral" size="sm">Live preview</Badge>
          </div>
          {preview && <RequestCard request={preview} viewerId={null} showStatus={false} />}
          <p className="text-xs text-muted">Hosts see the neighborhood only. The full address appears after they apply.</p>
        </aside>
      </div>
    </AppShell>
  );
}
