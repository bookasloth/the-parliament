import { describe, it, expect } from "vitest";
import {
  resolveActivePlan,
  isWithinGrace,
  isExpiringSoon,
  daysBetween,
  nextRenewalDate,
  academicYearFor,
  type MembershipRow,
  type UserLike,
} from "@/lib/membership-cycle";
import { MEMBERSHIP_GRACE_DAYS } from "@/config/membership";

const activeUser: UserLike = { status: "active", createdAt: new Date("2020-01-01"), isVerified: true };
const now = new Date("2026-07-31");

function row(over: Partial<MembershipRow>): MembershipRow {
  return { planCode: "premium", benefitTier: "premium", startedAt: new Date("2026-01-01"), endsAt: null, status: "active", ...over };
}

describe("resolveActivePlan", () => {
  it("suspended/banned/inactive users collapse to inactive", () => {
    for (const status of ["inactive", "suspended", "banned"]) {
      const r = resolveActivePlan({ ...activeUser, status }, [row({})], now);
      expect(r.planCode).toBe("inactive");
      expect(r.benefitTier).toBe("base");
    }
  });

  it("defaults to student when no active paid rows", () => {
    const r = resolveActivePlan(activeUser, [], now);
    expect(r.planCode).toBe("student");
    expect(r.source).toBe("default_student");
  });

  it("picks the highest-precedence active plan", () => {
    const r = resolveActivePlan(activeUser, [
      row({ planCode: "associate", benefitTier: "associate", endsAt: new Date("2027-01-01") }),
      row({ planCode: "premium", benefitTier: "premium", endsAt: new Date("2027-01-01") }),
    ], now);
    expect(r.planCode).toBe("premium"); // premium outranks associate
    expect(r.inGrace).toBe(false);
  });

  it("keeps an expired plan alive during the grace window, then drops it", () => {
    const justExpired = new Date("2026-07-20"); // 11 days ago, within 30-day grace
    const inGrace = resolveActivePlan(activeUser, [row({ endsAt: justExpired })], now);
    expect(inGrace.planCode).toBe("premium");
    expect(inGrace.inGrace).toBe(true);

    const longExpired = new Date("2026-05-01"); // > 30 days ago
    const dropped = resolveActivePlan(activeUser, [row({ endsAt: longExpired })], now);
    expect(dropped.planCode).toBe("student"); // grace lapsed → default
  });
});

describe("isWithinGrace", () => {
  it("true inside the grace window, false past it", () => {
    const endsAt = new Date("2026-07-01");
    const within = new Date(endsAt);
    within.setDate(within.getDate() + MEMBERSHIP_GRACE_DAYS - 1);
    const past = new Date(endsAt);
    past.setDate(past.getDate() + MEMBERSHIP_GRACE_DAYS + 1);
    expect(isWithinGrace(endsAt, within)).toBe(true);
    expect(isWithinGrace(endsAt, past)).toBe(false);
  });
});

describe("isExpiringSoon", () => {
  it("only true for a future date inside the window", () => {
    expect(isExpiringSoon(new Date("2026-08-10"), 30, now)).toBe(true);
    expect(isExpiringSoon(new Date("2026-10-01"), 30, now)).toBe(false); // too far
    expect(isExpiringSoon(new Date("2026-07-01"), 30, now)).toBe(false); // already past
    expect(isExpiringSoon(null, 30, now)).toBe(false);
  });
});

describe("date helpers", () => {
  it("daysBetween is absolute", () => {
    expect(daysBetween(new Date("2026-01-01"), new Date("2026-01-11"))).toBe(10);
    expect(daysBetween(new Date("2026-01-11"), new Date("2026-01-01"))).toBe(10);
  });
  it("nextRenewalDate adds the duration", () => {
    expect(nextRenewalDate(new Date("2026-01-01"), 365).getFullYear()).toBe(2027);
  });
  it("academicYearFor rolls over in April (IST academic year)", () => {
    expect(academicYearFor(new Date("2026-03-15")).startYear).toBe(2025); // before April
    expect(academicYearFor(new Date("2026-04-15")).startYear).toBe(2026); // April+
  });
});
