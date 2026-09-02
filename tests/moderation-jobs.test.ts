import { describe, it, expect } from "vitest"
import { shouldReactivate } from "@/modules/moderation/jobs"

describe("shouldReactivate", () => {
  it("reactivates a suspended user with no remaining in-force suspension", () => {
    expect(shouldReactivate("suspended", 0)).toBe(true)
  })

  it("keeps a user suspended when another suspension is still in force", () => {
    expect(shouldReactivate("suspended", 1)).toBe(false)
    expect(shouldReactivate("suspended", 3)).toBe(false)
  })

  it("never touches a non-suspended user", () => {
    expect(shouldReactivate("active", 0)).toBe(false)
    expect(shouldReactivate("banned", 0)).toBe(false)
    expect(shouldReactivate("inactive", 0)).toBe(false)
  })
})
