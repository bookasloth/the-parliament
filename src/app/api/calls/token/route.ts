import { NextResponse } from "next/server"
import { requireUser, UnauthorizedError } from "@/modules/auth/session"
import { env } from "@/config/env"
import { livekitConfigured, mintCallToken } from "@/lib/livekit"
import { authorizeDmCall, ensureCallSession } from "@/modules/calls/service"

/** POST /api/calls/token { conversationId } → LiveKit join token for a 1:1 huddle. */
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

  const { conversationId } = await req.json().catch(() => ({ conversationId: null }))
  if (!conversationId || typeof conversationId !== "string") {
    return NextResponse.json({ error: "conversationId required" }, { status: 400 })
  }

  const authz = await authorizeDmCall(user.id, conversationId)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.message ?? "Not allowed", code: authz.code }, { status: 403 })
  }

  await ensureCallSession({
    roomName: authz.roomName!,
    kind: "dm",
    startedById: user.id,
    conversationId,
    passId: authz.passId,
  })

  const token = await mintCallToken({
    identity: user.id,
    name: user.name ?? user.username ?? "Member",
    room: authz.roomName!,
    canPublish: authz.canPublish ?? true,
    // Grace over the cap so the token doesn't expire mid-call on a slow leave.
    ttlMinutes: (authz.maxCallMinutes ?? 30) + 5,
  })

  return NextResponse.json({
    token,
    url: env.livekitUrl,
    roomName: authz.roomName,
    maxCallMinutes: authz.maxCallMinutes,
  })
}
