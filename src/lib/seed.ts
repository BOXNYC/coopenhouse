// Seed data. Dates are relative to "now" so the demo never goes stale.
import { agreementTerms, defaultChecklist, NEIGHBORHOODS } from "./rules";
import { CITIES, type CityKey } from "./cities";
import { offerLabel } from "./format";
import type {
  Application,
  ApplicationStatus,
  Availability,
  Handoff,
  Message,
  Notification,
  Offer,
  OpenHouseRequest,
  RequestStatus,
  Review,
  User,
} from "./types";

export const DEMO_LISTER_ID = "u_lee";
export const DEMO_HOST_ID = "u_kolten";

const HOUR = 3_600_000;

function dayAt(dayOffset: number, hour: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, 0, 0, 0);
  return d;
}
const iso = (d: Date) => d.toISOString();
const ago = (hours: number) => new Date(Date.now() - hours * HOUR).toISOString();

const weekendish: Availability = {
  days: [0, 6],
  startHour: 10,
  endHour: 17,
  minOffer: "any",
  alertsEnabled: true,
};

function review(id: string, fromUserId: string, fromName: string, stars: number, comment: string, daysAgo: number): Review {
  return { id, fromUserId, fromName, stars, comment, createdAt: ago(daysAgo * 24) };
}

export function makeUser(p: Partial<User> & Pick<User, "id" | "name" | "defaultMode" | "initials" | "avatarColor" | "brokerage" | "homeArea" | "homeLat" | "homeLng">): User {
  const slug = p.name.toLowerCase().replace(/[^a-z]+/g, ".");
  return {
    email: `${slug}@example.com`,
    phone: "5125550100",
    licenseNumber: "TX-000000",
    licenseState: "TX",
    yearsLicensed: 0,
    badges: { license: false, brokerage: false, id: false },
    eoInsured: false,
    radiusMiles: 10,
    stats: { covered: 0, completionRate: 100, noShows: 0, rating: 0, ratingCount: 0 },
    reviews: [],
    workedWithListerIds: [],
    credits: 0,
    availability: weekendish,
    accountStatus: "active",
    ...p,
  };
}

