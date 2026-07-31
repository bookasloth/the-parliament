import crypto from "node:crypto"
import { beforeAll, describe, expect, it } from "vitest"
import { signRealtimeToken, conversationTopic } from "@/lib/supabase-realtime"

const SECRET = "test-secret-value-1234567890"

function b64urlToBuf(s: string): Buffer {
  return Buffer.from(s.replace(/-/g, "+").replace(/_/g, "/"), "base64")
}

beforeAll(() => {
  process.env.SUPABASE_JWT_SECRET = SECRET
})

describe("signRealtimeToken", () => {
  it("produces a valid HS256 JWT whose signature verifies against the secret", () => {
    const token = signRealtimeToken("user-123", 3600)
    const [header, payload, sig] = token.split(".")
    expect(header && payload && sig).toBeTruthy()

    const expected = crypto
      .createHmac("sha256", SECRET)
      .update(`${header}.${payload}`)
      .digest("base64")
      .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_")
    expect(sig).toBe(expected)

    const h = JSON.parse(b64urlToBuf(header).toString())
    expect(h).toEqual({ alg: "HS256", typ: "JWT" })
  })

  it("embeds sub, authenticated role/aud, and a future expiry", () => {
    const before = Math.floor(Date.now() / 1000)
    const token = signRealtimeToken("abc", 100)
    const claims = JSON.parse(b64urlToBuf(token.split(".")[1]).toString())
    expect(claims.sub).toBe("abc")
    expect(claims.role).toBe("authenticated")
    expect(claims.aud).toBe("authenticated")
    expect(claims.exp).toBeGreaterThan(before)
    expect(claims.exp - claims.iat).toBe(100)
  })

  it("throws when the secret is missing", () => {
    delete process.env.SUPABASE_JWT_SECRET
    expect(() => signRealtimeToken("x")).toThrow(/SUPABASE_JWT_SECRET/)
    process.env.SUPABASE_JWT_SECRET = SECRET
  })

  it("builds the conversation topic", () => {
    expect(conversationTopic("uuid-1")).toBe("conversation:uuid-1")
  })
})
