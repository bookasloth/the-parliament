import { cache } from "react"
import { prisma } from "@/lib/prisma"

/**
 * Single-school deployment: resolve the one school's id. Wrapped in React
 * cache() so the many pages that call it per request share one query instead
 * of each firing its own round-trip (the value never changes within a request).
 */
export const getDefaultSchoolId = cache(async (): Promise<string | null> => {
  const school = await prisma.school.findFirst({ select: { id: true } })
  return school?.id ?? null
})
