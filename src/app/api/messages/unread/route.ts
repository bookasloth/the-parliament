import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { totalUnread } from "@/modules/messaging/service"

// GET → total unread DM count for the navbar Messages badge.
export async function GET() {
  try {
    const user = await requireUser()
    return ok({ count: await totalUnread(user.id) })
  } catch (e) {
    return handleError(e)
  }
}
