"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { getUserSync, subscribeDB, getDBVersion } from "./db";
import { cityFromPath, cityPath, DEFAULT_CITY, stripCity, type CityKey } from "./cities";
import type { ActiveRole, User } from "./types";
import { DEMO_HOST_ID, DEMO_LISTER_ID } from "./seed";

const STORAGE_KEY = "coopenhouse.auth.v1";
const listeners = new Set<() => void>();

interface Stored {
  userId: string;
  mode?: ActiveRole;
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

/** Demo accounts shown on the login page. Either account can use either mode. */
export const DEMO_LOGINS: { userId: string; blurb: ActiveRole }[] = [
  { userId: DEMO_LISTER_ID, blurb: "lister" },
  { userId: DEMO_HOST_ID, blurb: "host" },
];

/** Landing page for a display mode in a city. Central place for mode-aware links. */
export function homeFor(mode: ActiveRole, city: CityKey): string {
  return cityPath(city, mode === "lister" ? "/lister" : "/host");
}

/** Mode implied by a pathname (city prefix optional), or null on shared pages (profile, events, login). */
export function modeFromPath(pathname: string): ActiveRole | null {
  const p = stripCity(pathname);
  if (p === "/lister" || p.startsWith("/lister/")) return "lister";
  if (p === "/host" || p.startsWith("/host/")) return "host";
  return null;
}

/** Login URL that returns to `next` and defaults to `city`. */
export function loginUrl(city: CityKey, next?: string): string {
  return `/login?city=${city}${next ? `&next=${encodeURIComponent(next)}` : ""}`;
}

interface AuthValue {
  /** False until localStorage has been read on the client. */
  ready: boolean;
  currentUser: User | null;
  /** The current display mode (Lister view or Host view). Not an identity. */
  mode: ActiveRole | null;
  login: (userId: string) => User | null;
  logout: () => void;
  /** Change display mode only; never changes the signed-in user. */
  setMode: (mode: ActiveRole) => void;
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

  const mode: ActiveRole | null = currentUser ? (stored?.mode ?? currentUser.defaultMode) : null;

  const login = useCallback((userId: string) => {
    const u = getUserSync(userId);
    if (!u) return null;
    writeRaw(JSON.stringify({ userId, mode: u.defaultMode } satisfies Stored));
    return u;
  }, []);
  const logout = useCallback(() => writeRaw(null), []);
  const setMode = useCallback((m: ActiveRole) => {
    const s = parse(readRaw() ?? memoryFallback);
    if (s && s.mode !== m) writeRaw(JSON.stringify({ ...s, mode: m }));
  }, []);

  const value = useMemo<AuthValue>(
    () => ({ ready, currentUser, mode, login, logout, setMode }),
    [ready, currentUser, mode, login, logout, setMode],
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

/** Redirects to /login (with ?city= and ?next=) when signed out. Renders nothing until auth is known. */
export function RequireAuth({ children, fallback = null }: { children: ReactNode; fallback?: ReactNode }) {
  const { ready: authReady, currentUser } = useAuth();
  const ready = useHydrated() && authReady;
  const router = useRouter();
  const pathname = usePathname();
  const city = cityFromPath(pathname) ?? DEFAULT_CITY;
  useEffect(() => {
    if (ready && !currentUser) router.replace(loginUrl(city, pathname));
  }, [ready, currentUser, router, pathname, city]);
  if (!ready || !currentUser) return <>{fallback}</>;
  return <>{children}</>;
}

/**
 * Requires auth and aligns the display mode with the route's mode (the path is the source of truth
 * on /<city>/lister/* and /<city>/host/*). Never redirects between modes, so there are no redirect loops.
 */
export function RequireRole({ role, children, fallback = null }: { role: ActiveRole; children: ReactNode; fallback?: ReactNode }) {
  const { ready: authReady, currentUser, mode, setMode } = useAuth();
  const ready = useHydrated() && authReady;
  const router = useRouter();
  const pathname = usePathname();
  const city = cityFromPath(pathname) ?? DEFAULT_CITY;
  useEffect(() => {
    if (!ready) return;
    if (!currentUser) router.replace(loginUrl(city, pathname));
    else if (mode !== role) setMode(role);
  }, [ready, currentUser, mode, role, setMode, router, pathname, city]);
  if (!ready || !currentUser) return <>{fallback}</>;
  return <>{children}</>;
}
