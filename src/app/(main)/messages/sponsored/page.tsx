"use client"

import Image from "next/image"
import Link from "next/link"
import { ArrowLeft, ExternalLink } from "lucide-react"
import { SHUBHAM_DATARKAR_AD, sponsorHref } from "@/config/sponsor-ads"
import { trackAdClick } from "@/lib/ad-beacon"

// The sponsor's "message", opened from the Sponsored row in the chat list.
// Styled like a real conversation (header + received bubble) but clearly an ad:
// a Sponsored label and a single external CTA. No reply composer.
export default function SponsoredMessagePage() {
  const ad = SHUBHAM_DATARKAR_AD
  const href = sponsorHref("alerts")

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
        <Link href="/messages" className="rounded-[4px] p-1.5 text-gray-500 hover:bg-gray-100 lg:hidden" aria-label="Back to chats">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <Image src={ad.avatarUrl} alt="" width={40} height={40} className="h-10 w-10 rounded-[4px] object-cover" />
        <div className="min-w-0">
          <h2 className="truncate text-sm font-bold text-gray-900">{ad.advertiser}</h2>
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Sponsored</p>
        </div>
      </div>

      {/* Message body */}
      <div className="flex-1 overflow-y-auto bg-[#f7f8fa] px-4 py-6">
        <div className="mx-auto max-w-lg space-y-3">
          <div className="rounded-[10px] rounded-tl-[3px] border border-gray-200 bg-white p-4 shadow-sm">
            <p className="text-sm font-bold text-gray-900">{ad.title}</p>
            <p className="mt-2 text-sm leading-relaxed text-gray-700">
              Hi — {ad.tagline} If you run a business (or plan to), let&rsquo;s get you a website
              that actually converts, plus the SEO &amp; ads to get found.
            </p>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer sponsored"
              onClick={() => trackAdClick(ad.id, "alerts")}
              className="mt-4 inline-flex items-center gap-1.5 rounded-[4px] bg-brand px-4 py-2 text-sm font-bold text-white hover:bg-brand-600"
            >
              {ad.cta} <ExternalLink className="h-4 w-4" />
            </a>
          </div>
          <p className="text-center text-[11px] text-gray-400">Sponsored message · You can&rsquo;t reply to this chat.</p>
        </div>
      </div>
    </div>
  )
}
