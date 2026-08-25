import { describe, it, expect } from "vitest";
import { assignTokens, TOKENS, PERMANENT_EMAIL } from "@/modules/vyapaar/tokens";

describe("vyapaar token assignment", () => {
  it("pins the permanent piece to sndatarkar and gives everyone else a pool piece", () => {
    const players = [
      { seat: 0, email: "a@x.com" },
      { seat: 1, email: PERMANENT_EMAIL },
      { seat: 2, email: "c@x.com" },
    ];
    const t = assignTokens(players, "match-123");
    expect(t[1]).toBe(TOKENS[0]); // permanent
    expect(t[0]).not.toBe(TOKENS[0]);
    expect(t[2]).not.toBe(TOKENS[0]);
  });

  it("is deterministic for the same match (no reshuffle between renders)", () => {
    const players = [
      { seat: 0, email: "a@x.com" },
      { seat: 1, email: "b@x.com" },
    ];
    expect(assignTokens(players, "m1")).toEqual(assignTokens(players, "m1"));
  });

  it("gives 6 non-permanent players distinct pieces (no collisions)", () => {
    const players = Array.from({ length: 6 }, (_, i) => ({ seat: i, email: `p${i}@x.com` }));
    const t = assignTokens(players, "match-xyz");
    const used = t.filter(Boolean);
    expect(used.length).toBe(6);
    expect(new Set(used).size).toBe(6); // all distinct
  });

  it("indexes the result array by seat (not by input order)", () => {
    const players = [
      { seat: 2, email: "c@x.com" },
      { seat: 0, email: PERMANENT_EMAIL },
    ];
    const t = assignTokens(players, "m2");
    expect(t[0]).toBe(TOKENS[0]);
    expect(t[2]).toBeTruthy();
  });
});
