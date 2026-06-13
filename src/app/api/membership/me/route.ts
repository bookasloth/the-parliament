import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { getCurrent } from "@/modules/membership/service"

export async function GET() {
  try {
    const user = await requireUser()
    const current = await getCurrent(user.id)
    return ok(current)
  } catch (e) {
    return handleError(e)
  }
}
