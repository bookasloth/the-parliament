import { describe, it, expect } from "vitest"
import {
  FESTIVE_THEMES, mergeThemeOverrides, extractThemeOverrides,
} from "@/config/chat-themes"

const scheduled = FESTIVE_THEMES.find((t) => t.schedule)!

describe("mergeThemeOverrides", () => {
  it("returns the base set unchanged when there are no overrides", () => {
    expect(mergeThemeOverrides(null)).toBe(FESTIVE_THEMES)
    expect(mergeThemeOverrides({})).not.toBe(FESTIVE_THEMES) // new array
    expect(mergeThemeOverrides({})).toEqual(FESTIVE_THEMES)
  })

  it("applies enabled + schedule overrides onto matching ids only", () => {
    const merged = mergeThemeOverrides({
      [scheduled.id]: { enabled: !scheduled.enabled, schedule: { startMonth: 3, startDay: 1, endMonth: 3, endDay: 5 } },
    })
    const hit = merged.find((t) => t.id === scheduled.id)!
    expect(hit.enabled).toBe(!scheduled.enabled)
    expect(hit.schedule).toEqual({ startMonth: 3, startDay: 1, endMonth: 3, endDay: 5 })
    // untouched theme is identical
    const other = FESTIVE_THEMES.find((t) => t.id !== scheduled.id)!
    expect(merged.find((t) => t.id === other.id)).toEqual(other)
  })

  it("ignores unknown ids (stale blob can't resurrect a removed theme)", () => {
    const merged = mergeThemeOverrides({ "ghost-theme": { enabled: true } })
    expect(merged.map((t) => t.id)).toEqual(FESTIVE_THEMES.map((t) => t.id))
  })

  it("won't attach a schedule to a theme that has none", () => {
    const noSchedule = FESTIVE_THEMES.find((t) => !t.schedule)!
    const merged = mergeThemeOverrides({ [noSchedule.id]: { schedule: { startMonth: 1, startDay: 1, endMonth: 1, endDay: 2 } } })
    expect(merged.find((t) => t.id === noSchedule.id)!.schedule).toBeUndefined()
  })
})

describe("extractThemeOverrides", () => {
  it("emits nothing when nothing changed", () => {
    expect(extractThemeOverrides(FESTIVE_THEMES)).toEqual({})
  })

  it("round-trips through merge", () => {
    const edited = FESTIVE_THEMES.map((t) =>
      t.id === scheduled.id ? { ...t, enabled: !t.enabled } : t,
    )
    const overrides = extractThemeOverrides(edited)
    expect(overrides).toEqual({ [scheduled.id]: { enabled: !scheduled.enabled } })
    expect(mergeThemeOverrides(overrides)).toEqual(edited)
  })
})
