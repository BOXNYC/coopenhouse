"use client";
// Client-side async API over the in-memory store. Every call waits a randomized
// latency, then returns a deep clone (callers can never mutate the store).
import { emitChange, getDB, getUserSync, uid } from "./db";
import { offerLabel } from "./format";
import { CITIES, CITY_KEYS, type CityKey } from "./cities";
import { makeUser } from "./seed";
import {
  agreementTerms,
  defaultChecklist,
  haversineMiles,
  hostEligibility,
  hoursUntil,
  isApplicant,
  mutualConnections,
  NEIGHBORHOODS,
  isLicensedIn,
  trustScore,
  userInCity,
  type Eligibility,
  type Mutuals,
} from "./rules";
import type {
  ActiveRole,
  Application,
  Availability,
  CancelResult,
  Dispute,
  EventSummary,
  Handoff,
  Message,
  Notification,
  NotificationType,
  Offer,
  OfferType,
  OpenHouseRequest,
  Rating,
  Report,
  ReportCategory,
  RequestStatus,
  User,
  Audience,
} from "./types";

/** Simulated network latency range in ms. Tweak to taste (set both to 0 to disable). */
export const API_LATENCY = { min: 300, max: 900 };

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
  }
}

const clone = <T,>(v: T): T => structuredClone(v);
const wait = () =>
  new Promise<void>((r) => setTimeout(r, API_LATENCY.min + Math.random() * (API_LATENCY.max - API_LATENCY.min)));

async function call<T>(fn: () => T): Promise<T> {
  await wait();
  const out = fn();
  return clone(out);
}

/** Like `call`, but notifies subscribers (hooks refetch) after the write. */
async function mutate<T>(fn: () => T): Promise<T> {
  await wait();
  const out = clone(fn());
  emitChange();
  return out;
}

// ---------- internal helpers ----------

function findReq(id: string): OpenHouseRequest {
  const r = getDB().requests.find((x) => x.id === id);
  if (!r) throw new ApiError("not-found", "Request not found.");
  return r;
}
function mustUser(id: string): User {
  const u = getUserSync(id);
  if (!u) throw new ApiError("not-found", "User not found.");
  return u;
}
function patchUser(id: string, fn: (u: User) => Partial<User>): void {
  const db = getDB();
  db.users = db.users.map((u) => (u.id === id ? { ...u, ...fn(u) } : u));
}
function note(userId: string, type: NotificationType, title: string, body: string, requestId?: string): void {
  getDB().notifications.unshift({
    id: uid("n"), userId, type, title, body, requestId, cityKey: requestId ? getDB().requests.find((x) => x.id === requestId)?.cityKey : undefined, createdAt: new Date().toISOString(), read: false,
  });
}
function log(r: OpenHouseRequest, label: string): void {
  r.timeline.push({ at: new Date().toISOString(), label });
}
function nameOf(id: string): string {
  return getUserSync(id)?.name ?? "Someone";
}
function short(r: OpenHouseRequest): string {
  return r.address;
}
/** open <-> applied depends on live applicants. */
function refreshOpenStatus(r: OpenHouseRequest): void {
  if (r.status !== "open" && r.status !== "applied") return;
  r.status = r.applicants.some((a) => a.status === "pending" || a.status === "backup") ? "applied" : "open";
}
function maybeSettle(r: OpenHouseRequest): void {
  if (r.status !== "completed") return;
  if (r.payment === "unpaid" || r.payment === "disputed") return;
  if (!r.ratings.listerToHost) return;
  r.status = "settled";
  log(r, "Settled");
  if (r.offer.type === "credit" && r.confirmedHostId) {
    const n = r.offer.credits ?? 1;
    patchUser(r.confirmedHostId, (u) => ({ credits: u.credits + n }));
    patchUser(r.listerId, (u) => ({ credits: Math.max(0, u.credits - n) }));
  }
}
function withDistance(r: OpenHouseRequest, viewerId?: string): OpenHouseRequest {
  const v = getUserSync(viewerId);
  if (!v) return r;
  const h = userInCity(v, r.cityKey);
  return { ...r, distanceMiles: haversineMiles(h.homeLat, h.homeLng, r.lat, r.lng) };
}
function requireLister(r: OpenHouseRequest, userId: string): void {
  if (r.listerId !== userId) throw new ApiError("forbidden", "Only the Lister can do that.");
}
function requireConfirmedHost(r: OpenHouseRequest, userId: string): void {
  if (r.confirmedHostId !== userId) throw new ApiError("forbidden", "Only the confirmed Host can do that.");
}
function notifyNearbyHosts(r: OpenHouseRequest, excludeId: string | null): void {
  for (const u of getDB().users) {
    if (u.id === r.listerId || u.id === excludeId) continue;
    if (!u.availability.alertsEnabled) continue;
    const h = userInCity(u, r.cityKey);
    const d = haversineMiles(h.homeLat, h.homeLng, r.lat, r.lng);
    if (d <= u.radiusMiles) {
      note(u.id, "urgent", `Urgent: ${r.neighborhood} needs a host`, `${offerLabel(r.offer)}, ${d} mi away.`, r.id);
    }
  }
}

