"use server"

import { revalidatePath, updateTag } from "next/cache"
import { Prisma } from "@/generated/prisma/client"
import type { ProfileVisibility } from "@/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"
import { monthYearToDate } from "@/modules/profile/history"
import { validateUsernameFormat } from "@/lib/username-check"
import { isHouseAllowed } from "@/lib/houses"

async function revalidateOwnProfile(userId: string) {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { username: true } })
  if (u?.username) revalidatePath(`/${u.username}`)
  updateTag("directory")
}

export async function saveAccount(input: {
  firstName: string
  lastName: string
  nickname?: string
  username: string
  dateOfBirth?: string
  gender?: string
  bio?: string
  headline?: string
  houseId?: string
  batchId?: string
  bloodGroup?: string
  bloodDonor?: boolean
}) {
  const user = await requireUser()
  const fullName = `${input.firstName} ${input.lastName}`.replace(/\s+/g, " ").trim()
  if (!fullName) throw new Error("Name is required")

  const fmt = validateUsernameFormat(input.username)
  if (!fmt.ok) throw new Error(fmt.reason)
  const username = fmt.slug
  const clash = await prisma.user.findFirst({ where: { username, id: { not: user.id } }, select: { id: true } })
  if (clash) throw new Error("That username is taken")

  // House and batch are immutable once set — keep the existing value.
  const existing = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { houseId: true, batchId: true },
  })
  const houseId = existing?.houseId ?? (input.houseId || null)
  const batchId = existing?.batchId ?? (input.batchId || null)

  // Validate a NEWLY-chosen house against the member's batch era + gender.
  // (Existing/locked houses are never re-validated — alumni data is preserved.)
  if (!existing?.houseId && houseId) {
    let startYear: number | null = null
    if (batchId) {
      const b = await prisma.batch.findUnique({ where: { id: batchId }, select: { startYear: true } })
      startYear = b?.startYear ?? null
    }
    const ok = await isHouseAllowed(houseId, startYear, input.gender ?? null)
    if (!ok) throw new Error("That house isn't available for your batch and gender.")
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      legalName: fullName,
      displayName: input.nickname?.trim() || fullName,
      username,
      dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : null,
      gender: input.gender || null,
    },
  })
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      bio: input.bio ?? null,
      headline: input.headline?.trim() || null,
      houseId,
      batchId,
      bloodGroup: input.bloodGroup || null,
      bloodDonor: !!input.bloodDonor,
    },
    create: {
      userId: user.id,
      bio: input.bio ?? null,
      headline: input.headline?.trim() || null,
      houseId,
      batchId,
      bloodGroup: input.bloodGroup || null,
      bloodDonor: !!input.bloodDonor,
    },
  })
  revalidatePath(`/${username}`)
  updateTag("directory")
}

/** Loose E.164 normaliser: keep a single leading +, strip spaces/dashes. Empty → null. */
function normalizePhone(raw?: string): string | null {
  const s = (raw ?? "").trim()
  if (!s) return null
  const plus = s.startsWith("+")
  const digits = s.replace(/[^\d]/g, "")
  if (digits.length < 7 || digits.length > 15) throw new Error("Enter a valid phone number (7–15 digits)")
  return (plus ? "+" : "") + digits
}

export async function saveContact(input: {
  city?: string
  address?: string
  homeTown?: string
  phone?: string
  whatsappOptIn?: boolean
}) {
  const user = await requireUser()
  const phone = normalizePhone(input.phone)
  await prisma.user.update({ where: { id: user.id }, data: { mobileE164: phone } })
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { city: input.city || null, correspondenceAddress: input.address || null, homeTown: input.homeTown || null, whatsappOptIn: !!input.whatsappOptIn },
    create: { userId: user.id, city: input.city || null, correspondenceAddress: input.address || null, homeTown: input.homeTown || null, whatsappOptIn: !!input.whatsappOptIn },
  })
  updateTag("directory")
}

