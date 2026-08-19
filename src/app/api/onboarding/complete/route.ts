import { after } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { handleError, ok } from "@/lib/api"
import { markComplete } from "@/modules/onboarding/service"
import { awardKarma } from "@/modules/karma/ledger"
import { KARMA } from "@/config/karma"
import { botWelcome } from "@/modules/bot/service"

export async function POST() {
  try {
    const user = await requireUser()
    await markComplete(user.id)
    await awardKarma({
      userId: user.id,
      actionType: "profile_complete",
      baseValue: KARMA.ACTIVITY.PROFILE_COMPLETE,
    })
    // Bot welcome (follow + notification) — best-effort, deferred past the response.
    after(() => botWelcome(user.id))
    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