export function seedUsers(): User[] {
  return [
    makeUser({
      id: "u_lee", name: "Lee Wolfowitz", defaultMode: "lister", initials: "LW", avatarColor: "#0f5565",
      email: "lee.wolfowitz@lonestarrealty.example", phone: "5125550142",
      brokerage: "Lonestar Realty Group", licenseNumber: "TX-0612384", yearsLicensed: 9,
      badges: { license: true, brokerage: true, id: true }, eoInsured: true,
      homeArea: "Zilker", homeLat: 30.2669, homeLng: -97.7729, radiusMiles: 12,
      licenseStates: ["TX", "NY"],
      cityHomes: { nyc: { homeArea: "Upper West Side", homeLat: 40.787, homeLng: -73.9754 } },
      bio: "Listing agent focused on central Austin bungalows and condos.",
      stats: { covered: 4, completionRate: 100, noShows: 0, rating: 4.9, ratingCount: 18 },
      reviews: [review("rv_m1", "u_priya", "Priya Raman", 5, "Crystal clear handoff notes and paid the same day.", 12)],
      credits: 2,
    }),
    makeUser({
      id: "u_kolten", name: "Kolten Yamaguchi", defaultMode: "host", initials: "KY", avatarColor: "#c8642b",
      email: "kolten.yamaguchi@hillcountry.example", phone: "5125550177",
      brokerage: "Hill Country Homes", licenseNumber: "TX-0745219", yearsLicensed: 3,
      badges: { license: true, brokerage: true, id: true }, eoInsured: true,
      homeArea: "South Congress", homeLat: 30.2488, homeLng: -97.7497, radiusMiles: 10,
      licenseStates: ["TX", "NY"],
      cityHomes: { nyc: { homeArea: "Williamsburg", homeLat: 40.7081, homeLng: -73.9571 } },
      bio: "Buyer-focused agent. Love meeting new clients at open houses.",
      stats: { covered: 14, completionRate: 96, noShows: 0, rating: 4.8, ratingCount: 11 },
      reviews: [
        review("rv_d1", "u_tom", "Tom Nguyen", 5, "Showed up early, great energy, sent a detailed summary.", 20),
        review("rv_d2", "u_lee", "Lee Wolfowitz", 5, "Left the house spotless. Would hire again.", 10),
        review("rv_d3", "u_priya", "Priya Raman", 4, "Professional and friendly with visitors.", 45),
      ],
      workedWithListerIds: ["u_tom", "u_lee"],
      credits: 1,
      availability: { days: [0, 6], startHour: 10, endHour: 17, minOffer: "any", alertsEnabled: true },
    }),
    makeUser({
      id: "u_priya", name: "Priya Raman", defaultMode: "host", initials: "PR", avatarColor: "#5f4fa8",
      brokerage: "Lonestar Realty Group", licenseNumber: "TX-0498833", yearsLicensed: 7,
      badges: { license: true, brokerage: true, id: true }, eoInsured: true,
      homeArea: "Mueller", homeLat: 30.2999, homeLng: -97.7048, radiusMiles: 15,
      licenseStates: ["TX", "NY"],
      cityHomes: { nyc: { homeArea: "Chelsea", homeLat: 40.7465, homeLng: -74.0014 } },
      bio: "Top producer who covers open houses for teammates and friends.",
      stats: { covered: 41, completionRate: 100, noShows: 0, rating: 4.9, ratingCount: 28 },
      reviews: [
        review("rv_p1", "u_lee", "Lee Wolfowitz", 5, "Priya is the gold standard. Zero worries.", 30),
        review("rv_p2", "u_tom", "Tom Nguyen", 5, "Brought two serious buyers to my listing.", 60),
      ],
      workedWithListerIds: ["u_lee", "u_tom"],
    }),
    makeUser({
      id: "u_marcus", name: "Marcus Bell", defaultMode: "host", initials: "MB", avatarColor: "#2f6fb0",
      brokerage: "Austin Urban Living", licenseNumber: "TX-0771120", yearsLicensed: 2,
      badges: { license: true, brokerage: false, id: true }, eoInsured: false,
      homeArea: "East Austin", homeLat: 30.2634, homeLng: -97.7137, radiusMiles: 8,
      cityHomes: { nyc: { homeArea: "Long Island City", homeLat: 40.7447, homeLng: -73.9485 } },
      bio: "Newer agent building a buyer pipeline in the east side.",
      stats: { covered: 6, completionRate: 83, noShows: 1, rating: 4.2, ratingCount: 5 },
      reviews: [review("rv_b1", "u_tom", "Tom Nguyen", 4, "Good with buyers, arrived a bit late once.", 40)],
      workedWithListerIds: ["u_tom"],
    }),
    makeUser({
      id: "u_sofia", name: "Sofia Lindqvist", defaultMode: "host", initials: "SL", avatarColor: "#1e8a4c",
      brokerage: "Capital Key Realty", licenseNumber: "TX-0802991", yearsLicensed: 0,
      badges: { license: false, brokerage: false, id: false }, eoInsured: false,
      homeArea: "Bouldin Creek", homeLat: 30.2517, homeLng: -97.7564, radiusMiles: 8,
      cityHomes: { nyc: { homeArea: "Greenwich Village", homeLat: 40.7336, homeLng: -74.0027 } },
      bio: "Just licensed. Eager to learn and meet buyers.",
      stats: { covered: 0, completionRate: 100, noShows: 0, rating: 0, ratingCount: 0 },
    }),
    makeUser({
      id: "u_tom", name: "Tom Nguyen", defaultMode: "lister", initials: "TN", avatarColor: "#a44f20",
      brokerage: "Barton Springs Properties", licenseNumber: "TX-0551702", yearsLicensed: 12,
      badges: { license: true, brokerage: true, id: true }, eoInsured: true,
      homeArea: "Westlake", homeLat: 30.2977, homeLng: -97.8067, radiusMiles: 15,
      licenseStates: ["TX", "NY"],
      cityHomes: { nyc: { homeArea: "Brooklyn Heights", homeLat: 40.696, homeLng: -73.9936 } },
      stats: { covered: 9, completionRate: 98, noShows: 0, rating: 4.7, ratingCount: 22 },
    }),
    makeUser({
      id: "u_dana", name: "Dana Okafor", defaultMode: "lister", initials: "DO", avatarColor: "#8a3f6b",
      email: "dana.okafor@gothamhomes.example", phone: "2125550118",
      brokerage: "Gotham Home Partners", licenseNumber: "NY-10401288", licenseState: "NY", yearsLicensed: 11,
      badges: { license: true, brokerage: true, id: true }, eoInsured: true,
      homeArea: "Brooklyn Heights", homeLat: 40.696, homeLng: -73.9936, radiusMiles: 8,
      bio: "Brownstone and co-op specialist across Brooklyn and lower Manhattan.",
      stats: { covered: 7, completionRate: 99, noShows: 0, rating: 4.8, ratingCount: 31 },
    }),
    makeUser({
      id: "u_ravi", name: "Ravi Shah", defaultMode: "host", initials: "RS", avatarColor: "#2a7f8c",
      email: "ravi.shah@parkslope.example", phone: "7185550134",
      brokerage: "Gotham Home Partners", licenseNumber: "NY-10401977", licenseState: "NY", yearsLicensed: 5,
      badges: { license: true, brokerage: true, id: true }, eoInsured: true,
      homeArea: "Park Slope", homeLat: 40.671, homeLng: -73.9814, radiusMiles: 6,
      bio: "Buyer's agent who knows every block of Brooklyn.",
      stats: { covered: 22, completionRate: 97, noShows: 0, rating: 4.8, ratingCount: 17 },
      workedWithListerIds: ["u_dana"],
    }),
    makeUser({
      id: "u_mei", name: "Mei Chen", defaultMode: "host", initials: "MC", avatarColor: "#b5542b",
      email: "mei.chen@astoria.example", phone: "7185550166",
      brokerage: "Queens Key Realty", licenseNumber: "NY-10402345", licenseState: "NY", yearsLicensed: 3,
      badges: { license: true, brokerage: false, id: true }, eoInsured: false,
      homeArea: "Astoria", homeLat: 40.7644, homeLng: -73.9235, radiusMiles: 8,
      bio: "Queens-based agent, fluent in Mandarin and Cantonese.",
      stats: { covered: 9, completionRate: 91, noShows: 0, rating: 4.5, ratingCount: 8 },
    }),
    makeUser({
      id: "u_jules", name: "Jules Moreau", defaultMode: "host", initials: "JM", avatarColor: "#4d6b2f",
      email: "jules.moreau@harlem.example", phone: "6465550177",
      brokerage: "Uptown Door Realty", licenseNumber: "NY-10403012", licenseState: "NY", yearsLicensed: 0,
      badges: { license: false, brokerage: false, id: false }, eoInsured: false,
      homeArea: "Harlem", homeLat: 40.8116, homeLng: -73.9465, radiusMiles: 6,
      bio: "Newly licensed and ready to hustle.",
    }),
  ];
}

