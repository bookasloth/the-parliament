import { describe, it, expect } from "vitest";
import { CITIES, ZONES, COMPANIES, upgradeCost, MAX_LEVEL, ZONE_DOUBLE } from "@/modules/vyapaar/engine/data";

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

  it("makes the first house worth building: 1-house rent beats the zone-set (base x ZONE_DOUBLE) rent", () => {
    // Regression: base and 1-house rungs were authored independently, so 23/25 cities had
    // 1House <= base*ZONE_DOUBLE — building the first house gave zero (or negative) rent.
    for (const c of CITIES) {
      const zoneSetRent = c.rent[0] * ZONE_DOUBLE;
      expect(c.rent[1]).toBeGreaterThan(zoneSetRent);
    }
  });

  it("derives upgrade cost from buy price (10% default)", () => {
    // Delhi (cityId 0) price 9000 → 900/level
    expect(upgradeCost(0)).toBe(900);
    expect(upgradeCost(0)).toBeGreaterThan(0);
  });

  it("has 6 companies in 3 reciprocal pairs", () => {
    expect(COMPANIES).toHaveLength(6);
    for (let i = 0; i < COMPANIES.length; i++) expect(COMPANIES[COMPANIES[i].partner].partner).toBe(i);
    for (const c of COMPANIES) expect(c.pair).toBeGreaterThan(c.single); // pair rate always higher
  });
});
