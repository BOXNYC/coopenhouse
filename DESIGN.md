# CoOpenHouse.com: Design Doc

## 1. Summary

Agents who can't host their own open house today post in a brokerage Slack or group chat and hope. It works when the agent knows the people, and it fails when the post gets buried, nobody nearby sees it, or the one volunteer is a stranger the listing agent can't vet.

**CoOpenHouse.com** is a marketplace that matches a listing agent who needs an open house covered with a verified, licensed agent nearby who is free at that time. The product bets on two things:

1. **Trust is the product.** Handing a client's home to a stranger is the hard part, not finding a volunteer. Most of the design effort goes into verification, a clear handoff, and accountability.
2. **Compensation should look like what agents already do.** Agents think in referral splits and favors, not hourly wages. The MVP offers a few simple, familiar options and leaves money movement to the brokerages.

## 2. Problem

**For the agent who needs coverage ("Lister")**

- A conflict comes up (closing, showing, sick kid) and the open house is days or hours away.
- Their reach is limited to one brokerage's chat. Posts get buried and there is no structured response.
- If someone volunteers, the Lister has little basis to trust them with the home, the client, and their own reputation.

**For the agent who would cover ("Host")**

- Many agents would host a nearby open house for the right terms. Open houses are a good way to meet buyers.
- They have no way to discover opportunities that match their schedule and area, and no clarity on what they'd get out of it.

## 3. Users

| | Lister | Host |
|---|---|---|
| Who | Licensed agent with a listing and a conflict | Licensed agent with free time nearby. Often newer, wanting buyer leads and experience |
| Wants | A reliable, trustworthy stand-in with minimal effort | Good opportunities close by, clear terms, a fair return |
| Fears | Client complaint, damage or theft, no-show, a Host poaching the client | Wasted trip, unclear rules, not getting what was promised, a Lister who ghosts |

**Secondary stakeholders:** the seller (client), the Lister's brokerage and the Host's brokerage (liability, licensing, referral fee rules). The MVP serves agents directly but must not surprise brokerages. See §7.

## 4. Goals and non-goals

**Goals (MVP)**
- A Lister can post a covered-open-house request in under 2 minutes.
- A Host can find and claim a matching request in under 1 minute.
- Both sides see enough verified information to feel safe before committing.
- Problems (cancellations, no-shows, complaints) have a defined path, not a shrug.

**Non-goals (MVP)**
- Full MLS or calendar integration. Manual entry is fine.
- In-app payments. Compensation is agreed and recorded, not processed. See §6.
- Showings, listing management, CRM, or lead routing beyond the open house itself.
- Cross-state licensing complexity. Launch in one or two metros and states.

## 5. Core flows

### 5.1 Lister: request coverage
1. **Create request.** Pick the listing (address, photos optional), date and time window, and the compensation offer (§6).
2. **Add handoff details.** Access method (lockbox or meet-in-person), sign-in sheet expectations, talking points, client sensitivities, "do not discuss" items, and an emergency contact (the Lister).
3. **Choose audience.** Default is verified agents within N miles. The Lister may restrict to their own brokerage or "agents I've worked with" first, then widen after a timeout.
4. **Review applicants.** See each applicant's trust card (§7) and choose one. Auto-accept is available for trusted or previously-used agents.
5. **Confirm and hand off.** The agents get a shared handoff checklist and in-app messaging. Contact details are released only on confirmation.
6. **After the event.** The Host submits a summary: attendance, sign-in sheet leads, notable feedback, and any issues. The Lister confirms completion and rates the Host. This triggers the compensation record.

### 5.2 Host: discover and cover
1. **Set availability and radius.** Home area, travel radius, preferred days and times, minimum compensation terms. No full calendar sync in the MVP.
2. **Browse or get alerted.** A feed and push alerts show nearby requests that fit their windows: price range, neighborhood, time, compensation, Lister rating.
3. **Inspect a request.** The full address is shown only after applying or being invited. Before that, only neighborhood and photo.
4. **Apply with one tap.** An optional note. Hosts can also "claim now" if the Lister enabled instant accept.
5. **Confirmed.** Add to calendar, get directions, see the handoff checklist and the day-of reminder.
6. **Day of.** Check in on arrival (location-confirmed) and check out with the summary form. Lead sign-ins are captured in the app.