const gradients = [
  "linear-gradient(135deg,#0f5565 0%,#3b8fa0 55%,#e8c9a0 100%)",
  "linear-gradient(135deg,#a44f20 0%,#e07a3f 55%,#f6d9b8 100%)",
  "linear-gradient(135deg,#2f4858 0%,#5f7a8c 55%,#d9e2e7 100%)",
  "linear-gradient(135deg,#3b6b4f 0%,#8fb59a 55%,#efe6cf 100%)",
  "linear-gradient(135deg,#5f4fa8 0%,#9a8fd1 55%,#f0e6f4 100%)",
  "linear-gradient(135deg,#7a3b2e 0%,#c98b6e 55%,#f3e3d3 100%)",
];

interface ReqSpec {
  id: string;
  listerId: string;
  address: string;
  neighborhood: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  start: Date;
  hours: number;
  offer: Offer;
  status: RequestStatus;
  access?: Handoff["access"];
  instantAccept?: boolean;
  urgent?: boolean;
  createdHoursAgo?: number;
  audience?: OpenHouseRequest["audience"];
  gradient: number;
  /** Defaults to austin. */
  cityKey?: CityKey;
  applicants?: Array<[string, string, ApplicationStatus, number]>;
  confirmedHostId?: string | null;
  payment?: OpenHouseRequest["payment"];
}

const EMERGENCY: Record<string, { name: string; phone: string }> = {
  u_lee: { name: "Lee Wolfowitz", phone: "5125550142" },
  u_tom: { name: "Tom Nguyen", phone: "5125550163" },
  u_priya: { name: "Priya Raman", phone: "5125550188" },
  u_dana: { name: "Dana Okafor", phone: "2125550118" },
};

