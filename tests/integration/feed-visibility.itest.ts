import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { getFeed, getPostById } from "@/modules/feed/query";

// End-to-end regression guard for the audit CP0-1 / CP0-2 privacy fixes shipped in
// #429 (fix(privacy): enforce post visibility on profile timeline, hide
// banned-author content). The pure audience-rule builders are unit-tested in
// tests/feed-visibility.test.ts; this asserts they're actually wired into the DB
// read paths (getFeed profile timeline + main feed, getPostById) against a real
// migration-built schema — the path that also exercises the poll_options.poll_id
// column the 20260907000000 migration reconciles (postSelect selects poll.options).
//
//   CP0-1: a followers-only post is hidden on a profile timeline from
//          non-followers and logged-out visitors, but shown to followers + self.
//   CP0-2: a suspended author's posts vanish from the main feed, the profile
//          timeline, and getPostById — for every viewer, the author included.

const rnd = () => Math.random().toString(36).slice(2);

async function seedScenario() {
  const school = await prisma.school.create({ data: { name: "T", slug: `s-${rnd()}` } });
  const category = await prisma.postCategory.create({
    data: { schoolId: school.id, key: `k-${rnd()}`, label: "General" },
  });
  const mk = (name: string) =>
    prisma.user.create({ data: { email: `${name}-${rnd()}@test.local`, legalName: name } });
  const author = await mk("author");
  const follower = await mk("follower");
  const stranger = await mk("stranger");
  await prisma.follow.create({ data: { followerId: follower.id, followingId: author.id } });

  const mkPost = (scope: string) =>
    prisma.post.create({
      data: {
        schoolId: school.id,
        authorId: author.id,
        categoryId: category.id,
        body: `${scope} post`,
        visibilityScope: scope,
      },
    });
  const followersPost = await mkPost("followers");
  // Control: a non-followers scope stays visible to everyone, so an assertion
  // that the followers-only post vanished isn't just "the feed is empty".
  const publicPost = await mkPost("network");

  return { schoolId: school.id, author, follower, stranger, followersPost, publicPost };
}

async function profileTimelineIds(schoolId: string, authorId: string, viewerId?: string) {
  const { rows } = await getFeed({ schoolId, authorId, viewerId });
  return new Set(rows.map((r) => r.id));
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("CP0-1 profile-timeline followers-scope gate", () => {
  it("hides a followers-only post from a logged-out visitor (control post still shows)", async () => {
    const s = await seedScenario();
    const ids = await profileTimelineIds(s.schoolId, s.author.id, undefined);
    expect(ids.has(s.followersPost.id)).toBe(false);
    expect(ids.has(s.publicPost.id)).toBe(true);
  });

  it("hides a followers-only post from a logged-in non-follower (control post still shows)", async () => {
    const s = await seedScenario();
    const ids = await profileTimelineIds(s.schoolId, s.author.id, s.stranger.id);
    expect(ids.has(s.followersPost.id)).toBe(false);
    expect(ids.has(s.publicPost.id)).toBe(true);
  });

  it("shows a followers-only post to a follower", async () => {
    const s = await seedScenario();
    const ids = await profileTimelineIds(s.schoolId, s.author.id, s.follower.id);
    expect(ids.has(s.followersPost.id)).toBe(true);
  });

  it("shows a followers-only post to the author on their own timeline", async () => {
    const s = await seedScenario();
    const ids = await profileTimelineIds(s.schoolId, s.author.id, s.author.id);
    expect(ids.has(s.followersPost.id)).toBe(true);
  });
});

describe("CP0-2 suspended-author content suppression", () => {
  it("removes a suspended author's posts from the feed, profile timeline, and getPostById", async () => {
    const s = await seedScenario();

    // Baseline: the network post is reachable before suspension.
    expect(await getPostById(s.publicPost.id, s.stranger.id)).not.toBeNull();
    expect((await profileTimelineIds(s.schoolId, s.author.id, s.stranger.id)).has(s.publicPost.id)).toBe(true);

    await prisma.user.update({ where: { id: s.author.id }, data: { status: "suspended" } });

    // Main feed (no authorId) — the suspended author's footprint is gone for every viewer.
    const feed = await getFeed({ schoolId: s.schoolId, viewerId: s.stranger.id });
    const feedIds = new Set(feed.rows.map((r) => r.id));
    expect(feedIds.has(s.publicPost.id)).toBe(false);
    expect(feedIds.has(s.followersPost.id)).toBe(false);

    // Profile timeline — empty of the suspended author's posts.
    const profileIds = await profileTimelineIds(s.schoolId, s.author.id, s.stranger.id);
    expect(profileIds.has(s.publicPost.id)).toBe(false);

    // Direct fetch — null even for the public-scope post, and even to the author.
    expect(await getPostById(s.publicPost.id, s.stranger.id)).toBeNull();
    expect(await getPostById(s.publicPost.id, s.author.id)).toBeNull();
  });
});
