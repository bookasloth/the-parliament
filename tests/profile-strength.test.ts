import { describe, it, expect } from "vitest"
import { computeStrength, tierFor, type StrengthInput } from "@/lib/profile-strength"

const empty: StrengthInput = {}

const full: StrengthInput = {
  firstName: "Aditya", lastName: "Kulkarni", username: "aditya",
  headline: "PM · Fintech", bio: "Hello", hasCover: true,
  houseId: "h1", batchId: "b1", city: "Pune", phone: "+919000000000",
  industry: "Fintech", company: "Razorpay", designation: "PM",
  higherEducation: "VNIT", skills: ["Product", "SQL"], socialCount: 2,
}

describe("computeStrength", () => {
  it("scores an empty profile at 0 / seedling", () => {
    const r = computeStrength(empty)
    expect(r.score).toBe(0)
    expect(r.tier.key).toBe("seedling")
    expect(r.complete).toBe(false)
    expect(r.next.length).toBe(r.items.length)
  })

  it("scores a fully-filled profile at 100 / star / complete", () => {
    const r = computeStrength(full)
    expect(r.score).toBe(100)
    expect(r.tier.key).toBe("star")
    expect(r.complete).toBe(true)
    expect(r.next).toHaveLength(0)
  })

  it("weights sum to exactly 100", () => {
    const total = computeStrength(empty).items.reduce((s, i) => s + i.points, 0)
    expect(total).toBe(100)
  })

  it("orders next-best-actions richest-first", () => {
    const r = computeStrength({ firstName: "A", lastName: "B", username: "ab" })
    expect(r.next[0].points).toBeGreaterThanOrEqual(r.next[1].points)
    // headline (12) and jnv (12) are the biggest remaining items
    expect(r.next[0].points).toBe(12)
  })

  it("treats whitespace-only values as empty", () => {
    const r = computeStrength({ firstName: "  ", lastName: "  ", username: "  " })
    expect(r.items.find((i) => i.key === "name")?.done).toBe(false)
  })

  it("requires BOTH house and batch for the jnv item", () => {
    expect(computeStrength({ houseId: "h1" }).items.find((i) => i.key === "jnv")?.done).toBe(false)
    expect(computeStrength({ houseId: "h1", batchId: "b1" }).items.find((i) => i.key === "jnv")?.done).toBe(true)
  })

  it("tierFor boundaries", () => {
    expect(tierFor(0).key).toBe("seedling")
    expect(tierFor(34).key).toBe("seedling")
    expect(tierFor(35).key).toBe("sprout")
    expect(tierFor(64).key).toBe("sprout")
    expect(tierFor(65).key).toBe("established")
    expect(tierFor(89).key).toBe("established")
    expect(tierFor(90).key).toBe("star")
    expect(tierFor(100).key).toBe("star")
  })
})
