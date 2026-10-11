"use client"

import { ArrowRight, Coffee, ShoppingBag, Ticket, UsersRound } from "lucide-react"
import { HOUSE_PRODUCTS, houseProductHref, type HouseProductIcon, type HouseProductKey } from "@/config/house-products"
import { useAdImpression, trackAdClick } from "@/lib/ad-beacon"

const ICONS: Record<HouseProductIcon, typeof Ticket> = {
  ticket: Ticket,
  community: UsersRound,
  shop: ShoppingBag,
  coffee: Coffee,
}

/**
 * Rail-sized house ad built in HTML/CSS — brand gradient, decorative shapes,
 * icon + name, headline, CTA. Counts as the `sidebar` placement.
 */
export function HouseAdCard({ product }: { product: HouseProductKey }) {
  const p = HOUSE_PRODUCTS[product]
  const Icon = ICONS[p.icon]
  const ref = useAdImpression<HTMLAnchorElement>(p.id, "sidebar")

  return (
    <a
      ref={ref}
      href={houseProductHref(product, "sidebar")}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(p.id, "sidebar")}
      className="group relative block overflow-hidden rounded-[5px] p-5 text-white shadow-sm transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-md"
      style={{ backgroundImage: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})` }}
    >
      {/* Decorative shapes — pure CSS, no artwork. */}
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-white/10" />
      <span aria-hidden className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/10" />
      <Icon
        aria-hidden
        className="pointer-events-none absolute -bottom-4 -right-4 h-28 w-28 rotate-[-12deg] text-white/10 transition-transform duration-300 group-hover:rotate-0"
      />

      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-[6px] bg-white shadow-sm">
              <Icon className="h-[18px] w-[18px]" style={{ color: p.accent }} />
            </span>
            <span className="font-heading text-[15px] font-extrabold tracking-tight">{p.name}</span>
          </span>
          <span className="rounded-[3px] bg-black/15 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-white/80">
            Sponsored
          </span>
        </div>

        <p className="mt-5 font-heading text-xl font-extrabold leading-snug">{p.headline}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-white/85">{p.body}</p>

        <span
          className="mt-5 inline-flex items-center gap-1.5 rounded-[4px] bg-white px-4 py-2 text-xs font-bold shadow-sm"
          style={{ color: p.accent }}
        >
          {p.cta}
          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>

        <p className="mt-4 text-[10px] font-medium text-white/60">by Timewheel</p>
      </div>
    </a>
  )
}

/**
 * One-line house promo for inside a flow (create-event modal, award modal,
 * list-your-business form): brand icon + line + arrow. `inline` placement.
 */
export function HouseAdLine({ product, className = "" }: { product: HouseProductKey; className?: string }) {
  const p = HOUSE_PRODUCTS[product]
  const Icon = ICONS[p.icon]
  const ref = useAdImpression<HTMLAnchorElement>(p.id, "inline")

  return (
    <a
      ref={ref}
      href={houseProductHref(product, "inline")}
      target="_blank"
      rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(p.id, "inline")}
      className={`group inline-flex items-center gap-1.5 text-xs text-gray-500 transition-colors hover:text-gray-800 ${className}`}
    >
      <span
        className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-[4px] text-white"
        style={{ backgroundImage: `linear-gradient(135deg, ${p.gradient[0]}, ${p.gradient[1]})` }}
      >
        <Icon className="h-3 w-3" />
      </span>
      <span>{p.line}</span>
      <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
    </a>
  )
}
