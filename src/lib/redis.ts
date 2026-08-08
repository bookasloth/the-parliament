import { Redis } from "@upstash/redis"

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

/**
 * Cache-aside: return cached value or fetch + store.
 * Falls through to fetcher on Redis errors (app works without Redis, just slower).
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  try {
    const hit = await redis.get<T>(key)
    if (hit !== null && hit !== undefined) return hit
  } catch (e) {
    console.error("redis.get failed, falling through to DB:", e)
  }
  const data = await fetcher()
  try {
    await redis.set(key, data, { ex: ttlSeconds })
  } catch (e) {
    console.error("redis.set failed:", e)
  }
  return data
}

export async function invalidate(...keys: string[]): Promise<void> {
  if (!keys.length) return
  try {
    await redis.del(...keys)
  } catch (e) {
    console.error("redis.del failed:", e)
  }
}

// Convenience: blow the session cache so the JWT callback re-fetches from DB.
// Call after profile edit, membership change, role change, onboarding step.
export async function invalidateSession(userId: string): Promise<void> {
  await invalidate(`session:${userId}`)
}

export async function invalidatePrefix(prefix: string): Promise<void> {
  try {
    let cursor: string | number = 0
    do {
      const result = await redis.scan(cursor, { match: `${prefix}*`, count: 100 })
      const next = result[0] as string | number
      const keys = result[1] as string[]
      cursor = next
      if (keys.length) await redis.del(...keys)
    } while (cursor !== 0 && cursor !== "0")
  } catch (e) {
    console.error("redis.invalidatePrefix failed:", e)
  }
}
