import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { getHistory } from "@/modules/membership/service"

export async function GET() {
  try {
    const user = await requireUser()
    const history = await getHistory(user.id)
    return ok({ history })
  } catch (e) {
    return handleError(e)
  }
}