// ---------- queries ----------

export interface RequestFilters {
  listerId?: string;
  /** Host feed mode: open requests near this host (adds distanceMiles). */
  hostId?: string;
  /** Requests where this user is lister, applicant or confirmed host. */
  participantId?: string;
  status?: RequestStatus[];
  offerTypes?: OfferType[];
  maxDistanceMiles?: number;
  /** In host feed mode, include requests beyond the host's radius. */
  ignoreRadius?: boolean;
  /** Only requests in this pilot city. */
  cityKey?: CityKey;
  q?: string;
  upcomingOnly?: boolean;
  sort?: "soonest" | "nearest" | "newest";
}

export async function listRequests(filters: RequestFilters = {}): Promise<OpenHouseRequest[]> {
  return call(() => {
    const now = Date.now();
    const host = getUserSync(filters.hostId);
    let list = getDB().requests.slice();
    if (filters.cityKey) list = list.filter((r) => r.cityKey === filters.cityKey);
    if (filters.listerId) list = list.filter((r) => r.listerId === filters.listerId);
    if (filters.participantId) {
      const id = filters.participantId;
      list = list.filter((r) => r.listerId === id || r.confirmedHostId === id || isApplicant(r, id));
    }
    if (host) {
      if (!filters.status) {
        list = list.filter((r) => (r.status === "open" || r.status === "applied") && !r.confirmedHostId && new Date(r.startsAt).getTime() > now);
      }
      list = list.filter((r) => r.listerId !== host.id && (!!filters.cityKey || isLicensedIn(host, r.state)));
    }
    if (filters.status) list = list.filter((r) => filters.status!.includes(r.status));
    if (filters.offerTypes?.length) list = list.filter((r) => filters.offerTypes!.includes(r.offer.type));
    if (filters.upcomingOnly) list = list.filter((r) => new Date(r.endsAt).getTime() > now);
    if (filters.q) {
      const q = filters.q.toLowerCase();
      list = list.filter((r) => `${r.address} ${r.neighborhood} ${r.city}`.toLowerCase().includes(q));
    }
    let out = list.map((r) => withDistance(r, filters.hostId));
    if (host) {
      const max = filters.maxDistanceMiles ?? (filters.ignoreRadius ? Infinity : host.radiusMiles);
      out = out.filter((r) => (r.distanceMiles ?? 0) <= max);
    } else if (filters.maxDistanceMiles !== undefined) {
      out = out.filter((r) => (r.distanceMiles ?? 0) <= filters.maxDistanceMiles!);
    }
    const sort = filters.sort ?? "soonest";
    out.sort((a, b) => {
      if (sort === "nearest") return (a.distanceMiles ?? 0) - (b.distanceMiles ?? 0);
      if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
      return a.startsAt.localeCompare(b.startsAt);
    });
    return out;
  });
}

export async function getRequest(id: string, viewerId?: string): Promise<OpenHouseRequest> {
  return call(() => withDistance(findReq(id), viewerId));
}

export async function getUser(id: string): Promise<User> {
  return call(() => mustUser(id));
}

export async function listUsers(): Promise<User[]> {
  return call(() => getDB().users);
}

export async function registerUser(input: { name: string; brokerage: string; defaultMode: ActiveRole; cityKey?: CityKey }): Promise<User> {
  return mutate(() => {
    const name = input.name.trim();
    if (!name) throw new ApiError("invalid", "Please enter your name.");
    const initials = name.split(/\s+/).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    const colors = ["#0f5565", "#c8642b", "#5f4fa8", "#2f6fb0", "#1e8a4c", "#a44f20"];
    const home = CITIES[input.cityKey ?? "austin"];
    const u = makeUser({
      id: uid("u"), name, defaultMode: input.defaultMode, initials, avatarColor: colors[getDB().users.length % colors.length],
      brokerage: input.brokerage.trim() || "Independent", homeArea: home.defaultHome.area, homeLat: home.defaultHome.lat, homeLng: home.defaultHome.lng,
      licenseState: home.state, licenseStates: CITY_KEYS.map((k) => CITIES[k].state),
      phone: `${home.phoneAreaCode}5550100`,
      cityHomes: Object.fromEntries(CITY_KEYS.map((k) => [k, { homeArea: CITIES[k].defaultHome.area, homeLat: CITIES[k].defaultHome.lat, homeLng: CITIES[k].defaultHome.lng }])),
    });
    getDB().users.push(u);
    return u;
  });
}

