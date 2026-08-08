"use server"

import { prisma } from "@/lib/prisma"
import { invalidateSession } from "@/lib/redis"
import { requireUser } from "@/modules/auth/session"
import { publicUrlFor } from "@/lib/r2"
import { validateUsernameFormat } from "@/lib/username-check"
import { getDefaultSchoolId } from "@/lib/school"
import { followUser } from "@/modules/connections/service"
import { createPost } from "@/modules/feed/posts"
import { markComplete } from "@/modules/onboarding/service"
import type { OnboardingStep } from "@/lib/onboarding"

// Advance (or record) the member's furthest onboarding step so the gate resumes
// them at the right place. Never moves backwards.
async function setStep(userId: string, step: OnboardingStep) {
  await prisma.user.update({ where: { id: userId }, data: { onboardingStep: step } })
  await invalidateSession(userId)
}

export async function checkUsername(raw: string): Promise<{ ok: boolean; reason?: string; slug?: string }> {
  const fmt = validateUsernameFormat(raw)
  if (!fmt.ok) return { ok: false, reason: fmt.reason }
  const user = await requireUser()
  const clash = await prisma.user.findFirst({ where: { username: fmt.slug, id: { not: user.id } }, select: { id: true } })
  if (clash) return { ok: false, reason: "That username is taken", slug: fmt.slug }
  return { ok: true, slug: fmt.slug }
}

// Screen 1 (mandatory): photo, username, bio, location.
export async function saveProfileStep(input: {
  photoKey?: string
  username: string
  bio?: string
  location?: string
}) {
  const user = await requireUser()
  const fmt = validateUsernameFormat(input.username)
  if (!fmt.ok) throw new Error(fmt.reason)
  const clash = await prisma.user.findFirst({ where: { username: fmt.slug, id: { not: user.id } }, select: { id: true } })
  if (clash) throw new Error("That username is taken")

  await prisma.user.update({ where: { id: user.id }, data: { username: fmt.slug, onboardingStep: "work" } })
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      ...(input.photoKey ? { photoUrl: publicUrlFor(input.photoKey) } : {}),
      bio: input.bio?.trim() || null,
      city: input.location?.trim() || null,
    },
    create: {
      userId: user.id,
      ...(input.photoKey ? { photoUrl: publicUrlFor(input.photoKey) } : {}),
      bio: input.bio?.trim() || null,
      city: input.location?.trim() || null,
    },
  })
  return { username: fmt.slug }
}

// Screen 2 (skippable): work.
export async function saveWorkStep(input: {
  industry?: string
  company?: string
  position?: string
  sinceYear?: string
  sinceMonth?: string
}) {
  const user = await requireUser()
  const monthIdx = input.sinceMonth ? Math.max(0, Number(input.sinceMonth) - 1) : 0
  const workSince = input.sinceYear ? new Date(Date.UTC(Number(input.sinceYear), monthIdx, 1)) : null
  await prisma.profile.upsert({
    where: { userId: user.id },
    update: {
      industry: input.industry?.trim() || null,
      company: input.company?.trim() || null,
      designation: input.position?.trim() || null,
      workSince,
    },
    create: {
      userId: user.id,
      industry: input.industry?.trim() || null,
      company: input.company?.trim() || null,
      designation: input.position?.trim() || null,
      workSince,
    },
  })
  await setStep(user.id, "follow")
}

// Screen 3 (skippable): follow suggested people.
export async function followPerson(targetId: string) {
  const user = await requireUser()
  await followUser(user.id, targetId)
}

export async function reachedStep(step: OnboardingStep) {
  const user = await requireUser()
  await setStep(user.id, step)
}

// Screen 5: publish the introduction post + finish onboarding.
export async function publishIntro(text: string) {
  const user = await requireUser()
  const fresh = await prisma.user.findUnique({ where: { id: user.id }, select: { emailVerifiedAt: true } })
  if (!fresh?.emailVerifiedAt) throw new Error("Please verify your email first")

  const body = text.trim()
  if (body) {
    const schoolId = (await getDefaultSchoolId()) ?? undefined
    if (schoolId) {
      try {
        await createPost({ authorId: user.id, schoolId, categoryKey: "career_update", format: "text", body })
      } catch {
        // A feed hiccup must not block finishing onboarding.
      }
    }
  }
  await markComplete(user.id)
}

// Skip the intro (and anything after) — just finish.
export async function finishOnboarding() {
  const user = await requireUser()
  await markComplete(user.id)
}