function build(s: ReqSpec): OpenHouseRequest {
  const cityKey = s.cityKey ?? "austin";
  const cfg = CITIES[cityKey];
  const geo = NEIGHBORHOODS[s.neighborhood] ?? cfg.center;
  const end = new Date(s.start.getTime() + s.hours * HOUR);
  const applicants: Application[] = (s.applicants ?? []).map(([hostId, note, status, hoursAgo], i) => ({
    id: `${s.id}_a${i + 1}`,
    hostId,
    note,
    appliedAt: ago(hoursAgo),
    status,
    agreedToTerms: true,
  }));
  const confirmed = s.confirmedHostId ?? null;
  const post = ["completed", "settled", "disputed", "checked-in"].includes(s.status);
  const closedOut = ["completed", "settled", "disputed"].includes(s.status);
  const accessWord = s.access ?? "lockbox";
  return {
    id: s.id,
    listerId: s.listerId,
    address: s.address,
    neighborhood: s.neighborhood,
    cityKey,
    city: cfg.cityName,
    state: cfg.state,
    price: s.price,
    beds: s.beds,
    baths: s.baths,
    sqft: s.sqft,
    photo: { gradient: gradients[s.gradient % gradients.length] },
    lat: geo.lat + (Math.random() - 0.5) * 0.004,
    lng: geo.lng + (Math.random() - 0.5) * 0.004,
    startsAt: iso(s.start),
    endsAt: iso(end),
    offer: s.offer,
    handoff: {
      access: accessWord,
      accessDetails:
        accessWord === "lockbox" ? (cityKey === "nyc" ? "Lockbox on the service-entrance railing. Code 4417, then key inside. Doorman has your name." : "Supra lockbox on the front gate. Code 4417, then key inside.")
        : accessWord === "meet" ? "I'll meet you at the front door 20 minutes before start."
        : cityKey === "nyc" ? "Key at my office, 120 Broadway, front desk. Return it by end of day." : "Key at my office, 512 Congress Ave, front desk. Return it by end of day.",
      signInExpectations: "Digital sign-in on a tablet by the entry. Ask every visitor whether they are working with an agent.",
      talkingPoints: "Fully renovated kitchen (2023), new HVAC, walkable to parks and coffee. Seller is motivated but flexible on close date.",
      sensitivities: "Seller is going through a relocation. Do not speculate on reasons for selling or on pricing flexibility.",
      doNotDiscuss: ["Seller's relocation reason", "Offer history", "Price flexibility"],
      emergencyContact: EMERGENCY[s.listerId] ?? EMERGENCY.u_tom,
    },
    audience: s.audience ?? { mode: "verified", widenAfterHours: 24, requireBadges: ["license"] },
    instantAccept: !!s.instantAccept,
    status: s.status,
    urgent: !!s.urgent,
    createdAt: ago(s.createdHoursAgo ?? 30),
    applicants,
    confirmedHostId: confirmed,
    checklist: defaultChecklist().map((c, i) => ({ ...c, done: post ? true : s.status === "confirmed" && s.id === "r_today" ? i < 1 : false })),
    checkIn: post ? { time: iso(new Date(s.start.getTime() - 10 * 60_000)), locationConfirmed: true } : null,
    checkOut: closedOut ? { time: iso(new Date(end.getTime() + 8 * 60_000)), locationConfirmed: true } : null,
    summary: closedOut
      ? {
          attendance: 14,
          leads: [
            { name: "Jordan & Casey Reyes", email: "reyes.jc@example.com", phone: "5125550191", unrepresented: true },
            { name: "Alan Whitfield", email: "awhitfield@example.com", phone: "5125550123", unrepresented: false },
            { name: "Nina Park", email: "nina.park@example.com", phone: "5125550166", unrepresented: true },
          ],
          notes: "Steady traffic after 1:30. Several comments on the kitchen and backyard. One couple wants a second showing this week.",
          issues: "",
          photos: 6,
        }
      : null,
    ratings: { listerToHost: null, hostToLister: null },
    agreement: {
      acceptedByLister: s.status !== "draft",
      acceptedByHost: !!confirmed,
      terms: agreementTerms(offerLabel(s.offer)),
    },
    payment: s.payment ?? (s.offer.type === "flat" ? "unpaid" : "n/a"),
    messages: [],
    reports: [],
    disputes: [],
    timeline: [{ at: ago(s.createdHoursAgo ?? 30), label: "Request posted" }],
    pendingChange: null,
    cancelledHostIds: [],
  };
}

function msg(requestId: string, senderId: string, text: string, hoursAgo: number, n: number): Message {
  return { id: `${requestId}_m${n}`, requestId, senderId, text, sentAt: ago(hoursAgo) };
}

