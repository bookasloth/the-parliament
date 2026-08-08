import { NextResponse } from "next/server"
import { requireUser, UnauthorizedError } from "@/modules/auth/session"
import { env } from "@/config/env"
import { livekitConfigured, mintCallToken } from "@/lib/livekit"
import { authorizeAmaCall, ensureCallSession } from "@/modules/calls/service"

/** POST /api/calls/ama/token { amaSessionId } → LiveKit token for an AMA room. */
export async function POST(req: Request) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    if (e instanceof UnauthorizedError) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    throw e
  }

  if (!livekitConfigured()) {
    return NextResponse.json({ error: "Calling is not configured." }, { status: 503 })
  }

  const { amaSessionId } = await req.json().catch(() => ({ amaSessionId: null }))
  if (!amaSessionId || typeof amaSessionId !== "string") {
    return NextResponse.json({ error: "amaSessionId required" }, { status: 400 })
  }

  const authz = await authorizeAmaCall(user.id, amaSessionId)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message ?? "Not allowed", code: authz.code }, { status: 403 })
  }

  await ensureCallSession({
    roomName: authz.roomName!,
    kind: "ama",
    startedById: user.id,
    amaSessionId,
  })

  const token = await mintCallToken({
    identity: user.id,
    name: user.name ?? user.username ?? "Member",
    room: authz.roomName!,
    canPublish: authz.canPublish ?? false,
    ttlMinutes: (authz.maxCallMinutes ?? 180) + 5,
  })

  return NextResponse.json({ token, url: env.livekitUrl, roomName: authz.roomName, canPublish: authz.canPublish })
}
