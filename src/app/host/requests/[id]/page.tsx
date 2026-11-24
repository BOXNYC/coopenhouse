"use client";
import { useParams } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

// TODO(screen-agent): replace this entire file with the real screen.
export default function Page() {
  const { id } = useParams<{ id: string }>();
  return (
    <AppShell role="host" title="Request detail" back="/host">
      <Card>
        <p className="text-sm text-ink-soft">Placeholder for Request detail (request {id}).</p>
      </Card>
    </AppShell>
  );
}
