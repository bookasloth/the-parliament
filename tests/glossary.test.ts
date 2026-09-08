import { describe, it, expect } from "vitest"
import { GLOSSARY } from "@/config/glossary"
import { HOUSE_CATALOG } from "@/config/houses"
import { PLANS } from "@/config/membership"
import { KARMA } from "@/config/karma"

const section = (id: string) => GLOSSARY.find((s) => s.id === id)!
const allTerms = () => GLOSSARY.flatMap((s) => s.terms)

describe("glossary structure", () => {
  it("has the expected sections and no empty content", () => {
    for (const id of ["houses", "membership", "karma", "members", "school", "posts", "graph", "groups-events", "economy", "safety", "comms"]) {
      expect(section(id)).toBeTruthy()
    }
    for (const t of allTerms()) {
      expect(t.term.length).toBeGreaterThan(0)
      expect(t.def.length).toBeGreaterThan(0)
    }
  })

  it("has unique term names within each section", () => {
    for (const s of GLOSSARY) {
      expect(new Set(s.terms.map((t) => t.term)).size).toBe(s.terms.length)
    }
  })
})

describe("glossary stays in sync with config", () => {
  it("lists every house from HOUSE_CATALOG with its colour", () => {
    const houseTerms = section("houses").terms
    for (const h of HOUSE_CATALOG) {
      const t = houseTerms.find((x) => x.term === h.name)
      expect(t, `missing house ${h.name}`).toBeTruthy()
      expect(t!.color).toBe(h.colorHex)
    }
  })

  it("lists every membership plan from PLANS", () => {
    const names = section("membership").terms.map((t) => t.term)
    for (const code of Object.keys(PLANS)) {
      expect(names).toContain(PLANS[code as keyof typeof PLANS].displayName)
    }
  })

  it("reflects the real karma unlock thresholds", () => {
    const unlocks = section("karma").terms.find((t) => t.term === "Unlocks")!
    expect(unlocks.def).toContain(String(KARMA.UNLOCKS.POLLS))
    expect(unlocks.def).toContain(String(KARMA.UNLOCKS.CREATE_GROUP))
    expect(unlocks.def).toContain(String(KARMA.UNLOCKS.MENTOR_BADGE))
  })
})
