import type { Metadata } from "next"
import { TierLanding } from "../tier-landing"

export const metadata: Metadata = {
  title: "Alumni Associate — NNAWCA Membership",
  description:
    "Alumni Associate, ₹499/year: the full JNV Nagpur alumni network plus jobs, included video calling, more storage, and fewer ads. A contribution to NNAWCA.",
}

export default function AssociateLandingPage() {
  return <TierLanding tier="associate" />
}