export function seedRequests(): OpenHouseRequest[] {
  const mkRating = (stars: number, comment: string, hoursAgo: number) => ({ stars, comment, submittedAt: ago(hoursAgo) });
  const now = Date.now();
  const soon = new Date(Math.ceil((now + 3 * HOUR) / HOUR) * HOUR); // top of the hour, ~3-4h away

  const r_open = build({
    id: "r_open", listerId: "u_lee", address: "1407 W 38th St", neighborhood: "Tarrytown", price: 865000,
    beds: 3, baths: 2, sqft: 1980, start: dayAt(3, 13), hours: 3, offer: { type: "lead" }, status: "open", gradient: 0, createdHoursAgo: 6,
  });
  const r_applied = build({
    id: "r_applied", listerId: "u_lee", address: "2210 Rio Grande St, Unit 4B", neighborhood: "Hyde Park", price: 549000,
    beds: 2, baths: 2, sqft: 1240, start: dayAt(2, 14), hours: 3, offer: { type: "flat", amount: 100 }, status: "applied", gradient: 2, access: "meet",
    audience: { mode: "verified", widenAfterHours: 24, requireBadges: ["license"] }, createdHoursAgo: 20,
    applicants: [
      ["u_priya", "Happy to help, I know the neighborhood well and have hosted in this building before.", "pending", 14],
      ["u_marcus", "Would love the chance to meet buyers on the north side.", "pending", 9],
      ["u_sofia", "New to the area and eager to learn. Free all afternoon!", "pending", 3],
    ],
  });
  const r_confirmed = build({
    id: "r_confirmed", listerId: "u_lee", address: "903 Bouldin Ave", neighborhood: "Bouldin Creek", price: 725000,
    beds: 3, baths: 2, sqft: 1710, start: dayAt(1, 13), hours: 3, offer: { type: "referral", percent: 25 }, status: "confirmed", gradient: 1,
    confirmedHostId: "u_kolten", createdHoursAgo: 52,
    applicants: [
      ["u_kolten", "Local to the area and available all afternoon.", "confirmed", 40],
      ["u_marcus", "Interested if still open.", "backup", 30],
    ],
  });
  r_confirmed.messages = [
    msg("r_confirmed", "u_lee", "Thanks for taking this one, Kolten. Lockbox code is in the handoff once we're within 48 hours.", 20, 1),
    msg("r_confirmed", "u_kolten", "Sounds good! I'll arrive 20 minutes early to set up signs.", 19, 2),
  ];
  r_confirmed.timeline.push({ at: ago(40), label: "Kolten Yamaguchi applied" }, { at: ago(36), label: "Kolten Yamaguchi confirmed" });

  const r_today = build({
    id: "r_today", listerId: "u_lee", address: "5112 Duval St", neighborhood: "Mueller", price: 689000,
    beds: 3, baths: 2.5, sqft: 1860, start: soon, hours: 3, offer: { type: "flat", amount: 125 }, status: "confirmed", gradient: 3,
    confirmedHostId: "u_kolten", createdHoursAgo: 80, access: "lockbox",
    applicants: [["u_kolten", "Available, nearby.", "confirmed", 70]],
  });
  r_today.messages = [msg("r_today", "u_lee", "Quick heads up: please keep the back bedroom door closed, cat inside.", 3, 1)];

  const r_completed = build({
    id: "r_completed", listerId: "u_lee", address: "3306 Hemlock Ave", neighborhood: "Cherrywood", price: 612000,
    beds: 3, baths: 2, sqft: 1520, start: dayAt(-2, 13), hours: 3, offer: { type: "flat", amount: 100 }, status: "completed", gradient: 4,
    confirmedHostId: "u_kolten", createdHoursAgo: 150, payment: "unpaid",
    applicants: [["u_kolten", "Glad to help.", "confirmed", 140]],
  });
  r_completed.ratings.hostToLister = mkRating(5, "Clear instructions and very responsive.", 40);

  const r_settled = build({
    id: "r_settled", listerId: "u_lee", address: "1818 Newning Ave", neighborhood: "South Congress", price: 799000,
    beds: 4, baths: 3, sqft: 2240, start: dayAt(-10, 12), hours: 3, offer: { type: "lead" }, status: "settled", gradient: 5,
    confirmedHostId: "u_priya", createdHoursAgo: 300, payment: "n/a",
    applicants: [["u_priya", "Count me in.", "confirmed", 290]],
  });
  r_settled.ratings.listerToHost = mkRating(5, "Priya is a pro. Great follow-up notes.", 220);
  r_settled.ratings.hostToLister = mkRating(5, "Easy handoff, easy day.", 218);

  const r_cancelled = build({
    id: "r_cancelled", listerId: "u_lee", address: "78 Rainey St, Unit 12", neighborhood: "East Austin", price: 455000,
    beds: 1, baths: 1, sqft: 840, start: dayAt(-5, 14), hours: 2, offer: { type: "credit", credits: 1 }, status: "cancelled-host", gradient: 2,
    createdHoursAgo: 200,
    applicants: [["u_marcus", "I can do it.", "withdrawn", 190]],
  });
  r_cancelled.cancelledHostIds = ["u_marcus"];
  r_cancelled.timeline.push({ at: ago(130), label: "Marcus Bell cancelled (late)" });

  const r_expired = build({
    id: "r_expired", listerId: "u_lee", address: "4520 Bull Creek Rd", neighborhood: "Allandale", price: 935000,
    beds: 4, baths: 3, sqft: 2700, start: dayAt(-6, 13), hours: 3, offer: { type: "lead" }, status: "expired", gradient: 3, createdHoursAgo: 220,
  });
  r_expired.timeline.push({ at: ago(144), label: "Expired with no taker" });

  const r_feed1 = build({
    id: "r_feed1", listerId: "u_tom", address: "2701 Barton Hills Dr", neighborhood: "Barton Hills", price: 1150000,
    beds: 4, baths: 3, sqft: 2900, start: dayAt(2, 12), hours: 4, offer: { type: "lead" }, status: "open", instantAccept: true, gradient: 3, createdHoursAgo: 4,
    audience: { mode: "verified", widenAfterHours: 12, requireBadges: ["license"] },
  });
  const r_feed2 = build({
    id: "r_feed2", listerId: "u_tom", address: "1109 E 12th St", neighborhood: "East Austin", price: 498000,
    beds: 2, baths: 1, sqft: 1050, start: dayAt(1, 11), hours: 3, offer: { type: "flat", amount: 150 }, status: "open", urgent: true, gradient: 1, createdHoursAgo: 2,
    audience: { mode: "verified", requireBadges: ["license", "id"] },
  });
  const r_feed3 = build({
    id: "r_feed3", listerId: "u_priya", address: "605 Banister Ln", neighborhood: "Bouldin Creek", price: 829000,
    beds: 3, baths: 2, sqft: 1890, start: dayAt(4, 14), hours: 3, offer: { type: "referral", percent: 30 }, status: "open", gradient: 0, createdHoursAgo: 10,
    audience: { mode: "verified", widenAfterHours: 24, requireBadges: ["license"] },
  });
  const r_feed4 = build({
    id: "r_feed4", listerId: "u_tom", address: "9 Wild Basin Ledge", neighborhood: "Westlake", price: 1895000,
    beds: 5, baths: 4.5, sqft: 4300, start: dayAt(5, 13), hours: 3, offer: { type: "credit", credits: 2 }, status: "open", gradient: 4, createdHoursAgo: 14,
    audience: { mode: "brokerage", requireBadges: ["license", "brokerage", "id"] },
  });
  const r_dan_applied = build({
    id: "r_dan_applied", listerId: "u_tom", address: "1520 Alta Vista Ave", neighborhood: "Zilker", price: 940000,
    beds: 3, baths: 2, sqft: 1800, start: dayAt(3, 11), hours: 3, offer: { type: "flat", amount: 90 }, status: "applied", gradient: 5, createdHoursAgo: 18,
    applicants: [
      ["u_kolten", "I live ten minutes away and know Zilker well.", "pending", 5],
      ["u_priya", "Available!", "pending", 2],
    ],
  });
  const r_disputed = build({
    id: "r_disputed", listerId: "u_tom", address: "3815 Speedway", neighborhood: "Hyde Park", price: 575000,
    beds: 2, baths: 1, sqft: 1100, start: dayAt(-8, 13), hours: 3, offer: { type: "flat", amount: 120 }, status: "disputed", gradient: 2,
    confirmedHostId: "u_kolten", createdHoursAgo: 260, payment: "disputed",
    applicants: [["u_kolten", "Happy to cover.", "confirmed", 250]],
  });
  r_disputed.disputes = [{ id: "dp_1", requestId: "r_disputed", openedBy: "u_kolten", reason: "Flat fee was agreed at $120 but nothing has been received after 8 days.", createdAt: ago(48), status: "open" }];
  r_disputed.ratings.hostToLister = mkRating(3, "Great listing, but payment is still outstanding.", 60);

  // ---------- New York City ----------
  const ny = "nyc" as const;
  const ny_open = build({
    id: "r_ny_open", cityKey: ny, listerId: "u_lee", address: "320 W 86th St, Apt 5C", neighborhood: "Upper West Side", price: 1295000,
    beds: 2, baths: 2, sqft: 1380, start: dayAt(3, 13), hours: 3, offer: { type: "lead" }, status: "open", gradient: 0, createdHoursAgo: 7, access: "meet",
  });
  const ny_applied = build({
    id: "r_ny_applied", cityKey: ny, listerId: "u_lee", address: "88 Greenwich St, Unit 12F", neighborhood: "Tribeca", price: 2150000,
    beds: 3, baths: 2.5, sqft: 1920, start: dayAt(2, 14), hours: 3, offer: { type: "flat", amount: 200 }, status: "applied", gradient: 2, access: "meet",
    createdHoursAgo: 22,
    applicants: [
      ["u_ravi", "I show Lower Manhattan condos weekly and can be there early.", "pending", 15],
      ["u_priya", "Happy to cover, I live in Chelsea.", "pending", 8],
      ["u_jules", "Newer agent, very eager. Free all afternoon.", "pending", 3],
    ],
  });
  const ny_confirmed = build({
    id: "r_ny_confirmed", cityKey: ny, listerId: "u_lee", address: "17 Henry St, Apt 3A", neighborhood: "Brooklyn Heights", price: 1075000,
    beds: 2, baths: 1.5, sqft: 1250, start: dayAt(1, 12), hours: 3, offer: { type: "referral", percent: 25 }, status: "confirmed", gradient: 1,
    confirmedHostId: "u_kolten", createdHoursAgo: 50,
    applicants: [
      ["u_kolten", "I'm in Williamsburg, a quick ride away.", "confirmed", 42],
      ["u_mei", "Available if you need a backup.", "backup", 30],
    ],
  });
  ny_confirmed.messages = [
    msg("r_ny_confirmed", "u_lee", "Thanks Kolten. The doorman will have your name; sign-in sheet is on the console table.", 18, 1),
    msg("r_ny_confirmed", "u_kolten", "Perfect, I'll be there 20 minutes early.", 17, 2),
  ];
  ny_confirmed.timeline.push({ at: ago(42), label: "Kolten Yamaguchi applied" }, { at: ago(38), label: "Kolten Yamaguchi confirmed" });
  const ny_completed = build({
    id: "r_ny_completed", cityKey: ny, listerId: "u_lee", address: "245 E 63rd St, Apt 9B", neighborhood: "Upper East Side", price: 985000,
    beds: 1, baths: 1, sqft: 820, start: dayAt(-3, 13), hours: 3, offer: { type: "flat", amount: 150 }, status: "completed", gradient: 4,
    confirmedHostId: "u_kolten", createdHoursAgo: 170, payment: "unpaid",
    applicants: [["u_kolten", "Glad to help.", "confirmed", 160]],
  });
  ny_completed.ratings.hostToLister = mkRating(5, "Smooth building handoff and quick replies.", 50);
  const ny_feed1 = build({
    id: "r_ny_feed1", cityKey: ny, listerId: "u_dana", address: "412 6th Ave, Unit 2", neighborhood: "Park Slope", price: 1650000,
    beds: 3, baths: 2, sqft: 1900, start: dayAt(2, 12), hours: 3, offer: { type: "lead" }, status: "open", gradient: 3, createdHoursAgo: 5,
    audience: { mode: "verified", widenAfterHours: 12, requireBadges: ["license"] },
  });
  const ny_feed2 = build({
    id: "r_ny_feed2", cityKey: ny, listerId: "u_dana", address: "150 N 6th St, Apt 4D", neighborhood: "Williamsburg", price: 1190000,
    beds: 2, baths: 2, sqft: 1100, start: dayAt(1, 11), hours: 3, offer: { type: "flat", amount: 175 }, status: "open", urgent: true, gradient: 1, createdHoursAgo: 2,
    audience: { mode: "verified", requireBadges: ["license", "id"] },
  });
  const ny_feed3 = build({
    id: "r_ny_feed3", cityKey: ny, listerId: "u_dana", address: "61 Jane St, Apt 6E", neighborhood: "Greenwich Village", price: 1895000,
    beds: 2, baths: 2, sqft: 1360, start: dayAt(4, 14), hours: 3, offer: { type: "referral", percent: 30 }, status: "open", gradient: 5, createdHoursAgo: 11,
    audience: { mode: "verified", widenAfterHours: 24, requireBadges: ["license"] },
  });
  const ny_feed4 = build({
    id: "r_ny_feed4", cityKey: ny, listerId: "u_dana", address: "30-17 Vernon Blvd, Unit 8A", neighborhood: "Long Island City", price: 875000,
    beds: 1, baths: 1, sqft: 760, start: dayAt(5, 13), hours: 3, offer: { type: "credit", credits: 1 }, status: "open", gradient: 4, createdHoursAgo: 16, access: "meet",
    audience: { mode: "brokerage", requireBadges: ["license", "brokerage", "id"] },
  });
  const ny_feed5 = build({
    id: "r_ny_feed5", cityKey: ny, listerId: "u_tom", address: "2288 Frederick Douglass Blvd, Apt 3B", neighborhood: "Harlem", price: 760000,
    beds: 2, baths: 1, sqft: 980, start: dayAt(3, 11), hours: 3, offer: { type: "flat", amount: 120 }, status: "open", gradient: 2, createdHoursAgo: 9,
  });
  const ny_dana_applied = build({
    id: "r_ny_kapplied", cityKey: ny, listerId: "u_dana", address: "75 Morton St, Apt 2R", neighborhood: "Greenwich Village", price: 1420000,
    beds: 2, baths: 1.5, sqft: 1150, start: dayAt(3, 14), hours: 3, offer: { type: "flat", amount: 140 }, status: "applied", gradient: 0, createdHoursAgo: 19,
    applicants: [
      ["u_kolten", "I know the West Village market well and I'm free that afternoon.", "pending", 6],
      ["u_ravi", "Available!", "pending", 2],
    ],
  });
  const ny_settled = build({
    id: "r_ny_settled", cityKey: ny, listerId: "u_dana", address: "9 Prince St, Unit 5", neighborhood: "SoHo", price: 2490000,
    beds: 3, baths: 3, sqft: 2100, start: dayAt(-9, 12), hours: 3, offer: { type: "lead" }, status: "settled", gradient: 2,
    confirmedHostId: "u_ravi", createdHoursAgo: 280, payment: "n/a",
    applicants: [["u_ravi", "Count me in.", "confirmed", 270]],
  });
  ny_settled.ratings.listerToHost = mkRating(5, "Ravi is thorough and great with buyers.", 210);
  ny_settled.ratings.hostToLister = mkRating(5, "Clear handoff, would cover again.", 208);

  return [
    ny_open, ny_applied, ny_confirmed, ny_completed, ny_feed1, ny_feed2, ny_feed3, ny_feed4, ny_feed5, ny_dana_applied, ny_settled,
    r_today, r_confirmed, r_applied, r_open, r_completed, r_settled, r_cancelled, r_expired,
    r_feed1, r_feed2, r_feed3, r_feed4, r_dan_applied, r_disputed,
  ];
}

