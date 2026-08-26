import type { Metadata } from "next"
import { TierLanding } from "../tier-landing"

export const metadata: Metadata = {
  title: "Life Member — NNAWCA Membership",
  description:
    "Life Member, ₹9,999 once: every Premium benefit for life, the longest calls, 10 GB storage, eligibility for the NNAWCA Committee, and a lifetime certificate. Never renews.",
}

export default function LifeLandingPage() {
  return <TierLanding tier="life" />
}
