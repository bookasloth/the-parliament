"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"

const schema = z.object({
  id: z.string().uuid(),
  status: z.enum(["paid", "printing", "shipped", "delivered", "cancelled"]),
  trackingId: z.string().trim().max(120).optional(),
})

/** Advance a paid ID-card order through the fulfilment pipeline. */
export async function updateIdCardOrderAction(input: z.infer<typeof schema>) {
  const admin = await requireAdmin()
  const { id, status, trackingId } = schema.parse(input)

  await prisma.idCardOrder.update({
    where: { id },
    data: {
      status,
      ...(trackingId !== undefined ? { trackingId: trackingId || null } : {}),
      ...(status === "shipped" ? { shippedAt: new Date() } : {}),
    },
  })

  await audit({
    actorId: admin.id,
    action: "idcard.fulfilment.update",
    entityType: "id_card_order",
    entityId: id,
    payload: { status, trackingId: trackingId ?? null },
  })

  revalidatePath("/admin/id-cards")
  return { ok: true }
}
