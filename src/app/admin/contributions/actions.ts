"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { setContributionApproval } from "@/modules/contributions/service"

/** Approve / unapprove a contribution for the public /development wall. */
export async function setApprovalAction(id: string, approved: boolean) {
  const admin = await requireAdmin()
  z.string().uuid().parse(id)
  await setContributionApproval(id, approved, admin.id)
  revalidatePath("/admin/contributions")
  revalidatePath("/development")
  return { ok: true }
}
