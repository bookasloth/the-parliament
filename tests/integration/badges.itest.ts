import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { grantBadge } from "@/modules/badges/award";
import { evaluateUserBadges } from "@/modules/badges/evaluate-user";
import type { BadgeCriteria, BadgeRarity } from "@/config/badges";

// Badge award engine against a real DB (local *_test only — see guard.ts).
// Covers the two paths that must never double-count: idempotent grant + the
// end-to-end evaluate → grant flow.

const rnd = () => Math.random().toString(36).slice(2);
let schoolId: string;
let userId: string;

async function makeUser() {
  const u = await prisma.user.create({
    data: { email: `u-${rnd()}@test.local`, legalName: "Test User", schoolId },
  });
  return u.id;
}

async function makeBadge(key: string, rarity: string, criteria: BadgeCriteria | null) {
  return prisma.badge.create({
    data: {
      schoolId,
      key,
      label: key,
      rarity,
      awardMode: "auto",
      autoCriteria: criteria ? (criteria as unknown as object) : undefined,
    },
    select: { id: true, label: true, rarity: true, iconUrl: true },
  });
}

beforeAll(async () => {
  const school = await prisma.school.create({
    data: { name: "Badge School", slug: `s-${rnd()}` },
  });
  schoolId = school.id;
  userId = await makeUser();
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("grantBadge idempotency", () => {
  it("grants once and never double-counts the score under redelivery", async () => {
    const badge = await makeBadge(`k-${rnd()}`, "rare", null); // weight 7
    const uid = await makeUser();

    const b = { ...badge, rarity: badge.rarity as BadgeRarity };
    const first = await grantBadge({ userId: uid, badge: b, notify: false });
    const second = await grantBadge({ userId: uid, badge: b, notify: false }); // at-least-once replay

    expect(first).toBe(true);
    expect(second).toBe(false);

    const rows = await prisma.userBadge.count({ where: { userId: uid, badgeId: badge.id } });
    expect(rows).toBe(1);

    const u = await prisma.user.findUnique({
      where: { id: uid },
      select: { achievementScore: true, badgeCount: true },
    });
    expect(u).toMatchObject({ achievementScore: 7, badgeCount: 1 }); // bumped exactly once
  });
});

describe("evaluateUserBadges (event path)", () => {
  it("unlocks a threshold badge when the metric passes, and only once", async () => {
    const badge = await makeBadge(`follow-${rnd()}`, "common", {
      metric: "following_count",
      op: ">=",
      target: 1,
      window: "all_time",
      triggers: ["follow"],
    });
    const actor = await makeUser();
    const target = await makeUser();

    // Not yet: no follow → no unlock.
    await evaluateUserBadges(actor, { notify: false });
    expect(await prisma.userBadge.count({ where: { userId: actor, badgeId: badge.id } })).toBe(0);

    // Follow, then evaluate → unlocked.
    await prisma.follow.create({ data: { followerId: actor, followingId: target } });
    const first = await evaluateUserBadges(actor, { notify: false });
    expect(first.granted).toContain(badge.id);

    // Re-run → idempotent, no second grant.
    const again = await evaluateUserBadges(actor, { notify: false });
    expect(again.granted).not.toContain(badge.id);
    expect(await prisma.userBadge.count({ where: { userId: actor, badgeId: badge.id } })).toBe(1);
  });

  it("skips cron-only badges in event mode", async () => {
    const cron = await makeBadge(`tenure-${rnd()}`, "epic", {
      metric: "tenure_years",
      op: ">=",
      target: 0, // would pass instantly if evaluated
      window: "none",
      triggers: [],
    });
    const uid = await makeUser();
    await evaluateUserBadges(uid, { notify: false }); // event mode
    expect(await prisma.userBadge.count({ where: { userId: uid, badgeId: cron.id } })).toBe(0);

    // 'all' mode DOES evaluate it.
    await evaluateUserBadges(uid, { mode: "all", notify: false });
    expect(await prisma.userBadge.count({ where: { userId: uid, badgeId: cron.id } })).toBe(1);
  });
});
