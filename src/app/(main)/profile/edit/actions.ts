"use server"

import { revalidatePath } from "next/cache"
import { Prisma } from "@/generated/prisma/client"
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
  houseId?: string
  batchId?: string
  bloodGroup?: string
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
      houseId,
      batchId,
      bloodGroup: input.bloodGroup || null,
    },
    create: {
      userId: user.id,
      bio: input.bio ?? null,
      houseId,
      batchId,
      bloodGroup: input.bloodGroup || null,
    },
  })
  revalidatePath(`/${username}`)
}

export async function saveContact(input: { city?: string; address?: string; homeTown?: string }) {
  const user = await requireUser()
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { city: input.city || null, correspondenceAddress: input.address || null, homeTown: input.homeTown || null },
    create: { userId: user.id, city: input.city || null, correspondenceAddress: input.address || null, homeTown: input.homeTown || null },
  })
}

export async function saveProfessional(input: {
  company?: string
  jobTitle?: string
  higherEducation?: string
  skills?: string
}) {
  const user = await requireUser()
  const skills = (input.skills ?? "").split(",").map((s) => s.trim()).filter(Boolean)
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      company: input.company || null,
      designation: input.jobTitle || null,
      profession: input.jobTitle || null,
      higherEducation: input.higherEducation || null,
      skills,
    },
    create: {
      userId: user.id,
      company: input.company || null,
      designation: input.jobTitle || null,
      profession: input.jobTitle || null,
      higherEducation: input.higherEducation || null,
      skills,
    },
  })
}

export async function saveSocial(input: {
  linkedin?: string
  github?: string
  twitter?: string
  facebook?: string
  instagram?: string
  website?: string
  visibility?: string
}) {
  const user = await requireUser()
  const socialLinks = {
    github: input.github || "",
    twitter: input.twitter || "",
    facebook: input.facebook || "",
    instagram: input.instagram || "",
    website: input.website || "",
  } as Prisma.InputJsonValue
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: { linkedinUrl: input.linkedin || null, socialLinks, visibility: input.visibility || "alumni" },
    create: { userId: user.id, linkedinUrl: input.linkedin || null, socialLinks, visibility: input.visibility || "alumni" },
  })
}

export async function closeAccount() {
  const user = await requireUser()
  await prisma.user.update({
    where: { id: user.id },
    data: { deletedAt: new Date(), status: "inactive" },
  })
}
