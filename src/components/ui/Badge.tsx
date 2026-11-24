import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { Badges, BadgeKind } from "@/lib/types";
import { BuildingIcon, IdCardIcon, ShieldCheckIcon } from "./icons";

export type Tone = "neutral" | "brand" | "accent" | "success" | "warn" | "danger" | "violet" | "sky";

export const toneClasses: Record<Tone, string> = {
  neutral: "bg-black/5 text-ink-soft",
  brand: "bg-brand-50 text-brand-800",
  accent: "bg-accent-50 text-accent-700",
  success: "bg-success-50 text-success-700",
  warn: "bg-warn-50 text-warn-700",
  danger: "bg-danger-50 text-danger-700",
  violet: "bg-violet-50 text-violet-600",
  sky: "bg-sky-50 text-sky-600",
};

export function Badge({ tone = "neutral", icon, size = "md", className, children }: { tone?: Tone; icon?: ReactNode; size?: "sm" | "md"; className?: string; children: ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap", size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs", toneClasses[tone], className)}>
      {icon}
      {children}
    </span>
  );
}

const VERIF: Record<BadgeKind, { label: string; Icon: typeof ShieldCheckIcon }> = {
  license: { label: "License verified", Icon: ShieldCheckIcon },
  brokerage: { label: "Brokerage verified", Icon: BuildingIcon },
  id: { label: "ID verified", Icon: IdCardIcon },
};

export function VerificationBadge({ kind, verified = true, compact }: { kind: BadgeKind; verified?: boolean; compact?: boolean }) {
  const { label, Icon } = VERIF[kind];
  const short = label.replace(" verified", "");
  return (
    <span
      title={verified ? label : `${short} not verified`}
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap",
        compact ? "px-1.5 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        verified ? "bg-success-50 text-success-700" : "bg-black/5 text-muted line-through decoration-muted/40",
      )}
    >
      <Icon size={compact ? 13 : 15} />
      {compact ? short : verified ? label : `${short} unverified`}
    </span>
  );
}

export function VerificationBadges({ badges, compact, showMissing }: { badges: Badges; compact?: boolean; showMissing?: boolean }) {
  const kinds: BadgeKind[] = ["license", "brokerage", "id"];
  const list = showMissing ? kinds : kinds.filter((k) => badges[k]);
  if (list.length === 0) {
    return <Badge tone="warn" size={compact ? "sm" : "md"}>Not yet verified</Badge>;
  }
  return (
    <span className="inline-flex flex-wrap gap-1.5">
      {list.map((k) => (
        <VerificationBadge key={k} kind={k} verified={badges[k]} compact={compact} />
      ))}
    </span>
  );
}
