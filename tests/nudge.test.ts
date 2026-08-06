import { describe, it, expect } from "vitest";
import { nudgeVerdict, type NudgeFacts } from "@/modules/games/nudge";

const base: NudgeFacts = {
  actorId: "a",
  targetId: "b",
  isConnection: true,
  nudgedRecently: false,
};

describe("nudgeVerdict", () => {
  it("allows nudging a fresh connection", () => {
    expect(nudgeVerdict(base)).toEqual({ ok: true });
  });

  it("rejects nudging yourself (checked before connection/rate)", () => {
    expect(nudgeVerdict({ ...base, actorId: "x", targetId: "x", isConnection: false })).toEqual({
      ok: false,
      reason: "self",
    });
  });

  it("rejects a non-connection", () => {
    expect(nudgeVerdict({ ...base, isConnection: false })).toEqual({ ok: false, reason: "not_connected" });
  });

  it("rejects a repeat nudge inside the cooldown", () => {
    expect(nudgeVerdict({ ...base, nudgedRecently: true })).toEqual({ ok: false, reason: "rate_limited" });
  });

  it("self check wins over rate_limited when both apply", () => {
    expect(nudgeVerdict({ actorId: "x", targetId: "x", isConnection: true, nudgedRecently: true })).toEqual({
      ok: false,
      reason: "self",
    });
  });
});