export async function saveProfessional(input: {
  company?: string
  jobTitle?: string
  industry?: string
  department?: string
  workSince?: string
  higherEducation?: string
  skills?: string
}) {
  const user = await requireUser()
  const skills = (input.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const data = {
    company: input.company || null,
    designation: input.jobTitle || null,
    industry: input.industry || null,
    department: input.department || null,
    workSince: input.workSince ? new Date(input.workSince) : null,
    higherEducation: input.higherEducation || null,
    skills,
  }
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  })
  updateTag("directory")
}

export async function saveSocial(input: {
  linkedin?: string
  github?: string
  twitter?: string
  facebook?: string
  instagram?: string
  website?: string
  visibility?: string
  showOnMap?: boolean
  isPublicIndexed?: boolean
}) {
  const user = await requireUser()
  const socialLinks = {
    github: input.github || "",
    twitter: input.twitter || "",
    facebook: input.facebook || "",
    instagram: input.instagram || "",
    website: input.website || "",
  } as Prisma.InputJsonValue
  const data = {
    linkedinUrl: input.linkedin || null,
    socialLinks,
    visibility: (input.visibility || "alumni") as ProfileVisibility,
    showOnMap: !!input.showOnMap,
    isPublicIndexed: !!input.isPublicIndexed,
  }
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: data,
    create: { userId: user.id, ...data },
  })
  updateTag("directory")
}

export interface ExperienceInput {
  id?: string
  title: string
  company: string
  employmentType?: string
  location?: string
  locationType?: string
  current: boolean
  startMonth?: number
  startYear: number
  endMonth?: number
  endYear?: number
  description?: string
  skills?: string
}

export async function saveExperience(input: ExperienceInput) {
  const user = await requireUser()
  const title = input.title.trim()
  const company = input.company.trim()
  if (!title || !company) throw new Error("Job title and organization are required")
  const startDate = monthYearToDate(input.startYear, input.startMonth)
  if (!startDate) throw new Error("Start year is required")
  const endDate = input.current ? null : monthYearToDate(input.endYear, input.endMonth)
  const skills = (input.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  const data = {
    title, company,
    employmentType: input.employmentType?.trim() || null,
    location: input.location?.trim() || null,
    locationType: input.locationType?.trim() || null,
    startDate, endDate,
    description: input.description?.trim() || null,
    skills,
  }
  if (input.id) {
    // Ownership enforced via userId in the where clause.
    const res = await prisma.experience.updateMany({ where: { id: input.id, userId: user.id }, data })
    if (res.count === 0) throw new Error("Not found")
  } else {
    await prisma.experience.create({ data: { ...data, userId: user.id } })
  }
  await revalidateOwnProfile(user.id)
}

export async function deleteExperience(id: string) {
  const user = await requireUser()
  await prisma.experience.deleteMany({ where: { id, userId: user.id } })
  await revalidateOwnProfile(user.id)
}

export interface EducationInput {
  id?: string
  school: string
  degree?: string
  fieldOfStudy?: string
  startYear?: number
  endYear?: number
}

export async function saveEducation(input: EducationInput) {
  const user = await requireUser()
  const school = input.school.trim()
  if (!school) throw new Error("School is required")
  const data = {
    school,
    degree: input.degree?.trim() || null,
    fieldOfStudy: input.fieldOfStudy?.trim() || null,
    startYear: input.startYear || null,
    endYear: input.endYear || null,
  }
  if (input.id) {
    const res = await prisma.education.updateMany({ where: { id: input.id, userId: user.id }, data })
    if (res.count === 0) throw new Error("Not found")
  } else {
    await prisma.education.create({ data: { ...data, userId: user.id } })
  }
  await revalidateOwnProfile(user.id)
}

export async function deleteEducation(id: string) {
  const user = await requireUser()
  await prisma.education.deleteMany({ where: { id, userId: user.id } })
  await revalidateOwnProfile(user.id)
}

export async function closeAccount(reason?: string) {
  const user = await requireUser()
  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date(), status: "inactive" },
  })
  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "account.delete",
      entityType: "user",
      entityId: user.id,
      payload: { reason: reason?.slice(0, 500) ?? "" },
    },
  })
  updateTag("directory")
}
