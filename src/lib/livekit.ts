import { AccessToken, WebhookReceiver, type VideoGrant } from "livekit-server-sdk"
import { env } from "@/config/env"

/** True when LiveKit is configured. Routes fail closed (503) when false. */
export function livekitConfigured(): boolean {
  return Boolean(env.livekitApiKey && env.livekitApiSecret && env.livekitUrl)
}

function creds(): { key: string; secret: string } {
  if (!env.livekitApiKey || !env.livekitApiSecret) {
    throw new Error("LiveKit credentials missing")
  }
  return { key: env.livekitApiKey, secret: env.livekitApiSecret }
}

/**
 * Mint a room-join token. `identity` MUST be the app user id — the webhook maps
 * participant identity back to a user for metering, so it has to be trustworthy
 * (this is server-signed, the client cannot forge it).
 *
 * ttlMinutes caps token validity. ponytail: this bounds re-joins, not the live
 * session — a hard mid-call cutoff needs a scheduled RoomService.deleteRoom;
 * add that if soft (client) + webhook-truth metering proves insufficient.
 */
export async function mintCallToken(opts: {
  identity: string
  name: string
  room: string
  canPublish: boolean
  ttlMinutes: number
}): Promise<string> {
  const { key, secret } = creds()
  const at = new AccessToken(key, secret, {
    identity: opts.identity,
    name: opts.name,
    ttl: `${Math.max(1, Math.ceil(opts.ttlMinutes))}m`,
  })
  const grant: VideoGrant = {
    roomJoin: true,
    room: opts.room,
    canPublish: opts.canPublish,
    canPublishData: true,
    canSubscribe: true,
  }
  at.addGrant(grant)
  return at.toJwt()
}

/** Verify + decode a LiveKit webhook. Throws on bad signature (caller → 401). */
export function webhookReceiver(): WebhookReceiver {
  const { key, secret } = creds()
  return new WebhookReceiver(key, secret)
}
