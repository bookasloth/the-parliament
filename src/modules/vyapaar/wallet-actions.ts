"use server"

import { requireUser } from "@/modules/auth/session"
import { topUpVyapaarCoins } from "@/modules/vyapaar/wallet"
import { ForbiddenError } from "@/lib/errors"

export async function topUpAction(
  packId: string,
): Promise<{ ok: true; wallet: number; shells: number } | { ok: false; error: string }> {
  const user = await requireUser()
  try {
    const res = await topUpVyapaarCoins(user.id, packId)
    return { ok: true, ...res }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message }
    throw e
  }
}
