"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { awardKarma } from "@/modules/karma/ledger"
import { audit } from "@/lib/audit"

const schema = z.object({
  query: z.string().min(2).max(120),
  amount: z.number().int().refine((n) => n !== 0, "Amount can't be zero").refine((n) => Math.abs(n) <= 100_000, "Amount out of range"),
  reason: z.string().min(3).max(200),
})

export async function adjustKarmaAction(input: { query: string; amount: number; reason: string }) {
  const admin = await requireAdmin()
  const { query, amount, reason } = schema.parse({ ...input, query: input.query.trim(), reason: input.reason.trim() })

  const q = query.toLowerCase()
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: q }, { email: q }] },
    select: { id: true, legalName: true, displayName: true, username: true, email: true },
  })
  if (!user) throw new Error(`No member found for "${query}" (use exact username or email)`)

  const bal = await awardKarma({
    userId: user.id,
    actionType: "admin_adjustment",
    baseValue: amount,
    role: "self",
    reasonCode: reason.slice(0, 60),
  })

  await audit({
    actorId: admin.id,
    action: "karma.admin.adjust",
    entityType: "user_karma",
    entityId: user.id,
    payload: { amount, reason },
  })

  revalidatePath("/admin/karma")
  return {
    ok: true,
    name: user.legalName || user.displayName || user.username || user.email,
    balance: bal.balance,
  }
}
