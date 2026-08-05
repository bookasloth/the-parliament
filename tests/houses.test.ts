import { describe, it, expect } from "vitest"
import {
  houseSystemForBatch,
  allowedHouseGenders,
  isHouseValidFor,
  housesForContext,
  HOUSE_CATALOG,
  HOUSE_TRANSITION_YEAR,
} from "@/config/houses"

const byName = (n: string) => HOUSE_CATALOG.find((h) => h.name === n)!

describe("house system resolution", () => {
  it("uses the transition year (default 2002) to split eras", () => {
    expect(HOUSE_TRANSITION_YEAR).toBe(2002)
    expect(houseSystemForBatch(1999)).toBe("pre2002")
    expect(houseSystemForBatch(2001)).toBe("pre2002")
    expect(houseSystemForBatch(2002)).toBe("ansu") // cutoff year is ANSU
    expect(houseSystemForBatch(2010)).toBe("ansu")
    expect(houseSystemForBatch(null)).toBe("ansu") // unknown → current
    expect(houseSystemForBatch(undefined)).toBe("ansu")
  })

  it("allows gender-open houses to everyone; restricts by gender otherwise", () => {
    expect(allowedHouseGenders("male")).toEqual([null, "male"])
    expect(allowedHouseGenders("female")).toEqual([null, "female"])
    expect(allowedHouseGenders("other")).toEqual([null, "male", "female"])
    expect(allowedHouseGenders(undefined)).toEqual([null, "male", "female"])
  })
})

describe("housesForContext — the three distinct systems", () => {
  it("pre-2002 boy sees the 4 boys houses only (no ANSU, no girls)", () => {
    const out = housesForContext(HOUSE_CATALOG, 1998, "male").map((h) => h.name).sort()
    expect(out).toEqual(["Jawahar", "Rajiv", "Subhash", "Tilak"])
  })

  it("pre-2002 girl sees the 2 girls houses only", () => {
    const out = housesForContext(HOUSE_CATALOG, 1998, "female").map((h) => h.name).sort()
    expect(out).toEqual(["Indira", "Laxmi"])
  })

  it("post-2002 member sees the 4 ANSU houses regardless of gender", () => {
    const ansu = ["Aravali", "Nilgiri", "Shiwalik", "Udaigiri"]
    expect(housesForContext(HOUSE_CATALOG, 2010, "male").map((h) => h.name).sort()).toEqual(ansu)
    expect(housesForContext(HOUSE_CATALOG, 2010, "female").map((h) => h.name).sort()).toEqual(ansu)
    expect(housesForContext(HOUSE_CATALOG, 2010, "other").map((h) => h.name).sort()).toEqual(ansu)
  })

  it("pre-2002 with unknown gender sees all pre-2002 houses (boys + girls)", () => {
    const out = housesForContext(HOUSE_CATALOG, 1998, undefined).map((h) => h.name).sort()
    expect(out).toEqual(["Indira", "Jawahar", "Laxmi", "Rajiv", "Subhash", "Tilak"])
  })

  it("never mixes systems — Jawahar and Aravali are distinct even at the same colour", () => {
    const jawahar = byName("Jawahar")
    const aravali = byName("Aravali")
    expect(jawahar.colorHex).toBe(aravali.colorHex) // same colour
    expect(jawahar.system).toBe("pre2002")
    expect(aravali.system).toBe("ansu")
    // A post-2002 member can never be offered Jawahar; a pre-2002 boy never Aravali.
    expect(isHouseValidFor(jawahar, 2010, "male")).toBe(false)
    expect(isHouseValidFor(aravali, 1998, "male")).toBe(false)
  })
})
