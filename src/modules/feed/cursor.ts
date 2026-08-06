import type { Prisma } from "@/generated/prisma/client"

/** Keyset pagination cursor — the last row of the previous recency page. */
export interface FeedCursor {
  createdAt: string
  id: string
}

/**
 * Prisma WHERE fragment selecting rows strictly AFTER the cursor under a
 * `createdAt DESC, id DESC` sort — i.e. `(createdAt, id) < (cursor.createdAt,
 * cursor.id)`. The id tie-break makes the order total, so no row is repeated or
 * skipped across pages even when many posts share a createdAt. Pure (type-only
 * Prisma import, no client) so it unit-tests without a DB.
 */
export function recencyCursorWhere(cursor: FeedCursor): Prisma.PostWhereInput {
  const createdAt = new Date(cursor.createdAt)
  return {
    OR: [
      { createdAt: { lt: createdAt } },
      { AND: [{ createdAt }, { id: { lt: cursor.id } }] },
    ],
  }
}
