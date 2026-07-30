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
  /** Tailwind text-color class for text placed over this background. */
  textClass: string;
  /** Next tier in the upgrade flow, or null if terminal. */
  next: MembershipTier | null;
}

export const MEMBERSHIP_TIERS: Record<MembershipTier, TierMeta> = {
  student: {
    label: "Student",
    background: "radial-gradient(circle at 50% 50%, #81C784 20%, #4CAF50 80%)",
    textClass: "text-white",
    next: "associate",
  },
  associate: {
    label: "Associate",
    background: "#2196F3",
    textClass: "text-white",
    next: "premium",
  },
  premium: {
    label: "Premium",
    background: "#0080ae",
    textClass: "text-white",
    next: "life",
  },
  life: {
    label: "Life",
    background: "radial-gradient(circle at 50% 50%, #FFD700 0%, #B8860B 70%, #4B3B00 100%)",
    textClass: "text-white",
    next: null,
  },
  inactive: {
    label: "Inactive",
    background: "#b0b0b0",
    textClass: "text-white",
    next: "associate",
  },
  committee: {
    label: "Committee",
    background:
      "linear-gradient(to right, #FFB3AE 20%, #AECBFF 40%, #B8E2B3 60%, #FFF5B8 80%)",
    textClass: "text-gray-800",
    next: null,
  },
};
