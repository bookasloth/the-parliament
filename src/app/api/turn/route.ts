import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"

const STUN_ONLY = [{ urls: "stun:stun.l.google.com:19302" }]

// GET → ICE servers (STUN + TURN) for a WebRTC call. Fetches short-lived TURN
// credentials from Metered using the SECRET key server-side, so the secret never
// reaches the browser. Falls back to STUN-only if TURN isn't configured or the
// upstream call fails (calls between open networks still connect). Gated on auth
// so anonymous traffic can't burn the TURN quota.
export async function GET() {
  try {
    await requireUser()
    const domain = process.env.METERED_DOMAIN
    const key = process.env.METERED_SECRET_KEY
    if (!domain || !key) return ok({ iceServers: STUN_ONLY })
    const r = await fetch(`https://${domain}/api/v1/turn/credentials?apiKey=${key}`, { cache: "no-store" })
    if (!r.ok) return ok({ iceServers: STUN_ONLY })
    const iceServers = await r.json()
    return ok({ iceServers: Array.isArray(iceServers) && iceServers.length ? iceServers : STUN_ONLY })
  } catch (e) {
    return handleError(e)
  }
}
