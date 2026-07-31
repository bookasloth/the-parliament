import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";

// Verifies the DB triggers (post_counter_triggers migration) keep the
// denormalized Post counters correct — the app no longer maintains them.

const rnd = () => Math.random().toString(36).slice(2);

async function seedPost() {
  const school = await prisma.school.create({ data: { name: "T", slug: `s-${rnd()}` } });
  const category = await prisma.postCategory.create({ data: { key: `k-${rnd()}`, label: "General" } });
  const author = await prisma.user.create({ data: { email: `a-${rnd()}@test.local`, legalName: "Author" } });
  const post = await prisma.post.create({
    data: { schoolId: school.id, authorId: author.id, categoryId: category.id },
  });
  return post.id;
}

async function makeUser() {
  return (await prisma.user.create({ data: { email: `u-${rnd()}@test.local`, legalName: "U" } })).id;
}

async function counts(postId: string) {
  const p = await prisma.post.findUniqueOrThrow({
    where: { id: postId },
    select: { upvoteCount: true, downvoteCount: true, commentCount: true, shareCount: true },
  });
  return p;
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("reaction triggers", () => {
  it("upvote + like both count as upvotes; downvote is separate; delete decrements", async () => {
    const postId = await seedPost();
    const u1 = await makeUser();
    const u2 = await makeUser();
    const u3 = await makeUser();

    await prisma.reaction.create({ data: { userId: u1, entityType: "post", entityId: postId, type: "upvote" } });
    expect(await counts(postId)).toMatchObject({ upvoteCount: 1, downvoteCount: 0 });

    await prisma.reaction.create({ data: { userId: u2, entityType: "post", entityId: postId, type: "like" } });
    expect((await counts(postId)).upvoteCount).toBe(2); // 'like' counts as an upvote

    const down = await prisma.reaction.create({
      data: { userId: u3, entityType: "post", entityId: postId, type: "downvote" },
    });
    expect(await counts(postId)).toMatchObject({ upvoteCount: 2, downvoteCount: 1 });

    // Changing a downvote to an upvote moves the count across.
    await prisma.reaction.update({ where: { id: down.id }, data: { type: "upvote" } });
    expect(await counts(postId)).toMatchObject({ upvoteCount: 3, downvoteCount: 0 });

    await prisma.reaction.delete({ where: { id: down.id } });
    expect((await counts(postId)).upvoteCount).toBe(2);
  });

  it("does not react to reactions on other entity types", async () => {
    const postId = await seedPost();
    const u = await makeUser();
    await prisma.reaction.create({ data: { userId: u, entityType: "comment", entityId: postId, type: "upvote" } });
    expect((await counts(postId)).upvoteCount).toBe(0); // comment reaction, not a post reaction
  });
});

describe("comment + share triggers", () => {
  it("comment_count tracks non-deleted comments only", async () => {
    const postId = await seedPost();
    const author = await makeUser();
    const c = await prisma.comment.create({ data: { postId, authorId: author, body: "hi" } });
    expect((await counts(postId)).commentCount).toBe(1);

    await prisma.comment.update({ where: { id: c.id }, data: { deletedAt: new Date() } });
    expect((await counts(postId)).commentCount).toBe(0); // soft-deleted no longer counted
  });

  it("share_count tracks post_shares", async () => {
    const postId = await seedPost();
    const sharer = await makeUser();
    const s = await prisma.postShare.create({ data: { originalPostId: postId, sharerId: sharer } });
    expect((await counts(postId)).shareCount).toBe(1);
    await prisma.postShare.delete({ where: { id: s.id } });
    expect((await counts(postId)).shareCount).toBe(0);
  });
});

describe("self-healing", () => {
  it("recomputes an authoritative count even if the stored value was corrupted", async () => {
    const postId = await seedPost();
    const u = await makeUser();
    // Simulate drift: force a wrong stored value.
    await prisma.post.update({ where: { id: postId }, data: { upvoteCount: 999 } });
    // Any source-table write recomputes from scratch, not increment-on-top.
    await prisma.reaction.create({ data: { userId: u, entityType: "post", entityId: postId, type: "upvote" } });
    expect((await counts(postId)).upvoteCount).toBe(1); // corrected to the real count
  });
});
