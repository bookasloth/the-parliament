import type { Metadata } from "next"
import { TierLanding } from "../tier-landing"

export const metadata: Metadata = {
  title: "Alumni Premium — NNAWCA Membership",
  description:
    "Alumni Premium, ₹999/year: an ad-free feed, a highlighted profile, your own business listing, longer calls, 5 GB storage, and a yearly certificate. A contribution to NNAWCA.",
}

export default function PremiumLandingPage() {
  return <TierLanding tier="premium" />
}
