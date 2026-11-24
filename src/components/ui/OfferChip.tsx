import type { Offer } from "@/lib/types";
import { offerLabel, offerShortLabel } from "@/lib/format";
import { Badge, type Tone } from "./Badge";
import { DollarIcon, LinkIcon, PercentIcon, SwapIcon } from "./icons";

export const OFFER_META = {
  lead: { tone: "brand" as Tone, Icon: LinkIcon, name: "Lead sharing", blurb: "Keep any buyer leads you meet. The Lister keeps the seller." },
  flat: { tone: "success" as Tone, Icon: DollarIcon, name: "Flat fee", blurb: "A fixed amount paid by the Lister." },
  referral: { tone: "violet" as Tone, Icon: PercentIcon, name: "Referral split", blurb: "Share a pre-agreed percent if a lead converts." },
  credit: { tone: "sky" as Tone, Icon: SwapIcon, name: "Favor swap", blurb: "Earn cover credits to spend when you need coverage." },
};

/** `variant="short"` shows "$100" / "25% referral"; "full" shows "$100 flat fee". */
export function OfferChip({ offer, variant = "short", size = "md" }: { offer: Offer; variant?: "short" | "full"; size?: "sm" | "md" }) {
  const { tone, Icon } = OFFER_META[offer.type];
  return (
    <Badge tone={tone} size={size} icon={<Icon size={size === "sm" ? 12 : 14} />}>
      {variant === "full" ? offerLabel(offer) : offerShortLabel(offer)}
    </Badge>
  );
}
