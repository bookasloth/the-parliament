import { describe, it, expect, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/modules/notifications/service";

// Coalesced notifications aggregate distinct actors (audit N-1) instead of
// overwriting to the latest one. Drives sendNotification against a real DB.

const rnd = () => Math.random().toString(36).slice(2);
async function makeUser() {
  return (await prisma.user.create({ data: { email: `na-${rnd()}@test.local`, legalName: "NA" } })).id;
}

afterAll(async () => { await prisma.$disconnect(); });

describe("notification actor aggregation", () => {
  it("folds distinct actors into one coalesced row; ignores a repeat actor", async () => {
    const recipient = await makeUser();
    const entityId = randomUUID(); // polymorphic entityId (no FK) — a stand-in post id
    const a1 = randomUUID(), a2 = randomUUID();

    const base = { userId: recipient, kind: "reaction_on_post" as const, entityType: "post", entityId, sendEmail: false };
    await sendNotification({ ...base, title: "Alice reacted to your post", actorId: a1 });
    await sendNotification({ ...base, title: "Bob reacted to your post", actorId: a2 });

    let rows = await prisma.notification.findMany({ where: { userId: recipient, entityType: "post", entityId } });
    expect(rows).toHaveLength(1);                       // coalesced into one row
    expect(rows[0].actorCount).toBe(2);                 // both distinct actors counted
    expect(rows[0].actorIds).toEqual([a2, a1]);         // newest-first
    expect(rows[0].title).toBe("Bob reacted to your post"); // title tracks the latest actor

    // A repeat actor must not inflate the count.
    await sendNotification({ ...base, title: "Alice reacted to your post", actorId: a1 });
    rows = await prisma.notification.findMany({ where: { userId: recipient, entityType: "post", entityId } });
    expect(rows).toHaveLength(1);
    expect(rows[0].actorCount).toBe(2);
  });

  it("a fresh entity is its own row with actorCount 1", async () => {
    const recipient = await makeUser();
    const entityId = randomUUID();
    await sendNotification({ userId: recipient, kind: "reaction_on_post", title: "Alice reacted to your post", entityType: "post", entityId, actorId: randomUUID(), sendEmail: false });
    const row = await prisma.notification.findFirstOrThrow({ where: { userId: recipient, entityId } });
    expect(row.actorCount).toBe(1);
    expect(row.actorIds).toHaveLength(1);
  });
});
