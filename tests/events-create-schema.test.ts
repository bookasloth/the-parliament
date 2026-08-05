import { describe, it, expect } from "vitest"
import { createEventSchema } from "@/app/(main)/events/create-schema"

const base = { title: "Batch Meetup", date: "2026-10-15", time: "18:30", mode: "in-person" as const }

describe("createEventSchema", () => {
  it("accepts a valid in-person event", () => {
    expect(createEventSchema.safeParse(base).success).toBe(true)
  })

  it("accepts an optional valid URL and empty string, rejects a bad URL", () => {
    expect(createEventSchema.safeParse({ ...base, eventUrl: "https://ex.com/e" }).success).toBe(true)
    expect(createEventSchema.safeParse({ ...base, eventUrl: "" }).success).toBe(true)
    expect(createEventSchema.safeParse({ ...base, eventUrl: "not-a-url" }).success).toBe(false)
  })

  it("rejects short title, bad date, bad time, bad mode", () => {
    expect(createEventSchema.safeParse({ ...base, title: "x" }).success).toBe(false)
    expect(createEventSchema.safeParse({ ...base, date: "15-10-2026" }).success).toBe(false)
    expect(createEventSchema.safeParse({ ...base, time: "6pm" }).success).toBe(false)
    expect(createEventSchema.safeParse({ ...base, mode: "offline" }).success).toBe(false)
  })
})
