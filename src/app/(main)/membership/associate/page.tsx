import type { Metadata } from "next"
import { prisma } from "@/lib/prisma"
import { optionalUser } from "@/modules/auth/session"
import { TierLanding } from "../tier-landing"

export const metadata: Metadata = {
  title: "Alumni Associate — NNAWCA Membership",
  description:
    "Alumni Associate, ₹499/year: the full JNV Nagpur alumni network plus jobs, included video calling, more storage, and fewer ads. A contribution to NNAWCA.",
}

export default async function AssociateLandingPage() {
  const [memberCount, session] = await Promise.all([
    prisma.user.count({ where: { status: "active", deletedAt: null } }).catch(() => 0),
    optionalUser(),
  ])
  return <TierLanding tier="associate" memberCount={memberCount} guest={!session?.id} />
}
