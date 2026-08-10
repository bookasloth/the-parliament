import { cache } from "react"
import { prisma } from "@/lib/prisma"

/**
 * Single-school deployment: resolve the one school's id. Wrapped in React
 * cache() so the many pages that call it per request share one query instead
 * of each firing its own round-trip (the value never changes within a request).
 */
export const getDefaultSchoolId = cache(async (): Promise<string | null> => {
  // Deterministic: oldest school is the canonical default. Without orderBy,
  // a future 2nd school could make Postgres return an arbitrary row, silently
  // scoping /community to the wrong school and hiding every other school's users.
  const school = await prisma.school.findFirst({
    orderBy: { createdAt: "asc" },
    select: { id: true },
  })
  return school?.id ?? null
})
