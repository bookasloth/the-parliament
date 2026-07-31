import { describe, it, expect } from "vitest";
import { awards } from "@/components/shared/feed-card/types";
import { POST_AWARDS, POST_AWARD_LIST } from "@/config/post-awards";

// One canonical catalog (config/post-awards) feeds both the UI grid and the
// server lookup. These tests guard the derivation so a hand-edit can't desync
// cost/label/keys between what the client shows and what the server charges.
describe("award catalog derivation", () => {
  it("the UI grid IS the canonical list", () => {
    expect(awards).toBe(POST_AWARD_LIST);
  });

  it("server lookup matches the list on cost + label for every key", () => {
    for (const a of POST_AWARD_LIST) {
      expect(POST_AWARDS[a.key]).toEqual({ label: a.label, cost: a.cost });
    }
  });

  it("keys are unique and the lookup has the same set", () => {
    const keys = POST_AWARD_LIST.map((a) => a.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(new Set(Object.keys(POST_AWARDS))).toEqual(new Set(keys));
  });

  it("every award has a positive integer cost", () => {
    for (const a of POST_AWARD_LIST) {
      expect(Number.isInteger(a.cost)).toBe(true);
      expect(a.cost).toBeGreaterThan(0);
    }
  });
});
