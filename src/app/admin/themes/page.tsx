import { requireAdmin } from "@/modules/auth/session"
import { getSetting } from "@/modules/admin/settings"
import { mergeThemeOverrides, type ThemeOverrides } from "@/config/chat-themes"
import AdminThemesClient from "./themes-client"

export const dynamic = "force-dynamic"

export default async function AdminThemesPage() {
  await requireAdmin()
  // Admin edits (enabled + schedule) are persisted as one JSON blob in the
  // AdminSetting KV store; merge them onto the code-owned base theme set.
  const overrides = await getSetting<ThemeOverrides>("chat_themes", {})
  const themes = mergeThemeOverrides(overrides)
  // TODO: the member chat pane (ConversationView -> getActiveTheme) still reads
  // the static FESTIVE_THEMES, so these saved overrides don't yet drive live
  // conversations. Wiring that means threading the merged set from a server
  // parent into ConversationView — a separate, cross-cutting change.
  return <AdminThemesClient initialThemes={themes} />
}