export async function updateUser(
  id: string,
  patch: Partial<Pick<User, "name" | "brokerage" | "homeArea" | "homeLat" | "homeLng" | "radiusMiles" | "bio" | "phone" | "eoInsured" | "defaultMode">>,
): Promise<User> {
  return mutate(() => {
    mustUser(id);
    patchUser(id, () => patch);
    return mustUser(id);
  });
}

export interface ApplicantWithTrust {
  application: Application;
  user: User;
  trustScore: number;
  mutuals: Mutuals;
}

export async function listApplicantsWithTrust(requestId: string): Promise<ApplicantWithTrust[]> {
  return call(() => {
    const r = findReq(requestId);
    const lister = getUserSync(r.listerId);
    return r.applicants
      .filter((a) => a.status !== "withdrawn")
      .map((application) => {
        const user = mustUser(application.hostId);
        return { application, user, trustScore: trustScore(user), mutuals: mutualConnections(lister, user) };
      })
      .sort((a, b) => {
        const rank = (s: string) => (s === "confirmed" ? 0 : s === "pending" ? 1 : s === "backup" ? 2 : 3);
        return rank(a.application.status) - rank(b.application.status) || b.trustScore - a.trustScore;
      });
  });
}

export async function getEligibility(requestId: string, hostId: string): Promise<Eligibility> {
  return call(() => {
    const r = findReq(requestId);
    return hostEligibility(r, mustUser(hostId), getUserSync(r.listerId));
  });
}

// ---------- create / update / delete ----------

export interface NewRequestInput {
  address: string;
  neighborhood: string;
  /** Pilot city key; sets city/state and map coordinates. Defaults to austin. */
  cityKey?: CityKey;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  photoGradient?: string;
  startsAt: string;
  endsAt: string;
  offer: Offer;
  handoff?: Partial<Handoff>;
  audience?: Partial<Audience>;
  instantAccept?: boolean;
  /** Save as draft instead of publishing. */
  draft?: boolean;
}

const GRADIENTS = [
  "linear-gradient(135deg,#0f5565 0%,#3b8fa0 55%,#e8c9a0 100%)",
  "linear-gradient(135deg,#a44f20 0%,#e07a3f 55%,#f6d9b8 100%)",
  "linear-gradient(135deg,#2f4858 0%,#5f7a8c 55%,#d9e2e7 100%)",
  "linear-gradient(135deg,#3b6b4f 0%,#8fb59a 55%,#efe6cf 100%)",
];

export async function createRequest(input: NewRequestInput, listerId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const lister = mustUser(listerId);
    const cityKey = input.cityKey ?? "austin";
    const cfg = CITIES[cityKey];
    const geo = cfg.neighborhoods[input.neighborhood] ?? NEIGHBORHOODS[input.neighborhood] ?? cfg.center;
    const now = new Date().toISOString();
    const r: OpenHouseRequest = {
      id: uid("r"),
      listerId,
      address: input.address,
      neighborhood: input.neighborhood,
      cityKey,
      city: cfg.cityName,
      state: cfg.state,
      price: input.price,
      beds: input.beds,
      baths: input.baths,
      sqft: input.sqft,
      photo: { gradient: input.photoGradient ?? GRADIENTS[Math.floor(Math.random() * GRADIENTS.length)] },
      lat: geo.lat + (Math.random() - 0.5) * 0.004,
      lng: geo.lng + (Math.random() - 0.5) * 0.004,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      offer: input.offer,
      handoff: {
        access: "lockbox",
        signInExpectations: "",
        talkingPoints: "",
        sensitivities: "",
        doNotDiscuss: [],
        emergencyContact: { name: lister.name, phone: lister.phone },
        ...input.handoff,
      },
      audience: { mode: "verified", widenAfterHours: 24, requireBadges: ["license"], ...input.audience },
      instantAccept: !!input.instantAccept,
      status: input.draft ? "draft" : "open",
      urgent: false,
      createdAt: now,
      applicants: [],
      confirmedHostId: null,
      checklist: defaultChecklist(),
      checkIn: null,
      checkOut: null,
      summary: null,
      ratings: { listerToHost: null, hostToLister: null },
      agreement: { acceptedByLister: !input.draft, acceptedByHost: false, terms: agreementTerms(offerLabel(input.offer)) },
      payment: input.offer.type === "flat" ? "unpaid" : "n/a",
      messages: [],
      reports: [],
      disputes: [],
      timeline: [{ at: now, label: input.draft ? "Draft saved" : "Request posted" }],
      pendingChange: null,
      cancelledHostIds: [],
    };
    getDB().requests.unshift(r);
    if (!input.draft) {
      for (const u of getDB().users) {
        if (!u.availability.alertsEnabled) continue;
        const h = userInCity(u, r.cityKey);
        const d = haversineMiles(h.homeLat, h.homeLng, r.lat, r.lng);
        if (d <= u.radiusMiles) note(u.id, "system", `New open house in ${r.neighborhood}`, `${offerLabel(r.offer)}, ${d} mi away.`, r.id);
      }
    }
    return r;
  });
}

