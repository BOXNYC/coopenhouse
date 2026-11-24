"use client";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import { markNotificationsRead } from "@/lib/api";
import { homeFor, RequireAuth, RequireRole, useAuth } from "@/lib/auth";
import { useNotifications } from "@/lib/hooks";
import { relativeTime } from "@/lib/format";
import type { ActiveRole } from "@/lib/types";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import { Avatar } from "./ui/Avatar";
import { Badge } from "./ui/Badge";
import { Modal } from "./ui/Modal";
import { Skeleton } from "./ui/Skeleton";
import { BellIcon, ChevronLeftIcon, HomeIcon, LogoutIcon, PlusIcon, SearchIcon, SwapIcon, UserIcon } from "./ui/icons";

interface NavItem {
  href: string;
  label: string;
  Icon: typeof HomeIcon;
  match: (p: string) => boolean;
  primary?: boolean;
}

const NAV: Record<ActiveRole, NavItem[]> = {
  lister: [
    { href: "/lister", label: "Requests", Icon: HomeIcon, match: (p) => p === "/lister" || p.startsWith("/lister/requests") || p.startsWith("/events") },
    { href: "/lister/new", label: "New", Icon: PlusIcon, match: (p) => p.startsWith("/lister/new"), primary: true },
    { href: "/profile", label: "Profile", Icon: UserIcon, match: (p) => p.startsWith("/profile") },
  ],
  host: [
    { href: "/host", label: "Feed", Icon: SearchIcon, match: (p) => p === "/host" || p.startsWith("/host/") || p.startsWith("/events") },
    { href: "/profile", label: "Profile", Icon: UserIcon, match: (p) => p.startsWith("/profile") },
  ],
};

export interface AppShellProps {
  children: ReactNode;
  /** Page title shown in the header. */
  title?: string;
  subtitle?: string;
  /** Shows a back button linking here. */
  back?: string;
  /** Right-side header slot. */
  actions?: ReactNode;
  /** Restrict to a role (redirects others). Omit to require sign-in only. */
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
      <Shell {...rest}>{children}</Shell>
    </RequireRole>
  ) : (
    <RequireAuth fallback={fallback}>
      <Shell {...rest}>{children}</Shell>
    </RequireAuth>
  );
}

function Shell({ children, title, subtitle, back, actions }: Omit<AppShellProps, "role">) {
  const { currentUser, role, logout, switchDemoRole } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
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
  const items = NAV[role];
  const unread = notes.data?.filter((n) => !n.read).length ?? 0;
  const otherRoleLabel = role === "lister" ? "Host" : "Lister";

  const openBell = () => {
    setBell(true);
    setMenu(false);
    if (unread) void markNotificationsRead(currentUser.id);
  };
  const doSwitch = () => {
    switchDemoRole();
    setMenu(false);
    router.push(homeFor(role === "lister" ? "host" : "lister"));
  };
  const doLogout = () => {
    logout();
    router.push("/login");
  };
  const notePath = (requestId?: string) => (requestId ? (role === "lister" ? `/lister/requests/${requestId}` : `/host/requests/${requestId}`) : homeFor(role));

  return (
    <div className="min-h-dvh md:flex">
      {/* Desktop side nav */}
      <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-line bg-surface p-4 md:flex">
        <Link href={homeFor(role)} className="px-2 py-1">
          <Logo />
        </Link>
        <nav className="mt-6 space-y-1">
          {items.map((it) => {
            const active = it.match(pathname);
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
              <Badge tone={role === "lister" ? "brand" : "accent"} size="sm">{role === "lister" ? "Lister" : "Host"}</Badge>
            </div>
          </div>
          <ThemeToggle className="mt-3 w-full justify-between" showLabels={false} />
          <button onClick={doSwitch} className="mt-2 flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-ink-soft hover:bg-ink/5">
            <SwapIcon size={16} /> Switch to {otherRoleLabel} demo
          </button>
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
              <Link href={homeFor(role)} className="md:hidden">
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
                        <p className="text-xs text-muted">Signed in as {role === "lister" ? "Lister" : "Host"}</p>
                      </div>
                    </div>
                    <div className="px-2 pb-2"><ThemeToggle className="w-full justify-between" /></div>
                    <Link href="/profile" className="flex items-center gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-ink/5">
                      <UserIcon size={16} /> Profile
                    </Link>
                    <button onClick={doSwitch} className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-ink/5">
                      <SwapIcon size={16} /> Switch to {otherRoleLabel} demo
                    </button>
                    <button onClick={doLogout} className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-sm hover:bg-ink/5">
                      <LogoutIcon size={16} /> Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-3xl flex-1 px-4 pb-28 pt-4 md:pb-12 md:pt-6">{children}</main>
      </div>

      {/* Mobile bottom tab bar */}
      <nav className="pb-safe fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 backdrop-blur md:hidden" aria-label="Primary">
        <ul className="mx-auto flex max-w-md items-stretch justify-around">
          {items.map((it) => {
            const active = it.match(pathname);
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
        ) : !notes.data?.length ? (
          <p className="py-6 text-center text-sm text-muted">You&apos;re all caught up.</p>
        ) : (
          <ul className="-mx-2 divide-y divide-line">
            {notes.data.map((n) => (
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
