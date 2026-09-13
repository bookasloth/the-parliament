"use client"

import Image from "next/image"
import Link from "next/link"
import { UserPlus } from "lucide-react"
import { useAdImpression, trackAdClick } from "@/lib/ad-beacon"
import { SHUBHAM_DATARKAR_AD, sponsorHref } from "@/config/sponsor-ads"
import type { AdPlacement } from "@/config/ad-tracking"

// Ad rows styled exactly like a notification (avatar · title + label on one line
// · body · CTA) so they sit inline in the notifications list + dropdown instead
// of a separate banner. Two ads: an internal membership upsell and the house
// sponsor (Shubham Datarkar). Render only for ad-eligible tiers (caller gates).
const SPONSOR_AVATAR =
  "https://ui-avatars.com/api/?name=Shubham+Datarkar&background=009ae4&color=fff&bold=true"

export function AlertAds({ placement, compact = false }: { placement: AdPlacement; compact?: boolean }) {
  const ad = SHUBHAM_DATARKAR_AD
  const ref = useAdImpression<HTMLAnchorElement>(ad.id, placement)

  const pad = compact ? "p-2.5" : "p-3"
  const nameCls = compact ? "text-xs" : "text-sm"
  const bodyCls = compact ? "text-[11px]" : "text-[13px]"
  const av = compact ? "h-9 w-9" : "h-10 w-10"
  const avPx = compact ? 36 : 40

  return (
    <div className="space-y-0.5">
      {/* Membership upsell — internal, drives /membership */}
      <Link href="/membership" className={`flex gap-3 rounded-[5px] ${pad} transition-colors hover:bg-gray-50`}>
        <span className={`flex ${av} flex-shrink-0 items-center justify-center rounded-[4px] bg-amber-100 text-amber-600`}>
          <UserPlus className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`${nameCls} truncate font-medium text-gray-900`}>Someone viewed your profile</p>
            <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-amber-500">Promoted</span>
          </div>
          <p className={`${bodyCls} leading-snug text-gray-500`}>Alumni want to connect with you — upgrade to see who and message them.</p>
          <span className={`mt-1 inline-block ${bodyCls} font-bold text-brand`}>See who &amp; connect →</span>
        </div>
      </Link>

      {/* House sponsor — external, tracked via ad-beacon */}
      <a
        ref={ref}
        href={sponsorHref(placement)}
        target="_blank"
        rel="noopener noreferrer sponsored"
        onClick={() => trackAdClick(ad.id, placement)}
        className={`flex gap-3 rounded-[5px] ${pad} transition-colors hover:bg-gray-50`}
      >
        <Image src={SPONSOR_AVATAR} alt="" width={avPx} height={avPx} className={`${av} flex-shrink-0 rounded-[4px] object-cover`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className={`${nameCls} truncate font-medium text-gray-900`}>Shubham Datarkar</p>
            <span className="flex-shrink-0 text-[10px] font-semibold uppercase tracking-wide text-gray-400">Sponsored</span>
          </div>
          <p className={`${bodyCls} line-clamp-2 leading-snug text-gray-500`}>{ad.tagline}</p>
          <span className={`mt-1 inline-block ${bodyCls} font-bold text-brand`}>{ad.cta} →</span>
        </div>
      </a>
    </div>
  )
}
