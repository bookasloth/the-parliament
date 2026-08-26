import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { optionalUser } from "@/modules/auth/session"
import { TierLanding } from "../tier-landing"

export const metadata: Metadata = {
  title: "Life Member — NNAWCA Membership",
  description:
    "Life Member, ₹9,999 once: every Premium benefit for life, the longest calls, 10 GB storage, eligibility for the NNAWCA Committee, and a lifetime certificate. Never renews.",
}

export default async function LifeLandingPage() {
  const [memberCount, session] = await Promise.all([
    prisma.user.count({ where: { status: "active", deletedAt: null } }).catch(() => 0),
    optionalUser(),
  ])
  return <TierLanding tier="life" memberCount={memberCount} guest={!session?.id} />
}
