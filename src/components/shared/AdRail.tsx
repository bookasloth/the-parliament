import { optionalUser } from "@/modules/auth/session"
import { showSidebarAd, type AdSetKey } from "@/config/ad-sets"
import type { HouseProductKey } from "@/config/house-products"
import { AdCard } from "./AdCard"
import { HouseAdCard } from "./HouseAd"

/**
 * Sticky right-hand display-ad rail: 340px on desktop, hidden below `lg`, and
 * hidden entirely for ad-free tiers.
 *
 * Server component, so it reads the viewer's tier itself — no prop threading.
 * Drop it directly on a server page, or (for client pages) render it in that
 * page's server wrapper and pass it down as a prop.
 *
 * `set` = rotating image creatives (ad-sets.ts); `product` = a Timewheel house
 * product rendered as an HTML/CSS card (house-products.ts).
 */
export async function AdRail(props: { set: AdSetKey } | { product: HouseProductKey }) {
  const session = await optionalUser()
  if (!showSidebarAd(session?.membershipStatus)) return null

  return (
    <aside className="hidden w-[340px] flex-shrink-0 lg:block">
      <div className="sticky top-20">
        {"product" in props ? <HouseAdCard product={props.product} /> : <AdCard set={props.set} />}
      </div>
    </aside>
  )
}

/**
 * Same tier gate as AdRail, but just the card — for pages that already have
 * their own right column (event detail, business detail).
 */
export async function HouseAdSlot({ product }: { product: HouseProductKey }) {
  const session = await optionalUser()
  if (!showSidebarAd(session?.membershipStatus)) return null
  return <HouseAdCard product={product} />
}
