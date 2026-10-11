import { describe, it, expect } from "vitest"
import { HOUSE_PRODUCTS, houseProductHref, type HouseProductKey } from "@/config/house-products"
import { adCatalog, isKnownAdId } from "@/config/ad-tracking"
import { prepareAdEventBatch } from "@/modules/ads/tracking"

const KEYS = Object.keys(HOUSE_PRODUCTS) as HouseProductKey[]

describe("house products config", () => {
  it("has unique ad ids", () => {
    const ids = KEYS.map((k) => HOUSE_PRODUCTS[k].id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it("links every product to timewheel.co.in over https", () => {
    for (const k of KEYS) {
      const u = new URL(HOUSE_PRODUCTS[k].url)
      expect(u.protocol).toBe("https:")
      expect(u.hostname).toBe("timewheel.co.in")
    }
  })

  it("gives card copy to every product that renders in the sidebar", () => {
    for (const k of KEYS) {
      const p = HOUSE_PRODUCTS[k]
      if (p.placements.includes("sidebar")) {
        expect(p.headline && p.body && p.cta).toBeTruthy()
      }
      if (p.placements.includes("inline")) expect(p.line).toBeTruthy()
    }
  })
})

describe("houseProductHref", () => {
  it("tags the destination with source, slot and campaign", () => {
    const u = new URL(houseProductHref("ticketDino", "sidebar"))
    expect(u.origin + u.pathname).toBe("https://timewheel.co.in/products/ticket-dino")
    expect(u.searchParams.get("utm_source")).toBe("nnawca")
    expect(u.searchParams.get("utm_medium")).toBe("sidebar")
    expect(u.searchParams.get("utm_campaign")).toBe(HOUSE_PRODUCTS.ticketDino.id)
  })

  it("reflects the placement it was rendered in", () => {
    expect(new URL(houseProductHref("ezshop", "inline")).searchParams.get("utm_medium")).toBe("inline")
  })
})

describe("house products in delivery tracking", () => {
  it("whitelists every house product id for the beacon", () => {
    for (const k of KEYS) expect(isKnownAdId(HOUSE_PRODUCTS[k].id)).toBe(true)
  })

  it("lists one catalog row per (product, placement) it renders in", () => {
    const rows = adCatalog()
    for (const k of KEYS) {
      const p = HOUSE_PRODUCTS[k]
      const mine = rows.filter((r) => r.adId === p.id)
      expect(mine.map((r) => r.placement).sort()).toEqual([...p.placements].sort())
      expect(mine.every((r) => r.name === p.name)).toBe(true)
    }
  })

  it("accepts the new inline placement and still rejects forged placements", () => {
    const out = prepareAdEventBatch(
      [
        { adId: HOUSE_PRODUCTS.coffeeToffee.id, placement: "inline", kind: "impression" },
        { adId: HOUSE_PRODUCTS.coffeeToffee.id, placement: "popup", kind: "impression" },
      ],
      { viewerId: "u1", now: new Date("2026-10-11T10:00:00Z") },
    )
    expect(out).toHaveLength(1)
    expect(out[0]).toMatchObject({ placement: "inline", adId: "hp-coffeetoffee" })
  })
})
