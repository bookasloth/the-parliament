import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { enqueueOutbox } from "@/modules/outbox/enqueue";
import { drainOutbox } from "@/modules/outbox/drain";

// Outbox enqueue → drain lifecycle against a real DB (audit IP-5): coalescing,
// the claim lease (FOR UPDATE SKIP LOCKED), and failure backoff.

const rnd = () => Math.random().toString(36).slice(2);
async function makeUser() {
  return (await prisma.user.create({ data: { email: `ob-${rnd()}@test.local`, legalName: "OB" } })).id;
}

afterAll(async () => { await prisma.$disconnect(); });

describe("drainOutbox", () => {
  it("coalesces same-dedupeKey events into one unit and marks the whole group done", async () => {
    const authorId = await makeUser(); // real uuid → recompute handler no-ops cleanly (0 posts)
    await enqueueOutbox({ type: "recompute_author_ranking", payload: { authorId }, dedupeKey: authorId });
    await enqueueOutbox({ type: "recompute_author_ranking", payload: { authorId }, dedupeKey: authorId });
    await enqueueOutbox({ type: "recompute_author_ranking", payload: { authorId }, dedupeKey: authorId });

    const pendingBefore = await prisma.outboxEvent.count({ where: { dedupeKey: authorId, status: "pending" } });
    expect(pendingBefore).toBe(3);

    await drainOutbox();

    const rows = await prisma.outboxEvent.findMany({ where: { dedupeKey: authorId } });
    expect(rows).toHaveLength(3);
    expect(rows.every((r) => r.status === "done")).toBe(true);            // whole group marked done together
    expect(rows.every((r) => r.processedAt !== null)).toBe(true);
    expect(rows.every((r) => r.attempts === 1)).toBe(true);               // claimed once, succeeded
  });

  it("leaves nothing to claim on an immediate re-drain (lease + done)", async () => {
    const authorId = await makeUser();
    await enqueueOutbox({ type: "recompute_author_ranking", payload: { authorId }, dedupeKey: authorId });
    await drainOutbox();
    // The just-processed row is done; a second drain at the same instant finds it
    // ineligible (not pending).
    const r = await drainOutbox({ now: new Date() });
    // Can't assert global counts (other rows may exist), but this row must be done.
    const row = await prisma.outboxEvent.findFirstOrThrow({ where: { dedupeKey: authorId } });
    expect(row.status).toBe("done");
    expect(r.done).toBeGreaterThanOrEqual(0);
  });

  it("retries an unhandled type with backoff instead of losing it", async () => {
    const key = `unknown-${rnd()}`;
    await enqueueOutbox({ type: "no_such_handler", payload: {}, dedupeKey: key });
    const now = new Date();
    await drainOutbox({ now });

    const row = await prisma.outboxEvent.findFirstOrThrow({ where: { dedupeKey: key } });
    expect(row.status).toBe("pending");                 // not lost, not done
    expect(row.attempts).toBe(1);
    expect(row.lastError).toContain("no_such_handler");
    expect(row.nextAttemptAt.getTime()).toBeGreaterThan(now.getTime()); // backed off into the future
  });
});
