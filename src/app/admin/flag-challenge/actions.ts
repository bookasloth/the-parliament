"use server"

import { revalidatePath } from "next/cache"
import { z } from "zod"
import { requireAdmin } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { queueFlag, removeQueued } from "@/modules/games/flag-challenge"
import { isValidFlagCode } from "@/config/flag-challenge"

const queueSchema = z.object({
  code: z.string().refine(isValidFlagCode, "Unknown flag"),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date"),
})

export async function queueFlagAction(code: string, date: string) {
  await requireAdmin()
  const parsed = queueSchema.parse({ code, date })
  const schoolId = await getDefaultSchoolId()
  if (!schoolId) throw new Error("No school configured")
  // Parse the yyyy-mm-dd as a UTC calendar day (queueFlag normalises to utcDay).
  await queueFlag(schoolId, parsed.code, new Date(`${parsed.date}T00:00:00.000Z`))
  revalidatePath("/admin/flag-challenge")
  return { ok: true as const }
}

export async function removeFlagAction(id: string) {
  await requireAdmin()
  await removeQueued(z.string().uuid().parse(id))
  revalidatePath("/admin/flag-challenge")
  return { ok: true as const }
}
