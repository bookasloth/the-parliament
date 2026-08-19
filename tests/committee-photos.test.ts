import { describe, it, expect } from "vitest"
import { applyPhotos } from "@/modules/committee/photos"
import type { Member } from "@/lib/committee"

const roster: Member[] = [
  { key: "president", name: "A", position: "President" },
  { key: "member-1", name: "B", position: "Executive Member" },
  { name: "C", position: "Advisor" }, // no key
]

describe("applyPhotos", () => {
  it("attaches a photo only to the member whose key is in the map", () => {
    const out = applyPhotos(roster, { president: "https://x/p.jpg" })
    expect(out[0].photo).toBe("https://x/p.jpg")
    expect(out[1].photo).toBeUndefined()
    expect(out[2].photo).toBeUndefined()
  })

  it("leaves keyless members untouched even if a same-name key exists", () => {
    const out = applyPhotos(roster, { "member-1": "https://x/m.jpg", C: "https://x/c.jpg" })
    expect(out[1].photo).toBe("https://x/m.jpg")
    expect(out[2].photo).toBeUndefined() // member C has no key, can't be targeted
  })

  it("returns members unchanged when the map is empty", () => {
    expect(applyPhotos(roster, {})).toEqual(roster)
  })

  it("does not mutate the input array", () => {
    const copy = JSON.parse(JSON.stringify(roster))
    applyPhotos(roster, { president: "https://x/p.jpg" })
    expect(roster).toEqual(copy)
  })
})
