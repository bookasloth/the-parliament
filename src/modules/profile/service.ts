import { prisma } from "@/lib/prisma"
import { getBalance, thresholdFor } from "@/modules/karma/ledger"

export interface ProfileView {
  id: string
  username: string | null
  legalName: string
  displayName: string
  email: string | null
  isVerified: boolean
  verifiedAt: Date | null
  memberType: string
  membershipStatus: string
  status: string
  createdAt: Date
  profile: {
    photoUrl: string | null
    bio: string | null
    headline: string | null
    city: string | null
    profession: string | null
    company: string | null
    designation: string | null
    department: string | null
    industry: string | null
    higherEducation: string | null
    linkedinUrl: string | null
    socialLinks: Record<string, unknown>
    skills: unknown[]
    visibility: string
    contactAlwaysShare: boolean
    house: { id: string; name: string; colorHex: string } | null
    batch: { id: string; label: string } | null
  } | null
  divisions: { id: string; name: string; isProtected: boolean }[]
  karma: { balance: number; earned30d: number; lifetimeEarned: number }
  threshold: ReturnType<typeof thresholdFor>
  interests: { id: string; slug: string; name: string }[]
}

export async function getProfileByUsername(
  username: string,
  viewerId?: string,
): Promise<ProfileView | null> {
  const user = await prisma.user.findUnique({
    where: { username },
    include: {
      profile: {
        include: {
          house: { select: { id: true, name: true, colorHex: true } },
          batch: { select: { id: true, label: true } },
        },
      },
      userDivisions: { include: { division: true } },
      interests: { include: { interest: true } },
    },
  })

  if (!user || user.deletedAt) return null

  const karma = await getBalance(user.id)
  const isSelf = viewerId === user.id
  const showEmail = isSelf || user.profile?.contactAlwaysShare === true

  return {
    id: user.id,
    username: user.username,
    legalName: user.legalName,
    displayName: user.displayName,
    email: showEmail ? user.email : null,
    isVerified: user.isVerified,
    verifiedAt: user.verifiedAt,
    memberType: user.memberType,
    membershipStatus: user.membershipStatus,
    status: user.status,
    createdAt: user.createdAt,
    profile: user.profile
      ? {
          photoUrl: user.profile.photoUrl,
          bio: user.profile.bio,
          headline: user.profile.headline,
          city: user.profile.city,
          profession: user.profile.profession,
          company: user.profile.company,
          designation: user.profile.designation,
          department: user.profile.department,
          industry: user.profile.industry,
          higherEducation: user.profile.higherEducation,
          linkedinUrl: user.profile.linkedinUrl,
          socialLinks: (user.profile.socialLinks as Record<string, unknown>) ?? {},
          skills: (user.profile.skills as unknown[]) ?? [],
          visibility: user.profile.visibility,
          contactAlwaysShare: user.profile.contactAlwaysShare,
          house: user.profile.house,
          batch: user.profile.batch,
        }
      : null,
    divisions: user.userDivisions.map((ud) => ({
      id: ud.division.id,
      name: ud.division.name,
      isProtected: ud.isProtected,
    })),
    karma,
    threshold: thresholdFor(karma.balance),
    interests: user.interests.map((ui) => ({
      id: ui.interest.id,
      slug: ui.interest.slug,
      name: ui.interest.name,
    })),
  }
}

export interface ProfileUpdate {
  displayName?: string
  bio?: string
  headline?: string
  city?: string
  profession?: string
  company?: string
  designation?: string
  department?: string
  industry?: string
  higherEducation?: string
  linkedinUrl?: string
  photoUrl?: string
  socialLinks?: Record<string, unknown>
  skills?: unknown[]
  visibility?: string
  contactAlwaysShare?: boolean
  whatsappOptIn?: boolean
  showOnMap?: boolean
}

export async function updateProfile(userId: string, patch: ProfileUpdate) {
  const userFields: Record<string, unknown> = {}
  if (patch.displayName !== undefined) userFields.displayName = patch.displayName

  const profileFields = { ...patch } as Record<string, unknown>
  delete profileFields.displayName

  await prisma.$transaction([
    ...(Object.keys(userFields).length
      ? [prisma.user.update({ where: { id: userId }, data: userFields })]
      : []),
    ...(Object.keys(profileFields).length
      ? [
          prisma.profile.upsert({
            where: { userId },
            create: { userId, ...profileFields },
            update: profileFields,
          }),
        ]
      : []),
  ])
}
