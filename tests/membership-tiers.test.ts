import { describe, it, expect } from "vitest";
import { MEMBERSHIP_TIERS } from "@/config/membership-colors";
import { nextUpgradeTier, BENEFITS, PLANS } from "@/config/membership";

// The navbar's visual upgrade chain (MEMBERSHIP_TIERS.next) must agree with the
// authoritative upgrade logic (nextUpgradeTier) for the shared tiers, or the UI
// offers upgrades the backend won't honour.
describe("MEMBERSHIP_TIERS.next agrees with nextUpgradeTier", () => {
  it("student/associate/premium/life chain matches", () => {
    expect(MEMBERSHIP_TIERS.student.next).toBe("associate");
    expect(MEMBERSHIP_TIERS.associate.next).toBe("premium");
    expect(MEMBERSHIP_TIERS.premium.next).toBe("life");
    expect(MEMBERSHIP_TIERS.life.next).toBeNull();
  });

  it("life and committee are terminal in both", () => {
    expect(MEMBERSHIP_TIERS.life.next).toBeNull();
    expect(MEMBERSHIP_TIERS.committee.next).toBeNull();
    expect(nextUpgradeTier("life")).toBeNull();
    expect(nextUpgradeTier("committee")).toBeNull();
  });

  it("every tier has label + background + textClass", () => {
    for (const [tier, meta] of Object.entries(MEMBERSHIP_TIERS)) {
      expect(meta.label, tier).toBeTruthy();
      expect(meta.background, tier).toBeTruthy();
      expect(meta.textClass, tier).toMatch(/^text-/);
    }
  });

  // `accent` is used directly as a CSS `color`/`fill` (tier-colored verified icon in the
  // community grid/list). Unlike `background` it must be a solid hex — never a gradient —
  // or the icon renders transparent/black.
  it("every tier accent is a solid hex color", () => {
    for (const [tier, meta] of Object.entries(MEMBERSHIP_TIERS)) {
      expect(meta.accent, tier).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(meta.accent, tier).not.toContain("gradient");
    }
  });
});

// The job-opening post gate (createPost / publishDraft → assertCategoryEntitled)
// reads benefits.jobs. Pin the entitlement so a config change can't silently
// open jobs to Students or close it for paying members.
describe("BENEFITS.jobs entitlement (drives the job-post gate)", () => {
  it("base (student) cannot post jobs; associate and premium can", () => {
    expect(BENEFITS.base.jobs).toBe(false);
    expect(BENEFITS.associate.jobs).toBe(true);
    expect(BENEFITS.premium.jobs).toBe(true);
  });

  it("life and committee resolve to the premium benefit tier (jobs allowed)", () => {
    expect(PLANS.life.benefitTier).toBe("premium");
    expect(PLANS.committee.benefitTier).toBe("premium");
    expect(BENEFITS[PLANS.life.benefitTier].jobs).toBe(true);
  });

  it("businessListing stays premium-only (the other enforced gate)", () => {
    expect(BENEFITS.base.businessListing).toBe(false);
    expect(BENEFITS.associate.businessListing).toBe(false);
    expect(BENEFITS.premium.businessListing).toBe(true);
  });
});
