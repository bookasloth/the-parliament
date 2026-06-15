import { prisma } from "@/lib/prisma"

/**
 * Single-school deployment: resolve the one school's id. Cached per request
 * is unnecessary at this scale; the query is trivial and indexed.
 */
export async function getDefaultSchoolId(): Promise<string | null> {
  const school = await prisma.school.findFirst({ select: { id: true } })
  return school?.id ?? null
}