### 5.3 Lifecycle states
`Draft → Open → Applied → Confirmed → Checked-in → Completed → Settled`
with side exits: `Cancelled by Lister`, `Cancelled by Host`, `Expired (no taker)`, `Disputed`.

## 6. Compensation

Agents are paid by commission, so the natural currency isn't an hourly rate. The MVP offers three offer types the Lister can choose from, and the Host sees them side by side.

| Offer | How it works | Why agents like it |
|---|---|---|
| **Lead sharing** (default) | The Host keeps any buyer leads they meet at the open house. The Lister keeps the listing client | Costs the Lister nothing. Hosts get the thing they actually want |
| **Flat fee** | A fixed amount (for example $75–$150) paid by the Lister | Clear and simple. Good for hosts who aren't chasing leads |
| **Referral split** | If a lead the Host brings converts to a sale, the Host and Lister share a pre-agreed percentage of the commission | Aligns incentives. Uses a structure agents already know |
| **Favor swap / credit** | The Host earns cover credits that they can spend when they need coverage | Fits how agents already trade favors. Builds supply on both sides |

**MVP approach: record, don't process.** The app writes the agreed terms into a signed agreement that both agents accept before confirmation. Settlement happens outside the app (Venmo or brokerage check). The app tracks "paid / unpaid" with a nudge and a dispute option.

**Why not process payments in the MVP:** referral fees between agents in different brokerages generally have to pass through the brokers, and rules vary by state. Handling money and that compliance adds large scope and risk before we know people want the product. Payments are a fast follow once we've validated demand and the rules for the launch state.

**Lead ownership is the sharpest edge.** Without a clear rule, Lister and Host will clash over who owns a buyer who walks in. The agreement states: *the Host may follow up with open house visitors who sign in as unrepresented, and may not solicit the seller or represent the listing.* The Lister keeps the seller relationship, full stop.

## 7. Trust and safety (the focus)

Imagine being the Lister. What would make me comfortable?

### 7.1 Identity and license verification
- **License check at signup.** Verify license number, state, status (active, no disciplinary action) against the state board record or an aggregator. Re-check on a schedule. A license that lapses suspends the account.
- **Brokerage affiliation.** The Host states their brokerage. Verify via the license record or a brokerage email domain.
- **Photo and ID match.** A government ID and selfie check once, so the person who shows up is the person on the profile.
- **Badges:** `License verified`, `Brokerage verified`, `ID verified`. A Lister can require all three.

### 7.2 The trust card
Every applicant shows the Lister a compact card:
- Verified badges, years licensed, brokerage
- Open houses covered, completion rate, no-show count
- Ratings and short comments from past Listers
- Mutual connections (same brokerage, same past Listers)
- Insurance / E&O status (self-attested in MVP)

New Hosts have no history, so the MVP gives them a path: a Lister can limit requests to *verified* agents while new Hosts start on lower-stakes listings (vacant or lower price tier) and build a record.

### 7.3 Controlling what's shared
- Full address and access details are revealed only to the confirmed Host, and only shortly before the event.
- The Lister decides whether the Host gets a lockbox code or must meet in person or key-pickup.
- The seller never sees agent contact info unless the Lister shares it.

