"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { idSchema, redemptionStatusSchema } from "./schemas"

export async function setRewardActive(id: string, isActive: boolean) {
  await requireAdmin()
  const rewardId = idSchema.parse(id)
  const active = z.boolean().parse(isActive)
  await prisma.rewardItem.update({ where: { id: rewardId }, data: { isActive: active } })
  revalidatePath("/admin/rewards")
  return { ok: true }
}

export async function setRedemptionStatus(
  id: string,
  status: z.infer<typeof redemptionStatusSchema>,
) {
  await requireAdmin()
  const redemptionId = idSchema.parse(id)
  const next = redemptionStatusSchema.parse(status)
  await prisma.karmaRedemption.update({
    where: { id: redemptionId },
    data: { status: next, deliveredAt: next === "fulfilled" ? new Date() : undefined },
  })
  revalidatePath("/admin/rewards")
  return { ok: true }
}
