import { NextResponse } from "next/server"
import { webhookReceiver, livekitConfigured } from "@/lib/livekit"
import { recordParticipantLeft, endCallSession } from "@/modules/calls/service"

/**
 * POST /api/livekit/webhook — LiveKit server webhook (register this URL in the
 * LiveKit project settings). Signature-verified; this is the ONLY source of
 * truth for billed minutes, so the client can never inflate or dodge usage.
 */
export async function POST(req: Request) {
  if (!livekitConfigured()) return NextResponse.json({ ok: true }) // nothing to verify against

  const body = await req.text()
  const authHeader = req.headers.get("Authorization") ?? ""

  let event
  try {
    event = await webhookReceiver().receive(body, authHeader)
  } catch {
    return NextResponse.json({ error: "Bad signature" }, { status: 401 })
  }

  const roomName = event.room?.name
  if (!roomName) return NextResponse.json({ ok: true })

  if (event.event === "participant_left" && event.participant) {
    const joinedSec = Number(event.participant.joinedAt ?? 0)
    const nowSec = event.createdAt ? Number(event.createdAt) : Date.now() / 1000
    const minutes = joinedSec > 0 ? (nowSec - joinedSec) / 60 : 0
    // participant identity == app user id (we signed it in mintCallToken).
    await recordParticipantLeft({ roomName, userId: event.participant.identity, minutes })
  } else if (event.event === "room_finished") {
    await endCallSession(roomName)
  }

  return NextResponse.json({ ok: true })
}
