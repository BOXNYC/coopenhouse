import { AppShell } from "@/components/AppShell";
import { Card } from "@/components/ui/Card";

// TODO(screen-agent): replace this entire file with the real host feed.
export default function Page() {
  return (
    <AppShell role="host" title="Nearby open houses">
      <Card>
        <p className="text-sm text-ink-soft">Placeholder for the host feed.</p>
      </Card>
    </AppShell>
  );
}