export type RequestPatch = Partial<
  Pick<OpenHouseRequest, "address" | "neighborhood" | "city" | "state" | "price" | "beds" | "baths" | "sqft" | "photo" | "startsAt" | "endsAt" | "offer" | "handoff" | "audience" | "instantAccept">
>;

const SIGNIFICANT = ["address", "neighborhood", "startsAt", "endsAt"] as const;

export async function updateRequest(id: string, patch: RequestPatch, byUserId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    requireLister(r, byUserId);
    if (["completed", "settled", "cancelled-lister", "cancelled-host", "expired", "disputed"].includes(r.status)) {
      throw new ApiError("closed", "This request can no longer be edited.");
    }
    const committed = r.status === "confirmed" || r.status === "checked-in";
    const changed = (Object.keys(patch) as (keyof RequestPatch)[]).filter((k) => JSON.stringify(patch[k]) !== JSON.stringify(r[k]));
    const significant = changed.some((k) => (SIGNIFICANT as readonly string[]).includes(k));
    if (patch.neighborhood && patch.neighborhood !== r.neighborhood && NEIGHBORHOODS[patch.neighborhood]) {
      r.lat = NEIGHBORHOODS[patch.neighborhood].lat;
      r.lng = NEIGHBORHOODS[patch.neighborhood].lng;
    }
    Object.assign(r, patch);
    if (patch.offer) r.agreement.terms = agreementTerms(offerLabel(patch.offer));
    if (changed.length) log(r, `Lister edited: ${changed.join(", ")}`);
    if (committed && changed.length && r.confirmedHostId) {
      r.pendingChange = { fields: changed, significant, at: new Date().toISOString(), acknowledged: false };
      note(r.confirmedHostId, "change", "Details changed", `${nameOf(r.listerId)} updated ${short(r)}. Please review and acknowledge.`, r.id);
    }
    return r;
  });
}

export async function publishRequest(id: string, listerId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    requireLister(r, listerId);
    if (r.status !== "draft") throw new ApiError("invalid-state", "Only drafts can be published.");
    r.status = "open";
    r.agreement.acceptedByLister = true;
    log(r, "Request posted");
    return r;
  });
}

/** Hard-delete: only drafts, or open requests with no applicants. Otherwise use cancelRequest. */
export async function deleteRequest(id: string, listerId: string): Promise<{ id: string }> {
  return mutate(() => {
    const r = findReq(id);
    requireLister(r, listerId);
    if (!(r.status === "draft" || (r.status === "open" && r.applicants.length === 0))) {
      throw new ApiError("use-cancel", "This request has activity. Cancel it instead.");
    }
    const db = getDB();
    db.requests = db.requests.filter((x) => x.id !== id);
    return { id };
  });
}

// ---------- cancellation & reliability (§8) ----------

function hostPenaltyPoints(hoursOut: number): number {
  if (hoursOut < 2) return 15;
  if (hoursOut < 24) return 8;
  if (hoursOut < 72) return 3;
  return 1;
}

