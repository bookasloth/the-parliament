import { describe, it, expect, beforeAll } from "vitest"
import { buildMailPayload } from "@/modules/email/service"

beforeAll(() => {
  process.env.AUTH_URL = "https://nnawca.org"
})

describe("buildMailPayload", () => {
  const base = { toAddress: "a@b.com", subject: "Hi", text: "t", html: "<p>t</p>" }

  it("uses the category From address", () => {
    expect(buildMailPayload({ ...base, category: "transactional" }).from).toContain("noreply@nnawca.com")
    expect(buildMailPayload({ ...base, category: "engagement" }).from).toContain("community@nnawca.com")
  })

  it("omits List-Unsubscribe on transactional mail (unblockable)", () => {
    expect(buildMailPayload({ ...base, category: "transactional" }).headers).toBeUndefined()
  })

  it("adds one-click List-Unsubscribe with the token on non-transactional mail", () => {
    const h = buildMailPayload({ ...base, category: "digest", unsubscribeToken: "tok123" }).headers
    expect(h?.["List-Unsubscribe-Post"]).toBe("List-Unsubscribe=One-Click")
    expect(h?.["List-Unsubscribe"]).toContain("token=tok123")
    expect(h?.["List-Unsubscribe"]).toContain("https://nnawca.org/api/email/unsubscribe")
  })

  it("carries subject/text/html through unchanged", () => {
    const p = buildMailPayload({ ...base, category: "reminder" })
    expect(p.subject).toBe("Hi")
    expect(p.text).toBe("t")
    expect(p.html).toBe("<p>t</p>")
  })
})
