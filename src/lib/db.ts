// In-memory store. Module-level singleton stored on globalThis so it survives
// hot reloads and client-side navigation. No persistence beyond the page session.
import { seedNotifications, seedRequests, seedUsers } from "./seed";
import type { Notification, OpenHouseRequest, User } from "./types";

export interface DB {
  users: User[];
  requests: OpenHouseRequest[];
  notifications: Notification[];
  version: number;
  listeners: Set<() => void>;
}

const KEY = "__coopenhouse_db__";
type G = typeof globalThis & { [KEY]?: DB };

function create(): DB {
  return {
    users: seedUsers(),
    requests: seedRequests(),
    notifications: seedNotifications(),
    version: 0,
    listeners: new Set(),
  };
}

export function getDB(): DB {
  const g = globalThis as G;
  if (!g[KEY]) g[KEY] = create();
  return g[KEY];
}

/** Reset to freshly seeded data (handy for demos). */
export function resetDB(): void {
  const g = globalThis as G;
  const listeners = g[KEY]?.listeners ?? new Set<() => void>();
  g[KEY] = { ...create(), listeners, version: (g[KEY]?.version ?? 0) + 1 };
  listeners.forEach((l) => l());
}

export function emitChange(): void {
  const db = getDB();
  db.version += 1;
  db.listeners.forEach((l) => l());
}

export function subscribeDB(listener: () => void): () => void {
  const db = getDB();
  db.listeners.add(listener);
  return () => {
    db.listeners.delete(listener);
  };
}

export function getDBVersion(): number {
  return getDB().version;
}

/** Synchronous user lookup (stable reference until the user is updated). */
export function getUserSync(id: string | null | undefined): User | undefined {
  if (!id) return undefined;
  return getDB().users.find((u) => u.id === id);
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
}
