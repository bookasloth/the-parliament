"use server"

import bcrypt from "bcryptjs"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { enforceRateLimit, RateLimitedError } from "@/lib/rate-limit"
import { sanitizeEmailPrefs, validateNewPassword } from "./prefs"
import { isProfileVisibility } from "@/modules/profile/privacy"
import { reactivateAccount } from "@/modules/admin/users"
import { invalidateSession } from "@/lib/redis"
import { audit } from "@/lib/audit"
import { setNotificationPrefs } from "@/modules/notifications/service"

/** Save the viewer's bell/push notification preferences (audit P1-5). */
export async function updateNotificationPrefsAction(input: { pushEnabled: boolean; mutedKinds: string[] }) {
  const user = await requireUser()
  await setNotificationPrefs(user.id, {
    pushEnabled: !!input.pushEnabled,
    mutedKinds: Array.isArray(input.mutedKinds) ? input.mutedKinds.map(String) : [],
  })
  revalidatePath("/settings")
  return { ok: true as const }
}

/** `<form action>`-shaped wrapper (must return void) for the reactivate button. */
export async function reactivateAccountFormAction(_formData: FormData): Promise<void> {
  await reactivateAccountAction()
}

/** Self-serve reactivation of a deactivated (self-closed) account (audit P0-9). */
export async function reactivateAccountAction() {
  const user = await requireUser()
  const ok = await reactivateAccount(user.id)
  if (ok) {
    await invalidateSession(user.id)
    await audit({ actorId: user.id, action: "account.reactivate", entityType: "user", entityId: user.id })
    revalidatePath("/settings")
  }
  return { ok }
}

export interface PrivacyInput {
  visibility: string
  contactAlwaysShare: boolean
  isPublicIndexed: boolean
  showOnMap: boolean
}

/** Save the viewer's own profile privacy settings. Visibility is validated
 *  against the enum (trust boundary); the booleans are coerced. */
export async function updateProfilePrivacyAction(
  input: PrivacyInput,
): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser()
  if (!isProfileVisibility(input.visibility)) {
    return { ok: false, error: "Invalid visibility option." }
  }
  // updateMany (not update) so a user without a Profile row no-ops instead of
  // throwing; the settings form only renders when a profile exists anyway.
  await prisma.profile.updateMany({
    where: { userId: user.id },
    data: {
      visibility: input.visibility,
      contactAlwaysShare: !!input.contactAlwaysShare,
      isPublicIndexed: !!input.isPublicIndexed,
      showOnMap: !!input.showOnMap,
    },
  })
  revalidatePath("/settings")
  if (user.username) revalidatePath(`/${user.username}`)
  return { ok: true }
}

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
