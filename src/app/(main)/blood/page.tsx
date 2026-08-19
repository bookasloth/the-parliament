import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import BloodClient, { type BloodPrefill } from "./blood-client"

export const dynamic = "force-dynamic"

export default async function BloodPage() {
  const u = await requireUser()
  const me = await prisma.user.findUnique({
    where: { id: u.id },
    select: {
      displayName: true,
      legalName: true,
      mobileE164: true,
      profile: { select: { city: true, bloodGroup: true } },
    },
  })

  const prefill: BloodPrefill = {
    name: me?.displayName || me?.legalName || "",
    city: me?.profile?.city || "",
    contact: me?.mobileE164 || "",
    myGroup: me?.profile?.bloodGroup || "",
  }

  return <BloodClient prefill={prefill} />
}
