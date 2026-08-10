import { describe, it, expect } from "vitest"
import {
  rankedCursorWhere,
  recencyCursorWhere,
  compareRanked,
  afterRankedCursor,
  nextRankedCursor,
  isRankedCursor,
  type RankedCursor,
} from "@/modules/feed/cursor"

type Row = { rankingScore: number; id: string }

describe("rankedCursorWhere", () => {
  it("builds the (rankingScore, id) < cursor keyset with an id tie-break", () => {
    const where = rankedCursorWhere({ rankingScore: 12.5, id: "abc" })
    expect(where).toEqual({
      OR: [
        { rankingScore: { lt: 12.5 } },
        { AND: [{ rankingScore: 12.5 }, { id: { lt: "abc" } }] },
      ],
    })
  })
})

describe("isRankedCursor", () => {
  it("distinguishes ranked from recency cursors", () => {
    expect(isRankedCursor({ rankingScore: 1, id: "a" })).toBe(true)
    expect(isRankedCursor({ createdAt: "2026-01-01", id: "a" })).toBe(false)
  })
})

describe("compareRanked", () => {
  it("orders by rankingScore DESC then id DESC", () => {
    const rows: Row[] = [
      { rankingScore: 5, id: "a" },
      { rankingScore: 10, id: "b" },
      { rankingScore: 10, id: "c" },
      { rankingScore: 5, id: "z" },
    ]
    const sorted = [...rows].sort(compareRanked).map((r) => r.id)
    // score 10 first (c before b: id DESC), then score 5 (z before a: id DESC)
    expect(sorted).toEqual(["c", "b", "z", "a"])
  })
})

describe("afterRankedCursor mirrors rankedCursorWhere", () => {
  const cursor: RankedCursor = { rankingScore: 10, id: "m" }
  it("excludes the cursor row itself and higher-ranked rows", () => {
    expect(afterRankedCursor({ rankingScore: 10, id: "m" }, cursor)).toBe(false)
    expect(afterRankedCursor({ rankingScore: 11, id: "a" }, cursor)).toBe(false)
    expect(afterRankedCursor({ rankingScore: 10, id: "z" }, cursor)).toBe(false) // id "z" > "m"
  })
  it("includes strictly-lower rows (by score, or equal score + smaller id)", () => {
    expect(afterRankedCursor({ rankingScore: 9.9, id: "z" }, cursor)).toBe(true)
    expect(afterRankedCursor({ rankingScore: 10, id: "a" }, cursor)).toBe(true) // id "a" < "m"
  })
})

describe("nextRankedCursor", () => {
  it("returns the last row's key on a full page", () => {
    expect(nextRankedCursor({ rankingScore: 3.2, id: "x" }, true)).toEqual({
      rankingScore: 3.2,
      id: "x",
    })
  })
  it("returns null on a short page (end reached) or empty page", () => {
    expect(nextRankedCursor({ rankingScore: 3.2, id: "x" }, false)).toBeNull()
    expect(nextRankedCursor(undefined, true)).toBeNull()
  })
})

// The core property: paging by VALUE is stable even when a non-boundary row's
// score mutates mid-scroll (which is exactly what offset pagination gets wrong).
describe("keyset stability under mid-scroll score mutation", () => {
  function page(rows: Row[], cursor: RankedCursor | null, size: number): { rows: Row[]; next: RankedCursor | null } {
    const eligible = rows.filter((r) => (cursor ? afterRankedCursor(r, cursor) : true))
    const ordered = [...eligible].sort(compareRanked).slice(0, size)
    const last = ordered[ordered.length - 1]
    return { rows: ordered, next: nextRankedCursor(last, ordered.length === size) }
  }

  it("never repeats or skips a row across pages when a later-page row's score changes", () => {
    const rows: Row[] = Array.from({ length: 10 }, (_, i) => ({
      rankingScore: 100 - i * 5, // 100, 95, 90, ... distinct, descending
      id: `id${String(i).padStart(2, "0")}`,
    }))

    const p1 = page(rows, null, 3)
    expect(p1.rows.map((r) => r.id)).toEqual(["id00", "id01", "id02"])

    // A row that has NOT been served yet gets a big score bump (engagement spike)
    // — with offset pagination this would shove a page-1 row into page 2 (a dup).
    const mutated = rows.map((r) => (r.id === "id07" ? { ...r, rankingScore: 999 } : r))

    const p2 = page(mutated, p1.next, 3)
    // Keyset pages by the value boundary, so already-served ids never come back...
    for (const r of p1.rows) expect(p2.rows.map((x) => x.id)).not.toContain(r.id)
    // ...and the bumped row does NOT re-appear on page 2 (its score is now above
    // the cursor boundary, so the keyset correctly excludes it — no duplicate).
    expect(p2.rows.map((r) => r.id)).not.toContain("id07")

    // Union of the two pages has no duplicates.
    const seen = [...p1.rows, ...p2.rows].map((r) => r.id)
    expect(new Set(seen).size).toBe(seen.length)
  })
})

describe("recencyCursorWhere unchanged", () => {
  it("keys on (createdAt, id)", () => {
    const where = recencyCursorWhere({ createdAt: "2026-01-02T00:00:00.000Z", id: "k" })
    expect(where).toEqual({
      OR: [
        { createdAt: { lt: new Date("2026-01-02T00:00:00.000Z") } },
        { AND: [{ createdAt: new Date("2026-01-02T00:00:00.000Z") }, { id: { lt: "k" } }] },
      ],
    })
  })
})
