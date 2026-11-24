"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUserSync, subscribeDB, getDBVersion } from "./db";
import type { ActiveRole, User } from "./types";
import { DEMO_HOST_ID, DEMO_LISTER_ID } from "./seed";

const STORAGE_KEY = "coopenhouse.auth.v1";
const listeners = new Set<() => void>();

interface Stored {
  userId: string;
  role?: ActiveRole;
}

function readRaw(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}
function writeRaw(v: string | null): void {
  try {
    if (v === null) window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, v);
  } catch {
    // storage unavailable: fall back to in-memory only for this session
    memoryFallback = v;
  }
  listeners.forEach((l) => l());
}
let memoryFallback: string | null = null;

function subscribeStore(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}
/** undefined = server / not yet hydrated; null = signed out. */
const getClientSnapshot = (): string | null => readRaw() ?? memoryFallback;
const getServerSnapshot = (): string | null | undefined => undefined;

export const DEMO_LOGINS: { userId: string; role: ActiveRole }[] = [
  { userId: DEMO_LISTER_ID, role: "lister" },
  { userId: DEMO_HOST_ID, role: "host" },
];

export function homeFor(role: ActiveRole): string {
  return role === "lister" ? "/lister" : "/host";
}

interface AuthValue {
  /** False until localStorage has been read on the client. */
  ready: boolean;
  currentUser: User | null;
  /** The single role the signed-in user is acting as. */
  role: ActiveRole | null;
  login: (userId: string) => User | null;
  logout: () => void;
  /** For users with role 'both'. */
  setRole: (role: ActiveRole) => void;
  /** Sign in as the demo user of the other role. */
  switchDemoRole: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

function parse(raw: string | null | undefined): Stored | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as Stored;
    return v && typeof v.userId === "string" ? v : null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const raw = useSyncExternalStore(subscribeStore, getClientSnapshot, getServerSnapshot);
  // Re-render when users are edited so currentUser stays fresh.
  useSyncExternalStore(subscribeDB, getDBVersion, () => 0);
  const ready = raw !== undefined;
  const stored = parse(raw);
  const currentUser = (ready && getUserSync(stored?.userId)) || null;

  const role: ActiveRole | null = currentUser
    ? currentUser.role === "both"
      ? (stored?.role ?? "lister")
      : currentUser.role
    : null;

  const login = useCallback((userId: string) => {
    const u = getUserSync(userId);
    if (!u) return null;
    writeRaw(JSON.stringify({ userId, role: u.role === "both" ? "lister" : u.role } satisfies Stored));
    return u;
  }, []);
  const logout = useCallback(() => writeRaw(null), []);
  const setRole = useCallback((r: ActiveRole) => {
    const s = parse(readRaw() ?? memoryFallback);
    if (s) writeRaw(JSON.stringify({ ...s, role: r }));
  }, []);
  const switchDemoRole = useCallback(() => {
    const s = parse(readRaw() ?? memoryFallback);
    const target = s?.userId === DEMO_LISTER_ID ? DEMO_HOST_ID : DEMO_LISTER_ID;
    login(target);
  }, [login]);

  const value = useMemo<AuthValue>(
    () => ({ ready, currentUser, role, login, logout, setRole, switchDemoRole }),
    [ready, currentUser, role, login, logout, setRole, switchDemoRole],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

const noopSubscribe = () => () => {};
/** False on the server and while this component hydrates, even if the provider above already has; true afterwards. */
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

/** Redirects to /login (with ?next=) when signed out. Renders nothing until auth is known. */
export function RequireAuth({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { ready: authReady, currentUser } = useAuth();
  const ready = useHydrated() && authReady;
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (ready && !currentUser) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, currentUser, router, pathname]);
  if (!ready || !currentUser) return <>{fallback}</>;
  return <>{children}</>;
}

/** Requires auth AND the given active role; otherwise sends the user to their own home. */
export function RequireRole({ role, children, fallback = null }: { role: ActiveRole; children: ReactNode; fallback?: ReactNode }) {
  const { ready: authReady, currentUser, role: active } = useAuth();
  const ready = useHydrated() && authReady;
  const router = useRouter();
  const pathname = usePathname();
  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    else if (active && active !== role) router.replace(homeFor(active));
  }, [ready, currentUser, active, role, router, pathname]);
  if (!ready || !currentUser || active !== role) return <>{fallback}</>;
  return <>{children}</>;
}