### 7.4 Accountability
- **Check-in and check-out** with location confirmation and a timestamp.
- **A summary report** (visitors, sign-ins, issues, photos of the property's condition at close).
- **Mutual ratings** after every event, visible only once both have submitted, so neither is retaliating.
- **Written agreement** both agents accept: confidentiality, the lead rules in §6, no representation of the seller, and a code of conduct.
- **Insurance and liability.** Both agents remain responsible to their own brokerages. The MVP states this plainly and asks the Host to confirm their brokerage permits it. Pursuing optional brokerage pre-approval is a roadmap item.

### 7.5 Reporting
A one-tap *Report a problem* during or after an event. Reports go to a human reviewer, and serious reports (theft, misconduct) pause the Host's account while under review.

## 8. Edge cases and failure handling

| Scenario | Handling |
|---|---|
| **Nobody applies** | Auto-widen radius and audience after a set time. Notify the Lister at 48h and 12h before the event with options: raise compensation, widen audience, or cancel |
| **Host cancels late** | Lister is alerted immediately and the request reopens as *Urgent*, pushed to nearby hosts. The cancelling Host takes a reliability penalty that scales with how late it is |
| **Host no-show** | No check-in within 15 minutes of start pings the Host, then escalates to the Lister with a one-tap *Reopen / Call*. Records a no-show strike, and repeat strikes suspend the account |
| **Lister cancels late** | Host sees it right away. If the Host has already committed, the flat fee (if any) may be partially owed or a credit granted. Rules shown in the agreement |
| **Two Hosts claim at once** | First confirmed wins. The others are told right away and kept as backups |
| **Wrong or changed time or address** | Edits after confirmation require Host acknowledgement, and a significant change reopens the Host's option to drop out without penalty |
| **Property problem** (damage, theft, unsafe visitor) | Report flow, timestamped photos at check-in and check-out, escalation to the Lister immediately and to human review |
| **Compensation dispute** | Both sides see the signed terms and a *paid / not paid* status. Either may open a dispute, and a reviewer decides based on the record. Persistent non-payment affects the rating |
| **Lead conflict** | The signed rules apply. A reviewer checks the sign-in sheet record and timestamps |
| **License lapses or is flagged** | Account is suspended automatically and any upcoming confirmed events trigger the "Host cancels" path |
| **Seller refuses a substitute** | The Lister can cancel at any time. Treated as a Lister cancellation with the agreed terms |
| **Out-of-area or unlicensed in state** | Verification blocks the application. Hosts can only apply for states where they're licensed |

## 9. MVP scope

**In**
- Agent signup with license and ID verification (one or two states)
- Create request, feed, apply, confirm, handoff checklist
- Trust card, mutual ratings, check-in and check-out
- Three offer types, with agreement recorded and *paid / unpaid* tracking
- Push, SMS and email notifications
- Basic reporting and a manual admin review queue

**Out (later)**
- In-app payments and brokerage settlements
- Calendar and MLS sync
- Brokerage dashboards and pre-approval
- Insurance partnerships
- Smart matching and pricing suggestions
- Native apps (the MVP is a mobile-first web app)

**Success metrics:** time to fill a request, fill rate (percent filled before the event), no-show rate, repeat usage by Listers and Hosts, and ratings.

## 10. Rough architecture

Kept light, because the doc is about product, not infrastructure.

- **Mobile-first web app** with a small backend and relational DB (users, licenses, requests, applications, agreements, events, ratings, reports).
- **License verification:** an integration with a state board lookup or aggregator, plus a manual fallback queue.
- **Maps and distance:** a geocoding API and radius queries. No custom routing.
- **Notifications:** push, SMS and email provider.
- **Admin tooling:** a simple internal review queue for verification, reports, and disputes.

## 11. Open questions and assumptions

- **Brokerage rules.** Some brokerages restrict who may host their agents' listings, and referral fees must typically flow broker to broker. We assume agents may cover for each other with their broker's permission, and need to confirm this with a few brokers and the launch state's rules.
- **Licensing for hosting.** Many states require a licensed agent (or one under supervision) to host. The MVP assumes licensed agents only.
- **Insurance.** Who is liable for damage during a covered event? We assume the agents' brokerages' existing coverage, to be validated.
- **Cold start.** The service needs both sides. We'd seed one metro and one or two brokerages, and start with *Lead sharing* offers, which need no cash.
- **Will Listers pay?** A flat fee may be seen as a cost. We should test whether lead sharing alone is enough.
- **Business model** (not in scope): likely a small fee on flat-fee offers, a Pro tier for teams and brokerages, or a brokerage subscription.

## 12. Minimally Viable Product Flows

1. **Lister: Create request.** Date and time, compensation picker, handoff notes.
2. **Lister: Review applicants.** Trust cards side by side with a one-tap *Confirm*.
3. **Host: Feed.** Nearby requests with the offer, distance and Lister rating.
4. **Host: Request detail and apply.** Terms, what's included, the apply action.
5. **Day-of.** Check-in, handoff checklist, summary and rating.

## 13. Tech

- I already builtout the archetecture with Next.js
- This demo doesn't have a database, and all data is stored in memory to demonstrate the frontend.
- The focus is on demonstrating the user flows and UI/UX rather than full backend functionality.
- The data should be CRUD-capable in memory and have seed data set up for demonstration purposes.
- Add latency to API calls to simulate real-world network conditions.
- A user system is also in place with in-memory authentication and role management for Listers and Hosts. Use seeded users for demonstration purposes, save auth state in memory with local storage.