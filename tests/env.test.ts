import { describe, it, expect, afterEach, vi } from "vitest";
import { assertRequiredEnv } from "@/config/env";

// L5: fail fast on missing critical secrets in production; warn (don't block)
// elsewhere so local/CI flows aren't disrupted.

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("assertRequiredEnv", () => {
  it("does not throw when all required vars are present", () => {
    vi.stubEnv("AUTH_SECRET", "x");
    vi.stubEnv("DATABASE_URL", "postgres://x");
    expect(() => assertRequiredEnv()).not.toThrow();
  });

  it("throws in production when a required var is missing", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("DATABASE_URL", "postgres://x");
    expect(() => assertRequiredEnv()).toThrow(/AUTH_SECRET/);
  });

  it("warns but does not throw outside production", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("AUTH_SECRET", "");
    vi.stubEnv("DATABASE_URL", "");
    expect(() => assertRequiredEnv()).not.toThrow();
    expect(warn).toHaveBeenCalledOnce();
  });
});
