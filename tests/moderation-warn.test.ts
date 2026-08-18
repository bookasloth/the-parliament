import { describe, it, expect } from "vitest"
import { buildWarnPayload } from "@/modules/moderation/warn-copy"

describe("buildWarnPayload", () => {
  const APP = "https://nnawca.org"

  it("uses trimmed admin notes as the reason", () => {
    const p = buildWarnPayload("post", "Asha", "  Off-topic spam  ", APP)
    expect(p.body).toBe("Off-topic spam")
    expect(p.email.reason).toBe("Off-topic spam")
    expect(p.email.legalName).toBe("Asha")
    expect(p.email.appUrl).toBe(APP)
    expect(p.title).toMatch(/warning/i)
  })

  it("falls back to a generic reason when notes are missing/blank", () => {
    for (const notes of [undefined, "", "   "]) {
      const p = buildWarnPayload("comment", "Ravi", notes, APP)
      expect(p.body).toMatch(/reported and reviewed/i)
      expect(p.email.reason).toBe(p.body)
    }
  })

  it("maps each entity type to a human content label", () => {
    expect(buildWarnPayload("post", "x", "r", APP).email.contentType).toBe("post")
    expect(buildWarnPayload("comment", "x", "r", APP).email.contentType).toBe("comment")
    expect(buildWarnPayload("profile", "x", "r", APP).email.contentType).toBe("profile")
    expect(buildWarnPayload("business", "x", "r", APP).email.contentType).toBe("business listing")
    expect(buildWarnPayload("message", "x", "r", APP).email.contentType).toBe("message")
  })
})
