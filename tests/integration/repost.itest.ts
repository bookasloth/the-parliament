import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPost, sharePost, unsharePost } from "@/modules/feed/posts";
import { getFeed } from "@/modules/feed/query";

// Repost-as-object (audit): a reshare is a first-class feed Post embedding the
// original, deduped, flattened (no repost chains), with the embed viewer-gated.

const rnd = () => Math.random().toString(36).slice(2);

async function seed() {
  const school = await prisma.school.create({ data: { name: "T", slug: `s-${rnd()}` } });
  await prisma.postCategory.create({ data: { schoolId: school.id, key: "career_update", label: "Career Update" } });
  const author = await prisma.user.create({ data: { email: `au-${rnd()}@test.local`, legalName: "Author" } });
  const sharer = await prisma.user.create({ data: { email: `sh-${rnd()}@test.local`, legalName: "Sharer" } });
  const stranger = await prisma.user.create({ data: { email: `st-${rnd()}@test.local`, legalName: "Stranger" } });
  return { schoolId: school.id, author: author.id, sharer: sharer.id, stranger: stranger.id };
}
async function mkPost(schoolId: string, authorId: string, scope = "network") {
  const p = await createPost({ authorId, schoolId, categoryKey: "career_update", format: "text", body: `b-${rnd()}` });
  if (scope !== "network") await prisma.post.update({ where: { id: p.id }, data: { visibilityScope: scope } });
  return p.id;
}
const findRepostRow = async (feed: Awaited<ReturnType<typeof getFeed>>, repostOfId: string) =>
  feed.rows.find((r) => (r as { repostOfId?: string | null }).repostOfId === repostOfId);

afterAll(async () => { await prisma.$disconnect(); });

describe("reshare lifecycle", () => {
  it("creates a repost Post, bumps shareCount, dedupes, and unshare removes it", async () => {
    const { schoolId, author, sharer } = await seed();
    const original = await mkPost(schoolId, author);

    await sharePost({ userId: sharer, postId: original });
    const reposts = await prisma.post.findMany({ where: { authorId: sharer, repostOfId: original } });
    expect(reposts).toHaveLength(1);
    expect(reposts[0].format).toBe("repost");
    expect((await prisma.post.findUniqueOrThrow({ where: { id: original }, select: { shareCount: true } })).shareCount).toBe(1);

    // Dedupe: re-sharing is a no-op (one repost, shareCount unchanged).
    await sharePost({ userId: sharer, postId: original });
    expect(await prisma.post.count({ where: { authorId: sharer, repostOfId: original } })).toBe(1);
    expect((await prisma.post.findUniqueOrThrow({ where: { id: original }, select: { shareCount: true } })).shareCount).toBe(1);

    // Unshare removes both the repost object and the counter row.
    await unsharePost({ userId: sharer, postId: original });
    expect(await prisma.post.count({ where: { authorId: sharer, repostOfId: original } })).toBe(0);
    expect(await prisma.postShare.count({ where: { originalPostId: original, sharerId: sharer } })).toBe(0);
  });

  it("flattens a repost-of-a-repost to the true original", async () => {
    const { schoolId, author, sharer, stranger } = await seed();
    const original = await mkPost(schoolId, author);
    await sharePost({ userId: sharer, postId: original });
    const repost = await prisma.post.findFirstOrThrow({ where: { authorId: sharer, repostOfId: original } });

    // Stranger reshares the REPOST → should point at the original, not the repost.
    await sharePost({ userId: stranger, postId: repost.id });
    const strangerRepost = await prisma.post.findFirstOrThrow({ where: { authorId: stranger }, orderBy: { createdAt: "desc" } });
    expect(strangerRepost.repostOfId).toBe(original);
  });
});

describe("repost embed visibility", () => {
  it("tombstones a followers-only original for a viewer who can't see it, shows it to one who can", async () => {
    const { schoolId, author, sharer, stranger } = await seed();
    await prisma.follow.create({ data: { followerId: sharer, followingId: author } });   // sharer follows author
    await prisma.follow.create({ data: { followerId: stranger, followingId: sharer } });  // stranger follows sharer, NOT author

    const original = await mkPost(schoolId, author, "followers");
    await sharePost({ userId: sharer, postId: original }); // allowed — sharer follows author

    // Stranger's feed: the repost shows, but its embed is nulled (can't see author's followers-only post).
    const forStranger = await getFeed({ schoolId, viewerId: stranger, rankerName: "recency" });
    const rowS = await findRepostRow(forStranger, original);
    expect(rowS).toBeTruthy();
    expect(rowS!.repostOf).toBeNull();

    // Sharer follows the author → the embed is visible in their own feed.
    const forSharer = await getFeed({ schoolId, viewerId: sharer, rankerName: "recency" });
    const rowSh = await findRepostRow(forSharer, original);
    expect(rowSh?.repostOf).not.toBeNull();
  });
});
