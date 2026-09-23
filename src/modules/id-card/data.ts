import { prisma } from "@/lib/prisma"

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type IdCardTier = "life" | "premium" | "student" | "committee" | "associate" | "member"

export interface IdCardData {
  userId: string
  username: string | null
  name: string
  role: string
  tier: IdCardTier
  tierLabel: string
  photoUrl: string | null
  location: string
  house: string | null
  batch: string | null
  idNumber: string
  validThru: string
  /** true when membership is currently active (drives the verify verdict). */
  valid: boolean
  validReason: string
}

export function tierOf(status: string): { tier: IdCardTier; label: string } {
  switch (status) {
    case "life": return { tier: "life", label: "Life Member" }
    case "premium":
    case "active": return { tier: "premium", label: "Premium" }
    case "student": return { tier: "student", label: "Student" }
    case "committee": return { tier: "committee", label: "Committee" }
    case "associate": return { tier: "associate", label: "Associate" }
    default: return { tier: "member", label: "Member" }
  }
}

function makeIdNumber(id: string, createdAt: Date): string {
  const yy = String(createdAt.getFullYear()).slice(-2)
  const mm = String(createdAt.getMonth() + 1).padStart(2, "0")
  return `NGP-${yy}${mm}${id.slice(0, 4).toUpperCase()}`
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Load a member and derive everything an ID card / verify page needs.
 *  `handle` may be a username or (uuid-shaped) user id. Returns null if not found. */
export async function loadIdCardData(handle: string): Promise<IdCardData | null> {
  const user = await prisma.user.findFirst({
    where: UUID_RE.test(handle) ? { OR: [{ username: handle }, { id: handle }] } : { username: handle },
    select: {
      id: true,
      username: true,
      legalName: true,
      displayName: true,
      membershipStatus: true,
      membershipExpiresAt: true,
      status: true,
      createdAt: true,
      profile: {
        select: {
          photoUrl: true,
          city: true,
          designation: true,
          company: true,
          house: { select: { name: true } },
          batch: { select: { startYear: true, endYear: true } },
        },
      },
    },
  })
  if (!user) return null

  const { tier, label } = tierOf(user.membershipStatus)
  const name = user.displayName || user.legalName || "Alumni"
  const role = [user.profile?.designation, user.profile?.company].filter(Boolean).join(" at ") || label
  const batch = user.profile?.batch
  const isLife = user.membershipStatus === "life"
  const exp = user.membershipExpiresAt

  // Live validity verdict (the whole point of the QR scan).
  let valid = false
  let validReason = ""
  if (user.status === "suspended" || user.status === "banned") {
    validReason = "Account suspended"
  } else if (user.membershipStatus === "free" || user.membershipStatus === "inactive") {
    validReason = "No active membership"
  } else if (isLife) {
    valid = true
    validReason = "Lifetime membership"
  } else if (exp && exp.getTime() < Date.now()) {
    validReason = "Membership expired"
  } else {
    valid = true
    validReason = "Membership active"
  }

  const validThru = isLife
    ? "LIFETIME"
    : exp
      ? `${MONTHS[exp.getMonth()]} ${exp.getFullYear()}`
      : "—"

  return {
    userId: user.id,
    username: user.username,
    name,
    role,
    tier,
    tierLabel: label,
    photoUrl: user.profile?.photoUrl ?? null,
    location: user.profile?.city || "India",
    house: user.profile?.house?.name ?? null,
    batch: batch ? `${batch.startYear}–${batch.endYear}` : null,
    idNumber: makeIdNumber(user.id, user.createdAt),
    validThru,
    valid,
    validReason,
  }
}
