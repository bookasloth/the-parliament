"use server"

import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { gameIdSchema, isActiveSchema } from "./schema"

export async function setGameActive(id: string, isActive: boolean) {
  await requireAdmin()
  const gameId = gameIdSchema.parse(id)
  const active = isActiveSchema.parse(isActive)
  await prisma.game.update({ where: { id: gameId }, data: { isActive: active } })
  revalidatePath("/admin/games")
  return { ok: true as const }
}
