"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit"
import { sanitizeEmailPrefs, validateNewPassword } from "./prefs"

export async function updateEmailPrefsAction(
  input: Record<string, boolean>,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  const prefs = sanitizeEmailPrefs(input)
  await prisma.emailPreference.upsert({
    where: { userId: user.id },
    create: { userId: user.id, ...prefs },
    update: prefs,
  })
  revalidatePath("/settings")
  return { ok: true }
}

export async function changePasswordAction(input: {
  current: string
  next: string
  confirm: string
}): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()

  const err = validateNewPassword(input.next, input.confirm)
  if (err) return { ok: false, error: err }

  try {
    await enforceRateLimit({ bucket: "password-change", identifier: user.id, limit: 5, windowSec: 3600 })
  } catch (e) {
    if (e instanceof RateLimitedError) return { ok: false, error: "Too many attempts. Try again in an hour." }
    throw e
  }

  const row = await prisma.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } })
  // A user with a password must prove the current one; a Google-only user
  // (no hash yet) is setting one for the first time.
  if (row?.passwordHash) {
    const ok = await bcrypt.compare(input.current, row.passwordHash)
    if (!ok) return { ok: false, error: "Current password is incorrect." }
  }

  const passwordHash = await bcrypt.hash(input.next, 12)
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash } })
  return { ok: true }
}
