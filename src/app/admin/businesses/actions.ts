"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { businessStatusSchema, businessIdSchema } from "./schema"

export async function setBusinessStatus(
  id: string,
  status: "approved" | "rejected" | "suspended" | "pending",
) {
  await requireAdmin()
  const parsedId = businessIdSchema.parse(id)
  const parsedStatus = businessStatusSchema.parse(status)
  await prisma.business.update({ where: { id: parsedId }, data: { status: parsedStatus } })
  revalidatePath("/admin/businesses")
  return { ok: true }
}
