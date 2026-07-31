import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { dmKeyFor, canMessage, findOrCreateConversation } from "@/modules/messaging/service";

const rnd = () => Math.random().toString(36).slice(2);
async function makeUser() {
  return (await prisma.user.create({ data: { email: `m-${rnd()}@test.local`, legalName: "M" } })).id;
}
async function follow(a: string, b: string) {
  await prisma.follow.create({ data: { followerId: a, followingId: b } });
}

afterAll(async () => { await prisma.$disconnect(); });

describe("dmKeyFor", () => {
  it("is order-independent", () => {
    expect(dmKeyFor("b", "a")).toBe(dmKeyFor("a", "b"));
  });
});

describe("canMessage", () => {
  it("true when a follow exists either direction, false otherwise", async () => {
    const a = await makeUser(), b = await makeUser(), c = await makeUser();
    await follow(a, b);
    expect(await canMessage(a, b)).toBe(true);   // a follows b
    expect(await canMessage(b, a)).toBe(true);   // reverse also allowed
    expect(await canMessage(a, c)).toBe(false);  // no relation
  });
});

describe("findOrCreateConversation", () => {
  it("is idempotent for the same pair and blocks non-connections", async () => {
    const a = await makeUser(), b = await makeUser(), c = await makeUser();
    await follow(a, b);
    const c1 = await findOrCreateConversation(a, b);
    const c2 = await findOrCreateConversation(b, a); // same pair, reversed
    expect(c1.id).toBe(c2.id);
    const parts = await prisma.conversationParticipant.count({ where: { conversationId: c1.id } });
    expect(parts).toBe(2);
    await expect(findOrCreateConversation(a, c)).rejects.toThrow(); // not connected
    await expect(findOrCreateConversation(a, a)).rejects.toThrow(); // self
  });
});
