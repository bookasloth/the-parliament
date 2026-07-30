import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getCurrent } from "@/modules/membership/service"
import { colorAvatar } from "@/lib/avatar"
import type { PlanCode } from "@/config/membership"
import { ProfileView, type ExperienceItem, type ProfileViewData } from "./profile-view"

function fmt(d: Date | null | undefined): string {
  if (!d) return "Present"
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`
}

export const VALID_TABS = ["posts", "about", "followers"] as const
export type TabKey = (typeof VALID_TABS)[number]

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatDate(d: Date | null | undefined): string | null {
  if (!d) return null
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

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
      return { label: "Student", tier: "student" }
  }
}

export async function loadProfile(username: string, initialTab: TabKey) {
  const session = await auth()

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
          homeTown: true,
          correspondenceAddress: true,
          bloodGroup: true,
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
          followers: true,
          following: true,
          posts: true,
        },
      },
    },
  })

  if (!user) notFound()

  const experiences = await prisma.experience.findMany({
    where: { userId: user.id },
    orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }],
  })
  const experienceItems: ExperienceItem[] = experiences.map((e) => ({
    title: e.title,
    company: e.company,
    employmentType: e.employmentType,
    startLabel: fmt(e.startDate),
    endLabel: fmt(e.endDate),
    location: e.location,
    locationType: e.locationType,
    description: e.description,
    skills: Array.isArray(e.skills) ? (e.skills as string[]) : [],
  }))

  const p = user.profile
  const batch = p?.batch
  const membership = resolveMembership(user.membershipStatus)
  const gradYear = batch?.endYear ?? null
  const yearsSince = gradYear ? new Date().getFullYear() - gradYear : null
  const social = (p?.socialLinks ?? {}) as Record<string, string>

  const isOwnProfile = session?.user?.id === user.id
  const viewerFollows =
    !isOwnProfile && session?.user?.id
      ? (await prisma.follow.findUnique({
          where: { followerId_followingId: { followerId: session.user.id, followingId: user.id } },
          select: { id: true },
        })) !== null
      : false
  let owner: ProfileViewData["owner"] = null
  if (isOwnProfile) {
    const current = await getCurrent(user.id)
    owner = {
      planCode: current.planCode as PlanCode,
      canListBusiness: current.benefits.businessListing,
      canApplyMentor: current.benefits.mentorApply,
    }
  }

  const data: ProfileViewData = {
    username: user.username ?? username,
    experiences: experienceItems,
    name: user.legalName,
    initials: user.legalName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase(),
    photoUrl: p?.photoUrl || colorAvatar(user.id),
    coverUrl: p?.coverUrl ?? null,
    headline: p?.headline ?? p?.designation ?? p?.profession ?? null,
    profession: p?.profession ?? null,
    company: p?.company ?? null,
    city: p?.city ?? null,
    homeTown: p?.homeTown ?? null,
    correspondenceAddress: p?.correspondenceAddress ?? null,
    bloodGroup: p?.bloodGroup ?? null,
    bio: p?.bio ?? null,
    house: p?.house ? { name: p.house.name, color: p.house.colorHex } : null,
    batchLabel: batch ? batch.label || `${batch.startYear}–${batch.endYear}` : null,
    yearsSince,
    memberSince: formatDate(user.verifiedAt ?? user.createdAt),
    dateOfBirth: formatDate(user.dateOfBirth),
    gender: user.gender ?? null,
    currentStatus: user.currentStatus ?? null,
    membership,
    isVerified: user.isVerified,
    verificationStatus: user.verificationStatus,
    verifiedOn: formatDate(user.verifiedAt),
    profileCompletion: user.profileCompletion,
    followersCount: user._count.followers,
    followingCount: user._count.following,
    postsCount: user._count.posts,
    userId: user.id,
    viewerFollows,
    higherEducation: p?.higherEducation ?? null,
    skills: Array.isArray(p?.skills) ? (p?.skills as string[]) : [],
    linkedinUrl: p?.linkedinUrl ?? null,
    socialLinks: social,
    owner,
  }

  return <ProfileView data={data} initialTab={initialTab} />
}
