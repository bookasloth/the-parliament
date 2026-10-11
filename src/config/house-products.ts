// House product ads — Timewheel's own products, each matched to the page where
// its buyer already is (contextual, not rotated everywhere):
//
//   ticketDino   → events (list rail, event detail, create-event modal, host view)
//   alluminaty   → groups (list rail, group detail) — "run your own community"
//   ezshop       → businesses (business detail rail, list-your-business form)
//   coffeeToffee → the award modal, as a single "powered by" line
//
// Rendered as HTML/CSS (no image creatives) by components/shared/HouseAd.tsx.
// ponytail: static config, like feed-ads.ts / ad-sets.ts. Add an Ad model only
// when ads need scheduling or self-serve buyers.

import type { AdPlacement } from "./ad-tracking"

export type HouseProductKey = "ticketDino" | "alluminaty" | "ezshop" | "coffeeToffee"

/** Brand glyph drawn in front of the name (mapped to a lucide icon in HouseAd). */
export type HouseProductIcon = "ticket" | "community" | "shop" | "coffee"

export interface HouseProduct {
  /** Ad id for delivery tracking (AdImpression.adId). Stable — renaming loses history. */
  id: string
  name: string
  url: string
  icon: HouseProductIcon
  /** Card copy (sidebar placement). */
  headline: string
  body: string
  cta: string
  /** One-line copy (inline placement). */
  line: string
  /** Brand colours: [from, to] gradient + the solid accent for CTA/icon. */
  gradient: [string, string]
  accent: string
  /** Placements this product actually renders in — drives the admin catalog. */
  placements: AdPlacement[]
}

const TIMEWHEEL = "https://timewheel.co.in"

export const HOUSE_PRODUCTS: Record<HouseProductKey, HouseProduct> = {
  ticketDino: {
    id: "hp-ticketdino",
    name: "TicketDino",
    url: `${TIMEWHEEL}/products/ticket-dino`,
    icon: "ticket",
    headline: "Sell tickets for your next event",
    body: "Ticketing, registrations and payments for your events — all in one place.",
    cta: "Start selling",
    line: "Selling tickets? Run paid events on TicketDino",
    gradient: ["#ff7a18", "#f43f5e"],
    accent: "#f43f5e",
    placements: ["sidebar", "inline"],
  },
  alluminaty: {
    id: "hp-alluminaty",
    name: "Alluminaty",
    url: `${TIMEWHEEL}/products/alluminaty`,
    icon: "community",
    headline: "Run your own community like this",
    body: "The platform behind this network — groups, events, feed and memberships for your alumni or club.",
    cta: "See how",
    line: "Lead a community? Launch your own with Alluminaty",
    gradient: ["#009ae4", "#4f46e5"],
    accent: "#4f46e5",
    placements: ["sidebar"],
  },
  ezshop: {
    id: "hp-ezshop",
    name: "EZShop",
    url: `${TIMEWHEEL}/products/ezshop`,
    icon: "shop",
    headline: "Take your business online",
    body: "Your own online store — list products, take orders and get paid.",
    cta: "Open your store",
    line: "Selling products? Open your online store with EZShop",
    gradient: ["#10b981", "#0d9488"],
    accent: "#0d9488",
    placements: ["sidebar", "inline"],
  },
  coffeeToffee: {
    id: "hp-coffeetoffee",
    name: "Coffee & Toffee",
    url: `${TIMEWHEEL}/coffee-and-toffee`,
    icon: "coffee",
    headline: "Coffee & Toffee",
    body: "",
    cta: "",
    line: "Awards powered by Coffee & Toffee",
    gradient: ["#a16207", "#7c2d12"],
    accent: "#92400e",
    placements: ["inline"],
  },
}

/**
 * Destination with UTM tags so Timewheel's analytics can attribute traffic to
 * NNAWCA and to the slot it came from. Keeps any query the base URL already has.
 */
export function houseProductHref(key: HouseProductKey, placement: AdPlacement): string {
  const p = HOUSE_PRODUCTS[key]
  const u = new URL(p.url)
  u.searchParams.set("utm_source", "nnawca")
  u.searchParams.set("utm_medium", placement)
  u.searchParams.set("utm_campaign", p.id)
  return u.toString()
}
