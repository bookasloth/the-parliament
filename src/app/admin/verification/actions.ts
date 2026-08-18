"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requirePermission } from "@/lib/gate"
import { approveVerification, rejectVerification, startAdminReview, verifyUserDirectly } from "@/modules/verification/service"
import { suggestEndorsers, requestEndorsement } from "@/modules/verification/endorsements"

const loginUrl = process.env.AUTH_URL ?? "https://nnawca.org"

export async function approveVerificationAction(verificationId: string) {
  const admin = await requirePermission("verification:review")
  z.string().min(1).parse(verificationId)
  await approveVerification({ verificationId, reviewerId: admin.id, loginUrl })
  revalidatePath("/admin/verification")
  return { ok: true }
}

export async function rejectVerificationAction(verificationId: string, reason: string) {
  const admin = await requirePermission("verification:review")
  z.string().min(1).parse(verificationId)
  const trimmed = z.string().min(3).max(1000).parse(reason.trim())
  await rejectVerification({ verificationId, reviewerId: admin.id, reason: trimmed })
  revalidatePath("/admin/verification")
  return { ok: true }
}

export async function startUserReviewAction(userId: string) {
  const admin = await requirePermission("verification:review")
  z.string().uuid().parse(userId)
  await startAdminReview({ userId, adminId: admin.id })
  revalidatePath("/admin/verification")
  return { ok: true }
}

export async function verifyUserNowAction(userId: string) {
  const admin = await requirePermission("verification:review")
  z.string().uuid().parse(userId)
  await verifyUserDirectly({ userId, adminId: admin.id, loginUrl })
  revalidatePath("/admin/verification")
  return { ok: true }
}

export async function listSuggestedEndorsersAction(verificationId: string) {
  await requirePermission("verification:read")
  z.string().uuid().parse(verificationId)
  return suggestEndorsers(verificationId)
}

export async function requestEndorsementAction(verificationId: string, endorserId: string) {
  const admin = await requirePermission("verification:review")
  z.string().uuid().parse(verificationId)
  z.string().uuid().parse(endorserId)
  const res = await requestEndorsement({ verificationId, endorserId, adminId: admin.id })
  revalidatePath("/admin/verification")
  return res
}
