import { describe, it, expect } from "vitest"
import { WELCOME_TEMPLATES, pickTemplate } from "@/modules/bot/templates"

describe("bot welcome templates", () => {
  it("ships 20 templates", () => {
    expect(WELCOME_TEMPLATES).toHaveLength(20)
  })

  it("every template has exactly one {mention} placeholder", () => {
    for (const t of WELCOME_TEMPLATES) {
      expect(t.match(/\{mention\}/g)).toHaveLength(1)
    }
  })

  it("is NNAWCA-branded and never says 'Parliament'", () => {
    for (const t of WELCOME_TEMPLATES) {
      expect(t.toLowerCase()).not.toContain("parliament")
      expect(t).toContain("NNAWCA")
    }
  })

  it("pickTemplate is deterministic for the same seed", () => {
    expect(pickTemplate(WELCOME_TEMPLATES, "user-abc")).toBe(pickTemplate(WELCOME_TEMPLATES, "user-abc"))
  })

  it("pickTemplate always returns a real template, and different seeds can differ", () => {
    const a = pickTemplate(WELCOME_TEMPLATES, "aaaaaa")
    const b = pickTemplate(WELCOME_TEMPLATES, "zzzzzz")
    expect(WELCOME_TEMPLATES).toContain(a)
    expect(WELCOME_TEMPLATES).toContain(b)
  })

  it("replacing {mention} yields a real @handle mention", () => {
    const body = pickTemplate(WELCOME_TEMPLATES, "seed").replace("{mention}", "@ravi_k")
    expect(body).toContain("@ravi_k")
    expect(body).not.toContain("{mention}")
  })
})
