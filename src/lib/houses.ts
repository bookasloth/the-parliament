import { prisma } from "@/lib/prisma"
import { isHouseValidFor, allowedHouseGenders } from "@/config/houses"

export interface HouseOption {
  id: string
  name: string
  colorHex: string
  system: string
  gender: string | null
}

/** Houses to OFFER for a batch year + gender. With no context, returns all. */
export async function listHousesForContext(opts: {
  schoolId?: string
  startYear?: number | null
  gender?: string | null
}): Promise<HouseOption[]> {
  const houses = await prisma.house.findMany({
    where: opts.schoolId ? { schoolId: opts.schoolId } : {},
    orderBy: [{ system: "asc" }, { name: "asc" }],
    select: { id: true, name: true, colorHex: true, system: true, gender: true },
  })
  const noContext = opts.startYear == null && !opts.gender
  return noContext ? houses : houses.filter((h) => isHouseValidFor(h, opts.startYear ?? null, opts.gender ?? null))
}

/** Whether a chosen house is allowed for the user's batch year + gender. When
 *  the batch year is unknown we can't decide the era, so only gender is
 *  enforced — the era check is skipped rather than wrongly rejecting. */
export async function isHouseAllowed(
  houseId: string,
  startYear?: number | null,
  gender?: string | null,
): Promise<boolean> {
  const h = await prisma.house.findUnique({ where: { id: houseId }, select: { system: true, gender: true } })
  if (!h) return false
  if (startYear == null) return allowedHouseGenders(gender).includes(h.gender)
  return isHouseValidFor(h, startYear, gender)
}
