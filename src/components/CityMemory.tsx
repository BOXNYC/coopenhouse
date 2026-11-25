"use client";
import { useEffect } from "react";
import type { CityKey } from "@/lib/cities";
import { rememberCity } from "@/lib/city";

/** Remembers the last visited city so /login can return to it. Renders nothing. */
export function CityMemory({ city }: { city: CityKey }) {
  useEffect(() => rememberCity(city), [city]);
  return null;
}
