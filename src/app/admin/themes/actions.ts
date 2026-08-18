"use server"

import { z } from "zod"
import { revalidatePath } from "next/cache"
import { requireAdmin } from "@/modules/auth/session"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import { setSetting } from "@/modules/admin/settings"
import type { ThemeOverrides } from "@/config/chat-themes"

const scheduleSchema = z.object({
  startMonth: z.number().int().min(1).max(12),
  startDay: z.number().int().min(1).max(31),
  endMonth: z.number().int().min(1).max(12),
  endDay: z.number().int().min(1).max(31),
})

const overridesSchema = z.record(
  z.string().min(1).max(64),
  z.object({ enabled: z.boolean().optional(), schedule: scheduleSchema.optional() }),
)

export async function saveThemeOverridesAction(overrides: unknown) {
  const admin = await requireAdmin()
  await enforceAdminRateLimit(admin.id, "themes-save", 30, 60)
  const parsed: ThemeOverrides = overridesSchema.parse(overrides)
  await setSetting(admin.id, "chat_themes", parsed)
  revalidatePath("/admin/themes")
  return { ok: true as const }
}
