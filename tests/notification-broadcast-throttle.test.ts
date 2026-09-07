import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock only the redis client — the throttle module is framework-free so it loads
// cleanly under the node test env (unlike notifications/service, which imports
// next/server).
// vi.mock is hoisted above imports, so the mock fn must be created via vi.hoisted
// (a plain `const set = vi.fn()` isn't initialised when the factory runs).
const { set } = vi.hoisted(() => ({ set: vi.fn() }))
vi.mock("@/lib/redis", () => ({ redis: { set } }))

import { throttleBroadcast, BROADCAST_THROTTLE_MS } from "@/modules/notifications/broadcast-throttle"

describe("throttleBroadcast", () => {
  beforeEach(() => set.mockReset())

  it("allows when the window latch is acquired (NX set returns OK)", async () => {
    set.mockResolvedValueOnce("OK")
    expect(await throttleBroadcast("u1")).toBe(true)
    // NX + a TTL window so the latch self-expires.
    expect(set).toHaveBeenCalledWith("notif:bcast:u1", 1, { nx: true, px: BROADCAST_THROTTLE_MS })
  })

  it("suppresses when the latch already exists (NX set returns null)", async () => {
    set.mockResolvedValueOnce(null)
    expect(await throttleBroadcast("u1")).toBe(false)
  })

  it("fails OPEN on a redis error so realtime delivery never silently dies", async () => {
    set.mockRejectedValueOnce(new Error("redis down"))
    expect(await throttleBroadcast("u1")).toBe(true)
  })

  it("honours a custom window", async () => {
    set.mockResolvedValueOnce("OK")
    await throttleBroadcast("u2", 5000)
    expect(set).toHaveBeenCalledWith("notif:bcast:u2", 1, { nx: true, px: 5000 })
  })
})