export async function cancelRequest(id: string, byUserId: string, reason = ""): Promise<CancelResult> {
  return mutate(() => {
    const r = findReq(id);
    const hoursOut = hoursUntil(r.startsAt);
    if (["completed", "settled", "cancelled-lister", "cancelled-host", "expired", "disputed"].includes(r.status)) {
      throw new ApiError("closed", "This request is already closed.");
    }

    if (r.listerId === byUserId) {
      const late = !!r.confirmedHostId && hoursOut < 24;
      const hostId = r.confirmedHostId;
      r.status = "cancelled-lister";
      r.cancelReason = reason;
      r.applicants.forEach((a) => {
        if (a.status !== "withdrawn") a.status = "declined";
      });
      r.confirmedHostId = null;
      log(r, `Cancelled by Lister${reason ? `: ${reason}` : ""}`);
      const targets = new Set([...(hostId ? [hostId] : []), ...r.applicants.map((a) => a.hostId)]);
      targets.forEach((hid) =>
        note(hid, "cancelled", "Open house cancelled", `${nameOf(r.listerId)} cancelled ${short(r)}.${hid === hostId && late && r.offer.type === "flat" ? " Your flat fee may be partially owed per the agreement." : ""}`, r.id),
      );
      return {
        request: r, by: "lister", late, penaltyPoints: 0,
        message: late && r.offer.type === "flat"
          ? "Cancelled. Because the Host had committed within 24 hours, a partial flat fee may be owed per the agreement."
          : late ? "Cancelled. The Host has been notified; a cover credit may be granted per the agreement." : "Request cancelled.",
      } satisfies CancelResult;
    }

    const app = r.applicants.find((a) => a.hostId === byUserId && a.status !== "withdrawn");
    if (!app) throw new ApiError("forbidden", "You are not part of this request.");

    if (r.confirmedHostId !== byUserId) {
      app.status = "withdrawn";
      refreshOpenStatus(r);
      log(r, `${nameOf(byUserId)} withdrew`);
      return { request: r, by: "host", late: false, penaltyPoints: 0, message: "Application withdrawn." } satisfies CancelResult;
    }

    // Confirmed host cancels: reopen as urgent, penalize by lateness.
    const late = hoursOut < 24;
    const points = hostPenaltyPoints(hoursOut);
    patchUser(byUserId, (u) => ({ stats: { ...u.stats, completionRate: Math.max(0, u.stats.completionRate - points) } }));
    app.status = "withdrawn";
    r.cancelledHostIds.push(byUserId);
    r.confirmedHostId = null;
    r.agreement.acceptedByHost = false;
    r.pendingChange = null;
    r.urgent = hoursOut < 48;
    r.cancelReason = reason;
    r.status = "open";
    refreshOpenStatus(r);
    log(r, `${nameOf(byUserId)} cancelled${late ? " (late)" : ""}; reopened${r.urgent ? " as Urgent" : ""}`);
    const backups = r.applicants.filter((a) => a.status === "backup").length;
    note(r.listerId, "cancelled", `${nameOf(byUserId)} cancelled`, `${short(r)} is open again${r.urgent ? " and marked Urgent" : ""}.${backups ? ` ${backups} backup${backups === 1 ? "" : "s"} available.` : ""}`, r.id);
    if (r.urgent) notifyNearbyHosts(r, byUserId);
    return {
      request: r, by: "host", late, penaltyPoints: points,
      message: late
        ? `Cancelled late. Your completion rate drops by ${points} points and the request goes out as Urgent.`
        : `Cancelled. Your completion rate drops by ${points} point${points === 1 ? "" : "s"}.`,
    } satisfies CancelResult;
  });
}

export async function withdrawApplication(id: string, hostId: string): Promise<CancelResult> {
  return cancelRequest(id, hostId, "Withdrawn");
}

/** Lister taps "Host didn't show": no-show strike, request reopens if the event is still on. */
export async function markNoShow(id: string, listerId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    requireLister(r, listerId);
    const hostId = r.confirmedHostId;
    if (!hostId || r.status !== "confirmed") throw new ApiError("invalid-state", "No confirmed host to mark.");
    patchUser(hostId, (u) => {
      const noShows = u.stats.noShows + 1;
      return {
        stats: { ...u.stats, noShows, completionRate: Math.max(0, u.stats.completionRate - 10) },
        accountStatus: noShows >= 3 ? "suspended" : u.accountStatus,
      };
    });
    const app = r.applicants.find((a) => a.hostId === hostId);
    if (app) app.status = "withdrawn";
    r.cancelledHostIds.push(hostId);
    r.confirmedHostId = null;
    r.agreement.acceptedByHost = false;
    if (hoursUntil(r.endsAt) > 0) {
      r.urgent = true;
      r.status = "open";
      refreshOpenStatus(r);
      notifyNearbyHosts(r, hostId);
    } else r.status = "cancelled-host";
    log(r, `${nameOf(hostId)} did not check in (no-show strike)`);
    note(hostId, "cancelled", "No-show recorded", `You did not check in for ${short(r)}. A no-show strike was added to your record.`, r.id);
    return r;
  });
}

// ---------- applications ----------

