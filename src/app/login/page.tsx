"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { VerificationBadges } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { DEMO_LOGINS, homeFor, useAuth } from "@/lib/auth";
import { getUserSync } from "@/lib/db";
import { cn } from "@/lib/cn";

const COPY = {
  lister: { title: "I need coverage", sub: "Post an open house, review verified applicants, confirm one." },
  host: { title: "I want to host", sub: "Browse nearby open houses, apply in one tap, collect buyer leads." },
};

export default function LoginPage() {
  const { login, ready, currentUser, role } = useAuth();
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);

  const go = (userId: string) => {
    setPending(userId);
    const u = login(userId);
    const next = new URLSearchParams(window.location.search).get("next");
    const r = u?.role === "host" ? "host" : "lister";
    setTimeout(() => router.push(next && next.startsWith("/") ? next : homeFor(r)), 350);
  };

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-5 py-8">
      <div className="flex items-center justify-between">
        <Logo />
        <ThemeToggle showLabels={false} />
      </div>
      <h1 className="mt-8 text-3xl font-semibold tracking-tight text-ink">Welcome</h1>
      <p className="mt-2 text-ink-soft">Choose a login to explore. Feel free to click around.</p>

      {ready && currentUser && role && (
        <button onClick={() => router.push(homeFor(role))} className="mt-4 rounded-xl bg-brand-50 px-4 py-3 text-left text-sm text-brand-800">
          Signed in as <strong>{currentUser.name}</strong>. Continue &rarr;
        </button>
      )}

      <div className="mt-6 space-y-4">
        {DEMO_LOGINS.map(({ userId, role: r }) => {
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
                  <p className={cn("text-xs font-semibold uppercase tracking-wide", r === "lister" ? "text-brand-700" : "text-accent-700")}>{r === "lister" ? "Lister" : "Host"}</p>
                  <p className="text-lg font-semibold text-ink">{u.name}</p>
                  <p className="truncate text-sm text-muted">{u.brokerage}</p>
                </div>
                {busy ? <Spinner className="text-brand-700" /> : <ChevronRightIcon size={20} className="text-muted transition group-hover:translate-x-0.5" />}
              </div>
              <p className="mt-3 font-medium text-ink">{COPY[r].title}</p>
              <p className="text-sm text-ink-soft">{COPY[r].sub}</p>
              <div className="mt-3">
                <VerificationBadges badges={u.badges} compact />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
