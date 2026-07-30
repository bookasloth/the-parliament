// Per-tier upgrade checkout: /upgrade/associate | premium | life.
// Reached from the navbar "Upgrade to X" button (student→associate→premium→life).
// Server component: loads the viewer's profile + current plan, then hands off to the
// interactive 3-column checkout (profile · plan · price breakdown).

import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { getCurrent } from "@/modules/membership/service"
import { PURCHASABLE_PLANS, type PlanCode } from "@/config/membership"
import UpgradeCheckout from "./UpgradeCheckout"

export default async function UpgradePage({ params }: { params: Promise<{ type: string }> }) {
  const { type } = await params
  if (!(PURCHASABLE_PLANS as string[]).includes(type)) notFound()
  const target = type as "associate" | "premium" | "life"

  const user = await requireUser()
  const [dbUser, current] = await Promise.all([
    prisma.user.findUnique({
      where: { id: user.id },
      select: {
        displayName: true,
        legalName: true,
        username: true,
        passOutYear: true,
        profile: {
          select: {
            photoUrl: true,
            coverUrl: true,
            headline: true,
            house: { select: { name: true, colorHex: true } },
            batch: { select: { label: true } },
          },
        },
      },
    }),
    getCurrent(user.id),
  ])

  const profile = {
    name: dbUser?.displayName || dbUser?.legalName || "Member",
    username: dbUser?.username ?? null,
    photoUrl: dbUser?.profile?.photoUrl ?? null,
    coverUrl: dbUser?.profile?.coverUrl ?? null,
    headline: dbUser?.profile?.headline ?? null,
    houseName: dbUser?.profile?.house?.name ?? null,
    houseColor: dbUser?.profile?.house?.colorHex ?? null,
    batchLabel: dbUser?.profile?.batch?.label ?? (dbUser?.passOutYear ? String(dbUser.passOutYear) : null),
  }

  return <UpgradeCheckout target={target} profile={profile} currentPlan={current.planCode as PlanCode} />
}
