"use server"

import { revalidatePath } from "next/cache"
import { requirePermission } from "@/lib/gate"
import { enforceAdminRateLimit } from "@/modules/admin/rate-limit"
import { setSetting } from "@/modules/admin/settings"

export async function saveSettingsAction(sectionKey: string, values: unknown) {
  const admin = await requirePermission("settings:manage")
  await enforceAdminRateLimit(admin.id, "settings-save", 30, 60)
  // sectionKey validated by setSetting's settingKeySchema; values is the section blob.
  await setSetting(admin.id, sectionKey, values)
  revalidatePath("/admin/settings")
  return { ok: true as const }
}
