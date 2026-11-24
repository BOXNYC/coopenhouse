import type { OpenHouseRequest, User } from "@/lib/types";

/** Everything an event panel needs about the viewer and the (possibly simulated) clock. */
export interface EventCtx {
  req: OpenHouseRequest;
  me: User;
  /** The viewer is the confirmed Host (otherwise the Lister). */
  isHost: boolean;
  /** Simulated or real epoch ms. */
  now: number;
  /** The other agent, if loaded. */
  other: User | undefined;
}

export function mapsLink(address: string): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
