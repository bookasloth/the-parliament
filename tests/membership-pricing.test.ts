import { describe, it, expect } from "vitest";
import {
  computePricing,
  isDeltaUpgrade,
  lookupPromo,
  isPromoRedeemable,
  isBenefitTierAtLeast,
  isPaidTier,
  nextUpgradeTier,
  isRecentGraduate,
  PLANS,
  PLATFORM_FEE_INR,
  DEV_SUPPORT_DONATION_INR,
  ASSOCIATE_TO_PREMIUM_DELTA_INR,
} from "@/config/membership";

describe("computePricing — authoritative, tamper-proof charge", () => {
  it("base only, no fee/donation/promo", () => {
    const r = computePricing("premium");
    expect(r.basePaise).toBe(PLANS.premium.pricePaise); // 99900
    expect(r.totalPaise).toBe(PLANS.premium.pricePaise);
    expect(r.platformFeePaise).toBe(0);
    expect(r.donationPaise).toBe(0);
    expect(r.discountPaise).toBe(0);
  });

  it("adds platform fee and opt-in donation in paise", () => {
    const r = computePricing("associate", { platformFee: true, donate: true });
    expect(r.platformFeePaise).toBe(PLATFORM_FEE_INR * 100);
    expect(r.donationPaise).toBe(DEV_SUPPORT_DONATION_INR * 100);
    expect(r.totalPaise).toBe(PLANS.associate.pricePaise + PLATFORM_FEE_INR * 100 + DEV_SUPPORT_DONATION_INR * 100);
  });

  it("flat promo caps at the base price (can't go negative)", () => {
    const r = computePricing("associate", { promoCode: "JNV100" });
    expect(r.discountPaise).toBe(100 * 100);
    expect(r.totalPaise).toBe(PLANS.associate.pricePaise - 100 * 100);
  });

  it("percentage promo discounts the plan price only", () => {
    const r = computePricing("premium", { promoCode: "FOUNDER20" });
    expect(r.discountPaise).toBe(Math.round((PLANS.premium.pricePaise * 20) / 100));
    expect(r.totalPaise).toBe(PLANS.premium.pricePaise - r.discountPaise);
  });

  it("total is clamped at >= 0 even if discount exceeds base", () => {
    // student base is 0; a flat promo can't drive it negative
    const r = computePricing("student", { promoCode: "JNV100" });
    expect(r.totalPaise).toBe(0);
    expect(r.discountPaise).toBe(0); // flat is min(promo, base=0)
  });

  it("unknown promo is ignored", () => {
    const r = computePricing("associate", { promoCode: "NOPE" });
    expect(r.promo).toBeNull();
    expect(r.discountPaise).toBe(0);
  });
});

describe("isDeltaUpgrade — only same-kind subscription upgrades", () => {
  it("associate → premium is a delta upgrade", () => {
    expect(isDeltaUpgrade("associate", "premium")).toBe(true);
  });
  it("premium → life is NOT (life is one-time, not a subscription)", () => {
    expect(isDeltaUpgrade("premium", "life")).toBe(false);
    expect(isDeltaUpgrade("associate", "life")).toBe(false);
  });
  it("student/null source is never a delta upgrade (full price)", () => {
    expect(isDeltaUpgrade("student", "premium")).toBe(false);
    expect(isDeltaUpgrade(null, "premium")).toBe(false);
    expect(isDeltaUpgrade(undefined, "associate")).toBe(false);
  });
  it("same-tier or downgrade is not an upgrade", () => {
    expect(isDeltaUpgrade("premium", "premium")).toBe(false);
    expect(isDeltaUpgrade("premium", "associate")).toBe(false);
  });
});

describe("computePricing — delta upgrade (associate → premium)", () => {
  it("charges only the price difference, flagged as a delta", () => {
    const r = computePricing("premium", { upgradeFromPlan: "associate" });
    expect(r.isUpgradeDelta).toBe(true);
    expect(r.basePaise).toBe(PLANS.premium.pricePaise - PLANS.associate.pricePaise);
    expect(r.basePaise).toBe(ASSOCIATE_TO_PREMIUM_DELTA_INR * 100);
    expect(r.totalPaise).toBe(r.basePaise);
  });

  it("platform fee + donation still ride on the delta", () => {
    const r = computePricing("premium", { upgradeFromPlan: "associate", platformFee: true, donate: true });
    expect(r.totalPaise).toBe(
      PLANS.premium.pricePaise - PLANS.associate.pricePaise + PLATFORM_FEE_INR * 100 + DEV_SUPPORT_DONATION_INR * 100,
    );
  });

  it("percentage promo discounts the delta, not the full plan price", () => {
    const r = computePricing("premium", { upgradeFromPlan: "associate", promoCode: "FOUNDER20" });
    const delta = PLANS.premium.pricePaise - PLANS.associate.pricePaise;
    expect(r.discountPaise).toBe(Math.round((delta * 20) / 100));
    expect(r.totalPaise).toBe(delta - r.discountPaise);
  });

  it("a non-delta target (life) ignores upgradeFromPlan and charges full price", () => {
    const r = computePricing("life", { upgradeFromPlan: "premium" });
    expect(r.isUpgradeDelta).toBe(false);
    expect(r.basePaise).toBe(PLANS.life.pricePaise);
  });

  it("student→premium (no active sub) charges full price", () => {
    const r = computePricing("premium", { upgradeFromPlan: "student" });
    expect(r.isUpgradeDelta).toBe(false);
    expect(r.basePaise).toBe(PLANS.premium.pricePaise);
  });
});

