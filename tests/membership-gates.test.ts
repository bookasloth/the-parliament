import { describe, it, expect } from "vitest";
import {
  canPostJob,
  canApplyAsMentor,
  canListBusiness,
  canVoteInNNAWCA,
  isEligibleForCommitteeInvite,
  canInviteToCommittee,
  requireBenefitTier,
  MembershipGateError,
  type MemberContext,
} from "@/lib/membership-gates";

function ctx(over: Partial<MemberContext> = {}): MemberContext {
  return {
    user: { status: "active", createdAt: new Date("2020-01-01"), isVerified: true },
    benefitTier: "base",
    planCode: "student",
    ...over,
  };
}

describe("benefit gates by tier", () => {
  it("jobs unlocked at associate+, business/mentor at premium", () => {
    expect(canPostJob(ctx({ benefitTier: "base" }))).toBe(false);
    expect(canPostJob(ctx({ benefitTier: "associate" }))).toBe(true);

    expect(canListBusiness(ctx({ benefitTier: "associate" }))).toBe(false);
    expect(canListBusiness(ctx({ benefitTier: "premium" }))).toBe(true);

    expect(canApplyAsMentor(ctx({ benefitTier: "associate" }))).toBe(false);
    expect(canApplyAsMentor(ctx({ benefitTier: "premium" }))).toBe(true);
  });
});

describe("canVoteInNNAWCA — verified + 30 active days", () => {
  const now = new Date("2026-07-31");
  it("requires verification", () => {
    expect(
      canVoteInNNAWCA(ctx({ user: { status: "active", createdAt: new Date("2020-01-01"), isVerified: false } }), now),
    ).toBe(false);
  });
  it("requires >= 30 days since first active", () => {
    const fresh = ctx({ user: { status: "active", createdAt: new Date("2026-07-20"), isVerified: true } }); // 11 days
    expect(canVoteInNNAWCA(fresh, now)).toBe(false);
    const seasoned = ctx({ user: { status: "active", createdAt: new Date("2026-06-01"), isVerified: true } });
    expect(canVoteInNNAWCA(seasoned, now)).toBe(true);
  });
});

describe("committee eligibility", () => {
  it("only Life members are eligible to be invited", () => {
    expect(isEligibleForCommitteeInvite(ctx({ planCode: "life" }))).toBe(true);
    expect(isEligibleForCommitteeInvite(ctx({ planCode: "premium" }))).toBe(false);
  });
  it("only super-admins can invite", () => {
    expect(canInviteToCommittee(ctx({ isSuperAdmin: true }))).toBe(true);
    expect(canInviteToCommittee(ctx({ isSuperAdmin: false }))).toBe(false);
    expect(canInviteToCommittee(ctx())).toBe(false);
  });
});

describe("requireBenefitTier", () => {
  it("passes when tier is high enough, throws otherwise", () => {
    expect(() => requireBenefitTier(ctx({ benefitTier: "premium" }), "associate")).not.toThrow();
    expect(() => requireBenefitTier(ctx({ benefitTier: "base" }), "premium")).toThrow(MembershipGateError);
  });
});
