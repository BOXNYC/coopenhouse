# CoOpenHouse

A mobile-first demo of a marketplace that matches a listing agent who needs an open house covered with a verified, licensed agent nearby. Built with Next.js 16 (App Router), React 19, Tailwind v4 and TypeScript. See `DESIGN.md` for the product design.

## Running the demo

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # production build
npm run lint
npx tsc --noEmit
```

There is no database. All data lives in memory in the browser (seeded on first load, reset on full refresh). API calls are async and have simulated latency of 300-900 ms (`API_LATENCY` in `src/lib/api.ts`). Auth state (the signed-in user id) is kept in `localStorage`.

## Seeded logins

Pick one on `/login`:

| User | Id | Role |
|---|---|---|
| Lee Wolfowitz | `u_lee` | Lister |
| Kolten Yamaguchi | `u_kolten` | Host |

Other seeded agents appear as applicants: Priya Raman (`u_priya`, top-rated), Marcus Bell (`u_marcus`, newer, one no-show), Sofia Lindqvist (`u_sofia`, brand new and unverified) and Tom Nguyen (`u_tom`, another Lister). Use "Switch to Host/Lister demo" in the profile menu to flip sides quickly.

## Structure

```
src/
  app/                 routes: / /login /lister /lister/new /lister/requests/[id]
                       /host /host/requests/[id] /events/[id] /profile
  components/
    AppShell.tsx       bottom tab bar (mobile) / side nav (desktop), bell, account menu, auth + role guard
    TrustCard.tsx      compact + expanded trust card
    RequestCard.tsx    request list item (+ RequestPhoto)
    ui/                Button, Card, Badge (+ verification badges), Avatar, Stars, Skeleton, Modal/BottomSheet,
                       Toast, Tabs, Field/Input/Textarea/Select, Stepper, StatusPill, OfferChip, EmptyState, icons
  lib/
    types.ts           domain types
    seed.ts            seed users, requests, notifications (dates relative to now)
    db.ts              in-memory singleton store (globalThis, hot-reload safe) with change subscriptions
    api.ts             async client API with latency, state transitions and reliability effects (DESIGN.md section 8)
    hooks.ts           useAsync, useRequest(s), useUser, useApplicants, useNotifications, useMutation
    auth.tsx           AuthProvider, useAuth, RequireAuth, RequireRole
    rules.ts           pure business rules (address visibility, eligibility, trust score, ratings visibility)
    format.ts          dates, currency, relative time, distance, offer labels
```

Screens wrap themselves in `<AppShell role="lister" | "host">`, fetch with the hooks, and write with `useMutation(api.fn)`. Mutations notify the store, so every mounted hook refetches silently.

## Map view (Host feed)

The Host feed's **Map** tab uses Mapbox GL with the request list floating on top as a draggable bottom sheet. Add a public token to `.env.local`:

```
NEXT_PUBLIC_MAPBOX_TOKEN=pk.your_token_here
```

Without a token it falls back to an illustrative SVG map.
