import { requirePermission } from "@/lib/gate"
import { getAllSettings } from "@/modules/admin/settings"
import { SettingsClient } from "./settings-client"

export const dynamic = "force-dynamic"

export default async function AdminSettingsPage() {
  await requirePermission("settings:manage")
  const settings = await getAllSettings()
  return <SettingsClient initial={settings} />
}
