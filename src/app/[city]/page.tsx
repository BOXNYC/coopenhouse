"use client";
// City entry point: send signed-in users to their mode home in this city, others to login for this city.
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homeFor, useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";

export default function CityEntry() {
  const { ready, currentUser, mode } = useAuth();
  const { key } = useCity();
  const router = useRouter();
  useEffect(() => {
    if (!ready) return;
    router.replace(currentUser && mode ? homeFor(mode, key) : `/login?city=${key}`);
  }, [ready, currentUser, mode, key, router]);
  return <div className="flex-1 animate-pulse bg-paper" aria-busy="true" />;
}
