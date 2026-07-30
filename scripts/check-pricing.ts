// Self-check for membership checkout pricing. Run: npx tsx scripts/check-pricing.ts
import assert from "node:assert"
import { computePricing, PLATFORM_FEE_INR, DEV_SUPPORT_DONATION_INR, PLANS } from "../src/config/membership"

const fee = PLATFORM_FEE_INR * 100
const donation = DEV_SUPPORT_DONATION_INR * 100
const premiumBase = PLANS.premium.pricePaise // 99900

// add-ons are opt-in: bare call charges the plan price only
assert.equal(computePricing("premium").totalPaise, premiumBase)

// platform fee is optional
assert.equal(computePricing("premium", { platformFee: true }).totalPaise, premiumBase + fee)

// platform fee + optional donation
assert.equal(computePricing("premium", { platformFee: true, donate: true }).totalPaise, premiumBase + fee + donation)

// flat promo (₹100 off), case-insensitive + trimmed
const flat = computePricing("premium", { platformFee: true, promoCode: " jnv100 " })
assert.equal(flat.discountPaise, 10000)
assert.equal(flat.totalPaise, premiumBase + fee - 10000)

// percent promo (20% off plan price)
const pct = computePricing("premium", { promoCode: "FOUNDER20" })
assert.equal(pct.discountPaise, Math.round(premiumBase * 0.2))

// unknown code = no discount
assert.equal(computePricing("premium", { promoCode: "NOPE" }).discountPaise, 0)

// flat discount can't exceed the plan price, total never negative
const huge = computePricing("associate", { promoCode: "JNV100" })
assert.ok(huge.totalPaise >= 0)

console.log("pricing checks passed")
