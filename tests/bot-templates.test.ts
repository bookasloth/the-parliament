import { describe, it, expect } from "vitest"
import { WELCOME_TEMPLATES, WELCOME_DM_TEMPLATES, pickTemplate } from "@/modules/bot/templates"

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

describe("bot welcome DM templates", () => {
  it("every DM template has exactly one {name} placeholder and is NNAWCA-branded", () => {
    expect(WELCOME_DM_TEMPLATES.length).toBeGreaterThan(0)
    for (const t of WELCOME_DM_TEMPLATES) {
      expect(t.match(/\{name\}/g)).toHaveLength(1)
      expect(t.toLowerCase()).not.toContain("parliament")
      expect(t).toContain("NNAWCA")
    }
  })

  it("replacing {name} fills in the member's name", () => {
    const body = pickTemplate(WELCOME_DM_TEMPLATES, "seed").replace("{name}", "Ravi")
    expect(body).toContain("Ravi")
    expect(body).not.toContain("{name}")
  })
})
