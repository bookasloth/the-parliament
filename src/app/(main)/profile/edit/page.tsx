import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { getDirectoryFacets } from "@/modules/directory/service"
import { colorAvatar } from "@/lib/avatar"
import { EditProfileClient, type EditInitial, type ExpRow, type EduRow } from "./edit-client"

export const dynamic = "force-dynamic"

function ym(d: Date | null): { month?: number; year?: number } {
  if (!d) return {}
  return { month: d.getUTCMonth() + 1, year: d.getUTCFullYear() }
}

export default async function EditProfilePage() {
  const sessionUser = await requireUser()
  const schoolId = (await getDefaultSchoolId()) ?? undefined

  const [user, facets, experiences, educations] = await Promise.all([
    prisma.user.findUnique({
      where: { id: sessionUser.id },
      select: {
        legalName: true, displayName: true, username: true, email: true,
        dateOfBirth: true, gender: true,
        profile: {
          select: {
            photoUrl: true, coverUrl: true, bio: true, houseId: true, batchId: true, bloodGroup: true,
            city: true, correspondenceAddress: true, homeTown: true,
            company: true, designation: true, higherEducation: true, skills: true,
            linkedinUrl: true, socialLinks: true, visibility: true,
          },
        },
      },
    }),
    getDirectoryFacets(schoolId),
    prisma.experience.findMany({ where: { userId: sessionUser.id }, orderBy: [{ sortOrder: "asc" }, { startDate: "desc" }] }),
    prisma.education.findMany({ where: { userId: sessionUser.id }, orderBy: [{ sortOrder: "asc" }, { endYear: "desc" }] }),
  ])
  if (!user) throw new Error("User not found")

  const expRows: ExpRow[] = experiences.map((e) => ({
    id: e.id,
    title: e.title,
    company: e.company,
    employmentType: e.employmentType ?? "",
    location: e.location ?? "",
    locationType: e.locationType ?? "",
    current: e.endDate === null,
    startMonth: ym(e.startDate).month,
    startYear: ym(e.startDate).year,
    endMonth: ym(e.endDate).month,
    endYear: ym(e.endDate).year,
    description: e.description ?? "",
    skills: Array.isArray(e.skills) ? (e.skills as string[]).join(", ") : "",
  }))
  const eduRows: EduRow[] = educations.map((e) => ({
    id: e.id,
    school: e.school,
    degree: e.degree ?? "",
    fieldOfStudy: e.fieldOfStudy ?? "",
    startYear: e.startYear ?? undefined,
    endYear: e.endYear ?? undefined,
  }))

  const p = user.profile
  const social = (p?.socialLinks ?? {}) as Record<string, string>
  const nameParts = user.legalName.split(" ")
  const initial: EditInitial = {
    firstName: nameParts[0] ?? "",
    lastName: nameParts.slice(1).join(" "),
    nickname: user.displayName && user.displayName !== user.legalName ? user.displayName : "",
    username: user.username ?? "",
    email: user.email,
    dateOfBirth: user.dateOfBirth ? user.dateOfBirth.toISOString().slice(0, 10) : "",
    gender: user.gender ?? "",
    photoUrl: p?.photoUrl || colorAvatar(sessionUser.id),
    coverUrl: p?.coverUrl ?? "",
    bio: p?.bio ?? "",
    houseId: p?.houseId ?? "",
    batchId: p?.batchId ?? "",
    bloodGroup: p?.bloodGroup ?? "",
    city: p?.city ?? "",
    address: p?.correspondenceAddress ?? "",
    homeTown: p?.homeTown ?? "",
    company: p?.company ?? "",
    jobTitle: p?.designation ?? "",
    higherEducation: p?.higherEducation ?? "",
    skills: Array.isArray(p?.skills) ? (p?.skills as string[]).join(", ") : "",
    linkedin: p?.linkedinUrl ?? "",
    github: social.github ?? "",
    twitter: social.twitter ?? "",
    facebook: social.facebook ?? "",
    instagram: social.instagram ?? "",
    website: social.website ?? "",
    visibility: p?.visibility ?? "alumni",
  }

  return <EditProfileClient initial={initial} facets={facets} experiences={expRows} educations={eduRows} />
}
