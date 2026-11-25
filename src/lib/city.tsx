"use client";
// Current-city hook. The city is the first URL segment (validated by app/[city]/layout.tsx).
import { usePathname } from "next/navigation";
import { useCallback } from "react";
import { cityFromPath, cityPath, DEFAULT_CITY, getCity, type CityConfig, type CityKey } from "./cities";

export interface CityValue {
  key: CityKey;
  city: CityConfig;
  /** City-scoped path builder: path("/host") -> "/nyc/host". */
  path: (p?: string) => string;
}

export function useCity(): CityValue {
  const pathname = usePathname();
  const key = cityFromPath(pathname) ?? DEFAULT_CITY;
  const path = useCallback((p: string = "/") => cityPath(key, p), [key]);
  return { key, city: getCity(key), path };
}

const CITY_STORAGE = "coopenhouse.city.v1";
export function rememberCity(key: CityKey): void {
  try {
    window.localStorage.setItem(CITY_STORAGE, key);
  } catch {
    // ignore
  }
}
export function forgetCity(): void {
  try {
    window.localStorage.removeItem(CITY_STORAGE);
  } catch {
    // ignore
  }
}
export function recallCity(): CityKey | null {
  try {
    const v = window.localStorage.getItem(CITY_STORAGE);
    return v === "austin" || v === "nyc" ? v : null;
  } catch {
    return null;
  }
}
