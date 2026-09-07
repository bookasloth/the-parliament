import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { enqueueOutbox } from "@/modules/outbox/enqueue";
import { drainOutbox } from "@/modules/outbox/drain";

// Event-invite fan-out via the outbox (audit IP-5): the drain delivers a wave in
// bounded, keyset-paginated chunks and re-enqueues a continuation until the whole
// audience is notified — no 5000 cap, no 60s-timeout risk. A tiny pageSize here
// forces the multi-chunk path without seeding 500 users.

const rnd = () => Math.random().toString(36).slice(2);

async function seed() {
  const school = await prisma.school.create({ data: { name: "T", slug: `s-${rnd()}` } });
  const host = await prisma.user.create({ data: { email: `host-${rnd()}@test.local`, legalName: "Host" } });
  const event = await prisma.event.create({
    data: { schoolId: school.id, hostId: host.id, title: `Reunion ${rnd()}`, startsAt: new Date(Date.now() + 86400000), mode: "online" },
  });
  // 3 premium members (the "premium" wave tier) → 2 chunks at pageSize 2.
  const members: string[] = [];
  for (let i = 0; i < 3; i++) {
    members.push((await prisma.user.create({
      data: { email: `m-${rnd()}@test.local`, legalName: `M${i}`, membershipStatus: "premium" },
    })).id);
  }
  return { eventId: event.id, members };
}

const inviteCount = (eventId: string) =>
  prisma.notification.count({ where: { type: "new_event_in_batch", entityType: "event", entityId: eventId } });
const pendingFanout = (eventId: string) =>
  prisma.outboxEvent.count({ where: { type: "fanout_event_invite", status: "pending", payload: { path: ["eventId"], equals: eventId } } });

afterAll(async () => { await prisma.$disconnect(); });

describe("fanout_event_invite", () => {
  it("delivers a wave in chunks, re-enqueuing until every recipient is notified", async () => {
    const { eventId } = await seed();
    await enqueueOutbox({ type: "fanout_event_invite", payload: { eventId, tier: "premium", pageSize: 2 } });

    // Chunk 1: 2 of 3 notified, a continuation left pending.
    await drainOutbox();
    expect(await inviteCount(eventId)).toBe(2);
    expect(await pendingFanout(eventId)).toBe(1);

    // Chunk 2: the last recipient notified, no continuation (page not full).
    await drainOutbox();
    expect(await inviteCount(eventId)).toBe(3);
    expect(await pendingFanout(eventId)).toBe(0);

    // A further drain is a clean no-op — nobody notified twice.
    await drainOutbox();
    expect(await inviteCount(eventId)).toBe(3);
  });

  it("no-ops for an unpublished event without enqueuing a continuation", async () => {
    const { eventId } = await seed();
    await prisma.event.update({ where: { id: eventId }, data: { status: "cancelled" } });
    await enqueueOutbox({ type: "fanout_event_invite", payload: { eventId, tier: "premium", pageSize: 2 } });
    await drainOutbox();
    expect(await inviteCount(eventId)).toBe(0);
    expect(await pendingFanout(eventId)).toBe(0);
  });
});
