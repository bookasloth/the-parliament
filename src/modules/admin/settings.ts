import { z } from "zod"
import { Prisma } from "@/generated/prisma/client"
import { prisma } from "@/lib/prisma"
import { audit } from "@/lib/audit"

// Settings are stored one JSONB blob per key. Keys are section names; the value
// is an arbitrary object the settings UI owns. Kept generic on purpose — adding
// a new setting needs no migration.
export const settingKeySchema = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(/^[a-z0-9_.-]+$/i, "invalid setting key")

export type SettingsMap = Record<string, unknown>

export async function getAllSettings(): Promise<SettingsMap> {
  const rows = await prisma.adminSetting.findMany()
  const out: SettingsMap = {}
  for (const r of rows) out[r.key] = r.value
  return out
}

export async function getSetting<T = unknown>(key: string, fallback: T): Promise<T> {
  const row = await prisma.adminSetting.findUnique({ where: { key } })
  return (row?.value as T) ?? fallback
}

/** Upsert one settings blob and audit the change (records the new value). */
export async function setSetting(
  actorId: string,
  key: string,
  value: unknown,
  ip?: string,
): Promise<{ ok: true }> {
  const k = settingKeySchema.parse(key)
  const json = (value ?? {}) as Prisma.InputJsonValue
  await prisma.adminSetting.upsert({
    where: { key: k },
    update: { value: json, updatedBy: actorId },
    create: { key: k, value: json, updatedBy: actorId },
  })
  await audit({
    actorId,
    action: "admin.settings.update",
    entityType: "admin_setting",
    entityId: k,
    payload: { key: k, value },
    ipInet: ip,
  })
  return { ok: true }
}
