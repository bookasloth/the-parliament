"use server"

import { z } from "zod"
import { requireUser } from "@/modules/auth/session"
import { recordEndorsement } from "@/modules/verification/endorsements"

export async function respondEndorsementAction(
  token: string,
  decision: "endorsed" | "declined",
  note?: string,
) {
  const user = await requireUser()
  z.string().min(1).parse(token)
  z.enum(["endorsed", "declined"]).parse(decision)
  const cleanNote = note ? z.string().max(1000).parse(note) : undefined
  await recordEndorsement({ token, responderId: user.id, decision, note: cleanNote })
  return { ok: true }
}
