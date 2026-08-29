import { redis } from "@/lib/redis"

export interface RateLimitInput {
  bucket: string
  identifier: string
  limit: number
  windowSec: number
}

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: Date
}

export async function checkRateLimit(input: RateLimitInput): Promise<RateLimitResult> {
  const now = Date.now()
  const windowMs = input.windowSec * 1000
  const windowStart = Math.floor(now / windowMs) * windowMs
  const key = `rl:${input.bucket}:${input.identifier}:${windowStart}`
  const expiresAt = new Date(windowStart + windowMs)

  // Fail OPEN on Redis infra errors (unreachable / unconfigured): a rate limiter
  // that hard-throws turns any Redis blip into a total auth outage — a missing
  // UPSTASH_* env would silently block EVERY credentials login. Distinguish this
  // from a genuine over-limit, which still returns allowed:false below.
  let count: number
  try {
    count = await redis.incr(key)
    if (count === 1) await redis.expire(key, input.windowSec + 1)
  } catch (e) {
    console.error(`rate-limit redis error for ${input.bucket}, allowing:`, e)
    return { allowed: true, remaining: input.limit, resetAt: expiresAt }
  }

  const remaining = Math.max(0, input.limit - count)
  return { allowed: count <= input.limit, remaining, resetAt: expiresAt }
}

export class RateLimitedError extends Error {
  constructor(public readonly resetAt: Date) {
    super("Rate limit exceeded")
    this.name = "RateLimitedError"
  }
}

export async function enforceRateLimit(input: RateLimitInput): Promise<void> {
  const result = await checkRateLimit(input)
  if (!result.allowed) {
    throw new RateLimitedError(result.resetAt)
  }
}

/**
 * Fail-open rate-limit check: returns false ONLY when the caller is definitively over the
 * limit. If Redis is unreachable, logs and returns true (allow) — for paths where staying
 * available matters more than perfect flood-protection (e.g. play-money game actions).
 * ponytail: fail-open by design; do not use for anything security-critical.
 */
export async function rateLimitOk(input: RateLimitInput): Promise<boolean> {
  try {
    await enforceRateLimit(input)
    return true
  } catch (e) {
    if (e instanceof RateLimitedError) return false
    console.error(`rate-limit check failed for ${input.bucket}, allowing:`, e)
    return true
  }
}
