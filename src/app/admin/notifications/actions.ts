"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { broadcastSchema, type BroadcastInput } from "./schema"

export async function broadcast(input: BroadcastInput) {
  await requireAdmin()
  const data = broadcastSchema.parse(input)

  const users = await prisma.user.findMany({
    where: { deletedAt: null, status: { not: "suspended" } },
    select: { id: true },
  })
  if (users.length === 0) return { ok: true, count: 0 }

  // ponytail: single createMany over all active users; batch/queue if member count outgrows one insert.
  await prisma.notification.createMany({
    data: users.map((u) => ({
      userId: u.id,
      type: data.type,
      title: data.title,
      body: data.body ?? null,
    })),
  })

  revalidatePath("/admin/notifications")
  return { ok: true, count: users.length }
}
