import { prisma } from "@/lib/prisma"

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
  const windowKey = String(windowStart)
  const expiresAt = new Date(windowStart + windowMs)
  const bucketKey = `${input.bucket}:${input.identifier}`

  const row = await prisma.rateLimitCounter.upsert({
    where: { bucket_windowKey: { bucket: bucketKey, windowKey } },
    create: { bucket: bucketKey, windowKey, count: 1, expiresAt },
    update: { count: { increment: 1 } },
  })

  const remaining = Math.max(0, input.limit - row.count)
  return {
    allowed: row.count <= input.limit,
    remaining,
    resetAt: expiresAt,
  }
}

export async function purgeExpired(): Promise<number> {
  const res = await prisma.rateLimitCounter.deleteMany({
    where: { expiresAt: { lt: new Date() } },
  })
  return res.count
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