export async function applyToRequest(id: string, hostId: string, noteText = ""): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    const host = mustUser(hostId);
    if (r.status !== "open" && r.status !== "applied") throw new ApiError("not-open", "This request isn't accepting applications.");
    if (r.confirmedHostId) throw new ApiError("already-confirmed", "A host has already been confirmed.");
    if (r.listerId === hostId) throw new ApiError("forbidden", "You can't apply to your own request.");
    const elig = hostEligibility(r, host, getUserSync(r.listerId));
    if (!elig.ok) throw new ApiError("ineligible", elig.reasons[0]);
    const existing = r.applicants.find((a) => a.hostId === hostId);
    if (existing && existing.status !== "withdrawn") throw new ApiError("already-applied", "You already applied.");
    if (existing) r.applicants = r.applicants.filter((a) => a !== existing);
    r.applicants.push({ id: uid("a"), hostId, note: noteText, appliedAt: new Date().toISOString(), status: "pending", agreedToTerms: true });
    refreshOpenStatus(r);
    log(r, `${host.name} applied`);
    note(r.listerId, "applicant", `${host.name} applied`, `${short(r)}. Review their trust card and confirm.`, r.id);
    return r;
  });
}

/** Instant accept: first host to claim is confirmed immediately; others stay as backups. */
export async function claimNow(id: string, hostId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    const host = mustUser(hostId);
    if (!r.instantAccept) throw new ApiError("no-instant", "This Lister reviews applicants manually.");
    if (r.confirmedHostId) throw new ApiError("already-confirmed", "Someone else just claimed this one. You're not confirmed.");
    if (r.status !== "open" && r.status !== "applied") throw new ApiError("not-open", "This request isn't accepting claims.");
    const elig = hostEligibility(r, host, getUserSync(r.listerId));
    if (!elig.ok) throw new ApiError("ineligible", elig.reasons[0]);
    r.applicants = r.applicants.filter((a) => a.hostId !== hostId);
    r.applicants.forEach((a) => {
      if (a.status === "pending") a.status = "backup";
    });
    r.applicants.push({ id: uid("a"), hostId, note: "Claimed instantly", appliedAt: new Date().toISOString(), status: "confirmed", agreedToTerms: true });
    r.confirmedHostId = hostId;
    r.status = "confirmed";
    r.agreement.acceptedByLister = true;
    r.agreement.acceptedByHost = true;
    log(r, `${host.name} claimed instantly`);
    note(r.listerId, "confirmed", `${host.name} claimed ${short(r)}`, "Instant accept: they're confirmed. Contact details are released.", r.id);
    return r;
  });
}

export async function confirmApplicant(id: string, listerId: string, hostId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    requireLister(r, listerId);
    if (r.confirmedHostId) throw new ApiError("already-confirmed", "A host is already confirmed. First confirmed wins.");
    const app = r.applicants.find((a) => a.hostId === hostId && (a.status === "pending" || a.status === "backup"));
    if (!app) throw new ApiError("not-found", "That applicant is no longer available.");
    app.status = "confirmed";
    r.applicants.forEach((a) => {
      if (a !== app && (a.status === "pending" || a.status === "backup")) {
        a.status = "backup";
        note(a.hostId, "backup", "Another host was confirmed", `${short(r)} went to someone else. You're kept as a backup.`, r.id);
      }
    });
    r.confirmedHostId = hostId;
    r.status = "confirmed";
    r.urgent = false;
    r.agreement.acceptedByLister = true;
    r.agreement.acceptedByHost = app.agreedToTerms;
    log(r, `${nameOf(hostId)} confirmed`);
    note(hostId, "confirmed", `You're confirmed for ${short(r)}`, `${nameOf(r.listerId)} confirmed you. Contact details and the handoff checklist are now available.`, r.id);
    return r;
  });
}

export async function declineApplicant(id: string, listerId: string, hostId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    requireLister(r, listerId);
    const app = r.applicants.find((a) => a.hostId === hostId);
    if (!app) throw new ApiError("not-found", "Applicant not found.");
    app.status = "declined";
    refreshOpenStatus(r);
    note(hostId, "backup", "Not selected", `${short(r)}: the Lister chose not to move forward.`, r.id);
    return r;
  });
}

/** Lister accepts terms; a Host accepts as an applicant or as the confirmed host. */
export async function acceptAgreement(id: string, userId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    if (r.listerId === userId) r.agreement.acceptedByLister = true;
    else {
      const app = r.applicants.find((a) => a.hostId === userId && a.status !== "withdrawn");
      if (!app) throw new ApiError("forbidden", "Apply first to accept the agreement.");
      app.agreedToTerms = true;
      if (r.confirmedHostId === userId) r.agreement.acceptedByHost = true;
    }
    return r;
  });
}

