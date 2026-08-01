"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { adminRefund } from "@/modules/membership/admin"

export async function refundOrderAction(orderId: string, reason: string) {
  const admin = await requireAdmin()
  z.string().uuid().parse(orderId)
  const trimmed = z.string().min(3).max(500).parse(reason.trim())
  const refund = await adminRefund({ adminId: admin.id, orderId, reason: trimmed })
  revalidatePath("/admin/membership")
  return { ok: true, refundId: refund.id }
}
