/**
 * Blood donor→patient compatibility.
 *
 * Groups are the 8 ABO/Rh values used across the app (`Profile.bloodGroup`, and
 * the auto-assigned `Group{type:"blood", refDepartment}`). A request for a
 * patient of group X must reach members whose OWN blood group can DONATE to X —
 * not members who share X.
 */

export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] as const
export type BloodGroup = (typeof BLOOD_GROUPS)[number]

/** Donor groups that can give to a patient of the key group. */
const DONORS: Record<BloodGroup, BloodGroup[]> = {
  "A+": ["A+", "A-", "O+", "O-"],
  "A-": ["A-", "O-"],
  "B+": ["B+", "B-", "O+", "O-"],
  "B-": ["B-", "O-"],
  "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"], // universal recipient
  "AB-": ["AB-", "A-", "B-", "O-"],
  "O+": ["O+", "O-"],
  "O-": ["O-"], // only O- donors
}

export function isBloodGroup(v: string | null | undefined): v is BloodGroup {
  return !!v && (BLOOD_GROUPS as readonly string[]).includes(v)
}

/** Compatible donor groups for a patient group; [] if the group is invalid. */
export function donorGroupsFor(patient: string | null | undefined): BloodGroup[] {
  return isBloodGroup(patient) ? DONORS[patient] : []
}