export async function acknowledgeChange(id: string, hostId: string, accept: boolean): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    requireConfirmedHost(r, hostId);
    if (!r.pendingChange) return r;
    if (accept) {
      r.pendingChange.acknowledged = true;
      log(r, `${nameOf(hostId)} acknowledged the change`);
      note(r.listerId, "change", "Change acknowledged", `${nameOf(hostId)} accepted the updated details.`, r.id);
    } else if (r.pendingChange.significant) {
      // Significant change: host may drop out without penalty.
      const app = r.applicants.find((a) => a.hostId === hostId);
      if (app) app.status = "withdrawn";
      r.confirmedHostId = null;
      r.agreement.acceptedByHost = false;
      r.pendingChange = null;
      r.status = "open";
      refreshOpenStatus(r);
      log(r, `${nameOf(hostId)} dropped out after a significant change (no penalty)`);
      note(r.listerId, "cancelled", `${nameOf(hostId)} dropped out`, `${short(r)} is open again. No penalty applied due to the change.`, r.id);
    } else throw new ApiError("not-significant", "This change isn't significant enough to drop out penalty-free.");
    return r;
  });
}

// ---------- day-of ----------

export async function toggleChecklistItem(id: string, itemId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    const it = r.checklist.find((c) => c.id === itemId);
    if (!it) throw new ApiError("not-found", "Checklist item not found.");
    it.done = !it.done;
    return r;
  });
}

export async function checkIn(id: string, hostId: string, opts: { locationConfirmed?: boolean } = {}): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    requireConfirmedHost(r, hostId);
    if (r.status !== "confirmed") throw new ApiError("invalid-state", "You can only check in to a confirmed event.");
    r.checkIn = { time: new Date().toISOString(), locationConfirmed: opts.locationConfirmed ?? true };
    r.status = "checked-in";
    log(r, `${nameOf(hostId)} checked in`);
    note(r.listerId, "checkin", `${nameOf(hostId)} checked in`, `${short(r)}: location confirmed.`, r.id);
    return r;
  });
}

export async function checkOut(id: string, hostId: string, summary: EventSummary, opts: { locationConfirmed?: boolean } = {}): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    requireConfirmedHost(r, hostId);
    if (r.status !== "checked-in") throw new ApiError("invalid-state", "Check in before checking out.");
    r.checkOut = { time: new Date().toISOString(), locationConfirmed: opts.locationConfirmed ?? true };
    r.summary = summary;
    r.status = "completed";
    patchUser(hostId, (u) => ({ stats: { ...u.stats, covered: u.stats.covered + 1 } }));
    log(r, "Checked out; summary submitted");
    note(r.listerId, "completed", "Summary submitted", `${short(r)}: ${summary.attendance} visitors, ${summary.leads.length} leads. Rate your host.`, r.id);
    maybeSettle(r);
    return r;
  });
}

// ---------- ratings, payments, disputes, reports ----------

export async function submitRating(id: string, byUserId: string, rating: { stars: number; comment: string }): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    if (!["completed", "settled", "disputed"].includes(r.status)) throw new ApiError("invalid-state", "You can rate after the event is completed.");
    const isListerSide = r.listerId === byUserId;
    if (!isListerSide && r.confirmedHostId !== byUserId) throw new ApiError("forbidden", "Only the two agents can rate.");
    const key = isListerSide ? "listerToHost" : "hostToLister";
    if (r.ratings[key]) throw new ApiError("already-rated", "You already submitted a rating.");
    const value: Rating = { stars: Math.min(5, Math.max(1, Math.round(rating.stars))), comment: rating.comment, submittedAt: new Date().toISOString() };
    r.ratings[key] = value;
    const otherId = isListerSide ? r.confirmedHostId! : r.listerId;
    if (r.ratings.listerToHost && r.ratings.hostToLister) {
      // Reveal both: update each recipient's reputation now.
      const apply = (toId: string, fromId: string, v: Rating) =>
        patchUser(toId, (u) => {
          const count = u.stats.ratingCount + 1;
          return {
            stats: { ...u.stats, ratingCount: count, rating: Math.round(((u.stats.rating * u.stats.ratingCount + v.stars) / count) * 10) / 10 },
            reviews: [{ id: uid("rv"), fromUserId: fromId, fromName: nameOf(fromId), stars: v.stars, comment: v.comment, createdAt: v.submittedAt }, ...u.reviews],
          };
        });
      apply(r.confirmedHostId!, r.listerId, r.ratings.listerToHost);
      apply(r.listerId, r.confirmedHostId!, r.ratings.hostToLister);
      note(otherId, "rating", "Ratings are in", `Both ratings for ${short(r)} are now visible.`, r.id);
      note(byUserId, "rating", "Ratings are in", `Both ratings for ${short(r)} are now visible.`, r.id);
    } else {
      note(otherId, "rating", "You've been rated", `${nameOf(byUserId)} rated ${short(r)}. Submit yours to reveal it.`, r.id);
    }
    maybeSettle(r);
    return r;
  });
}

