import { describe, it, expect } from "vitest"
import { adminSetTier } from "@/modules/membership/admin"

// Guard branches reject BEFORE touching the DB, so they're unit-testable.
// The paid-grant and student/free downgrade paths hit Prisma → covered by
// integration tests, not here.
describe("adminSetTier guards", () => {
  const base = { adminId: "admin-1", targetUserId: "user-1" }

  it("rejects committee (must use the invite flow)", async () => {
    await expect(adminSetTier({ ...base, tier: "committee" })).rejects.toThrow(/Committee/i)
  })

  it("rejects inactive (not a grantable tier)", async () => {
    await expect(adminSetTier({ ...base, tier: "inactive" })).rejects.toThrow(/inactive/i)
  })

  it("rejects an unknown tier", async () => {
    await expect(adminSetTier({ ...base, tier: "vip" })).rejects.toThrow(/Unsupported/i)
  })
})
