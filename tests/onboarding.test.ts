import { describe, it, expect } from "vitest";
import {
  ONBOARDING_STEPS,
  STEP_INDEX,
  buildIntroPost,
  daysInMonth,
  MIN_INTERESTS,
  EMPTY_ONBOARDING,
  INTEREST_OPTIONS,
  type OnboardingData,
} from "@/lib/onboarding";

describe("step ordering", () => {
  it("STEP_INDEX matches the canonical ONBOARDING_STEPS order", () => {
    ONBOARDING_STEPS.forEach((step, i) => expect(STEP_INDEX[step]).toBe(i));
  });
});

describe("daysInMonth — leap year edge", () => {
  it("Feb has 29 days in leap years, 28 otherwise", () => {
    expect(daysInMonth(2024, 2)).toBe(29); // leap
    expect(daysInMonth(2026, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29); // divisible by 400
    expect(daysInMonth(1900, 2)).toBe(28); // divisible by 100 not 400
  });
  it("30/31-day months", () => {
    expect(daysInMonth(2026, 4)).toBe(30); // April
    expect(daysInMonth(2026, 12)).toBe(31);
  });
});

describe("buildIntroPost", () => {
  it("greets by name and always appends the standard hashtags", () => {
    const post = buildIntroPost(EMPTY_ONBOARDING, { name: "Asha Rao" });
    expect(post).toContain("Hi everyone, I'm Asha Rao!");
    expect(post).toContain("#JNVNagpur");
    expect(post).toContain("#Navodayan");
    expect(post).toContain("#NNAWCA");
  });

  it("falls back to a generic greeting without a name", () => {
    expect(buildIntroPost(EMPTY_ONBOARDING)).toContain("Hi everyone! 👋");
  });

  it("includes work, bio, interests and a donor line when present", () => {
    const data: OnboardingData = {
      ...EMPTY_ONBOARDING,
      work: { company: "Acme", position: "Engineer", sinceYear: "2022", sinceMonth: "", sinceDay: "" },
      media: { ...EMPTY_ONBOARDING.media, bio: "Love building things.", bloodGroup: "O+", willingToDonate: true },
      interests: { interestIds: ["mentorship", "jobs"] },
    };
    const post = buildIntroPost(data, { name: "Asha" });
    expect(post).toContain("Engineer at Acme");
    expect(post).toContain("since 2022");
    expect(post).toContain("Love building things.");
    expect(post).toContain("Mentorship, Jobs"); // slugs resolved to names
    expect(post).toContain("blood donor (O+)");
    expect(post).toContain("#mentorship");
  });

  it("omits the donor line when not willing", () => {
    const data = { ...EMPTY_ONBOARDING, media: { ...EMPTY_ONBOARDING.media, willingToDonate: false } };
    expect(buildIntroPost(data)).not.toContain("blood donor");
  });
});

describe("interest catalog", () => {
  it("offers at least MIN_INTERESTS distinct options with unique slugs", () => {
    const slugs = INTEREST_OPTIONS.map((i) => i.slug);
    expect(slugs.length).toBeGreaterThanOrEqual(MIN_INTERESTS);
    expect(new Set(slugs).size).toBe(slugs.length);
  });
});
