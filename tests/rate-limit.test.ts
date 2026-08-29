import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the Redis client the limiter depends on. vi.hoisted so the fns exist
// when the hoisted vi.mock factory runs.
const { incr, expire } = vi.hoisted(() => ({ incr: vi.fn(), expire: vi.fn() }))
vi.mock("@/lib/redis", () => ({ redis: { incr, expire } }))

import { checkRateLimit, enforceRateLimit, RateLimitedError } from "@/lib/rate-limit"

const input = { bucket: "auth.login.email", identifier: "a@b.com", limit: 5, windowSec: 900 }

beforeEach(() => {
  incr.mockReset()
  expire.mockReset()
})

describe("checkRateLimit", () => {
  it("allows while under the limit", async () => {
    incr.mockResolvedValue(3)
    const r = await checkRateLimit(input)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(2)
  })

  it("blocks once the count exceeds the limit", async () => {
    incr.mockResolvedValue(6)
    const r = await checkRateLimit(input)
    expect(r.allowed).toBe(false)
    expect(r.remaining).toBe(0)
  })

  it("allows exactly at the limit (boundary)", async () => {
    incr.mockResolvedValue(5)
    expect((await checkRateLimit(input)).allowed).toBe(true)
  })

  it("sets TTL only on the first hit in a window", async () => {
    incr.mockResolvedValue(1)
    await checkRateLimit(input)
    expect(expire).toHaveBeenCalledOnce()
    expire.mockClear()
    incr.mockResolvedValue(2)
    await checkRateLimit(input)
    expect(expire).not.toHaveBeenCalled()
  })

  it("FAILS OPEN when Redis is unreachable (no auth outage on infra error)", async () => {
    incr.mockRejectedValue(new Error("ECONNREFUSED"))
    const r = await checkRateLimit(input)
    expect(r.allowed).toBe(true)
    expect(r.remaining).toBe(input.limit)
  })
})

describe("enforceRateLimit", () => {
  it("throws RateLimitedError when over the limit", async () => {
    incr.mockResolvedValue(99)
    await expect(enforceRateLimit(input)).rejects.toBeInstanceOf(RateLimitedError)
  })

  it("does not throw when Redis errors (fail open)", async () => {
    incr.mockRejectedValue(new Error("down"))
    await expect(enforceRateLimit(input)).resolves.toBeUndefined()
  })
})
