import { describe, it, expect } from "vitest"
import { SHUBHAM_DATARKAR_AD, sponsorHref } from "@/config/sponsor-ads"
import { isKnownAdId, adCatalog } from "@/config/ad-tracking"
import {
  injectEmailSponsor,
  isSponsoredEmailCategory,
  EMAIL_FOOTER_ANCHOR,
} from "@/modules/email/sponsor-footer"

describe("sponsorHref", () => {
  it("links to the advertiser with source + campaign + per-placement medium", () => {
    const url = sponsorHref("email")
    expect(url.startsWith(SHUBHAM_DATARKAR_AD.baseUrl)).toBe(true)
    expect(url).toContain("utm_source=nnawca")
    expect(url).toContain("utm_medium=email")
    expect(url).toContain("utm_campaign=alumni_sponsor")
  })
  it("varies the medium by placement", () => {
    expect(sponsorHref("alerts")).toContain("utm_medium=alerts")
    expect(sponsorHref("email")).not.toContain("utm_medium=alerts")
  })
})

describe("tracking registration", () => {
  it("whitelists the sponsor ad id (so its beacons validate)", () => {
    expect(isKnownAdId(SHUBHAM_DATARKAR_AD.id)).toBe(true)
  })
  it("lists the sponsor under both the email and alerts placements in the catalog", () => {
    const cat = adCatalog()
    const mine = cat.filter((c) => c.adId === SHUBHAM_DATARKAR_AD.id)
    expect(mine.map((c) => c.placement).sort()).toEqual(["alerts", "email"])
    for (const c of mine) expect(c.name).toBe(SHUBHAM_DATARKAR_AD.advertiser)
  })
})

describe("isSponsoredEmailCategory", () => {
  it("is true for promotional-friendly categories", () => {
    for (const c of ["lifecycle", "reminder", "wish", "engagement", "digest", "marketing"]) {
      expect(isSponsoredEmailCategory(c)).toBe(true)
    }
  })
  it("is false for transactional, admin, and institutional mail", () => {
    for (const c of ["transactional", "admin", "institutional", "unknown"]) {
      expect(isSponsoredEmailCategory(c)).toBe(false)
    }
  })
})

describe("injectEmailSponsor", () => {
  const body = `<h1>Hi</h1>${EMAIL_FOOTER_ANCHOR}<footer>NNAWCA</footer>`

  it("inserts the sponsor strip before the footer for eligible mail", () => {
    const out = injectEmailSponsor(body, "digest")
    expect(out).not.toBe(body)
    expect(out).toContain("Sponsored")
    expect(out).toContain("Shubham Datarkar")
    // strip must land BEFORE the footer anchor, not after
    expect(out.indexOf("Shubham Datarkar")).toBeLessThan(out.indexOf(EMAIL_FOOTER_ANCHOR))
  })

  it("leaves transactional mail completely untouched (receipts/auth stay ad-free)", () => {
    expect(injectEmailSponsor(body, "transactional")).toBe(body)
    expect(injectEmailSponsor(body, "admin")).toBe(body)
  })

  it("is a no-op when the footer anchor is absent (non-emailShell body)", () => {
    const plain = "<p>no shell here</p>"
    expect(injectEmailSponsor(plain, "digest")).toBe(plain)
  })

  it("inserts the strip exactly once", () => {
    const out = injectEmailSponsor(body, "reminder")
    expect(out.split("Get a free consultation").length - 1).toBe(1)
  })
})
