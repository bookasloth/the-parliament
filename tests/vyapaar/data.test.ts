import { describe, it, expect } from "vitest";
import { CITIES, ZONES, HEADLINE, UPI, HUB_RENT, upgradeCost, MAX_LEVEL } from "@/modules/vyapaar/engine/data";

describe("vyapaar data", () => {
  it("has 25 cities, 5 per zone, authored zone-grouped", () => {
    expect(CITIES).toHaveLength(25);
    expect(ZONES).toHaveLength(5);
    for (let z = 0; z < ZONES.length; z++) {
      expect(CITIES.filter((c) => c.zone === z)).toHaveLength(5);
    }
    // authored zone-grouped: cityIds 0-4 North, 5-9 South, etc.
    for (let z = 0; z < ZONES.length; z++) {
      for (let i = 0; i < 5; i++) expect(CITIES[z * 5 + i].zone).toBe(z);
    }
  });

  it("gives each city a 7-rung rent ladder (levels 0..6) that strictly climbs", () => {
    expect(MAX_LEVEL).toBe(6);
    for (const c of CITIES) {
      expect(c.rent).toHaveLength(7);
      for (let i = 1; i < c.rent.length; i++) expect(c.rent[i]).toBeGreaterThan(c.rent[i - 1]);
      expect(c.price).toBeGreaterThan(0);
    }
  });

  it("derives upgrade cost from buy price (10% default)", () => {
    // Delhi (cityId 0) price 9000 → 900/level
    expect(upgradeCost(0)).toBe(900);
    expect(upgradeCost(0)).toBeGreaterThan(0);
  });

  it("has 8 cards in each deck and HUB_RENT indexed by hubs owned", () => {
    expect(HEADLINE).toHaveLength(8);
    expect(UPI).toHaveLength(8);
    expect(HUB_RENT).toEqual([0, 750, 1500, 3000, 6000]);
  });
});
