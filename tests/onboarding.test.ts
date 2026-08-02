import { describe, it, expect } from "vitest";
import {
  ONBOARDING_STEPS,
  STEP_INDEX,
  MANDATORY_STEPS,
  buildIntroPost,
  EMPTY_ONBOARDING,
  type OnboardingData,
} from "@/lib/onboarding";

describe("step ordering", () => {
  it("STEP_INDEX matches the canonical ONBOARDING_STEPS order", () => {
    ONBOARDING_STEPS.forEach((step, i) => expect(STEP_INDEX[step]).toBe(i));
  });
  it("verify + profile are the mandatory steps", () => {
    expect(MANDATORY_STEPS).toEqual(["verify", "profile"]);
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

  it("includes house/batch, work, bio and location when present", () => {
    const data: OnboardingData = {
      ...EMPTY_ONBOARDING,
      profile: { ...EMPTY_ONBOARDING.profile, bio: "Love building things.", location: "Pune, India" },
      work: { industry: "Technology", company: "Acme", position: "Engineer", sinceYear: "2022", sinceMonth: "", current: true },
    };
    const post = buildIntroPost(data, { name: "Asha", houseName: "Aravali", batchLabel: "2006–2013" });
    expect(post).toContain("Aravali House");
    expect(post).toContain("2006–2013 batch");
    expect(post).toContain("Engineer at Acme");
    expect(post).toContain("since 2022");
    expect(post).toContain("Love building things.");
    expect(post).toContain("Based in Pune, India.");
  });

  it("omits the 'since' tail when not currently working", () => {
    const data: OnboardingData = {
      ...EMPTY_ONBOARDING,
      work: { industry: "", company: "Acme", position: "Engineer", sinceYear: "2022", sinceMonth: "", current: false },
    };
    const post = buildIntroPost(data, { name: "Asha" });
    expect(post).toContain("Engineer at Acme");
    expect(post).not.toContain("since 2022");
  });

  it("falls back to industry when no role/company", () => {
    const data: OnboardingData = {
      ...EMPTY_ONBOARDING,
      work: { ...EMPTY_ONBOARDING.work, industry: "Finance" },
    };
    expect(buildIntroPost(data)).toContain("Working in Finance.");
  });
});
