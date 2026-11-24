// Pure business rules shared by the API and the UI (no I/O).
import type {
  AudienceMode,
  OpenHouseRequest,
  Rating,
  RequestStatus,
  User,
} from "./types";

export const ACCESS_REVEAL_HOURS = 48;

export const AUSTIN_CENTER = { lat: 30.2672, lng: -97.7431 };

export const NEIGHBORHOODS: Record<string, { lat: number; lng: number }> = {
  "Hyde Park": { lat: 30.3043, lng: -97.7291 },
  "Zilker": { lat: 30.2669, lng: -97.7729 },
  "East Austin": { lat: 30.2634, lng: -97.7137 },
  "South Congress": { lat: 30.2488, lng: -97.7497 },
  "Mueller": { lat: 30.2999, lng: -97.7048 },
  "Tarrytown": { lat: 30.3011, lng: -97.7683 },
  "Barton Hills": { lat: 30.2543, lng: -97.7783 },
  "Bouldin Creek": { lat: 30.2517, lng: -97.7564 },
  "Cherrywood": { lat: 30.2929, lng: -97.7152 },
  "Circle C": { lat: 30.1819, lng: -97.8536 },
  "Westlake": { lat: 30.2977, lng: -97.8067 },
  "Allandale": { lat: 30.3392, lng: -97.7454 },
};

export function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 3958.8;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 10) / 10;
}

export function hoursUntil(iso: string, now: number = Date.now()): number {
  return (new Date(iso).getTime() - now) / 3_600_000;
}

export function isPast(req: Pick<OpenHouseRequest, "endsAt">, now: number = Date.now()): boolean {
  return new Date(req.endsAt).getTime() < now;
}

/** Statuses where the event still needs action / is live. */
export const ACTIVE_STATUSES: RequestStatus[] = ["draft", "open", "applied", "confirmed", "checked-in"];
export const CLOSED_STATUSES: RequestStatus[] = [
  "completed",
  "settled",
  "cancelled-lister",
  "cancelled-host",
  "expired",
  "disputed",
];

export function isLister(req: OpenHouseRequest, userId: string): boolean {
  return req.listerId === userId;
}
export function isApplicant(req: OpenHouseRequest, userId: string): boolean {
  return req.applicants.some((a) => a.hostId === userId && a.status !== "withdrawn");
}
export function isConfirmedHost(req: OpenHouseRequest, userId: string): boolean {
  return req.confirmedHostId === userId;
}

/** §5.2: neighborhood only until the host applies or is confirmed. */
export function canViewFullAddress(req: OpenHouseRequest, userId: string): boolean {
  return isLister(req, userId) || isApplicant(req, userId) || isConfirmedHost(req, userId);
}

/** §7.3: lockbox/meeting details go to the confirmed host shortly before the event. */
export function canViewAccessDetails(req: OpenHouseRequest, userId: string, now = Date.now()): boolean {
  if (isLister(req, userId)) return true;
  if (!isConfirmedHost(req, userId)) return false;
  return hoursUntil(req.startsAt, now) <= ACCESS_REVEAL_HOURS;
}

/** §5.1.5: contact details are released only on confirmation. */
export function canViewContact(req: OpenHouseRequest, userId: string): boolean {
  return isLister(req, userId) || isConfirmedHost(req, userId);
}

export function displayAddress(req: OpenHouseRequest, userId: string | null | undefined): string {
  if (userId && canViewFullAddress(req, userId)) return `${req.address}, ${req.city}, ${req.state}`;
  return `${req.neighborhood}, ${req.city}`;
}

/** Mutual ratings stay hidden from the counterpart until both are submitted (§7.4). */
export function visibleRatings(
  req: OpenHouseRequest,
  viewerId: string,
): { mine: Rating | null; theirs: Rating | null; theirsHidden: boolean; bothSubmitted: boolean } {
  const { listerToHost, hostToLister } = req.ratings;
  const viewerIsLister = req.listerId === viewerId;
  const mine = viewerIsLister ? listerToHost : hostToLister;
  const theirsRaw = viewerIsLister ? hostToLister : listerToHost;
  const both = !!listerToHost && !!hostToLister;
  return { mine, theirs: both ? theirsRaw : null, theirsHidden: !!theirsRaw && !both, bothSubmitted: both };
}

