import { describe, it, expect } from "vitest"
import { donorGroupsFor, isBloodGroup, BLOOD_GROUPS } from "@/modules/blood/compatibility"
import { sanitizeTemplateParam } from "@/lib/aisensy"
import { matchBloodDonors, type DonorContact } from "@/modules/blood/service"

describe("donorGroupsFor", () => {
  it("O- patient accepts only O- donors", () => {
    expect(donorGroupsFor("O-")).toEqual(["O-"])
  })
  it("AB+ patient accepts every group (universal recipient)", () => {
    expect(donorGroupsFor("AB+").sort()).toEqual([...BLOOD_GROUPS].sort())
  })
  it("B+ patient accepts B+, B-, O+, O-", () => {
    expect(donorGroupsFor("B+").sort()).toEqual(["B+", "B-", "O+", "O-"].sort())
  })
  it("O- is a universal donor — appears for every patient group", () => {
    for (const g of BLOOD_GROUPS) expect(donorGroupsFor(g)).toContain("O-")
  })
  it("returns [] for an invalid group", () => {
    expect(donorGroupsFor("Z+")).toEqual([])
    expect(donorGroupsFor(null)).toEqual([])
  })
  it("isBloodGroup guards the 8 valid values", () => {
    expect(isBloodGroup("A+")).toBe(true)
    expect(isBloodGroup("a+")).toBe(false)
    expect(isBloodGroup("")).toBe(false)
  })
})

describe("sanitizeTemplateParam", () => {
  it("collapses newlines/tabs/multi-space into single spaces (Meta rule)", () => {
    expect(sanitizeTemplateParam("GMC\n\nHospital\t Ward   3")).toBe("GMC Hospital Ward 3")
  })
  it("trims", () => {
    expect(sanitizeTemplateParam("  Nagpur  ")).toBe("Nagpur")
  })
  it("caps length", () => {
    expect(sanitizeTemplateParam("a".repeat(500), 10)).toHaveLength(10)
  })
})

const d = (over: Partial<DonorContact>): DonorContact => ({
  userId: over.userId ?? "u1",
  name: over.name ?? "Donor",
  phone: "phone" in over ? over.phone ?? null : "+919876543210",
  whatsappOptIn: over.whatsappOptIn ?? true,
  status: over.status ?? "active",
  city: "city" in over ? over.city ?? null : "Nagpur",
  bloodDonor: over.bloodDonor ?? false,
})

const base = { requesterId: "req", city: "Nagpur", sameCityOnly: true, donorsOnly: false }

describe("matchBloodDonors", () => {
  it("keeps active, opted-in, in-city donors with a valid number", () => {
    const out = matchBloodDonors([d({ userId: "a", name: "Asha", phone: "+919000000001" })], base)
    expect(out).toEqual([{ userId: "a", name: "Asha", destination: "919000000001" }])
  })
  it("excludes the requester", () => {
    expect(matchBloodDonors([d({ userId: "req" })], base)).toEqual([])
  })
  it("drops opted-out and inactive members", () => {
    expect(matchBloodDonors([d({ whatsappOptIn: false }), d({ status: "suspended" })], base)).toEqual([])
  })
  it("sameCityOnly drops out-of-city donors", () => {
    expect(matchBloodDonors([d({ city: "Pune" })], base)).toEqual([])
  })
  it("allCities (sameCityOnly=false) keeps out-of-city donors", () => {
    const out = matchBloodDonors([d({ userId: "x", city: "Pune", phone: "+919000000002" })], { ...base, sameCityOnly: false })
    expect(out.map((r) => r.userId)).toEqual(["x"])
  })
  it("donorsOnly keeps only volunteers", () => {
    const out = matchBloodDonors(
      [d({ userId: "vol", bloodDonor: true, phone: "+919000000003" }), d({ userId: "non", bloodDonor: false })],
      { ...base, donorsOnly: true },
    )
    expect(out.map((r) => r.userId)).toEqual(["vol"])
  })
  it("dedupes by destination", () => {
    const out = matchBloodDonors(
      [d({ userId: "a", phone: "+919876543210" }), d({ userId: "b", phone: "9876543210" })],
      base,
    )
    expect(out).toHaveLength(1)
  })
  it("when target city unknown, city gate is skipped (no false drops)", () => {
    const out = matchBloodDonors([d({ userId: "a", city: "Pune", phone: "+919000000004" })], { ...base, city: null })
    expect(out.map((r) => r.userId)).toEqual(["a"])
  })
})
