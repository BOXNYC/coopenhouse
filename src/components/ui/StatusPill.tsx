import type { RequestStatus } from "@/lib/types";
import { Badge, type Tone } from "./Badge";
import { BoltIcon } from "./icons";

export const STATUS_META: Record<RequestStatus, { label: string; tone: Tone }> = {
  draft: { label: "Draft", tone: "neutral" },
  open: { label: "Open", tone: "brand" },
  applied: { label: "Applicants", tone: "accent" },
  confirmed: { label: "Confirmed", tone: "success" },
  "checked-in": { label: "Checked in", tone: "success" },
  completed: { label: "Completed", tone: "sky" },
  settled: { label: "Settled", tone: "neutral" },
  "cancelled-lister": { label: "Cancelled by Lister", tone: "danger" },
  "cancelled-host": { label: "Cancelled by Host", tone: "danger" },
  expired: { label: "Expired", tone: "neutral" },
  disputed: { label: "Disputed", tone: "warn" },
};

export function StatusPill({ status, size = "md" }: { status: RequestStatus; size?: "sm" | "md" }) {
  const m = STATUS_META[status];
  return (
    <Badge tone={m.tone} size={size}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {m.label}
    </Badge>
  );
}

export function UrgentPill({ size = "md" }: { size?: "sm" | "md" }) {
  return (
    <Badge tone="danger" size={size} icon={<BoltIcon size={12} />}>
      Urgent
    </Badge>
  );
}
