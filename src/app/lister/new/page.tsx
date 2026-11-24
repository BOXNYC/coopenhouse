import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

// TODO(screen-agent): replace this entire file with the real create-request flow.
export default function Page() {
  return (
    <AppShell role="lister" title="New request" back="/lister">
      <Card>
        <p className="text-sm text-ink-soft">Placeholder for the new request flow.</p>
      </Card>
    </AppShell>
  );
}
