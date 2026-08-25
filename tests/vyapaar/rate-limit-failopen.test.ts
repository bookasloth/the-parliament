import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the redis client the rate-limiter sits on, so we can drive incr's behaviour.
const incr = vi.fn();
const expire = vi.fn();
vi.mock("@/lib/redis", () => ({ redis: { incr: (...a: unknown[]) => incr(...a), expire: (...a: unknown[]) => expire(...a) } }));

import { rateLimitOk } from "@/lib/rate-limit";

const input = { bucket: "vyapaar:test", identifier: "u1", limit: 3, windowSec: 10 };

describe("rateLimitOk (fail-open)", () => {
  beforeEach(() => { incr.mockReset(); expire.mockReset(); });

  it("allows while under the limit", async () => {
    incr.mockResolvedValue(1);
    expect(await rateLimitOk(input)).toBe(true);
  });

  it("blocks once the count exceeds the limit", async () => {
    incr.mockResolvedValue(4); // limit is 3
    expect(await rateLimitOk(input)).toBe(false);
  });

  it("allows exactly at the limit boundary", async () => {
    incr.mockResolvedValue(3); // count === limit → still allowed
    expect(await rateLimitOk(input)).toBe(true);
  });

  it("FAILS OPEN when redis is unreachable (infra error → allow)", async () => {
    incr.mockRejectedValue(new TypeError("Failed to parse URL from /pipeline"));
    expect(await rateLimitOk(input)).toBe(true);
  });
});
