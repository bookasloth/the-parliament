import { optionalUser } from "@/modules/auth/session"
import { showSidebarAd, type AdSetKey } from "@/config/ad-sets"
import { AdCard } from "./AdCard"

/**
 * Sticky right-hand display-ad rail: 340px on desktop, hidden below `lg`, and
 * hidden entirely for ad-free tiers.
 *
 * Server component, so it reads the viewer's tier itself — no prop threading.
 * Drop it directly on a server page, or (for client pages) render it in that
 * page's server wrapper and pass it down as a prop.
 */
export async function AdRail({ set }: { set: AdSetKey }) {
  const session = await optionalUser()
  if (!showSidebarAd(session?.membershipStatus)) return null

  return (
    <aside className="hidden w-[340px] flex-shrink-0 lg:block">
      <div className="sticky top-20">
        <AdCard set={set} />
      </div>
    </aside>
  )
}
