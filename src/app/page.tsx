import Link from "next/link";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/Button";
import { BoltIcon, BuildingIcon, ClipboardIcon, IdCardIcon, ShieldCheckIcon } from "@/components/ui/icons";
import { OFFER_META } from "@/components/ui/OfferChip";

const trust = [
  { Icon: ShieldCheckIcon, title: "License checked", body: "Every agent is verified against the state board before they can apply." },
  { Icon: IdCardIcon, title: "ID and selfie match", body: "The person who shows up is the person on the profile." },
  { Icon: BuildingIcon, title: "Brokerage verified", body: "Know who they hang their license with. Require all three badges if you like." },
  { Icon: ClipboardIcon, title: "A clear paper trail", body: "Signed terms, location-confirmed check-in, a summary report, mutual ratings." },
];

export default function Landing() {
  return (
    <div className="flex-1">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-4">
        <Logo />
        <Link href="/login" className="text-sm font-semibold text-brand-700 hover:underline">Sign in</Link>
      </header>

      <section className="mx-auto max-w-5xl px-5 pb-12 pt-8 md:pt-16">
        <p className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">
          <BoltIcon size={13} /> Austin, TX pilot
        </p>
        <h1 className="max-w-2xl text-4xl font-semibold leading-[1.1] tracking-tight text-ink md:text-6xl">
          Cover any open house with an agent you can trust.
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-soft">
          Got a conflict? Post your open house in under two minutes and match with a verified, licensed agent nearby. Want buyer leads? Find open houses near you that fit your schedule.
        </p>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <Button href="/login" size="lg" variant="accent">Try the demo</Button>
          <Button href="#how" size="lg" variant="outline">How it works</Button>
        </div>
      </section>

      <section id="how" className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-5xl gap-8 px-5 py-12 md:grid-cols-2">
          <div>
            <h2 className="text-2xl font-semibold text-ink">Trust is the product</h2>
            <p className="mt-2 text-ink-soft">Handing a client&apos;s home to a stranger is the hard part. So every application comes with a trust card, and every event leaves a record.</p>
          </div>
          <ul className="grid gap-4 sm:grid-cols-2">
            {trust.map(({ Icon, title, body }) => (
              <li key={title} className="rounded-card border border-line bg-paper p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-700 text-white"><Icon size={18} /></span>
                <h3 className="mt-3 font-semibold text-ink">{title}</h3>
                <p className="mt-1 text-sm text-ink-soft">{body}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-5 py-12">
        <h2 className="text-2xl font-semibold text-ink">Compensation that looks like how agents already work</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {Object.values(OFFER_META).map(({ name, blurb, Icon }) => (
            <div key={name} className="rounded-card border border-line bg-surface p-4 shadow-card">
              <Icon size={22} className="text-brand-700" />
              <h3 className="mt-2 font-semibold text-ink">{name}</h3>
              <p className="mt-1 text-sm text-ink-soft">{blurb}</p>
            </div>
          ))}
        </div>
        <div className="mt-10 rounded-card bg-brand-800 p-6 text-white md:p-8">
          <h2 className="text-xl font-semibold">See both sides in a minute</h2>
          <p className="mt-1 text-brand-100">Sign in as a Lister or a Host to explore. No account needed.</p>
          <Button href="/login" variant="accent" className="mt-4">Pick a demo login</Button>
        </div>
      </section>

      <footer className="mx-auto max-w-5xl px-5 pb-10 text-xs text-muted">
        CoOpenHouse is a demo. All data lives in your browser session and nothing is sent anywhere.
      </footer>
    </div>
  );
}
