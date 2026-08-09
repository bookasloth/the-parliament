/**
 * Sponsor tiers for the /development wall. Single source of truth — imported by
 * the checkout route, the verify route, and the client modal so the minimums can
 * never drift apart. RGBY accents (0 blue · 1 red · 2 yellow · 3 green).
 *
 * ponytail: edit the minimums here and everywhere (page, modal, server guard)
 * follows. No DB — a paid sponsor's name rides in the Razorpay order notes; the
 * team adds it to the wall arrays in the page. Add a Sponsor table only when you
 * want names to appear instantly without a human in the loop.
 */

export type SponsorTier = "silver" | "gold" | "platinum"

export interface TierDef {
  id: SponsorTier
  label: string
  minPaise: number
  accent: 0 | 1 | 2 | 3
  hasLogo: boolean
  blurb: string
  perks: string[]
}

export const SPONSOR_TIERS: TierDef[] = [
  {
    id: "platinum",
    label: "Platinum",
    minPaise: 250_000, // ₹2,500
    accent: 0,
    hasLogo: true,
    blurb: "For companies backing the platform.",
    perks: ["Company logo on this page", "Top billing, largest size", "Link to your website", "A thank-you in the release notes"],
  },
  {
    id: "gold",
    label: "Gold",
    minPaise: 50_000, // ₹500
    accent: 2,
    hasLogo: false,
    blurb: "For alumni who want to give a little more.",
    perks: ["Your name on the wall", "Gold highlight", "Our lasting thanks"],
  },
  {
    id: "silver",
    label: "Silver",
    minPaise: 10_000, // ₹100
    accent: 3,
    hasLogo: false,
    blurb: "Add your name, keep the lights on.",
    perks: ["Your name on the wall", "Our lasting thanks"],
  },
]

const MAX_PAISE = 100_000_00 // ₹1,00,000 sanity cap

export function tierById(id: string): TierDef | undefined {
  return SPONSOR_TIERS.find((t) => t.id === id)
}

export const rupees = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN")}`

/** Amount must be a positive integer paise value within [tier.min, cap]. */
export function validateSponsorAmount(
  tierId: string,
  paise: number,
): { ok: true; tier: TierDef } | { ok: false; error: string } {
  const tier = tierById(tierId)
  if (!tier) return { ok: false, error: "Unknown tier" }
  if (!Number.isInteger(paise) || paise <= 0) return { ok: false, error: "Enter a valid amount" }
  if (paise < tier.minPaise) return { ok: false, error: `${tier.label} needs at least ${rupees(tier.minPaise)}` }
  if (paise > MAX_PAISE) return { ok: false, error: `That's over the ${rupees(MAX_PAISE)} limit — contact us directly` }
  return { ok: true, tier }
}

// ── Contributions (recipient: NNAWCA) ────────────────────────────────────────

export type ContributorKind = "individual" | "company"

/** Wall tier from who's giving + how much. Companies are always Platinum (logo). */
export function deriveTier(kind: ContributorKind, paise: number): SponsorTier {
  if (kind === "company") return "platinum"
  return paise >= tierById("gold")!.minPaise ? "gold" : "silver"
}

/** Floor to be listed on the wall — the Silver minimum. */
export const MIN_CONTRIBUTION_PAISE = tierById("silver")!.minPaise

/**
 * Validate a contribution and derive its wall tier. Companies must clear the
 * Platinum minimum (logo placement); individuals must clear Silver. Same cap.
 */
export function validateContribution(
  kind: string,
  paise: number,
): { ok: true; tier: SponsorTier } | { ok: false; error: string } {
  if (kind !== "individual" && kind !== "company") return { ok: false, error: "Unknown contributor kind" }
  if (!Number.isInteger(paise) || paise <= 0) return { ok: false, error: "Enter a valid amount" }
  const floor = kind === "company" ? tierById("platinum")!.minPaise : MIN_CONTRIBUTION_PAISE
  if (paise < floor) {
    const label = kind === "company" ? "Company sponsors" : "Contributions"
    return { ok: false, error: `${label} start at ${rupees(floor)}` }
  }
  if (paise > MAX_PAISE) return { ok: false, error: `That's over the ${rupees(MAX_PAISE)} limit — contact us directly` }
  return { ok: true, tier: deriveTier(kind, paise) }
}
