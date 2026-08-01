"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { approveVerification, rejectVerification } from "@/modules/verification/service"

const loginUrl = process.env.AUTH_URL ?? "https://nnawca.org"

export async function approveVerificationAction(verificationId: string) {
  const admin = await requireAdmin()
  z.string().min(1).parse(verificationId)
  await approveVerification({ verificationId, reviewerId: admin.id, loginUrl })
  revalidatePath("/admin/verification")
  return { ok: true }
}

export async function rejectVerificationAction(verificationId: string, reason: string) {
  const admin = await requireAdmin()
  z.string().min(1).parse(verificationId)
  const trimmed = z.string().min(3).max(1000).parse(reason.trim())
  await rejectVerification({ verificationId, reviewerId: admin.id, reason: trimmed })
  revalidatePath("/admin/verification")
  return { ok: true }
}
