import { requireUser } from "@/modules/auth/session"
import { handleError, ok } from "@/lib/api"
import { getProgress } from "@/modules/onboarding/service"

export async function GET() {
  try {
    const user = await requireUser()
    const progress = await getProgress(user.id)
    return ok(progress)
  } catch (e) {
    return handleError(e)
  }
}