export async function markPaid(id: string, userId: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    if (r.listerId !== userId && r.confirmedHostId !== userId) throw new ApiError("forbidden", "Only the two agents can update payment.");
    if (r.payment === "n/a") throw new ApiError("invalid-state", "No payment is tracked for this offer.");
    r.payment = "paid";
    if (r.status === "disputed") r.status = "completed";
    log(r, "Marked paid");
    const other = r.listerId === userId ? r.confirmedHostId : r.listerId;
    if (other) note(other, "payment", "Marked as paid", `${nameOf(userId)} marked ${short(r)} as paid.`, r.id);
    maybeSettle(r);
    return r;
  });
}

export async function openDispute(id: string, userId: string, reason: string): Promise<OpenHouseRequest> {
  return mutate(() => {
    const r = findReq(id);
    if (r.listerId !== userId && r.confirmedHostId !== userId) throw new ApiError("forbidden", "Only the two agents can open a dispute.");
    if (!["completed", "settled", "checked-in"].includes(r.status)) throw new ApiError("invalid-state", "Disputes open after the event.");
    const d: Dispute = { id: uid("dp"), requestId: id, openedBy: userId, reason, createdAt: new Date().toISOString(), status: "open" };
    r.disputes.push(d);
    r.status = "disputed";
    r.payment = r.payment === "n/a" ? "n/a" : "disputed";
    log(r, `${nameOf(userId)} opened a dispute`);
    const other = r.listerId === userId ? r.confirmedHostId : r.listerId;
    if (other) note(other, "payment", "A dispute was opened", `${short(r)}: a reviewer will check the signed terms and record.`, r.id);
    return r;
  });
}

export async function reportProblem(id: string, userId: string, report: { category: ReportCategory; details: string }): Promise<Report> {
  return mutate(() => {
    const r = findReq(id);
    if (r.listerId !== userId && r.confirmedHostId !== userId) throw new ApiError("forbidden", "Only the two agents can report.");
    const rep: Report = { id: uid("rp"), requestId: id, reporterId: userId, category: report.category, details: report.details, createdAt: new Date().toISOString(), status: "under-review" };
    r.reports.push(rep);
    log(r, `Problem reported (${report.category})`);
    const other = r.listerId === userId ? r.confirmedHostId : r.listerId;
    if (other) note(other, "report", "A problem was reported", `Reported on ${short(r)}. A reviewer will follow up.`, r.id);
    // Serious reports pause the accused host while under review.
    if (["theft", "misconduct"].includes(report.category) && r.confirmedHostId && r.listerId === userId) {
      patchUser(r.confirmedHostId, () => ({ accountStatus: "under-review" }));
    }
    return rep;
  });
}

// ---------- messaging & notifications ----------

export async function sendMessage(id: string, senderId: string, text: string): Promise<Message> {
  return mutate(() => {
    const r = findReq(id);
    const isParty = r.listerId === senderId || r.confirmedHostId === senderId;
    if (!isParty) throw new ApiError("forbidden", "Messaging opens once a host is confirmed.");
    const m: Message = { id: uid("m"), requestId: id, senderId, text: text.trim(), sentAt: new Date().toISOString() };
    r.messages.push(m);
    const other = r.listerId === senderId ? r.confirmedHostId : r.listerId;
    if (other) note(other, "message", `Message from ${nameOf(senderId)}`, m.text.slice(0, 90), id);
    return m;
  });
}

export async function listNotifications(userId: string): Promise<Notification[]> {
  return call(() => getDB().notifications.filter((n) => n.userId === userId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export async function markNotificationsRead(userId: string, ids?: string[]): Promise<void> {
  return mutate(() => {
    getDB().notifications.forEach((n) => {
      if (n.userId === userId && (!ids || ids.includes(n.id))) n.read = true;
    });
  });
}

// ---------- host availability ----------

export async function getHostAvailability(hostId: string): Promise<Availability> {
  return call(() => mustUser(hostId).availability);
}

export async function updateAvailability(hostId: string, patch: Partial<Availability>): Promise<Availability> {
  return mutate(() => {
    mustUser(hostId);
    patchUser(hostId, (u) => ({ availability: { ...u.availability, ...patch } }));
    return mustUser(hostId).availability;
  });
}
