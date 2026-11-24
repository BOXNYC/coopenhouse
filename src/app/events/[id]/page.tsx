"use client";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

// TODO(screen-agent): replace this entire file with the real screen.
export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell title="Day of event" back="/">
      <Card>
        <p className="text-sm text-ink-soft">Placeholder for Day of event (request {id}).</p>
      </Card>
    </AppShell>
  );
}
