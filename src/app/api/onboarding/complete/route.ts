import { requireUser } from "@/modules/auth/session"
import { handleError, ok } from "@/lib/api"
import { markComplete } from "@/modules/onboarding/service"
import { awardKarma } from "@/modules/karma/ledger"
import { KARMA } from "@/config/karma"

export async function POST() {
  try {
    const user = await requireUser()
    await markComplete(user.id)
    await awardKarma({
      userId: user.id,
      actionType: "profile_complete",
      baseValue: KARMA.ACTIVITY.PROFILE_COMPLETE,
    })
    return ok({ success: true })
  } catch (e) {
    return handleError(e)
  }
}
