"use server"

import { requireUser } from "@/modules/auth/session"
import { throwEgg } from "@/modules/economy/eggs"

export async function throwEggAction(targetId: string) {
  const user = await requireUser()
  try {
    await throwEgg(user.id, targetId)
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}
