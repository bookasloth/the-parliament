import type { Prisma } from "@/generated/prisma/client"

/** Keyset cursor for the recency feed — last row under `createdAt DESC, id DESC`. */
export interface RecencyCursor {
  createdAt: string
  id: string
}

/** Keyset cursor for the ranked feed — last row under `rankingScore DESC, id DESC`.
 *  Paging by VALUE (not offset) is stable even as rankingScore mutates mid-scroll:
 *  the offset drift (dup/skip) only bites when you page by position. */
export interface RankedCursor {
  rankingScore: number
  id: string
}

export type FeedCursor = RecencyCursor | RankedCursor

export function isRankedCursor(c: FeedCursor): c is RankedCursor {
  return typeof (c as RankedCursor).rankingScore === "number"
}

/**
 * Prisma WHERE fragment selecting rows strictly AFTER the cursor under a
 * `createdAt DESC, id DESC` sort — i.e. `(createdAt, id) < (cursor.createdAt,
 * cursor.id)`. The id tie-break makes the order total, so no row is repeated or
 * skipped across pages even when many posts share a createdAt. Pure (type-only
 * Prisma import, no client) so it unit-tests without a DB.
 */
export function recencyCursorWhere(cursor: RecencyCursor): Prisma.PostWhereInput {
  const createdAt = new Date(cursor.createdAt)
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { AND: [{ createdAt }, { id: { lt: cursor.id } }] },
    ],
  }
}

/**
 * Prisma WHERE fragment selecting rows strictly AFTER the cursor under a
 * `rankingScore DESC, id DESC` sort — i.e. `(rankingScore, id) < (cursor.
 * rankingScore, cursor.id)`. The id tie-break totalises the order so pages never
 * overlap or skip, and paging by score VALUE survives rankingScore mutating
 * between page loads (the offset feed's core bug). Pure — unit-testable, no DB.
 */
export function rankedCursorWhere(cursor: RankedCursor): Prisma.PostWhereInput {
  return {
    OR: [
      { rankingScore: { lt: cursor.rankingScore } },
      { AND: [{ rankingScore: cursor.rankingScore }, { id: { lt: cursor.id } }] },
    ],
  }
}

/** Total order matching `rankingScore DESC, id DESC` — the sort the ranked keyset
 *  pages over. Exported as the executable spec of `rankedCursorWhere`. */
export function compareRanked(
  a: { rankingScore: number; id: string },
  b: { rankingScore: number; id: string },
): number {
  if (a.rankingScore !== b.rankingScore) return b.rankingScore - a.rankingScore
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0 // id DESC
}

/** Predicate mirror of `rankedCursorWhere`: is `row` strictly after `cursor`
 *  under `rankingScore DESC, id DESC`? Kept in lockstep with the WHERE above. */
export function afterRankedCursor(
  row: { rankingScore: number; id: string },
  cursor: RankedCursor,
): boolean {
  return (
    row.rankingScore < cursor.rankingScore ||
    (row.rankingScore === cursor.rankingScore && row.id < cursor.id)
  )
}

/** Cursor for the next ranked page from the last row of this one, or null when the
 *  page was short (end reached). */
export function nextRankedCursor(
  last: { rankingScore: number; id: string } | undefined,
  full: boolean,
): RankedCursor | null {
  return last && full ? { rankingScore: last.rankingScore, id: last.id } : null
}
