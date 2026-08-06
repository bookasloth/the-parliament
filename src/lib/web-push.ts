import webpush from "web-push"
import { prisma } from "@/lib/prisma"

// Web Push (browser Push API) sender. VAPID keys authenticate us to the push
// services (FCM/Mozilla/Apple). Configured lazily so a missing key doesn't crash
// boot — push just no-ops until the env is set.
let configured: boolean | null = null
function ensureConfigured(): boolean {
  if (configured !== null) return configured
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) {
    configured = false
    return false
  }
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || "mailto:admin@nnawca.com", pub, priv)
  configured = true
  return true
}

export interface PushPayload {
  title: string
  body?: string
  url?: string
  icon?: string
  tag?: string
}

/** Best-effort push to all of a user's subscribed devices. Prunes dead
 *  subscriptions (410 Gone / 404) so the table self-heals. */
export async function sendPush(userId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return
  let subs: { endpoint: string; p256dh: string; auth: string }[]
  try {
    subs = await prisma.pushSubscription.findMany({ where: { userId } })
  } catch (e) {
    // Table not created yet, or a transient DB error — push is best-effort.
    console.warn("sendPush lookup failed:", e)
    return
  }
  if (subs.length === 0) return
  const data = JSON.stringify(payload)
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          data,
        )
      } catch (e) {
        const status = (e as { statusCode?: number }).statusCode
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { endpoint: s.endpoint } }).catch(() => {})
        }
      }
    }),
  )
}
