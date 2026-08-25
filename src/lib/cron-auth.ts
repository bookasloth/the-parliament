/**
 * Authorize a Vercel Cron request. Vercel automatically attaches
 * `Authorization: Bearer $CRON_SECRET` to scheduled invocations when the
 * CRON_SECRET env var is set. We fail CLOSED: if the secret is unset or the
 * header doesn't match, the endpoint refuses — so a cron route can never be
 * triggered by an anonymous internet request to hammer the DB.
 */
import crypto from "node:crypto"

export function isAuthorizedCron(authHeader: string | null, secret: string | undefined): boolean {
  if (!secret) return false // fail closed on unset secret
  const a = Buffer.from(authHeader ?? "")
  const b = Buffer.from(`Bearer ${secret}`)
  // Constant-time compare (length-guarded) so the bearer can't be recovered via response timing.
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