describe("lookupPromo", () => {
  it("is case-insensitive and trims", () => {
    expect(lookupPromo("  jnv100 ")?.code).toBe("JNV100");
  });
  it("returns null for empty/unknown", () => {
    expect(lookupPromo(null)).toBeNull();
    expect(lookupPromo("")).toBeNull();
    expect(lookupPromo("bogus")).toBeNull();
  });
});

describe("isPromoRedeemable — expiry + redemption cap", () => {
  const base = { code: "X", type: "flat" as const, value: 100, label: "x" };
  const now = new Date("2026-06-01T00:00:00Z");

  it("no expiry, no cap → always redeemable", () => {
    expect(isPromoRedeemable(base, { now, redemptions: 999999 })).toBe(true);
  });
  it("null promo is never redeemable", () => {
    expect(isPromoRedeemable(null, { now })).toBe(false);
    expect(isPromoRedeemable(undefined, { now })).toBe(false);
  });
  it("expired code is rejected", () => {
    const p = { ...base, expiresAt: "2026-05-31T23:59:59Z" };
    expect(isPromoRedeemable(p, { now })).toBe(false);
  });
  it("not-yet-expired code is allowed", () => {
    const p = { ...base, expiresAt: "2026-12-31T23:59:59Z" };
    expect(isPromoRedeemable(p, { now })).toBe(true);
  });
  it("rejects once redemptions reach the cap (boundary)", () => {
    const p = { ...base, maxRedemptions: 500 };
    expect(isPromoRedeemable(p, { now, redemptions: 499 })).toBe(true);
    expect(isPromoRedeemable(p, { now, redemptions: 500 })).toBe(false);
    expect(isPromoRedeemable(p, { now, redemptions: 501 })).toBe(false);
  });
  it("the shipped codes are still live before their expiry", () => {
    expect(isPromoRedeemable(lookupPromo("FOUNDER20"), { now, redemptions: 0 })).toBe(true);
    expect(isPromoRedeemable(lookupPromo("JNV100"), { now, redemptions: 0 })).toBe(true);
  });
});

describe("isBenefitTierAtLeast — ordering base < associate < premium", () => {
  it("holds across the ladder", () => {
    expect(isBenefitTierAtLeast("premium", "base")).toBe(true);
    expect(isBenefitTierAtLeast("associate", "associate")).toBe(true);
    expect(isBenefitTierAtLeast("base", "associate")).toBe(false);
    expect(isBenefitTierAtLeast("associate", "premium")).toBe(false);
  });
});

describe("nextUpgradeTier — upgrade chain", () => {
  it("student → associate → premium → life, then terminal", () => {
    expect(nextUpgradeTier("student")).toBe("associate");
    expect(nextUpgradeTier("associate")).toBe("premium");
    expect(nextUpgradeTier("premium")).toBe("life");
    expect(nextUpgradeTier("life")).toBeNull();
    expect(nextUpgradeTier("committee")).toBeNull();
    expect(nextUpgradeTier("inactive")).toBeNull();
  });
});

describe("isPaidTier", () => {
  it("free tiers are not paid", () => {
    expect(isPaidTier("student")).toBe(false);
    expect(isPaidTier("inactive")).toBe(false);
  });
  it("paid/honorary tiers are paid", () => {
    for (const t of ["associate", "premium", "life", "committee"] as const) {
      expect(isPaidTier(t)).toBe(true);
    }
  });
});

describe("isRecentGraduate — auto-Student within 5 years", () => {
  const now = new Date("2026-07-31");
  it("within window is recent", () => {
    expect(isRecentGraduate(2026, now)).toBe(true);
    expect(isRecentGraduate(2021, now)).toBe(true); // exactly 5 years
  });
  it("outside window or missing is not", () => {
    expect(isRecentGraduate(2020, now)).toBe(false);
    expect(isRecentGraduate(null, now)).toBe(false);
    expect(isRecentGraduate(undefined, now)).toBe(false);
  });
});

describe("price deltas stay consistent", () => {
  it("associate→premium delta matches plan prices", () => {
    expect(ASSOCIATE_TO_PREMIUM_DELTA_INR).toBe(PLANS.premium.priceInr - PLANS.associate.priceInr);
  });
});
