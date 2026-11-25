"use client";
import { AppShell } from "@/components/AppShell";
import { TrustCard } from "@/components/TrustCard";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/Toast";
import { getHostAvailability, updateAvailability, updateUser } from "@/lib/api";
import { Tabs } from "@/components/ui/Tabs";
import { useAuth } from "@/lib/auth";
import { forgetCity, useCity } from "@/lib/city";
import { userInCity } from "@/lib/rules";
import { useAsync, useMutation } from "@/lib/hooks";
import { cn } from "@/lib/cn";
import { formatCurrency } from "@/lib/format";
import { LogoutIcon } from "@/components/ui/icons";
import { useRouter } from "next/navigation";

const DAYS = ["S", "M", "T", "W", "T", "F", "S"];

export default function ProfilePage() {
  const { currentUser, mode, logout } = useAuth();
  const router = useRouter();
  const { key: cityKey } = useCity();
  const toast = useToast();
  const avail = useAsync(() => getHostAvailability(currentUser!.id), `avail:${currentUser?.id}`, { enabled: !!currentUser && mode === "host" });
  const saveMode = useMutation(updateUser, { onSuccess: () => toast.success("Default view saved") });
  const save = useMutation(updateAvailability, { onSuccess: () => toast.success("Availability updated") });

  return (
    <AppShell title="Profile">
      {currentUser && (
        <div className="space-y-5">
          <TrustCard user={currentUser} variant="expanded" />

          <section>
            <SectionTitle>Default view</SectionTitle>
            <Card>
              <p className="mb-3 text-sm text-ink-soft">Which view opens when you sign in. You can switch any time from the header.</p>
              <Tabs
                tabs={[{ id: "lister" as const, label: "Lister" }, { id: "host" as const, label: "Host" }]}
                value={currentUser.defaultMode}
                onChange={(m) => saveMode.mutate(currentUser.id, { defaultMode: m })}
              />
            </Card>
          </section>

          {mode === "host" && (
            <section id="availability">
              <SectionTitle>Availability and radius</SectionTitle>
              <Card>
                {avail.loading || !avail.data ? (
                  <Skeleton className="h-24 w-full" />
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-ink-soft">
                      Home area <strong>{userInCity(currentUser, cityKey).homeArea}</strong>, within <strong>{currentUser.radiusMiles} miles</strong>.
                    </p>
                    <div>
                      <p className="mb-2 text-sm font-medium">Preferred days</p>
                      <div className="flex gap-1.5">
                        {DAYS.map((d, i) => {
                          const on = avail.data!.days.includes(i);
                          return (
                            <button
                              key={i}
                              onClick={() => save.mutate(currentUser.id, { days: on ? avail.data!.days.filter((x) => x !== i) : [...avail.data!.days, i] })}
                              className={cn("h-10 flex-1 rounded-lg text-sm font-semibold transition", on ? "bg-brand-700 text-white" : "bg-ink/[0.06] text-muted")}
                              aria-pressed={on}
                            >
                              {d}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <p className="text-sm text-ink-soft">
                      {avail.data.startHour % 12 || 12}
                      {avail.data.startHour < 12 ? "am" : "pm"} to {avail.data.endHour % 12 || 12}
                      {avail.data.endHour < 12 ? "am" : "pm"} · Minimum offer: {avail.data.minOffer === "any" ? "any" : avail.data.minOffer}
                      {avail.data.minFlatFee ? ` (${formatCurrency(avail.data.minFlatFee)}+)` : ""}
                    </p>
                    <label className="flex items-center justify-between text-sm font-medium">
                      Alerts for matching requests
                      <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={avail.data.alertsEnabled} onChange={(e) => save.mutate(currentUser.id, { alertsEnabled: e.target.checked })} />
                    </label>
                  </div>
                )}
              </Card>
            </section>
          )}

          <Button
            variant="outline"
            fullWidth
            icon={<LogoutIcon size={18} />}
            onClick={() => {
              logout();
              forgetCity();
              router.push("/login");
            }}
          >
            Sign out
          </Button>
        </div>
      )}
    </AppShell>
  );
}
