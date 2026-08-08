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

  const count = await redis.incr(key)
  // Set TTL only on the first increment (when count === 1)
  if (count === 1) await redis.expire(key, input.windowSec + 1)

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
