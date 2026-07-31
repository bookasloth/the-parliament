import { describe, it, expect } from "vitest";
import { thresholdFor, InsufficientKarmaError, spendKarma } from "@/modules/karma/ledger";
import { KARMA } from "@/config/karma";

describe("thresholdFor — level tiers", () => {
  const cases: [number, string][] = [
    [0, "reader"],
    [24, "reader"],
    [25, "commenter"],
    [49, "commenter"],
    [50, "poster"],
    [99, "poster"],
    [100, "poller"],
    [249, "poller"],
    [250, "group_leader"],
    [499, "group_leader"],
    [500, "mentor"],
    [10_000, "mentor"],
  ];
  it.each(cases)("balance %i → %s", (balance, level) => {
    expect(thresholdFor(balance).level).toBe(level);
  });

  it("negative balance is still a reader and cannot post", () => {
    const t = thresholdFor(-5);
    expect(t.level).toBe("reader");
    expect(t.canPost).toBe(false); // canPost requires balance >= 0
  });

  it("unlock booleans track the config thresholds", () => {
    expect(thresholdFor(KARMA.UNLOCKS.POLLS - 1).canCreatePoll).toBe(false);
    expect(thresholdFor(KARMA.UNLOCKS.POLLS).canCreatePoll).toBe(true);
    expect(thresholdFor(KARMA.UNLOCKS.CREATE_GROUP - 1).canCreateGroup).toBe(false);
    expect(thresholdFor(KARMA.UNLOCKS.CREATE_GROUP).canCreateGroup).toBe(true);
    expect(thresholdFor(0).canComment).toBe(true);
  });
});

describe("spendKarma — input guard (no DB touched)", () => {
  it("rejects a non-positive amount before any balance lookup", async () => {
    await expect(spendKarma({ userId: "u1", amount: 0, reasonCode: "x" })).rejects.toThrow(
      /positive/,
    );
    await expect(spendKarma({ userId: "u1", amount: -10, reasonCode: "x" })).rejects.toThrow(
      /positive/,
    );
  });
});

describe("InsufficientKarmaError", () => {
  it("reports required vs available in the message", () => {
    const e = new InsufficientKarmaError(50, 12);
    expect(e).toBeInstanceOf(Error);
    expect(e.name).toBe("InsufficientKarmaError");
    expect(e.message).toContain("50");
    expect(e.message).toContain("12");
  });
});