export function audienceModeLabel(mode: AudienceMode): string {
  return { verified: "All verified agents", brokerage: "My brokerage first", "worked-with": "Agents I've worked with first" }[mode];
}

export interface Eligibility {
  ok: boolean;
  reasons: string[];
}

/** Whether a host may apply for a request (state license, badges, audience, account). */
export function hostEligibility(req: OpenHouseRequest, host: User, lister: User | undefined, now = Date.now()): Eligibility {
  const reasons: string[] = [];
  if (host.accountStatus === "suspended") reasons.push("Your account is suspended.");
  if (host.licenseState !== req.state) reasons.push(`You are not licensed in ${req.state}.`);
  for (const b of req.audience.requireBadges) {
    if (!host.badges[b]) {
      const label = { license: "License", brokerage: "Brokerage", id: "ID" }[b];
      reasons.push(`${label} verification required.`);
    }
  }
  const widened =
    req.audience.widenAfterHours !== undefined &&
    (now - new Date(req.createdAt).getTime()) / 3_600_000 >= req.audience.widenAfterHours;
  if (!widened && lister) {
    if (req.audience.mode === "brokerage" && host.brokerage !== lister.brokerage) {
      reasons.push("Restricted to the Lister's brokerage for now.");
    }
    if (req.audience.mode === "worked-with" && !host.workedWithListerIds.includes(lister.id)) {
      reasons.push("Restricted to agents the Lister has worked with for now.");
    }
  }
  return { ok: reasons.length === 0, reasons };
}

/** 0-100 score used to sort applicants. */
export function trustScore(u: User): number {
  let s = 0;
  if (u.badges.license) s += 20;
  if (u.badges.brokerage) s += 10;
  if (u.badges.id) s += 10;
  if (u.eoInsured) s += 5;
  s += Math.min(u.yearsLicensed, 10);
  s += Math.min(u.stats.covered, 30) / 2;
  s += (u.stats.completionRate / 100) * 15;
  s -= u.stats.noShows * 8;
  if (u.stats.ratingCount > 0) s += (u.stats.rating / 5) * 15;
  return Math.max(0, Math.min(100, Math.round(s)));
}

export interface Mutuals {
  sameBrokerage: boolean;
  workedWithLister: boolean;
}
export function mutualConnections(viewer: User | undefined, host: User): Mutuals {
  if (!viewer) return { sameBrokerage: false, workedWithLister: false };
  return {
    sameBrokerage: viewer.brokerage === host.brokerage,
    workedWithLister: host.workedWithListerIds.includes(viewer.id),
  };
}

export function agreementTerms(offerText: string): string {
  return [
    `Compensation: ${offerText}. Terms are recorded here and settled outside CoOpenHouse (Venmo or brokerage check). CoOpenHouse does not process payments.`,
    "Lead ownership: the Host may follow up with open house visitors who sign in as unrepresented, and may not solicit the seller or represent the listing. The Lister keeps the seller relationship.",
    "Confidentiality: access details, client information and sensitivities are shared in confidence and used only for this event.",
    "Conduct: the Host will arrive on time, check in and out in the app, keep the property secure, and report any problem immediately.",
    "Liability: both agents remain responsible to their own brokerages. Each confirms their brokerage permits this arrangement.",
    "Cancellations: late cancellations may affect reliability scores. If the Lister cancels after the Host has committed, a flat fee may be partially owed or a credit granted.",
  ].join("\n\n");
}

export function defaultChecklist(): { id: string; label: string; done: boolean }[] {
  return [
    "Review talking points and do-not-discuss list",
    "Confirm access plan (lockbox, meet or key pickup)",
    "Set up sign-in sheet and open house signs",
    "Check in and photograph condition on arrival",
    "Final walkthrough and lock up",
    "Check out and photograph condition at close",
  ].map((label, i) => ({ id: `cl_${i + 1}`, label, done: false }));
}
