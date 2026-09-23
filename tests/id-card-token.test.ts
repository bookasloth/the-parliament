import { describe, it, expect } from "vitest"
import { signIdCardToken, verifyIdCardToken } from "@/lib/id-card-token"

const SECRET = "test-secret-abcdefghijklmnop"

describe("id-card token", () => {
  it("round-trips a valid token", () => {
    const t = signIdCardToken("user-123", SECRET)
    const p = verifyIdCardToken(t, SECRET)
    expect(p?.u).toBe("user-123")
    expect(typeof p?.iat).toBe("number")
  })

  it("rejects a token signed with a different secret", () => {
    const t = signIdCardToken("user-123", SECRET)
    expect(verifyIdCardToken(t, "other-secret")).toBeNull()
  })

  it("rejects a tampered payload", () => {
    const t = signIdCardToken("user-123", SECRET)
    const [body, sig] = t.split(".")
    // flip the userId in the body while keeping the old signature
    const forged = Buffer.from(JSON.stringify({ u: "attacker", iat: 1 }))
      .toString("base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
    expect(verifyIdCardToken(`${forged}.${sig}`, SECRET)).toBeNull()
    expect(body).toBeTruthy()
  })

  it("rejects malformed tokens", () => {
    expect(verifyIdCardToken("", SECRET)).toBeNull()
    expect(verifyIdCardToken("nodot", SECRET)).toBeNull()
    expect(verifyIdCardToken(".sig", SECRET)).toBeNull()
    expect(verifyIdCardToken("body.", SECRET)).toBeNull()
    expect(verifyIdCardToken("!!!.!!!", SECRET)).toBeNull()
  })

  it("returns null when secret is empty", () => {
    expect(verifyIdCardToken("a.b", "")).toBeNull()
  })

  it("total paise math", async () => {
    const { idCardTotalPaise } = await import("@/config/id-card")
    expect(idCardTotalPaise(1)).toBe(100 * 100 + 40 * 100) // 1 card + delivery
    expect(idCardTotalPaise(3)).toBe(300 * 100 + 40 * 100)
    expect(idCardTotalPaise(0)).toBe(100 * 100 + 40 * 100) // clamps to 1
    expect(idCardTotalPaise(999)).toBe(1000 * 100 + 40 * 100) // clamps to max 10
  })
})
