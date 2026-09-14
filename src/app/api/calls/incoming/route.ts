import { NextResponse } from "next/server"
import { requireUser, UnauthorizedError } from "@/modules/auth/session"
import { getIncomingCall } from "@/modules/calls/service"

/** GET /api/calls/incoming → the live DM call ringing this user right now, or null.
 *  Poll fallback for the global incoming-call ring (realtime/push aren't guaranteed). */
export async function GET() {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ call: null }, { status: 401 })
    throw e
  }
  return NextResponse.json({ call: await getIncomingCall(user.id) })
}
