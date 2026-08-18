import { describe, it, expect } from "vitest"
// allowJs infers types from the .mjs helper, so no @ts-expect-error is needed
// (an unused one is itself a TS2578 hard-gate error).
import { parseMigrationList } from "../scripts/lib/parse-migration-list.mjs"

describe("parseMigrationList", () => {
  it("parses + trims a comma list of valid migration names", () => {
    const { valid, invalid } = parseMigrationList(" 20260809000000_event_reminder_sent_at , 20260809000100_committee_members ")
    expect(valid).toEqual(["20260809000000_event_reminder_sent_at", "20260809000100_committee_members"])
    expect(invalid).toEqual([])
  })

  it("handles empty / null / undefined", () => {
    for (const raw of ["", null, undefined, "  ,  "]) {
      expect(parseMigrationList(raw)).toEqual({ valid: [], invalid: [] })
    }
  })

  it("rejects shell-injection + malformed names (keeps them out of valid)", () => {
    const { valid, invalid } = parseMigrationList("20260809000000_ok, rm -rf /, 20260809000100_x; DROP TABLE users, badname, 123_short")
    expect(valid).toEqual(["20260809000000_ok"])
    expect(invalid).toEqual(["rm -rf /", "20260809000100_x; DROP TABLE users", "badname", "123_short"])
  })

  it("rejects uppercase / spaces / path traversal in names", () => {
    const { valid, invalid } = parseMigrationList("20260809000000_Bad, 20260809000000_../etc, 20260809000000_ok_name")
    expect(valid).toEqual(["20260809000000_ok_name"])
    expect(invalid.sort()).toEqual(["20260809000000_../etc", "20260809000000_Bad"].sort())
  })
})
