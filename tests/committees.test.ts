import { describe, it, expect } from "vitest"
import { COMMITTEE_KEYS, COMMITTEE_LABELS, isCommitteeKey } from "@/config/committees"

describe("committee config", () => {
  it("has the four committees with stable keys + labels", () => {
    expect(COMMITTEE_KEYS).toEqual(["alumni_student", "sports_culture", "tech_media", "executive"])
    expect(COMMITTEE_LABELS.executive).toBe("Executive")
    expect(COMMITTEE_LABELS.alumni_student).toBe("Alumni-Student Relation")
  })

  it("validates committee keys", () => {
    expect(isCommitteeKey("tech_media")).toBe(true)
    expect(isCommitteeKey("nonsense")).toBe(false)
    expect(isCommitteeKey("")).toBe(false)
  })

  it("labels cover every key", () => {
    for (const k of COMMITTEE_KEYS) expect(COMMITTEE_LABELS[k]).toBeTruthy()
  })
})
