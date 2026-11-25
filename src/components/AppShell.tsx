"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { markNotificationsRead } from "@/lib/api";
import { homeFor, modeFromPath, RequireAuth, RequireRole, useAuth } from "@/lib/auth";
import { CITIES, CITY_KEYS, cityPath, isCityKey, stripCity, type CityKey } from "@/lib/cities";
import { forgetCity, useCity } from "@/lib/city";
import { useNotifications } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import type { ActiveRole } from "@/lib/types";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./ui/Avatar";
import { Modal } from "./ui/Modal";
import { Skeleton } from "./ui/Skeleton";
import { Tabs } from "./ui/Tabs";
import { BellIcon, ChevronLeftIcon, HomeIcon, LogoutIcon, PlusIcon, SearchIcon, UserIcon } from "./ui/icons";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
  match: (p: string) => boolean;
  primary?: boolean;
}

/** Nav items for a mode; `p` is the path WITHOUT the city prefix, hrefs are city-scoped. */
function navFor(role: ActiveRole, city: CityKey): NavItem[] {
  const to = (p: string) => cityPath(city, p);
  return role === "lister"
    ? [
        { href: to("/lister"), label: "Requests", Icon: HomeIcon, match: (p) => p === "/lister" || p.startsWith("/lister/requests") || p.startsWith("/events") },
        { href: to("/lister/new"), label: "New", Icon: PlusIcon, match: (p) => p.startsWith("/lister/new"), primary: true },
        { href: to("/profile"), label: "Profile", Icon: UserIcon, match: (p) => p.startsWith("/profile") },
      ]
    : [
        { href: to("/host"), label: "Feed", Icon: SearchIcon, match: (p) => p === "/host" || p.startsWith("/host/") || p.startsWith("/events") },
        { href: to("/profile"), label: "Profile", Icon: UserIcon, match: (p) => p.startsWith("/profile") },
      ];
}

function CitySwitcher({ value, onChange, className }: { value: CityKey; onChange: (c: CityKey) => void; className?: string }) {
  return (
    <label className={cn("flex items-center gap-1.5 rounded-xl border border-line bg-paper px-2.5 py-1.5 text-sm text-ink-soft", className)}>
      <span className="sr-only">City</span>
      <select
        aria-label="City"
        value={value}
        onChange={(e) => isCityKey(e.target.value) && onChange(e.target.value)}
        className="min-w-0 flex-1 bg-transparent text-sm font-medium text-ink outline-none"
      >
        {CITY_KEYS.map((k) => (
          <option key={k} value={k}>{CITIES[k].name}</option>
        ))}
      </select>
    </label>
  );
}

export interface AppShellProps {
  children: ReactNode;
  /** Page title shown in the header. */
  title?: string;
  subtitle?: string;
  /** Shows a back button linking here. */
  back?: string;
  /** Right-side header slot. */
  actions?: ReactNode;
  /** Route mode: aligns the display mode with this page (no redirects). Omit on shared pages. */
  role?: ActiveRole;
}

function ShellSkeleton() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}

export function AppShell({ children, role, ...rest }: AppShellProps) {
  const fallback = <ShellSkeleton />;
  return role ? (
    <RequireRole role={role} fallback={fallback}>
      <Shell routeMode={role} {...rest}>{children}</Shell>
    </RequireRole>
  ) : (
    <RequireAuth fallback={fallback}>
      <Shell {...rest}>{children}</Shell>
    </RequireAuth>
  );
}

const MODE_TABS = [
  { id: "lister" as const, label: "Lister" },
  { id: "host" as const, label: "Host" },
];

