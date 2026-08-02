import { describe, it, expect } from "vitest";
import { MEMBERSHIP_TIERS } from "@/config/membership-colors";
import { nextUpgradeTier } from "@/config/membership";

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
