import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createVerifyToken, consumeVerifyToken } from "@/lib/email-verify";

// M4: self-signup email verification. The token must be single-use, expiring,
// and flip emailVerifiedAt on the right user only.

const rnd = () => Math.random().toString(36).slice(2);

async function seedUnverifiedUser() {
  return prisma.user.create({
    data: { email: `verify-${rnd()}@test.local`, legalName: "New User", emailVerifiedAt: null },
  });
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("email verification token", () => {
  it("consumes a valid token and marks the email verified", async () => {
    const user = await seedUnverifiedUser();
    const raw = await createVerifyToken(user.id);

    expect(await consumeVerifyToken(raw)).toBe(true);
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.emailVerifiedAt).not.toBeNull();
  });

  it("is single-use — a second consume fails", async () => {
    const user = await seedUnverifiedUser();
    const raw = await createVerifyToken(user.id);
    expect(await consumeVerifyToken(raw)).toBe(true);
    expect(await consumeVerifyToken(raw)).toBe(false);
  });

  it("rejects an expired token", async () => {
    const user = await seedUnverifiedUser();
    const raw = await createVerifyToken(user.id, -1); // already expired
    expect(await consumeVerifyToken(raw)).toBe(false);
    const fresh = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    expect(fresh.emailVerifiedAt).toBeNull();
  });

  it("rejects an unknown/garbage token", async () => {
    expect(await consumeVerifyToken("not-a-real-token")).toBe(false);
    expect(await consumeVerifyToken("")).toBe(false);
  });
});
