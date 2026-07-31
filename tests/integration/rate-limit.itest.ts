import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, enforceRateLimit, purgeExpired, RateLimitedError } from "@/lib/rate-limit";

// Unique bucket per run so parallel/leftover rows never collide.
const bucket = `test.itest.${Math.random().toString(36).slice(2)}`;

afterAll(async () => {
  await prisma.rateLimitCounter.deleteMany({ where: { bucket: { startsWith: `${bucket}:` } } });
  await prisma.$disconnect();
});

describe("checkRateLimit (DB)", () => {
  it("counts up to the limit, then blocks; remaining decrements", async () => {
    const args = { bucket, identifier: "1.2.3.4", limit: 3, windowSec: 3600 };

    const r1 = await checkRateLimit(args);
    expect(r1.allowed).toBe(true);
    expect(r1.remaining).toBe(2);

    const r2 = await checkRateLimit(args);
    expect(r2.allowed).toBe(true);
    expect(r2.remaining).toBe(1);

    const r3 = await checkRateLimit(args);
    expect(r3.allowed).toBe(true); // 3rd hit == limit, still allowed
    expect(r3.remaining).toBe(0);

    const r4 = await checkRateLimit(args);
    expect(r4.allowed).toBe(false); // 4th over the limit
    expect(r4.remaining).toBe(0);
  });

  it("separate identifiers have independent counters", async () => {
    const a = await checkRateLimit({ bucket, identifier: "alice", limit: 1, windowSec: 3600 });
    const b = await checkRateLimit({ bucket, identifier: "bob", limit: 1, windowSec: 3600 });
    expect(a.allowed).toBe(true);
    expect(b.allowed).toBe(true); // bob not affected by alice
  });

  it("enforceRateLimit throws RateLimitedError once over, and purgeExpired removes stale rows", async () => {
    const args = { bucket, identifier: "enforce", limit: 1, windowSec: 3600 };
    await enforceRateLimit(args); // 1st ok
    await expect(enforceRateLimit(args)).rejects.toBeInstanceOf(RateLimitedError);

    // Insert an already-expired row and confirm purge deletes it.
    await prisma.rateLimitCounter.create({
      data: { bucket: `${bucket}:stale`, windowKey: "0", count: 1, expiresAt: new Date(Date.now() - 60_000) },
    });
    const purged = await purgeExpired();
    expect(purged).toBeGreaterThanOrEqual(1);
  });
});