export function seedNotifications(): Notification[] {
  const n = (id: string, userId: string, type: Notification["type"], title: string, body: string, hoursAgo: number, requestId?: string, read = false, cityKey: CityKey = "austin"): Notification => ({
    id, userId, type, title, body, requestId, cityKey, createdAt: ago(hoursAgo), read,
  });
  return [
    n("n1", "u_lee", "applicant", "3 applicants on 2210 Rio Grande", "Sofia Lindqvist just applied. Review trust cards and confirm a host.", 3, "r_applied"),
    n("n2", "u_lee", "reminder", "Open house today", "Kolten Yamaguchi is confirmed for 5112 Duval St. Check-in opens shortly.", 1, "r_today"),
    n("n3", "u_lee", "completed", "Kolten submitted the summary", "3306 Hemlock Ave: 14 visitors, 3 leads. Confirm completion and rate Kolten.", 40, "r_completed"),
    n("n4", "u_lee", "reminder", "No applicants yet for 1407 W 38th", "Consider raising the offer or widening the audience.", 5, "r_open", true),
    n("n5", "u_kolten", "reminder", "Today: 5112 Duval St", "You're confirmed. Review the handoff checklist and check in on arrival.", 1, "r_today"),
    n("n6", "u_kolten", "confirmed", "You're confirmed for 903 Bouldin Ave", "Lee Wolfowitz confirmed you. Contact details are now visible.", 36, "r_confirmed", true),
    n("n7", "u_kolten", "urgent", "Urgent: 1109 E 12th St needs a host", "Flat fee $150, tomorrow 11 AM, 3.1 mi away.", 2, "r_feed2"),
    n("n8", "u_kolten", "payment", "Dispute opened on 3815 Speedway", "A reviewer will look at the signed terms and record.", 48, "r_disputed", true),
    n("n9", "u_lee", "applicant", "3 applicants on 88 Greenwich St", "Jules Moreau just applied. Review trust cards and confirm a host.", 3, "r_ny_applied", false, "nyc"),
    n("n10", "u_lee", "reminder", "Open house tomorrow", "Kolten Yamaguchi is confirmed for 17 Henry St. Handoff details unlock soon.", 2, "r_ny_confirmed", false, "nyc"),
    n("n11", "u_kolten", "confirmed", "You're confirmed for 17 Henry St", "Lee Wolfowitz confirmed you. Contact details are now visible.", 38, "r_ny_confirmed", true, "nyc"),
    n("n12", "u_kolten", "urgent", "Urgent: Williamsburg needs a host", "Flat fee $175, tomorrow 11 AM, nearby.", 2, "r_ny_feed2", false, "nyc"),
  ];
}