function Shell({ children, title, subtitle, back, actions, routeMode }: Omit<AppShellProps, "role"> & { routeMode?: ActiveRole }) {
  const { currentUser, mode, logout, setMode } = useAuth();
  const role = routeMode ?? mode;
  const router = useRouter();
  const pathname = usePathname();
  const { key: cityKey, path } = useCity();
  const [menu, setMenu] = useState(false);
  const [bell, setBell] = useState(false);
  const notes = useNotifications(currentUser?.id);

  useEffect(() => {
    // close menus on navigation
    const t = setTimeout(() => {
      setMenu(false);
      setBell(false);
    }, 0);
    return () => clearTimeout(t);
  }, [pathname]);

  if (!currentUser || !role) return <ShellSkeleton />;
  const items = navFor(role, cityKey);
  const rel = stripCity(pathname);
  const cityNotes = (notes.data ?? []).filter((n) => (n.cityKey ?? "austin") === cityKey);
  const unread = cityNotes.filter((n) => !n.read).length;
  const switchMode = (m: ActiveRole) => {
    setMode(m);
    setMenu(false);
    // On a mode route, go to the equivalent home; on shared pages (profile, events) stay put.
    if (modeFromPath(pathname)) router.push(homeFor(m, cityKey));
  };

  const openBell = () => {
    setBell(true);
    setMenu(false);
    if (unread) void markNotificationsRead(currentUser.id);
  };
  const doLogout = () => {
    logout();
    forgetCity();
    router.push("/login");
  };
  /** Switch city, keeping the page type: profile stays profile, everything else goes to the mode home. */
  const switchCity = (c: CityKey) => {
    if (c === cityKey) return;
    setMenu(false);
    router.push(rel.startsWith("/profile") ? cityPath(c, "/profile") : homeFor(role, c));
  };
  const notePath = (requestId?: string) => (requestId ? path(role === "lister" ? `/lister/requests/${requestId}` : `/host/requests/${requestId}`) : homeFor(role, cityKey));

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop side nav */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
        <Link href="/" aria-label="CoOpenHouse home" className="px-2 py-1">
          <Logo />
        </Link>
        <CitySwitcher className="mt-4" value={cityKey} onChange={switchCity} />
        <Tabs className="mt-3" tabs={MODE_TABS} value={role} onChange={switchMode} />
        <nav className="mt-4 space-y-1">
          {items.map((it) => {
            const active = it.match(rel);
            return (
              <Link key={it.href} href={it.href} className={cn("flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition", active ? "bg-brand-50 text-brand-800" : "text-ink-soft hover:bg-ink/5", it.primary && !active && "text-accent-700")}>
                <it.Icon size={20} />
                {it.label === "New" ? "New request" : it.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto rounded-xl bg-paper p-3">
          <div className="flex items-center gap-3">
            <Avatar user={currentUser} size="md" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{currentUser.name}</p>
              <p className="truncate text-xs text-muted">{currentUser.brokerage}</p>
            </div>
          </div>
          <ThemeToggle className="mt-3 w-full justify-between" showLabels={false} />
          <button onClick={doLogout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-soft hover:bg-ink/5">
            <LogoutIcon size={16} /> Sign out
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-14 w-full max-w-3xl items-center gap-2 px-4">
            {back ? (
              <Link href={back} aria-label="Back" className="-ml-2 rounded-full p-2 text-ink-soft hover:bg-ink/5">
                <ChevronLeftIcon size={22} />
              </Link>
            ) : (
              <Link href="/" aria-label="CoOpenHouse home" className="md:hidden">
                <Logo className="[&>span:last-child]:hidden sm:[&>span:last-child]:inline" />
              </Link>
            )}
            <div className="min-w-0 flex-1">
              {title && <h1 className="truncate text-lg font-semibold leading-tight text-ink">{title}</h1>}
              {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
            </div>
            {actions}
            <button onClick={openBell} aria-label={`Notifications${unread ? `, ${unread} unread` : ""}`} className="relative rounded-full p-2 text-ink-soft hover:bg-ink/5">
              <BellIcon size={22} />
              {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
            </button>
            <div className="relative md:hidden">
              <button onClick={() => setMenu((m) => !m)} aria-label="Account menu" aria-expanded={menu}>
                <Avatar user={currentUser} size="sm" />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} aria-hidden="true" />
                  <div className="absolute right-0 top-11 z-50 w-64 animate-pop-in rounded-2xl border border-line bg-surface p-2 shadow-pop">
                    <div className="flex items-center gap-3 px-2 py-2">
                      <Avatar user={currentUser} size="md" />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{currentUser.name}</p>
                        <p className="text-xs text-muted">{currentUser.brokerage}</p>
                      </div>
                    </div>
                    <div className="px-2 pb-2"><ThemeToggle className="w-full justify-between" /></div>
                    <Link href={path("/profile")} className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-ink/5">
                      <UserIcon size={16} /> Profile
                    </Link>
                    <button onClick={doLogout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-ink/5">
                      <LogoutIcon size={16} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
          <div className="mx-auto flex w-full max-w-3xl items-center gap-2 px-4 pb-2 md:hidden">
            <Tabs className="min-w-0 flex-1" tabs={MODE_TABS} value={role} onChange={switchMode} />
            <CitySwitcher className="shrink-0" value={cityKey} onChange={switchCity} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 md:pb-12 md:pt-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden" aria-label="Primary">
        <ul className="mx-auto flex max-w-md items-stretch justify-around">
          {items.map((it) => {
            const active = it.match(rel);
            return (
              <li key={it.href} className="flex-1">
                <Link href={it.href} aria-current={active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium", active ? "text-brand-700" : "text-muted")}>
                  {it.primary ? (
                    <span className="-mt-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent-500 text-white shadow-pop">
                      <it.Icon size={24} />
                    </span>
                  ) : (
                    <it.Icon size={22} />
                  )}
                  {it.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <Modal open={bell} onClose={() => setBell(false)} title="Notifications" variant="sheet">
        {notes.loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : !cityNotes.length ? (
          <p className="py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-line">
            {cityNotes.map((n) => (
              <li key={n.id}>
                <Link href={notePath(n.requestId)} onClick={() => setBell(false)} className="block rounded-lg px-2 py-3 hover:bg-ink/5">
                  <div className="flex items-start gap-2">
                    {!n.read && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent-500" />}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{n.title}</p>
                      <p className="text-sm text-ink-soft">{n.body}</p>
                      <p className="mt-0.5 text-xs text-muted">{relativeTime(n.createdAt)}</p>
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  );
}
