import { describe, it, expect } from "vitest"
import { planBotCron } from "@/modules/bot/cron"

// planBotCron is pure + UTC. Sunday = weekly poll, Monday = weekly roundup,
// the daily jobs always run.
describe("planBotCron", () => {
  it("schedules the weekly poll only on Sunday (UTC)", () => {
    expect(planBotCron(new Date("2026-08-16T00:40:00Z")).weeklyPoll).toBe(true) // Sunday
    expect(planBotCron(new Date("2026-08-17T00:40:00Z")).weeklyPoll).toBe(false) // Monday
  })

  it("schedules the weekly roundup only on Monday (UTC)", () => {
    expect(planBotCron(new Date("2026-08-17T00:40:00Z")).weeklyRoundup).toBe(true) // Monday
    expect(planBotCron(new Date("2026-08-16T00:40:00Z")).weeklyRoundup).toBe(false) // Sunday
  })

  it("runs birthday, event, and games jobs every day", () => {
    for (const iso of ["2026-08-16T00:40:00Z", "2026-08-19T00:40:00Z", "2026-08-22T00:40:00Z"]) {
      const p = planBotCron(new Date(iso))
      expect(p.birthdays).toBe(true)
      expect(p.eventTomorrow).toBe(true)
      expect(p.gamesResults).toBe(true)
    }
  })

  it("never schedules both weekly jobs on the same day", () => {
    for (let d = 0; d < 7; d++) {
      const p = planBotCron(new Date(Date.UTC(2026, 7, 16 + d)))
      expect(p.weeklyPoll && p.weeklyRoundup).toBe(false)
    }
  })
})
