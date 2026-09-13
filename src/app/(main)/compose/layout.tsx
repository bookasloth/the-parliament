import type { ReactNode } from "react"
import { LeftRailShell } from "@/components/shared/ProfileSidebar"
import { SIDEBAR_NAV } from "@/config/sidebar-nav"

// Compose + drafts share the feed's two-rail shell: sticky profile rail on the
// left, display-ad rail on the right, content (composer / drafts list) between.
export default function ComposeLayout({ children }: { children: ReactNode }) {
  return (
    <LeftRailShell nav={SIDEBAR_NAV.feed} adSet="seoAi">
      {children}
    </LeftRailShell>
  )
}
