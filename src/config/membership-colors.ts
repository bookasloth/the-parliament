// Single source of truth for membership tier visuals.
// Consumers: PrivateNavbar (inline style), AlumniProfileCard (class-string), etc.

export type MembershipTier =
  | "student"
  | "associate"
  | "premium"
  | "life"
  | "inactive"
  | "committee";

export interface TierMeta {
  label: string;
  /** Raw CSS `background` value (use as inline style). */
  background: string;
  /** Solid accent hex — safe for `color`/`fill`/`border` where a gradient can't be used. */
  accent: string;
  /** Tailwind text-color class for text placed over this background. */
  textClass: string;
  /** Next tier in the upgrade flow, or null if terminal. */
  next: MembershipTier | null;
}

/** Verified-seal fill per membership tier — the SINGLE source shared by the feed
 *  VerifiedBadge and the standalone VerifiedTick, so a verified member's badge is
 *  the same colour everywhere (feed, profile, messages, cards). life = gold,
 *  premium/associate/committee = blue, student = green. Unknown → brand blue. */
export const VERIFIED_SEAL_COLORS: Record<string, string> = {
  life: "#E0A400",
  student: "#16A34A",
  premium: "#009ae4",
  associate: "#009ae4",
  committee: "#009ae4",
  inactive: "#94a3b8",
};

export const DEFAULT_SEAL_COLOR = "#009ae4";

/** Verified-seal colour for a tier, falling back to brand blue. */
export function verifiedSealColor(tier: string | null | undefined): string {
  return (tier && VERIFIED_SEAL_COLORS[tier]) || DEFAULT_SEAL_COLOR;
}

export const MEMBERSHIP_TIERS: Record<MembershipTier, TierMeta> = {
  student: {
    label: "Student",
    background: "radial-gradient(circle at 50% 50%, #81C784 20%, #4CAF50 80%)",
    accent: "#4CAF50",
    textClass: "text-white",
    next: "associate",
  },
  associate: {
    label: "Associate",
    background: "#2196F3",
    accent: "#2196F3",
    textClass: "text-white",
    next: "premium",
  },
  premium: {
    label: "Premium",
    background: "#0080ae",
    accent: "#0080ae",
    textClass: "text-white",
    next: "life",
  },
  life: {
    label: "Life",
    background: "radial-gradient(circle at 50% 50%, #FFD700 0%, #B8860B 70%, #4B3B00 100%)",
    accent: "#B8860B",
    textClass: "text-white",
    next: null,
  },
  inactive: {
    label: "Inactive",
    background: "#b0b0b0",
    accent: "#b0b0b0",
    textClass: "text-white",
    next: "associate",
  },
  committee: {
    label: "Committee",
    background:
      "linear-gradient(to right, #FFB3AE 20%, #AECBFF 40%, #B8E2B3 60%, #FFF5B8 80%)",
    accent: "#8FA9D9",
    textClass: "text-gray-800",
    next: null,
  },
};
