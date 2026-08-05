// JNV Nagpur house systems. THREE distinct, non-interchangeable identities:
//   • pre-2002 boys:  Jawahar (blue), Tilak (green), Subhash (red), Rajiv (yellow)
//   • pre-2002 girls: Indira, Laxmi
//   • post-2002 ANSU (everyone): Aravali (blue), Nilgiri (green), Shiwalik (red), Udaigiri (yellow)
//
// Old and new houses are NOT the same identity even when they share a colour
// (Jawahar ≠ Aravali). This module never maps one system onto the other — it
// only decides which options to OFFER for a given batch year + gender.

export type HouseSystem = "pre2002" | "ansu"

/** Batches that started before this year use the pre-2002 house systems.
 *  Configurable via env because the exact 2001/02 cutoff is uncertain. */
export const HOUSE_TRANSITION_YEAR = (() => {
  const raw = Number(process.env.HOUSE_TRANSITION_YEAR)
  return Number.isFinite(raw) && raw > 0 ? raw : 2002
})()

export interface HouseSeed {
  name: string
  colorName: string
  colorHex: string
  system: HouseSystem
  /** null = open to any gender (ANSU). "male"/"female" = restricted. */
  gender: "male" | "female" | null
  isGirlsOnly: boolean
}

// Single source of truth for the house roster (used by the seed + migration).
export const HOUSE_CATALOG: HouseSeed[] = [
  // Post-2002 ANSU — everyone.
  { name: "Aravali", colorName: "blue", colorHex: "#1e3a8a", system: "ansu", gender: null, isGirlsOnly: false },
  { name: "Nilgiri", colorName: "green", colorHex: "#15803d", system: "ansu", gender: null, isGirlsOnly: false },
  { name: "Shiwalik", colorName: "red", colorHex: "#b91c1c", system: "ansu", gender: null, isGirlsOnly: false },
  { name: "Udaigiri", colorName: "yellow", colorHex: "#ca8a04", system: "ansu", gender: null, isGirlsOnly: false },
  // Pre-2002 boys.
  { name: "Jawahar", colorName: "blue", colorHex: "#1e3a8a", system: "pre2002", gender: "male", isGirlsOnly: false },
  { name: "Tilak", colorName: "green", colorHex: "#15803d", system: "pre2002", gender: "male", isGirlsOnly: false },
  { name: "Subhash", colorName: "red", colorHex: "#b91c1c", system: "pre2002", gender: "male", isGirlsOnly: false },
  { name: "Rajiv", colorName: "yellow", colorHex: "#ca8a04", system: "pre2002", gender: "male", isGirlsOnly: false },
  // Pre-2002 girls.
  { name: "Indira", colorName: "orange", colorHex: "#ea580c", system: "pre2002", gender: "female", isGirlsOnly: true },
  { name: "Laxmi", colorName: "pink", colorHex: "#db2777", system: "pre2002", gender: "female", isGirlsOnly: true },
]

/** Which house system a batch belongs to. Unknown/blank year → ansu (current). */
export function houseSystemForBatch(startYear?: number | null): HouseSystem {
  return startYear != null && startYear < HOUSE_TRANSITION_YEAR ? "pre2002" : "ansu"
}

/** House `gender` values acceptable for a member of the given gender.
 *  null (open) is always acceptable; unknown/"other" gender sees all. */
export function allowedHouseGenders(gender?: string | null): (string | null)[] {
  const g = gender?.toLowerCase()
  if (g === "male") return [null, "male"]
  if (g === "female") return [null, "female"]
  return [null, "male", "female"]
}

/** True if a house (by system + gender) may be offered to this batch/gender. */
export function isHouseValidFor(
  house: { system: string; gender: string | null },
  startYear?: number | null,
  gender?: string | null,
): boolean {
  if (house.system !== houseSystemForBatch(startYear)) return false
  return allowedHouseGenders(gender).includes(house.gender)
}

/** Filter a roster down to the houses offered for a batch year + gender. */
export function housesForContext<T extends { system: string; gender: string | null }>(
  houses: T[],
  startYear?: number | null,
  gender?: string | null,
): T[] {
  return houses.filter((h) => isHouseValidFor(h, startYear, gender))
}
