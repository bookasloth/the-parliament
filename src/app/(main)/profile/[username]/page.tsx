import { notFound } from "next/navigation"
// Auth disabled for UI testing — profile page is public
// import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { ProfileView, type ProfileViewData } from "./profile-view"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** Map the raw membershipStatus column to a display tier + asterisk color key. */
function resolveMembership(status: string): ProfileViewData["membership"] {
  switch (status) {
    case "life":
      return { label: "Life Member", tier: "life" }
    case "premium":
    case "active":
      return { label: "Premium", tier: "premium" }
    case "student":
      return { label: "Student", tier: "student" }
    case "associate":
      return { label: "Associate", tier: "associate" }
    case "committee":
      return { label: "Committee", tier: "committee" }
    default:
      return { label: "Free", tier: "inactive" }
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>
}) {
  const { username } = await params
  // const session = await auth()

  const user = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      legalName: true,
      displayName: true,
      username: true,
      memberType: true,
      currentStatus: true,
      gender: true,
      dateOfBirth: true,
      membershipStatus: true,
      isVerified: true,
      verifiedAt: true,
      verificationStatus: true,
      profileCompletion: true,
      createdAt: true,
      profile: {
        select: {
          photoUrl: true,
          coverUrl: true,
          bio: true,
          city: true,
          profession: true,
          company: true,
          designation: true,
          higherEducation: true,
          skills: true,
          linkedinUrl: true,
          socialLinks: true,
          headline: true,
          house: { select: { name: true, colorHex: true } },
          batch: { select: { startYear: true, endYear: true, label: true } },
        },
      },
      _count: {
        select: {
          connectionsRequested: true,
          posts: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  // const isOwnProfile = session?.user?.id === user.id

  const p = user.profile
  const batch = p?.batch
  const membership = resolveMembership(user.membershipStatus)
  const gradYear = batch?.endYear ?? null
  const yearsSince = gradYear ? new Date().getFullYear() - gradYear : null

  const social = (p?.socialLinks ?? {}) as Record<string, string>

  const data: ProfileViewData = {
    name: user.legalName,
    initials: user.legalName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase(),
    photoUrl: p?.photoUrl ?? null,
    coverUrl: p?.coverUrl ?? null,
    headline: p?.headline ?? p?.designation ?? p?.profession ?? null,
    profession: p?.profession ?? null,
    company: p?.company ?? null,
    city: p?.city ?? null,
    bio: p?.bio ?? null,
    house: p?.house ? { name: p.house.name, color: p.house.colorHex } : null,
    batchLabel: batch ? batch.label || `${batch.startYear}–${batch.endYear}` : null,
    yearsSince,
    memberSince: formatDate(user.createdAt),
    dateOfBirth: formatDate(user.dateOfBirth),
    gender: user.gender ?? null,
    currentStatus: user.currentStatus ?? null,
    membership,
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    verifiedOn: formatDate(user.verifiedAt),
    profileCompletion: user.profileCompletion,
    connectionsCount: user._count.connectionsRequested,
    postsCount: user._count.posts,
    higherEducation: p?.higherEducation ?? null,
    skills: Array.isArray(p?.skills) ? (p?.skills as string[]) : [],
    linkedinUrl: p?.linkedinUrl ?? null,
    socialLinks: social,
  }

  return <ProfileView data={data} />
}
