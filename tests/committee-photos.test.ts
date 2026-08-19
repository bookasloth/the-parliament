import { describe, it, expect } from "vitest"
import { applyOverrides } from "@/modules/committee/photos"
import type { Member } from "@/lib/committee"

const roster: Member[] = [
  { key: "president", name: "Placeholder A", position: "President" },
  { key: "member-1", name: "Placeholder B", position: "Executive Member" },
  { name: "Advisor C", position: "Advisor" }, // no key
]

describe("applyOverrides", () => {
  it("overlays name, profileLink and photo by member key", () => {
    const out = applyOverrides(roster, {
      president: { name: "Real Name", profileLink: "https://x/p", photo: "https://x/p.jpg" },
    })
    expect(out[0]).toMatchObject({ name: "Real Name", profileLink: "https://x/p", photo: "https://x/p.jpg", position: "President" })
    expect(out[1].name).toBe("Placeholder B") // untouched
  })

  it("only overrides the fields that are set (partial)", () => {
    const out = applyOverrides(roster, { "member-1": { photo: "https://x/m.jpg" } })
    expect(out[1]).toMatchObject({ name: "Placeholder B", photo: "https://x/m.jpg" })
    expect(out[1].profileLink).toBeUndefined()
  })

  it("ignores empty-string fields (falls back to roster)", () => {
    const out = applyOverrides(roster, { president: { name: "", profileLink: "" } })
    expect(out[0].name).toBe("Placeholder A")
    expect(out[0].profileLink).toBeUndefined()
  })

  it("leaves keyless members untouched", () => {
    const out = applyOverrides(roster, { "Advisor C": { name: "X" } })
    expect(out[2].name).toBe("Advisor C")
  })

  it("does not mutate the input", () => {
    const copy = JSON.parse(JSON.stringify(roster))
    applyOverrides(roster, { president: { photo: "https://x/p.jpg" } })
    expect(roster).toEqual(copy)
  })
})
