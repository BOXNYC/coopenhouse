// City registry: the pilot markets. The city key is the first segment of every app URL
// (/austin/host, /nyc/lister/new, ...). Pure module (no React) so it can be used anywhere.

export type CityKey = "austin" | "nyc";

export interface LatLng {
  lat: number;
  lng: number;
}

export interface CityConfig {
  key: CityKey;
  name: string;
  /** Short label for tight spaces (switchers). */
  shortName: string;
  state: string;
  /** Name of the city proper as stored on listings (e.g. "New York"). */
  cityName: string;
  tagline: string;
  center: LatLng;
  zoom: number;
  /** Default home area for new accounts / users with no home in this city. */
  defaultHome: { area: string; lat: number; lng: number };
  /** Rough bounding box [west, south, east, north]. */
  bounds: [number, number, number, number];
  neighborhoods: Record<string, LatLng>;
  phoneAreaCode: string;
}

export const CITIES: Record<CityKey, CityConfig> = {
  austin: {
    key: "austin",
    name: "Austin, TX",
    shortName: "Austin",
    state: "TX",
    cityName: "Austin",
    tagline: "Bungalows, condos and Hill Country homes.",
    center: { lat: 30.2672, lng: -97.7431 },
    zoom: 10.5,
    defaultHome: { area: "Austin", lat: 30.2672, lng: -97.7431 },
    bounds: [-98.0, 30.05, -97.5, 30.55],
    phoneAreaCode: "512",
    neighborhoods: {
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
    },
  },
  nyc: {
    key: "nyc",
    name: "New York City",
    shortName: "NYC",
    state: "NY",
    cityName: "New York",
    tagline: "Co-ops, condos and brownstones across the five boroughs.",
    center: { lat: 40.7306, lng: -73.9866 },
    zoom: 10.8,
    defaultHome: { area: "Manhattan", lat: 40.7306, lng: -73.9866 },
    bounds: [-74.26, 40.49, -73.7, 40.92],
    phoneAreaCode: "212",
    neighborhoods: {
      "Upper West Side": { lat: 40.787, lng: -73.9754 },
      "Upper East Side": { lat: 40.7736, lng: -73.9566 },
      "Harlem": { lat: 40.8116, lng: -73.9465 },
      "Chelsea": { lat: 40.7465, lng: -74.0014 },
      "Greenwich Village": { lat: 40.7336, lng: -74.0027 },
      "SoHo": { lat: 40.7233, lng: -74.003 },
      "Tribeca": { lat: 40.7163, lng: -74.0086 },
      "Williamsburg": { lat: 40.7081, lng: -73.9571 },
      "Brooklyn Heights": { lat: 40.696, lng: -73.9936 },
      "Park Slope": { lat: 40.671, lng: -73.9814 },
      "Long Island City": { lat: 40.7447, lng: -73.9485 },
      "Astoria": { lat: 40.7644, lng: -73.9235 },
    },
  },
};

export const CITY_KEYS = Object.keys(CITIES) as CityKey[];
export const DEFAULT_CITY: CityKey = "austin";

export function isCityKey(v: string | null | undefined): v is CityKey {
  return !!v && Object.prototype.hasOwnProperty.call(CITIES, v);
}

export function getCity(key: string | null | undefined): CityConfig {
  return isCityKey(key) ? CITIES[key] : CITIES[DEFAULT_CITY];
}

/** City key from a pathname like "/nyc/host", or null (home, login, unknown). */
export function cityFromPath(pathname: string): CityKey | null {
  const seg = pathname.split("/")[1];
  return isCityKey(seg) ? seg : null;
}

/** Pathname without its city prefix: "/nyc/host/requests/x" -> "/host/requests/x"; "/nyc" -> "/". */
export function stripCity(pathname: string): string {
  if (!cityFromPath(pathname)) return pathname;
  const rest = pathname.slice(pathname.indexOf("/", 1) === -1 ? pathname.length : pathname.indexOf("/", 1));
  return rest || "/";
}

/** Build a city-scoped app path: cityPath("nyc", "/host") -> "/nyc/host". "/" -> "/nyc". */
export function cityPath(city: CityKey, path: string = "/"): string {
  const p = path.startsWith("/") ? path : `/${path}`;
  return p === "/" ? `/${city}` : `/${city}${p}`;
}

/** Every neighborhood across all cities (names are unique), for coordinate lookup. */
export const ALL_NEIGHBORHOODS: Record<string, LatLng> = Object.assign({}, ...CITY_KEYS.map((k) => CITIES[k].neighborhoods));
