import { describe, it, expect } from "vitest"
import { recencyCursorWhere } from "@/modules/feed/cursor"

const cursor = { createdAt: "2026-08-06T10:00:00.000Z", id: "post-123" }

describe("recencyCursorWhere", () => {
  it("selects strictly-earlier rows OR same-createdAt-smaller-id (total order tie-break)", () => {
    const w = recencyCursorWhere(cursor)
    const or = w.OR as Array<Record<string, unknown>>
    expect(or).toHaveLength(2)
    expect(or[0]).toEqual({ createdAt: { lt: new Date(cursor.createdAt) } })
    expect(or[1]).toEqual({ AND: [{ createdAt: new Date(cursor.createdAt) }, { id: { lt: cursor.id } }] })
  })

  it("parses the ISO string into a Date (real timestamp compare, not lexical)", () => {
    const or = recencyCursorWhere(cursor).OR as Array<{ createdAt: { lt: unknown } }>
    expect(or[0].createdAt.lt).toBeInstanceOf(Date)
    expect((or[0].createdAt.lt as Date).toISOString()).toBe(cursor.createdAt)
  })

  it("carries the id into the tie-break branch so equal-timestamp posts never repeat/skip", () => {
    const or = recencyCursorWhere({ createdAt: cursor.createdAt, id: "zzz" }).OR as Array<{ AND?: Array<Record<string, unknown>> }>
    expect(or[1].AND?.[1]).toEqual({ id: { lt: "zzz" } })
  })
})
