import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { optionalUser } from "@/modules/auth/session"
import { TierLanding } from "../tier-landing"

export const metadata: Metadata = {
  title: "Alumni Premium — NNAWCA Membership",
  description:
    "Alumni Premium, ₹999/year: an ad-free feed, a highlighted profile, your own business listing, longer calls, 5 GB storage, and a yearly certificate. A contribution to NNAWCA.",
}

export default async function PremiumLandingPage() {
  const [memberCount, session] = await Promise.all([
    prisma.user.count({ where: { status: "active", deletedAt: null } }).catch(() => 0),
    optionalUser(),
  ])
  return <TierLanding tier="premium" memberCount={memberCount} guest={!session?.id} />
}
