import { NextRequest } from "next/server"
import { z } from "zod"
import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { acceptCommitteeInvite, declineCommitteeInvite } from "@/modules/membership/admin"

const schema = z.object({
  inviteId: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
})

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser()
    const { inviteId, action } = schema.parse(await req.json())
    if (action === "accept") {
      const r = await acceptCommitteeInvite({ inviteId, targetUserId: user.id })
      return ok({ membershipId: r.membershipId })
    }
    await declineCommitteeInvite({ inviteId, targetUserId: user.id })
    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
