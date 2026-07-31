import { describe, it, expect } from "vitest";
import { colorAvatar, AVATAR_COLORS } from "@/lib/avatar";

describe("colorAvatar", () => {
  it("is deterministic for the same seed", () => {
    expect(colorAvatar("user-123")).toBe(colorAvatar("user-123"));
  });

  it("always resolves to a known colour url", () => {
    for (const seed of ["a", "b", "c", "long-seed-value", ""]) {
      const url = colorAvatar(seed);
      expect(AVATAR_COLORS.some((c) => url.endsWith(`sd-${c}.png`))).toBe(true);
    }
  });
});
