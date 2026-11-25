"use client";
import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CITIES, CITY_KEYS, DEFAULT_CITY, cityFromPath, isCityKey, type CityKey } from "@/lib/cities";
import { recallCity } from "@/lib/city";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { VerificationBadges } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { DEMO_LOGINS, homeFor, useAuth } from "@/lib/auth";
import { Tabs } from "@/components/ui/Tabs";
import { registerUser } from "@/lib/api";
import { getUserSync } from "@/lib/db";
import type { ActiveRole } from "@/lib/types";
import { cn } from "@/lib/cn";

const COPY = {
  lister: { title: "I need coverage", sub: "Post an open house, review verified applicants, confirm one." },
  host: { title: "I want to host", sub: "Browse nearby open houses, apply in one tap, collect buyer leads." },
};

export default function LoginPage() {
  const { login, ready, currentUser, mode } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const sp = useSearchParams();
  const storedCity = useSyncExternalStore(() => () => {}, recallCity, () => null);
  const [picked, setPicked] = useState<CityKey | null>(null);
  // Under cacheComponents a hidden route keeps its state; reset in-flight login and city pick when this page is hidden.
  useEffect(
    () => () => {
      setPending(null);
      setPicked(null);
    },
    [],
  );
  const qCity = sp.get("city");
  const city: CityKey = picked ?? (isCityKey(qCity) ? qCity : (storedCity ?? DEFAULT_CITY));

  const [regName, setRegName] = useState("");
  const [regBrokerage, setRegBrokerage] = useState("");
  const [regMode, setRegMode] = useState<ActiveRole>("lister");
  const [regError, setRegError] = useState<string | null>(null);

  const register = async () => {
    setRegError(null);
    try {
      const u = await registerUser({ name: regName, brokerage: regBrokerage, defaultMode: regMode, cityKey: city });
      go(u.id);
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "Could not create account.");
    }
  };

  const go = (userId: string) => {
    setPending(userId);
    const u = login(userId);
    const next = sp.get("next");
    const r = u?.defaultMode ?? "lister";
    // A ?next= from the sign-out redirect points at the city you just left; only honor it when it matches the city picked here.
    const nextCity = next ? cityFromPath(next) : null;
    const safeNext = next && next.startsWith("/") && !next.startsWith("//") && (!nextCity || nextCity === city) ? next : null;
    setTimeout(() => router.push(safeNext ?? homeFor(r, city)), 350);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8 md:max-w-4xl">
      <div className="flex items-center justify-between">
        <Link href="/" aria-label="CoOpenHouse home"><Logo /></Link>
        <ThemeToggle showLabels={false} />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-ink">Welcome</h1>
      {/* <p className="mt-2 text-ink-soft">Choose a login to explore. Feel free to click around.</p> */}
      <div className="mt-4" role="radiogroup" aria-label="City">
        {/* <p className="mb-1.5 text-sm font-medium text-ink">City</p> */}
        <h2 className="text-lg font-semibold text-ink mb-1.5">City</h2>
        <div className="grid grid-cols-2 gap-2">
          {CITY_KEYS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={city === k}
              onClick={() => setPicked(k)}
              className={cn("rounded-xl border px-3 py-2 text-sm font-semibold transition", city === k ? "border-brand-500 bg-brand-50 text-brand-800 ring-2 ring-brand-500/25" : "border-line-strong bg-surface text-ink-soft hover:border-brand-300")}
            >
              {CITIES[k].name}
            </button>
          ))}
        </div>
      </div>

      {ready && currentUser && mode && (
        <button onClick={() => router.push(homeFor(mode, city))} className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-left text-sm text-brand-800">
          Signed in as <strong>{currentUser.name}</strong>. Continue &rarr;
        </button>
      )}

      <div className="mt-6 md:grid md:grid-cols-2 md:items-start md:gap-8">
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-ink">Log in</h2>
        {DEMO_LOGINS.map(({ userId, blurb: r }) => {
          const u = getUserSync(userId);
          if (!u) return null;
          const busy = pending === userId;
          return (
            <button
              key={userId}
              onClick={() => go(userId)}
              disabled={!!pending}
              className={cn("group w-full rounded-card border bg-surface p-5 text-left shadow-card transition hover:shadow-pop active:scale-[0.99] disabled:opacity-70", r === "lister" ? "border-brand-200" : "border-accent-100")}
            >
              <div className="flex items-center gap-4">
                <Avatar user={u} size="lg" />
                <div className="min-w-0 flex-1">
                  {/* <p className={cn("text-xs font-semibold uppercase tracking-wide", r === "lister" ? "text-brand-700" : "text-accent-700")}>Opens in {r === "lister" ? "Lister" : "Host"} view</p> */}
                  <p className="text-lg font-semibold text-ink">{u.name}</p>
                  <p className="truncate text-sm text-muted">{u.brokerage}</p>
                </div>
                {busy ? <Spinner className="text-brand-700" /> : <ChevronRightIcon size={20} className="text-muted transition group-hover:translate-x-0.5" />}
              </div>
              {/* <p className="mt-3 font-medium text-ink">{COPY[r].title}</p>
              <p className="text-sm text-ink-soft">{COPY[r].sub}</p>
              <div className="mt-3">
                <VerificationBadges badges={u.badges} compact />
              </div> */}
            </button>
          );
        })}
      </div>

      <form
        className="mt-8 space-y-3 md:mt-0 rounded-card border border-line bg-surface p-5 shadow-card"
        onSubmit={(e) => {
          e.preventDefault();
          void register();
        }}
      >
        <h2 className="text-lg font-semibold text-ink">Create an account</h2>
        <input value={regName} onChange={(e) => setRegName(e.target.value)} placeholder="Full name" aria-label="Full name" required className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm" />
        <input value={regBrokerage} onChange={(e) => setRegBrokerage(e.target.value)} placeholder="Brokerage" aria-label="Brokerage" className="w-full rounded-xl border border-line bg-paper px-3 py-2.5 text-sm" />
        <div>
          <p className="mb-1.5 text-sm font-medium text-ink">Default view</p>
          <Tabs tabs={[{ id: "lister" as const, label: "Lister" }, { id: "host" as const, label: "Host" }]} value={regMode} onChange={setRegMode} />
          <p className="mt-1.5 text-xs text-muted">You can use both views and switch any time.</p>
        </div>
        {regError && <p className="text-sm text-danger-600">{regError}</p>}
        <button type="submit" disabled={!!pending} className="w-full rounded-xl bg-brand-700 px-4 py-3 text-sm font-semibold text-white disabled:opacity-70">Create account</button>
      </form>
      </div>
    </div>
  );
}
