"use client"

import { ArrowUpRight } from "lucide-react"
import { useAdImpression, trackAdClick } from "@/lib/ad-beacon"
import { SHUBHAM_DATARKAR_AD, sponsorHref } from "@/config/sponsor-ads"
import type { AdPlacement } from "@/config/ad-tracking"

/**
 * The pinned "Sponsored" card for the Alerts slot (Messages + Notifications).
 * One tasteful, clearly-labeled card — never a fake unread message. Fires one
 * impression when it scrolls into view and a click on tap (via the ad-beacon),
 * so it shows up in /admin/ads. Render only for ad-eligible tiers — the caller
 * decides (ad-free tiers pass nothing).
 */
export function SponsoredCard({ placement }: { placement: AdPlacement }) {
  const ad = SHUBHAM_DATARKAR_AD
  const ref = useAdImpression<HTMLAnchorElement>(ad.id, placement)

  return (
    <a
      ref={ref}
      href={sponsorHref(placement)}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad.id, placement)}
      className="block rounded-[6px] border border-gray-200 bg-gradient-to-br from-brand-50/70 to-white p-3 transition-colors hover:border-brand/40"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">Sponsored</span>
        <ArrowUpRight className="h-3.5 w-3.5 text-gray-300" />
      </div>
      <p className="mt-1 text-sm font-bold leading-snug text-gray-900">{ad.title}</p>
      <p className="mt-0.5 text-xs leading-snug text-gray-500">{ad.tagline}</p>
      <span className="mt-2 inline-block text-xs font-bold text-brand">{ad.cta} →</span>
    </a>
  )
}
