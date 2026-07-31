import { describe, it, expect, afterAll } from "vitest";
import { prisma } from "@/lib/prisma";
import { dmKeyFor, canMessage, findOrCreateConversation, listConversations, getMessages, sendMessage, editMessage, deleteMessage, markRead } from "@/modules/messaging/service";

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

describe("listConversations + getMessages", () => {
  it("lists a conversation with unread count and returns its messages", async () => {
    const a = await makeUser(), b = await makeUser();
    await follow(a, b);
    const { id } = await findOrCreateConversation(a, b);
    await sendMessage(b, id, { body: "hi a" }); // b -> a, unread for a

    const listForA = await listConversations(a);
    expect(listForA).toHaveLength(1);
    expect(listForA[0].otherUser.id).toBe(b);
    expect(listForA[0].unreadCount).toBe(1);
    expect(listForA[0].lastMessagePreview).toBe("hi a");

    const msgs = await getMessages(a, id);
    expect(msgs.map((m) => m.body)).toEqual(["hi a"]);

    // a non-participant cannot read
    const c = await makeUser();
    await expect(getMessages(c, id)).rejects.toThrow();
  });
});

describe("send/edit/delete/markRead", () => {
  it("sends, bumps lastMessageAt, edits, soft-deletes, and marks read", async () => {
    const a = await makeUser(), b = await makeUser();
    await follow(a, b);
    const { id } = await findOrCreateConversation(a, b);

    const m = await sendMessage(a, id, { body: "hello" });
    const conv = await prisma.conversation.findUniqueOrThrow({ where: { id }, select: { lastMessageAt: true } });
    expect(conv.lastMessageAt).not.toBeNull();

    await sendMessage(a, id, { body: "", media: ["https://x/y.png"] }); // media-only ok
    await expect(sendMessage(a, id, { body: "" })).rejects.toThrow();   // empty rejected

    await editMessage(a, m.id, "hello (edited)");
    const edited = await prisma.message.findUniqueOrThrow({ where: { id: m.id } });
    expect(edited.body).toBe("hello (edited)");
    expect(edited.editedAt).not.toBeNull();
    await expect(editMessage(b, m.id, "nope")).rejects.toThrow(); // not author

    await deleteMessage(a, m.id);
    expect((await getMessages(a, id))[0].deleted).toBe(true);

    // b reads → unread clears for b
    await markRead(b, id);
    const listForB = await listConversations(b);
    expect(listForB[0].unreadCount).toBe(0);
  });
});
