import { describe, it, expect, afterEach, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { awardKarma, spendKarma, getBalance, InsufficientKarmaError } from "@/modules/karma/ledger";

const created: string[] = [];

async function makeUser(): Promise<string> {
  const u = await prisma.user.create({
    data: { email: `karma-${created.length}-${Math.random().toString(36).slice(2)}@test.local`, legalName: "Karma Test" },
  });
  created.push(u.id);
  return u.id;
}

afterEach(async () => {
  // Cascade deletes karma rows/transactions.
  if (created.length) {
    await prisma.user.deleteMany({ where: { id: { in: created.splice(0) } } });
  }
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("awardKarma (DB)", () => {
  it("writes a ledger row and upserts the balance; positive award grows earned30d + lifetime", async () => {
    const userId = await makeUser();
    const bal = await awardKarma({ userId, actionType: "post_like_publisher", baseValue: 5, role: "publisher" });

    expect(bal.balance).toBe(5);
    expect(bal.earned30d).toBe(5);
    expect(bal.lifetimeEarned).toBe(5);

    const txns = await prisma.karmaTransaction.findMany({ where: { userId } });
    expect(txns).toHaveLength(1);
    expect(txns[0].appliedValue.toNumber()).toBe(5);

    // A second positive award accumulates.
    const bal2 = await awardKarma({ userId, actionType: "comment_publisher", baseValue: 2, role: "publisher" });
    expect(bal2.balance).toBe(7);
    expect(bal2.lifetimeEarned).toBe(7);
  });

  it("negative award lowers balance but NOT earned30d/lifetime", async () => {
    const userId = await makeUser();
    await awardKarma({ userId, actionType: "comment_publisher", baseValue: 10, role: "publisher" });
    const after = await awardKarma({ userId, actionType: "downvote_publisher", baseValue: -2, role: "publisher" });

    expect(after.balance).toBe(8); // 10 - 2
    expect(after.earned30d).toBe(10); // unchanged by the negative
    expect(after.lifetimeEarned).toBe(10);
  });
});

describe("spendKarma (DB)", () => {
  it("debits when affordable and throws InsufficientKarmaError otherwise", async () => {
    const userId = await makeUser();
    await awardKarma({ userId, actionType: "admin_adjustment", baseValue: 100 });

    const afterSpend = await spendKarma({ userId, amount: 30, reasonCode: "unlock_poll" });
    expect(afterSpend.balance).toBe(70);
    expect((await getBalance(userId)).balance).toBe(70);

    await expect(spendKarma({ userId, amount: 1000, reasonCode: "too_much" })).rejects.toBeInstanceOf(
      InsufficientKarmaError,
    );
    // Balance untouched after a failed spend.
    expect((await getBalance(userId)).balance).toBe(70);
  });
});
