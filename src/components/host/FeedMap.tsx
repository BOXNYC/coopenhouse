"use client";
import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";
import type { OpenHouseRequest, User } from "@/lib/types";
import { HostRequestCard } from "@/components/host/HostRequestCard";

const SIZE = 400; // square viewBox
const C = SIZE / 2;
const MILES_PER_DEG_LAT = 69;

/** Project lat/lng to local x/y (miles east/north of the host's home). */
function toMiles(lat: number, lng: number, home: { lat: number; lng: number }) {
  const x = (lng - home.lng) * MILES_PER_DEG_LAT * Math.cos((home.lat * Math.PI) / 180);
  const y = (lat - home.lat) * MILES_PER_DEG_LAT;
  return { x, y };
}

// Decorative street grid + "river" so the canvas reads as a map.
const ROADS: [number, number, number, number][] = [
  [0, 90, 400, 130], [0, 210, 400, 190], [0, 310, 400, 330],
  [70, 0, 110, 400], [200, 0, 180, 400], [320, 0, 300, 400],
];

export function FeedMap({
  requests,
  me,
  radiusMiles,
  restrictedReasons,
  listers,
}: {
  requests: OpenHouseRequest[];
  me: User;
  radiusMiles: number;
  restrictedReasons: Map<string, string>;
  listers: Map<string, User>;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const pins = useMemo(() => {
    const home = { lat: me.homeLat, lng: me.homeLng };
    const pts = requests.map((r) => ({ r, ...toMiles(r.lat, r.lng, home) }));
    // Fit the map to the radius, or to the farthest pin if it's beyond it.
    const far = Math.max(radiusMiles, ...pts.map((p) => Math.hypot(p.x, p.y)));
    const scale = (C - 28) / (far * 1.05);
    return {
      scale,
      items: pts.map((p) => ({ r: p.r, cx: C + p.x * scale, cy: C - p.y * scale })),
    };
  }, [requests, me.homeLat, me.homeLng, radiusMiles]);

  const selected = requests.find((r) => r.id === selectedId) ?? null;
  const ringR = radiusMiles * pins.scale;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-card border border-line bg-[#eaf1ee] shadow-card">
        <svg
          viewBox={`0 0 ${SIZE} ${SIZE}`}
          className="block aspect-square w-full max-h-[460px]"
          role="group"
          aria-label={`Map of ${requests.length} open houses within ${radiusMiles} miles of ${me.homeArea}`}
          onClick={() => setSelectedId(null)}
        >
          <rect width={SIZE} height={SIZE} fill="#eaf1ee" />
          {/* parks / water */}
          <ellipse cx="320" cy="90" rx="60" ry="34" fill="#d3e6d5" />
          <ellipse cx="80" cy="330" rx="48" ry="28" fill="#d3e6d5" />
          <path d="M0 250 C 90 230, 140 290, 230 270 S 360 230, 400 250 L400 280 C 360 262, 290 300, 230 300 S 90 262, 0 282 Z" fill="#c7dfea" />
          {ROADS.map(([x1, y1, x2, y2], i) => (
            <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={i < 3 ? 5 : 4} opacity="0.9" />
          ))}
          {/* radius */}
          <circle cx={C} cy={C} r={ringR} className="fill-brand-500/10 stroke-brand-600" strokeWidth="1.5" strokeDasharray="6 5" />
          <circle cx={C} cy={C} r={ringR / 2} className="fill-none stroke-brand-600/40" strokeWidth="1" strokeDasharray="2 5" />
          <text x={C + ringR - 4} y={C - 6} textAnchor="end" className="fill-brand-700 text-[11px] font-semibold">
            {radiusMiles} mi
          </text>
          {/* home */}
          <circle cx={C} cy={C} r="9" className="fill-brand-700/20" />
          <circle cx={C} cy={C} r="5" className="fill-brand-700 stroke-white" strokeWidth="2" />
          <text x={C} y={C + 22} textAnchor="middle" className="fill-brand-800 text-[11px] font-semibold">
            {me.homeArea}
          </text>
          {/* pins */}
          {pins.items.map(({ r, cx, cy }) => {
            const active = r.id === selectedId;
            const restricted = restrictedReasons.has(r.id);
            const fill = restricted ? "#9aa3a0" : r.urgent ? "#d64545" : "#e8833a";
            return (
              <g
                key={r.id}
                transform={`translate(${cx} ${cy})`}
                role="button"
                tabIndex={0}
                aria-label={`${r.neighborhood}, ${restricted ? "restricted" : r.urgent ? "urgent" : "open"}`}
                aria-pressed={active}
                className="cursor-pointer outline-none"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedId(r.id);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setSelectedId(r.id);
                  }
                }}
              >
                {r.urgent && !restricted && <circle r="16" fill={fill} opacity="0.2" className="animate-ping" />}
                <path
                  d="M0 0 C -9 -10, -12 -16, -12 -21 A 12 12 0 1 1 12 -21 C 12 -16, 9 -10, 0 0 Z"
                  fill={fill}
                  stroke="#fff"
                  strokeWidth={active ? 3 : 2}
                  transform={active ? "scale(1.25)" : undefined}
                />
                <circle cy="-21" r="4.5" fill="#fff" transform={active ? "scale(1.25)" : undefined} />
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-2 text-[11px] font-medium text-ink-soft">
          <Legend color="#e8833a" label="Open" />
          <Legend color="#d64545" label="Urgent" />
          <Legend color="#9aa3a0" label="Restricted" />
        </div>
        <p className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-muted">Illustrative map · demo</p>
      </div>

      {selected ? (
        <HostRequestCard
          request={selected}
          lister={listers.get(selected.listerId)}
          viewerId={me.id}
          restrictedReason={restrictedReasons.get(selected.id)}
        />
      ) : (
        <p className={cn("rounded-card border border-dashed border-line-strong p-3 text-center text-sm text-muted")}>
          Tap a pin to preview the open house.
        </p>
      )}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-0.5 shadow-sm">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
