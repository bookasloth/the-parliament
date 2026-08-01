"use server"

import { revalidatePath, updateTag } from "next/cache"
import { Prisma } from "@/generated/prisma/client"
import type { ProfileVisibility } from "@/generated/prisma/enums"
import { prisma } from "@/lib/prisma"
import { requireUser } from "@/modules/auth/session"

const RESERVED = new Set([
  "feed", "directory", "community", "connections", "business", "businesses", "events",
  "groups", "membership", "notifications", "settings", "compose", "messages", "network",
  "profile", "admin", "auth", "api", "onboarding", "companies",
])

function slugUsername(raw: string): string {
  return raw.trim().replace(/^@/, "").toLowerCase()
    .replace(/[^a-z0-9-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 60)
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

  const username = slugUsername(input.username)
  if (!username) throw new Error("Username is required")
  if (RESERVED.has(username)) throw new Error("That username is reserved")
  const clash = await prisma.user.findFirst({ where: { username, id: { not: user.id } }, select: { id: true } })
  if (clash) throw new Error("That username is taken")

  // House and batch are immutable once set — keep the existing value.
  const existing = await prisma.profile.findUnique({
    where: { userId: user.id },
    select: { houseId: true, batchId: true },
  })
  const houseId = existing?.houseId ?? (input.houseId || null)
  const batchId = existing?.batchId ?? (input.batchId || null)

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

export async function closeAccount() {
  const user = await requireUser()
  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date(), status: "inactive" },
  })
  updateTag("directory")
}
