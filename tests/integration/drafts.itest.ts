import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { createPost, listDrafts, publishDraft, deletePost } from "@/modules/feed/posts";
// Import from the source module, not @/modules/auth/session — that pulls in
// next-auth (→ next/server), which fails to resolve under vitest's node env.
import { ForbiddenError } from "@/lib/errors";

// Save-draft lifecycle: create hidden draft → list → publish (→ visible) or delete,
// with author-only authorization on publish/delete.

const rnd = () => Math.random().toString(36).slice(2);

async function seed() {
  const school = await prisma.school.create({ data: { name: "T", slug: `s-${rnd()}` } });
  await prisma.postCategory.create({
    data: { schoolId: school.id, key: "career_update", label: "Career Update" },
  });
  const author = await prisma.user.create({ data: { email: `a-${rnd()}@test.local`, legalName: "Author" } });
  return { schoolId: school.id, authorId: author.id };
}

afterAll(async () => {
  await prisma.$disconnect();
});

describe("draft lifecycle", () => {
  it("saves a draft that is hidden from listDrafts of other users and publishes to visible", async () => {
    const { schoolId, authorId } = await seed();
    const draft = await createPost({
      authorId, schoolId, categoryKey: "career_update", format: "text", body: "wip", asDraft: true,
    });
    expect(draft.status).toBe("draft");

    const mine = await listDrafts(authorId);
    expect(mine.map((d) => d.id)).toContain(draft.id);

    const published = await publishDraft({ postId: draft.id, authorId });
    expect(published.id).toBe(draft.id);
    const fresh = await prisma.post.findUniqueOrThrow({ where: { id: draft.id } });
    expect(fresh.status).toBe("visible");
    // No longer a draft.
    expect((await listDrafts(authorId)).map((d) => d.id)).not.toContain(draft.id);
  });

  it("rejects an empty draft", async () => {
    const { schoolId, authorId } = await seed();
    await expect(
      createPost({ authorId, schoolId, categoryKey: "career_update", format: "text", body: "  ", asDraft: true }),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });

  it("only the author can publish or delete their draft", async () => {
    const { schoolId, authorId } = await seed();
    const other = (await prisma.user.create({ data: { email: `o-${rnd()}@test.local`, legalName: "O" } })).id;
    const draft = await createPost({
      authorId, schoolId, categoryKey: "career_update", format: "text", body: "wip", asDraft: true,
    });
    await expect(publishDraft({ postId: draft.id, authorId: other })).rejects.toBeInstanceOf(ForbiddenError);
    await expect(deletePost({ postId: draft.id, userId: other })).rejects.toBeInstanceOf(ForbiddenError);
    // Author can delete it.
    await deletePost({ postId: draft.id, userId: authorId });
    expect((await listDrafts(authorId)).map((d) => d.id)).not.toContain(draft.id);
  });
});
