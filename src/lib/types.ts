// Shared domain types for CoOpenHouse. Keep stable: screens are built on these.

import type { CityKey } from "./cities";

export interface CityHome {
  homeArea: string;
  homeLat: number;
  homeLng: number;
}

/** Display mode: Lister and Host are views, not identities. Every user can use both. */
export type ActiveRole = "lister" | "host";

export interface Badges {
  license: boolean;
  brokerage: boolean;
  id: boolean;
}
export type BadgeKind = keyof Badges;

export interface Review {
  id: string;
  fromUserId: string;
  fromName: string;
  stars: number;
  comment: string;
  createdAt: string;
}

export interface UserStats {
  covered: number;
  /** 0-100 */
  completionRate: number;
  noShows: number;
  rating: number;
  ratingCount: number;
}

export interface Availability {
  /** 0 = Sunday ... 6 = Saturday */
  days: number[];
  startHour: number;
  endHour: number;
  /** Minimum compensation terms the host will consider. */
  minOffer: "any" | OfferType;
  minFlatFee?: number;
  alertsEnabled: boolean;
}

export type AccountStatus = "active" | "under-review" | "suspended";

export interface User {
  id: string;
  name: string;
  /** The display mode this user lands in by default. */
  defaultMode: ActiveRole;
  initials: string;
  /** Tailwind-independent CSS color for avatar background. */
  avatarColor: string;
  email: string;
  phone: string;
  brokerage: string;
  licenseNumber: string;
  licenseState: string;
  /** Additional states this agent is licensed in (beyond licenseState). */
  licenseStates?: string[];
  yearsLicensed: number;
  badges: Badges;
  eoInsured: boolean;
  homeArea: string;
  homeLat: number;
  homeLng: number;
  /** Per-city home base. Falls back to homeArea/homeLat/homeLng when a city has no entry. */
  cityHomes?: Partial<Record<CityKey, CityHome>>;
  radiusMiles: number;
  bio?: string;
  stats: UserStats;
  reviews: Review[];
  /** Lister ids this person has covered for before (for "mutual connections"). */
  workedWithListerIds: string[];
  /** Cover credits balance (favor-swap offers). */
  credits: number;
  availability: Availability;
  accountStatus: AccountStatus;
}

export type OfferType = "lead" | "flat" | "referral" | "credit";
export interface Offer {
  type: OfferType;
  /** Flat fee in USD (type 'flat'). */
  amount?: number;
  /** Referral percent of commission (type 'referral'). */
  percent?: number;
  /** Cover credits (type 'credit'). */
  credits?: number;
}

export type AccessMethod = "lockbox" | "meet" | "key-pickup";

export interface Handoff {
  access: AccessMethod;
  /** Revealed only to the confirmed host shortly before the event. */
  accessDetails?: string;
  signInExpectations: string;
  talkingPoints: string;
  sensitivities: string;
  doNotDiscuss: string[];
  emergencyContact: { name: string; phone: string };
}

export type AudienceMode = "verified" | "brokerage" | "worked-with";
export interface Audience {
  mode: AudienceMode;
  /** After this many hours since posting, widen to all verified agents. */
  widenAfterHours?: number;
  requireBadges: BadgeKind[];
}

export type RequestStatus =
  | "draft"
  | "open"
  | "applied"
  | "confirmed"
  | "checked-in"
  | "completed"
  | "settled"
  | "cancelled-lister"
  | "cancelled-host"
  | "expired"
  | "disputed";

export type ApplicationStatus = "pending" | "confirmed" | "backup" | "declined" | "withdrawn";
export interface Application {
  id: string;
  hostId: string;
  note: string;
  appliedAt: string;
  status: ApplicationStatus;
  /** Host accepted the agreement terms when applying. */
  agreedToTerms: boolean;
}

export interface ChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface CheckEvent {
  time: string;
  locationConfirmed: boolean;
}

export interface Lead {
  name: string;
  email: string;
  phone: string;
  unrepresented: boolean;
}

export interface EventSummary {
  attendance: number;
  leads: Lead[];
  notes: string;
  issues: string;
  /** Count of condition photos uploaded at close. */
  photos: number;
}

export interface Rating {
  stars: number;
  comment: string;
  submittedAt: string;
}

export interface Agreement {
  acceptedByLister: boolean;
  acceptedByHost: boolean;
  terms: string;
}

export type PaymentStatus = "unpaid" | "paid" | "disputed" | "n/a";

export interface Message {
  id: string;
  requestId: string;
  senderId: string;
  text: string;
  sentAt: string;
}

export type ReportCategory = "theft" | "damage" | "misconduct" | "safety" | "other";
export interface Report {
  id: string;
  requestId: string;
  reporterId: string;
  category: ReportCategory;
  details: string;
  createdAt: string;
  status: "open" | "under-review" | "resolved";
}
export interface Dispute {
  id: string;
  requestId: string;
  openedBy: string;
  reason: string;
  createdAt: string;
  status: "open" | "resolved";
}

export interface TimelineEntry {
  at: string;
  label: string;
}

export interface PendingChange {
  fields: string[];
  significant: boolean;
  at: string;
  acknowledged: boolean;
}

export interface OpenHouseRequest {
  id: string;
  listerId: string;
  address: string;
  neighborhood: string;
  /** Registry key of the pilot city this request belongs to. */
  cityKey: CityKey;
  city: string;
  state: string;
  price: number;
  beds: number;
  baths: number;
  sqft?: number;
  /** Placeholder photo: a CSS gradient, optionally a real url. */
  photo: { gradient: string; url?: string };
  lat: number;
  lng: number;
  /** Populated by the API when a host viewer is known. */
  distanceMiles?: number;
  startsAt: string;
  endsAt: string;
  offer: Offer;
  handoff: Handoff;
  audience: Audience;
  instantAccept: boolean;
  status: RequestStatus;
  /** True when re-opened after a late cancel or no-show. */
  urgent: boolean;
  createdAt: string;
  applicants: Application[];
  confirmedHostId: string | null;
  checklist: ChecklistItem[];
  checkIn: CheckEvent | null;
  checkOut: CheckEvent | null;
  summary: EventSummary | null;
  ratings: { listerToHost: Rating | null; hostToLister: Rating | null };
  agreement: Agreement;
  payment: PaymentStatus;
  messages: Message[];
  reports: Report[];
  disputes: Dispute[];
  timeline: TimelineEntry[];
  pendingChange: PendingChange | null;
  /** Hosts who cancelled on this request. */
  cancelledHostIds: string[];
  cancelReason?: string;
}

export type NotificationType =
  | "applicant"
  | "confirmed"
  | "backup"
  | "cancelled"
  | "urgent"
  | "reminder"
  | "checkin"
  | "completed"
  | "rating"
  | "payment"
  | "message"
  | "change"
  | "report"
  | "system";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  requestId?: string;
  /** City the notification relates to (defaults to austin when absent). */
  cityKey?: CityKey;
  createdAt: string;
  read: boolean;
}

/** Result of a cancellation, including reliability effects (§8). */
export interface CancelResult {
  request: OpenHouseRequest;
  by: "lister" | "host";
  late: boolean;
  /** Reliability penalty applied to the cancelling host (completion rate points). */
  penaltyPoints: number;
  message: string;
}
