"use client";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import type { GeoJSONSource, Map as MapboxMap, Marker } from "mapbox-gl";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";
import type { OpenHouseRequest, User } from "@/lib/types";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MILES_PER_DEG_LAT = 69;
const PEEK = 148; // px of the sheet visible when collapsed

export type MapSection = { key: string; title: ReactNode; items: OpenHouseRequest[]; className?: string };

type Snap = "peek" | "half" | "full";

function pinColor(r: OpenHouseRequest, restricted: boolean) {
  return restricted ? "#9aa3a0" : r.urgent ? "#d64545" : "#e8833a";
}

/** GeoJSON polygon approximating a circle of `miles` around a point. */
function circlePolygon(lat: number, lng: number, miles: number) {
  const pts: [number, number][] = [];
  const dLat = miles / MILES_PER_DEG_LAT;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
}

/**
 * Full-bleed map with the request list floating on top as a draggable bottom
 * sheet (Google Maps style). Uses Mapbox when NEXT_PUBLIC_MAPBOX_TOKEN is set,
 * and an illustrative SVG canvas otherwise.
 */
export function FeedMap({
  requests,
  me,
  radiusMiles,
  restrictedReasons,
  sections,
  renderCard,
  loading,
  overlay,
}: {
  requests: OpenHouseRequest[];
  me: User;
  radiusMiles: number;
  restrictedReasons: Map<string, string>;
  sections: MapSection[];
  renderCard: (r: OpenHouseRequest) => ReactNode;
  loading?: boolean;
  /** Floating controls rendered over the top of the map. */
  overlay?: ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState(560);
  const [snap, setSnap] = useState<Snap>("half");
  const [drag, setDrag] = useState<number | null>(null); // visible px while dragging
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const dragStart = useRef<{ y: number; visible: number } | null>(null);

  useEffect(() => {
    document.body.classList.add("map-mode");
    return () => document.body.classList.remove("map-mode");
  }, []);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setHeight(el.clientHeight));
    ro.observe(el);
    setHeight(el.clientHeight);
    return () => ro.disconnect();
  }, []);

  const snapPx = useMemo(
    () => ({ peek: PEEK, half: Math.round((height - 64) * 0.5), full: height - 120 }),
    [height],
  );
  const visible = drag ?? snapPx[snap];

  const select = (id: string | null) => {
    setSelectedId(id);
    if (id) {
      setSnap((s) => (s === "full" ? "half" : s === "peek" ? "half" : s));
      requestAnimationFrame(() =>
        document.getElementById(`map-card-${id}`)?.scrollIntoView({ block: "nearest", behavior: "smooth" }),
      );
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId);
    dragStart.current = { y: e.clientY, visible: snapPx[snap] };
    setDrag(snapPx[snap]);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragStart.current) return;
    const v = dragStart.current.visible + (dragStart.current.y - e.clientY);
    setDrag(Math.max(PEEK - 40, Math.min(snapPx.full, v)));
  };
  const onPointerUp = () => {
    if (!dragStart.current || drag === null) return;
    const nearest = (Object.keys(snapPx) as Snap[]).reduce((a, b) =>
      Math.abs(snapPx[a] - drag) < Math.abs(snapPx[b] - drag) ? a : b,
    );
    dragStart.current = null;
    setDrag(null);
    setSnap(nearest);
  };
  const cycle = () => setSnap((s) => (s === "peek" ? "half" : s === "half" ? "full" : "peek"));

  const total = requests.length;

  return createPortal(
    <div ref={wrapRef} className="fixed inset-0 z-20 overflow-hidden bg-[#eaf1ee] dark:bg-[#10242b] md:left-64">
      {TOKEN ? (
        <MapboxCanvas
          requests={requests}
          me={me}
          radiusMiles={radiusMiles}
          restrictedReasons={restrictedReasons}
          selectedId={selectedId}
          onSelect={select}
          bottomPad={PEEK + 24 + 64}
        />
      ) : (
        <SvgCanvas
          requests={requests}
          me={me}
          radiusMiles={radiusMiles}
          restrictedReasons={restrictedReasons}
          selectedId={selectedId}
          onSelect={select}
        />
      )}

      <div className="pointer-events-none absolute left-3 top-[7.25rem] z-10 flex flex-wrap gap-2 text-[11px] font-medium text-ink-soft">
        <Legend color="#e8833a" label="Open" />
        <Legend color="#d64545" label="Urgent" />
        <Legend color="#9aa3a0" label="Restricted" />
      </div>
      {!TOKEN && (
        <p className="pointer-events-none absolute right-3 top-[7.25rem] max-w-[11rem] rounded bg-surface/90 px-2 py-1 text-right text-[10px] leading-tight text-muted shadow-sm">
          Illustrative map. Set NEXT_PUBLIC_MAPBOX_TOKEN for live Mapbox.
        </p>
      )}

      {overlay && <div className="pointer-events-none absolute inset-x-0 top-0 z-20 p-3"><div className="pointer-events-auto mx-auto max-w-3xl">{overlay}</div></div>}

      {/* Floating list sheet */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-16 z-10 mx-auto flex max-w-3xl flex-col rounded-t-[22px] md:bottom-0 bg-paper shadow-[0_-8px_30px_rgba(10,30,28,0.22)]",
          drag === null && "transition-[height] duration-300 ease-out",
        )}
        style={{ height: visible }}
      >
        <div
          role="slider"
          tabIndex={0}
          aria-label="Resize list"
          aria-valuemin={0}
          aria-valuemax={2}
          aria-valuenow={snap === "peek" ? 0 : snap === "half" ? 1 : 2}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onDoubleClick={cycle}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") setSnap((s) => (s === "peek" ? "half" : "full"));
            if (e.key === "ArrowDown") setSnap((s) => (s === "full" ? "half" : "peek"));
            if (e.key === "Enter" || e.key === " ") cycle();
          }}
          className="shrink-0 cursor-grab touch-none select-none px-4 pb-2 pt-2.5 active:cursor-grabbing"
        >
          <div className="mx-auto h-1.5 w-10 rounded-full bg-line-strong" />
          <p className="mt-2 text-sm font-semibold text-ink">
            {loading ? "Finding open houses…" : `${total} open house${total === 1 ? "" : "s"} nearby`}
          </p>
        </div>
        <div
          className={cn("min-h-0 flex-1 space-y-4 px-3 pb-4", snap === "peek" && drag === null ? "overflow-hidden" : "overflow-y-auto overscroll-contain")}
        >
          {sections.map((s) =>
            s.items.length ? (
              <section key={s.key} aria-label={s.key}>
                {s.title}
                <div className={cn("space-y-3", s.className)}>
                  {s.items.map((r) => (
                    <div
                      key={r.id}
                      id={`map-card-${r.id}`}
                      className={cn(
                        "rounded-card transition",
                        r.id === selectedId && "ring-2 ring-accent-500 ring-offset-2 ring-offset-paper",
                      )}
                      onMouseEnter={() => setSelectedId(r.id)}
                    >
                      {renderCard(r)}
                    </div>
                  ))}
                </div>
              </section>
            ) : null,
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

/* ---------------------------- Mapbox canvas ---------------------------- */

type CanvasProps = {
  requests: OpenHouseRequest[];
  me: User;
  radiusMiles: number;
  restrictedReasons: Map<string, string>;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
};

function MapboxCanvas({ requests, me, radiusMiles, restrictedReasons, selectedId, onSelect, bottomPad }: CanvasProps & { bottomPad: number }) {
  const { resolved } = useTheme();
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);
  const markers = useRef<Map<string, { marker: Marker; el: HTMLElement }>>(new Map());
  const [ready, setReady] = useState(false);
  const onSelectRef = useRef(onSelect);
  useEffect(() => {
    onSelectRef.current = onSelect;
  });

  // Init once
  useEffect(() => {
    let cancelled = false;
    let map: MapboxMap | undefined;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !ref.current) return;
      mapboxgl.accessToken = TOKEN!;
      map = new mapboxgl.Map({
        container: ref.current,
        style: `mapbox://styles/mapbox/${resolved}-v11`,
        center: [me.homeLng, me.homeLat],
        zoom: 10.5,
        attributionControl: true,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (cancelled) return;
        map!.addSource("radius", { type: "geojson", data: circlePolygon(me.homeLat, me.homeLng, radiusMiles) });
        map!.addLayer({ id: "radius-fill", type: "fill", source: "radius", paint: { "fill-color": "#1f7a6d", "fill-opacity": 0.08 } });
        map!.addLayer({ id: "radius-line", type: "line", source: "radius", paint: { "line-color": "#1f7a6d", "line-width": 1.5, "line-dasharray": [2, 2] } });
        const home = document.createElement("div");
        home.className = "h-4 w-4 rounded-full border-[3px] border-white bg-[#145a50] shadow-[0_0_0_6px_rgba(31,122,109,0.25)]";
        new mapboxgl.Marker({ element: home }).setLngLat([me.homeLng, me.homeLat]).addTo(map!);
        setReady(true);
      });
      map.on("click", () => onSelectRef.current(null));
      mapRef.current = map;
    })();
    const live = markers.current;
    return () => {
      cancelled = true;
      live.forEach(({ marker }) => marker.remove());
      live.clear();
      map?.remove();
      mapRef.current = null;
      setReady(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [me.homeLat, me.homeLng, resolved]);

  // Radius + fit
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    (map.getSource("radius") as GeoJSONSource | undefined)?.setData(circlePolygon(me.homeLat, me.homeLng, radiusMiles));
    const dLat = radiusMiles / MILES_PER_DEG_LAT;
    const dLng = dLat / Math.cos((me.homeLat * Math.PI) / 180);
    map.fitBounds(
      [
        [me.homeLng - dLng, me.homeLat - dLat],
        [me.homeLng + dLng, me.homeLat + dLat],
      ],
      { padding: { top: 150, left: 32, right: 32, bottom: bottomPad }, duration: 600 },
    );
  }, [ready, radiusMiles, me.homeLat, me.homeLng, bottomPad]);

  // Markers
  useEffect(() => {
    const map = mapRef.current;
    if (!ready || !map) return;
    let cancelled = false;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      const live = new Set(requests.map((r) => r.id));
      markers.current.forEach((m, id) => {
        if (!live.has(id)) {
          m.marker.remove();
          markers.current.delete(id);
        }
      });
      for (const r of requests) {
        const color = pinColor(r, restrictedReasons.has(r.id));
        let entry = markers.current.get(r.id);
        if (!entry) {
          const el = document.createElement("button");
          el.type = "button";
          el.setAttribute("aria-label", `${r.neighborhood} open house`);
          el.className = "grid h-7 w-7 place-items-center rounded-full border-2 border-white text-[11px] font-bold text-white shadow-lg transition-transform";
          el.addEventListener("click", (e) => {
            e.stopPropagation();
            onSelectRef.current(r.id);
          });
          const marker = new mapboxgl.Marker({ element: el }).setLngLat([r.lng, r.lat]).addTo(map);
          entry = { marker, el };
          markers.current.set(r.id, entry);
        }
        entry.el.style.background = color;
        entry.el.textContent = r.urgent ? "!" : "";
        entry.marker.setLngLat([r.lng, r.lat]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready, requests, restrictedReasons]);

  // Selection styling + pan
  useEffect(() => {
    markers.current.forEach(({ el }, id) => {
      const on = id === selectedId;
      el.style.transform = on ? "scale(1.35)" : "";
      el.style.zIndex = on ? "5" : "";
    });
    const r = requests.find((x) => x.id === selectedId);
    if (r && mapRef.current) mapRef.current.easeTo({ center: [r.lng, r.lat], duration: 400, padding: { bottom: bottomPad } });
  }, [selectedId, requests, bottomPad]);

  // mapbox-gl.css forces `position: relative` on the map element, so size it via a wrapper.
  return (
    <div className="absolute inset-0">
      <div ref={ref} className="h-full w-full" aria-label="Map of nearby open houses" />
    </div>
  );
}

/* ----------------------------- SVG fallback ----------------------------- */

const SIZE = 400;
const C = SIZE / 2;
const ROADS: [number, number, number, number][] = [
  [0, 90, 400, 130], [0, 210, 400, 190], [0, 310, 400, 330],
  [70, 0, 110, 400], [200, 0, 180, 400], [320, 0, 300, 400],
];

function SvgCanvas({ requests, me, radiusMiles, restrictedReasons, selectedId, onSelect }: CanvasProps) {
  const pins = useMemo(() => {
    const pts = requests.map((r) => ({
      r,
      x: (r.lng - me.homeLng) * MILES_PER_DEG_LAT * Math.cos((me.homeLat * Math.PI) / 180),
      y: (r.lat - me.homeLat) * MILES_PER_DEG_LAT,
    }));
    const far = Math.max(radiusMiles, ...pts.map((p) => Math.hypot(p.x, p.y)));
    const scale = (C - 28) / (far * 1.05);
    return { scale, items: pts.map((p) => ({ r: p.r, cx: C + p.x * scale, cy: C - p.y * scale })) };
  }, [requests, me.homeLat, me.homeLng, radiusMiles]);
  const ringR = radiusMiles * pins.scale;

  return (
    <svg
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      preserveAspectRatio="xMidYMin slice"
      className="absolute inset-0 h-full w-full"
      role="group"
      aria-label={`Map of ${requests.length} open houses within ${radiusMiles} miles of ${me.homeArea}`}
      onClick={() => onSelect(null)}
    >
      <rect width={SIZE} height={SIZE} fill="#eaf1ee" />
      <ellipse cx="320" cy="90" rx="60" ry="34" fill="#d3e6d5" />
      <ellipse cx="80" cy="330" rx="48" ry="28" fill="#d3e6d5" />
      <path d="M0 250 C 90 230, 140 290, 230 270 S 360 230, 400 250 L400 280 C 360 262, 290 300, 230 300 S 90 262, 0 282 Z" fill="#c7dfea" />
      {ROADS.map(([x1, y1, x2, y2], i) => (
        <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#fff" strokeWidth={i < 3 ? 5 : 4} opacity="0.9" />
      ))}
      <circle cx={C} cy={C} r={ringR} className="fill-brand-500/10 stroke-brand-600" strokeWidth="1.5" strokeDasharray="6 5" />
      <circle cx={C} cy={C} r="9" className="fill-brand-700/20" />
      <circle cx={C} cy={C} r="5" className="fill-brand-700 stroke-white" strokeWidth="2" />
      <text x={C} y={C + 22} textAnchor="middle" className="fill-brand-800 text-[11px] font-semibold">{me.homeArea}</text>
      {pins.items.map(({ r, cx, cy }) => {
        const active = r.id === selectedId;
        const fill = pinColor(r, restrictedReasons.has(r.id));
        return (
          <g
            key={r.id}
            transform={`translate(${cx} ${cy})`}
            role="button"
            tabIndex={0}
            aria-label={`${r.neighborhood}`}
            aria-pressed={active}
            className="cursor-pointer outline-none"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(r.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect(r.id);
              }
            }}
          >
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
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-1 rounded-full bg-surface/90 px-2 py-0.5 shadow-sm">
      <span className="h-2 w-2 rounded-full" style={{ background: color }} />
      {label}
    </span>
  );
}
