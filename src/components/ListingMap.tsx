"use client";
import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef } from "react";
import type { GeoJSONSource, Map as MapboxMap } from "mapbox-gl";
import { cn } from "@/lib/cn";
import { LockIcon } from "@/components/ui/icons";

const TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const MILES_PER_DEG_LAT = 69;
const APPROX_MILES = 0.45;

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function circle(lat: number, lng: number, miles: number) {
  const dLat = miles / MILES_PER_DEG_LAT;
  const dLng = dLat / Math.cos((lat * Math.PI) / 180);
  const pts: [number, number][] = [];
  for (let i = 0; i <= 64; i++) {
    const a = (i / 64) * Math.PI * 2;
    pts.push([lng + Math.cos(a) * dLng, lat + Math.sin(a) * dLat]);
  }
  return { type: "Feature" as const, properties: {}, geometry: { type: "Polygon" as const, coordinates: [pts] } };
}

/**
 * Map for a single listing. `precise` shows the exact pin; otherwise only an
 * approximate area is drawn (full address is withheld until a host applies, §5.2).
 */
export function ListingMap({
  id,
  lat,
  lng,
  precise,
  className,
}: {
  id: string;
  lat: number;
  lng: number;
  precise: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapboxMap | null>(null);

  // Deterministic offset so the approximate circle doesn't sit exactly on the house.
  const h = hash(id);
  const off = 0.12 + (h % 100) / 100 * 0.18; // miles
  const ang = ((h >> 3) % 360) * (Math.PI / 180);
  const cLat = precise ? lat : lat + (Math.sin(ang) * off) / MILES_PER_DEG_LAT;
  const cLng = precise ? lng : lng + (Math.cos(ang) * off) / MILES_PER_DEG_LAT / Math.cos((lat * Math.PI) / 180);

  useEffect(() => {
    if (!TOKEN) return;
    let cancelled = false;
    let map: MapboxMap | undefined;
    (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled || !ref.current) return;
      mapboxgl.accessToken = TOKEN;
      map = new mapboxgl.Map({
        container: ref.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: [cLng, cLat],
        zoom: precise ? 15 : 13.4,
        cooperativeGestures: true,
      });
      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      map.on("load", () => {
        if (precise) {
          const el = document.createElement("div");
          el.className = "h-5 w-5 rounded-full border-[3px] border-white bg-[#e8833a] shadow-[0_0_0_8px_rgba(232,131,58,0.28)]";
          new mapboxgl.Marker({ element: el }).setLngLat([cLng, cLat]).addTo(map!);
        } else {
          map!.addSource("area", { type: "geojson", data: circle(cLat, cLng, APPROX_MILES) });
          map!.addLayer({ id: "area-fill", type: "fill", source: "area", paint: { "fill-color": "#e8833a", "fill-opacity": 0.18 } });
          map!.addLayer({ id: "area-line", type: "line", source: "area", paint: { "line-color": "#e8833a", "line-width": 2 } });
        }
      });
      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      map?.remove();
      mapRef.current = null;
    };
  }, [cLat, cLng, precise]);

  return (
    <div className={cn("relative h-48 overflow-hidden bg-[#eaf1ee]", className)}>
      {TOKEN ? (
        // mapbox-gl.css forces `position: relative` on the map element, so size it via a wrapper.
        <div className="absolute inset-0">
          <div ref={ref} className="h-full w-full" role="img" aria-label={precise ? "Map of the listing" : "Map of the approximate listing area"} />
        </div>
      ) : (
        <svg viewBox="0 0 400 200" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full" role="img" aria-label="Illustrative map">
          <rect width="400" height="200" fill="#eaf1ee" />
          <path d="M0 130 C 90 110, 150 160, 240 140 S 360 100, 400 120 L400 150 C 360 132, 290 170, 240 170 S 90 132, 0 160 Z" fill="#c7dfea" />
          {[[0, 50, 400, 70], [0, 100, 400, 90], [90, 0, 110, 200], [250, 0, 230, 200]].map(([a, b, c, d], i) => (
            <line key={i} x1={a} y1={b} x2={c} y2={d} stroke="#fff" strokeWidth="5" />
          ))}
          {precise ? (
            <circle cx="200" cy="95" r="9" fill="#e8833a" stroke="#fff" strokeWidth="3" />
          ) : (
            <circle cx="200" cy="95" r="48" fill="#e8833a" fillOpacity="0.2" stroke="#e8833a" strokeWidth="2" />
          )}
        </svg>
      )}
      {!precise && (
        <p className="pointer-events-none absolute bottom-2 left-2 flex items-center gap-1 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-medium text-brand-800 shadow-sm">
          <LockIcon size={12} /> Approximate area. Exact pin unlocks when you apply.
        </p>
      )}
    </div>
  );
}
