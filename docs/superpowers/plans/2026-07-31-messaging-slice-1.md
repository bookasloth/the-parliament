# Messaging Slice 1 (1:1 DMs, polling) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the mock `messages/` UI with a working 1:1 direct-messaging feature (unread counts, read receipts, edit/delete, image attachments, emoji picker) delivered by polling.

**Architecture:** Extend the existing bare `Conversation`/`ConversationParticipant`/`Message` Prisma models. Business logic lives in a new `src/modules/messaging/service.ts` (server-only, Prisma), tested with the existing vitest integration harness against a local `_test` DB. Thin server actions expose it; the existing `messages/` client UI is wired off the mock and polls for updates. Real-time (Supabase Realtime + presence) is Slice 2, out of scope here.

**Tech Stack:** Next.js 16 App Router, Prisma 7 (generated client at `@/generated/prisma/*`), vitest, Supabase storage (existing `src/lib/supabase-storage.ts`), Tailwind.

## Global Constraints

- Prisma generated client is imported from `@/generated/prisma/*`; enums/types from `@/generated/prisma/enums`. `prisma` singleton from `@/lib/prisma`.
- Every server action / route handler starts with `requireUser()` from `@/modules/auth/session` (or `requireUser` re-export). Mutations are author/participant-guarded.
- Errors use `ForbiddenError` (from the same place existing services import it — see `src/modules/feed/posts.ts`).
- Migrations are hand-authored SQL under `prisma/migrations/<UTC-ish timestamp>_<name>/migration.sql`; timestamp must sort AFTER `20260731150000`. They apply to prod via the auto-migrate-on-deploy path — but **both target tables are empty on prod**, and no destructive casts here, so no preflight needed.
- Integration tests: `tests/integration/*.itest.ts`, run with `npm run test:integration` (local `_test` DB, guarded localhost + `_test`). Unit invariants: `npm test`. Typecheck: `npx tsc --noEmit` (must be 0).
- Standard page width and shared components per `CLAUDE.md` Frontend section. `messages/` is a master-detail client shell (`layout.tsx` + `ChatSidebar` + `[conversationId]`).
- Money/karma/auth rules unchanged; DMs award no karma.

---

### Task 1: Schema — extend messaging models + migration

**Files:**
- Modify: `prisma/schema.prisma` (Conversation, ConversationParticipant, Message)
- Create: `prisma/migrations/20260731160000_messaging_fields/migration.sql`

**Interfaces:**
- Produces: `Conversation.lastMessageAt`, `Conversation.dmKey`, `ConversationParticipant.lastReadAt`, `Message.editedAt`, `Message.media` columns + indexes that later tasks read/write.

- [ ] **Step 1: Edit `Conversation`** — add fields + index:

```prisma
model Conversation {
  id            String    @id @default(uuid()) @db.Uuid
  createdAt     DateTime  @default(now()) @map("created_at") @db.Timestamptz
  lastMessageAt DateTime? @map("last_message_at") @db.Timestamptz
  dmKey         String?   @unique @map("dm_key") @db.VarChar(80)

  participants ConversationParticipant[]
  messages     Message[]

  @@index([lastMessageAt])
  @@map("conversations")
}
```

- [ ] **Step 2: Edit `ConversationParticipant`** — add `lastReadAt` + index:

```prisma
model ConversationParticipant {
  conversationId String    @map("conversation_id") @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  lastReadAt     DateTime? @map("last_read_at") @db.Timestamptz

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  user         User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([conversationId, userId])
  @@index([userId])
  @@map("conversation_participants")
}
```

- [ ] **Step 3: Edit `Message`** — add `editedAt`, `media`, index:

```prisma
model Message {
  id             String    @id @default(uuid()) @db.Uuid
  conversationId String    @map("conversation_id") @db.Uuid
  senderId       String    @map("sender_id") @db.Uuid
  body           String
  media          Json      @default("[]")
  createdAt      DateTime  @default(now()) @map("created_at") @db.Timestamptz
  editedAt       DateTime? @map("edited_at") @db.Timestamptz
  deletedAt      DateTime? @map("deleted_at") @db.Timestamptz

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  sender       User         @relation("message_sender", fields: [senderId], references: [id], onDelete: Cascade)

  @@index([senderId, createdAt])
  @@index([conversationId, createdAt])
  @@map("messages")
}
```

- [ ] **Step 4: Write the migration SQL** — `prisma/migrations/20260731160000_messaging_fields/migration.sql`:

```sql
ALTER TABLE "conversations" ADD COLUMN "last_message_at" TIMESTAMPTZ;
ALTER TABLE "conversations" ADD COLUMN "dm_key" VARCHAR(80);
CREATE UNIQUE INDEX "conversations_dm_key_key" ON "conversations"("dm_key");
CREATE INDEX "conversations_last_message_at_idx" ON "conversations"("last_message_at");

ALTER TABLE "conversation_participants" ADD COLUMN "last_read_at" TIMESTAMPTZ;
CREATE INDEX "conversation_participants_user_id_idx" ON "conversation_participants"("user_id");

ALTER TABLE "messages" ADD COLUMN "media" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "messages" ADD COLUMN "edited_at" TIMESTAMPTZ;
CREATE INDEX "messages_conversation_id_created_at_idx" ON "messages"("conversation_id", "created_at");
```

- [ ] **Step 5: Generate + typecheck**

Run: `npx prisma generate && npx tsc --noEmit`
Expected: generate succeeds; 0 type errors.

- [ ] **Step 6: Apply on the test DB + confirm**

Run: `npm run test:integration` (global-setup runs `migrate deploy`; existing 11 tests still pass, and the new migration appears in the applied list).
Expected: "All migrations have been successfully applied", 11 passed.

- [ ] **Step 7: Commit**

```bash
git add prisma/schema.prisma prisma/migrations/20260731160000_messaging_fields
git commit -m "Messaging: extend conversation/message schema (last_message_at, dm_key, last_read_at, media, edited_at)"
```

---

### Task 2: `messaging` types + `canMessage` + `findOrCreateConversation`

**Files:**
- Create: `src/modules/messaging/types.ts`
- Create: `src/modules/messaging/service.ts`
- Create/extend: `tests/integration/messaging.itest.ts`

**Interfaces:**
- Consumes: `prisma` from `@/lib/prisma`; `ForbiddenError` (import from `@/lib/gate` or wherever `posts.ts` imports it — grep `ForbiddenError` first and match).
- Produces:
  - `dmKeyFor(a: string, b: string): string` — sorted `"<min>:<max>"`.
  - `canMessage(viewerId: string, otherId: string): Promise<boolean>` — true if a `Follow` row exists in either direction.
  - `findOrCreateConversation(viewerId: string, otherId: string): Promise<{ id: string }>` — throws `ForbiddenError` if `!canMessage` or `viewerId === otherId`.

- [ ] **Step 1: Confirm the Follow model shape**

Run: `grep -A12 "model Follow " prisma/schema.prisma`
Expected: fields `followerId`, `followingId`. Use these exact names below.

- [ ] **Step 2: Write `types.ts`**

```ts
export interface ConversationSummary {
  id: string
  otherUser: { id: string; name: string; username: string | null; avatar: string | null }
  lastMessagePreview: string
  lastMessageAt: string | null
  unreadCount: number
}

export interface MessageView {
  id: string
  senderId: string
  body: string
  media: string[]
  createdAt: string
  editedAt: string | null
  deleted: boolean
}
```

- [ ] **Step 3: Write the failing test** — `tests/integration/messaging.itest.ts`:

```ts
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
```

- [ ] **Step 4: Run it — verify it fails**

Run: `npm run test:integration -- messaging`
Expected: FAIL (module `@/modules/messaging/service` not found).

- [ ] **Step 5: Implement `service.ts` (this slice)**

```ts
import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/gate" // match posts.ts's import source

export function dmKeyFor(a: string, b: string): string {
  return [a, b].sort().join(":")
}

export async function canMessage(viewerId: string, otherId: string): Promise<boolean> {
  if (viewerId === otherId) return false
  const rel = await prisma.follow.findFirst({
    where: {
      OR: [
        { followerId: viewerId, followingId: otherId },
        { followerId: otherId, followingId: viewerId },
      ],
    },
    select: { followerId: true },
  })
  return !!rel
}

export async function findOrCreateConversation(viewerId: string, otherId: string): Promise<{ id: string }> {
  if (!(await canMessage(viewerId, otherId))) {
    throw new ForbiddenError("You can only message your connections")
  }
  const dmKey = dmKeyFor(viewerId, otherId)
  const existing = await prisma.conversation.findUnique({ where: { dmKey }, select: { id: true } })
  if (existing) return existing
  const conv = await prisma.conversation.create({
    data: {
      dmKey,
      participants: { create: [{ userId: viewerId }, { userId: otherId }] },
    },
    select: { id: true },
  })
  return conv
}
```

- [ ] **Step 6: Run — verify pass**

Run: `npm run test:integration -- messaging` then `npx tsc --noEmit`
Expected: PASS; 0 type errors.

- [ ] **Step 7: Commit**

```bash
git add src/modules/messaging tests/integration/messaging.itest.ts
git commit -m "Messaging: canMessage + findOrCreateConversation (connections-only, idempotent)"
```

---

### Task 3: `listConversations` + `getMessages`

**Files:**
- Modify: `src/modules/messaging/service.ts`
- Modify: `tests/integration/messaging.itest.ts`

**Interfaces:**
- Consumes: Task 2 exports.
- Produces:
  - `listConversations(viewerId: string): Promise<ConversationSummary[]>` — ordered by `lastMessageAt desc nulls last`; `unreadCount` = messages with `createdAt > participant.lastReadAt` (or all if never read) not sent by viewer, non-deleted.
  - `getMessages(viewerId, conversationId, opts?: { limit?: number; before?: string }): Promise<MessageView[]>` — ascending; asserts viewer participates (else `ForbiddenError`).

- [ ] **Step 1: Write failing tests** (append to `messaging.itest.ts`):

```ts
import { listConversations, getMessages, sendMessage } from "@/modules/messaging/service";

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
```

- [ ] **Step 2: Run — verify fail** (`sendMessage`/`listConversations`/`getMessages` undefined).

Run: `npm run test:integration -- messaging`
Expected: FAIL.

- [ ] **Step 3: Implement** (append to `service.ts`; note `sendMessage` is fully built in Task 4 — add a minimal version now, then Task 4 extends it. To avoid rework, implement Task 4's `sendMessage` here and mark Task 4 as extending edit/delete/read):

```ts
import type { ConversationSummary, MessageView } from "./types"

async function assertParticipant(viewerId: string, conversationId: string) {
  const p = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    select: { userId: true },
  })
  if (!p) throw new ForbiddenError("Not a participant")
}

export async function listConversations(viewerId: string): Promise<ConversationSummary[]> {
  const rows = await prisma.conversation.findMany({
    where: { participants: { some: { userId: viewerId } } },
    orderBy: { lastMessageAt: { sort: "desc", nulls: "last" } },
    select: {
      id: true,
      lastMessageAt: true,
      participants: {
        select: { userId: true, lastReadAt: true, user: { select: { id: true, displayName: true, legalName: true, username: true, profile: { select: { photoUrl: true } } } } },
      },
      messages: { orderBy: { createdAt: "desc" }, take: 1, where: { deletedAt: null }, select: { body: true, media: true } },
    },
  })
  return Promise.all(rows.map(async (c) => {
    const me = c.participants.find((p) => p.userId === viewerId)!
    const other = c.participants.find((p) => p.userId !== viewerId)!.user
    const unreadCount = await prisma.message.count({
      where: {
        conversationId: c.id, deletedAt: null, senderId: { not: viewerId },
        ...(me.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
      },
    })
    const last = c.messages[0]
    return {
      id: c.id,
      otherUser: { id: other.id, name: other.displayName || other.legalName, username: other.username, avatar: other.profile?.photoUrl ?? null },
      lastMessagePreview: last ? (last.body || ((last.media as string[]).length ? "📷 Photo" : "")) : "",
      lastMessageAt: c.lastMessageAt?.toISOString() ?? null,
      unreadCount,
    }
  }))
}

export async function getMessages(
  viewerId: string,
  conversationId: string,
  opts: { limit?: number; before?: string } = {},
): Promise<MessageView[]> {
  await assertParticipant(viewerId, conversationId)
  const limit = Math.min(opts.limit ?? 50, 100)
  const rows = await prisma.message.findMany({
    where: { conversationId, ...(opts.before ? { createdAt: { lt: new Date(opts.before) } } : {}) },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true, senderId: true, body: true, media: true, createdAt: true, editedAt: true, deletedAt: true },
  })
  return rows.reverse().map((m) => ({
    id: m.id, senderId: m.senderId,
    body: m.deletedAt ? "" : m.body,
    media: m.deletedAt ? [] : (m.media as string[]),
    createdAt: m.createdAt.toISOString(),
    editedAt: m.editedAt?.toISOString() ?? null,
    deleted: !!m.deletedAt,
  }))
}
```

- [ ] **Step 4: Add `sendMessage` (needed by the test)** — see Task 4 Step 3 for the full implementation; paste it now.

- [ ] **Step 5: Run — verify pass + typecheck**

Run: `npm run test:integration -- messaging && npx tsc --noEmit`
Expected: PASS; 0 errors.

- [ ] **Step 6: Commit**

```bash
git add src/modules/messaging tests/integration/messaging.itest.ts
git commit -m "Messaging: listConversations + getMessages (unread counts, participant guard)"
```

---

### Task 4: `sendMessage`, `editMessage`, `deleteMessage`, `markRead`

**Files:**
- Modify: `src/modules/messaging/service.ts`
- Modify: `tests/integration/messaging.itest.ts`

**Interfaces:**
- Produces:
  - `sendMessage(viewerId, conversationId, input: { body: string; media?: string[] }): Promise<MessageView>` — asserts participant; requires non-empty `body` or `media`; creates message; bumps `Conversation.lastMessageAt` in the same transaction.
  - `editMessage(viewerId, messageId, body: string): Promise<void>` — author-only; sets `editedAt`.
  - `deleteMessage(viewerId, messageId): Promise<void>` — author-only; sets `deletedAt`.
  - `markRead(viewerId, conversationId): Promise<void>` — sets participant `lastReadAt = now()`.

- [ ] **Step 1: Write failing tests** (append):

```ts
import { editMessage, deleteMessage, markRead } from "@/modules/messaging/service";

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
```

- [ ] **Step 2: Run — verify fail.** Run: `npm run test:integration -- messaging`. Expected: FAIL.

- [ ] **Step 3: Implement** (append to `service.ts`):

```ts
export async function sendMessage(
  viewerId: string,
  conversationId: string,
  input: { body: string; media?: string[] },
): Promise<MessageView> {
  await assertParticipant(viewerId, conversationId)
  const body = input.body.trim()
  const media = input.media ?? []
  if (!body && media.length === 0) throw new ForbiddenError("Empty message")
  const [msg] = await prisma.$transaction([
    prisma.message.create({
      data: { conversationId, senderId: viewerId, body, media },
      select: { id: true, senderId: true, body: true, media: true, createdAt: true, editedAt: true, deletedAt: true },
    }),
    prisma.conversation.update({ where: { id: conversationId }, data: { lastMessageAt: new Date() } }),
  ])
  return {
    id: msg.id, senderId: msg.senderId, body: msg.body, media: msg.media as string[],
    createdAt: msg.createdAt.toISOString(), editedAt: null, deleted: false,
  }
}

async function assertAuthor(viewerId: string, messageId: string) {
  const m = await prisma.message.findUnique({ where: { id: messageId }, select: { senderId: true } })
  if (!m || m.senderId !== viewerId) throw new ForbiddenError("Not the author")
}

export async function editMessage(viewerId: string, messageId: string, body: string): Promise<void> {
  await assertAuthor(viewerId, messageId)
  const trimmed = body.trim()
  if (!trimmed) throw new ForbiddenError("Empty message")
  await prisma.message.update({ where: { id: messageId }, data: { body: trimmed, editedAt: new Date() } })
}

export async function deleteMessage(viewerId: string, messageId: string): Promise<void> {
  await assertAuthor(viewerId, messageId)
  await prisma.message.update({ where: { id: messageId }, data: { deletedAt: new Date() } })
}

export async function markRead(viewerId: string, conversationId: string): Promise<void> {
  await assertParticipant(viewerId, conversationId)
  await prisma.conversationParticipant.update({
    where: { conversationId_userId: { conversationId, userId: viewerId } },
    data: { lastReadAt: new Date() },
  })
}
```

(If Task 3 already pasted `sendMessage`, skip re-adding — keep one copy.)

- [ ] **Step 4: Run — verify pass + typecheck.** Run: `npm run test:integration -- messaging && npx tsc --noEmit`. Expected: PASS; 0 errors.

- [ ] **Step 5: Commit**

```bash
git add src/modules/messaging tests/integration/messaging.itest.ts
git commit -m "Messaging: sendMessage/editMessage/deleteMessage/markRead + read receipts"
```

---

### Task 5: Server actions

**Files:**
- Create: `src/app/(main)/messages/actions.ts`

**Interfaces:**
- Consumes: all `service.ts` exports; `requireUser()` from `@/modules/auth/session`.
- Produces server actions: `startConversationAction(otherId)`, `sendMessageAction(conversationId, body, media)`, `editMessageAction(messageId, body)`, `deleteMessageAction(messageId)`, `markReadAction(conversationId)`, `refreshMessagesAction(conversationId, before?)`, `refreshConversationsAction()`.

- [ ] **Step 1: Write `actions.ts`** — each begins `"use server"` + `const u = await requireUser()`, delegates to the service with `u.id`, wraps in try/catch returning `{ ok, error }` for mutations or the data for reads. Example:

```ts
"use server"
import { requireUser } from "@/modules/auth/session"
import * as svc from "@/modules/messaging/service"

export async function sendMessageAction(conversationId: string, body: string, media: string[] = []) {
  const u = await requireUser()
  try {
    const msg = await svc.sendMessage(u.id, conversationId, { body, media })
    return { ok: true as const, msg }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : "Failed" }
  }
}
// ...one per service function, same shape.
```

- [ ] **Step 2: Typecheck.** Run: `npx tsc --noEmit`. Expected: 0 errors.
- [ ] **Step 3: Commit.** `git commit -am "Messaging: server actions"`

---

### Task 6: Wire ChatSidebar to real conversations

**Files:**
- Modify: `src/app/(main)/messages/layout.tsx` (fetch `listConversations` server-side, pass down)
- Modify: `src/app/(main)/messages/ChatSidebar.tsx` (consume real `ConversationSummary[]`)

**Interfaces:** Consumes `listConversations` (via a server component or `refreshConversationsAction`).

- [ ] **Step 1:** In `layout.tsx` (server), `const convos = await listConversations(user.id)` and pass to `ChatSidebar`. Get `user` via `auth()`/session as other `(main)` pages do (follow `network/page.tsx` pattern).
- [ ] **Step 2:** Change `ChatSidebar` props from mock `ChatConversation[]` to `ConversationSummary[]`; render name/avatar/preview/unread badge from real fields; link each to `/messages/{id}`.
- [ ] **Step 3: Verify** — `npx tsc --noEmit` (0 errors) and `npm run dev`, open `/messages` logged in (via the owner account), confirm real conversations render (empty state if none).
- [ ] **Step 4: Commit.** `git commit -am "Messaging: wire ChatSidebar to real conversations"`

---

### Task 7: Wire conversation view + polling + composer send

**Files:**
- Modify: `src/app/(main)/messages/[conversationId]/page.tsx`

**Interfaces:** Consumes `getMessages`, `markReadAction`, `sendMessageAction`, `refreshMessagesAction`.

- [ ] **Step 1:** Server component loads initial `getMessages(user.id, conversationId)` + participant check; passes to a client conversation component.
- [ ] **Step 2:** Client component renders messages (me vs them by `senderId === viewerId`), calls `markReadAction(conversationId)` on mount + when new messages arrive.
- [ ] **Step 3:** Composer input → `sendMessageAction`; optimistic append; clear on success.
- [ ] **Step 4: Polling** — `setInterval` every 4s while mounted: `refreshMessagesAction(conversationId, lastCreatedAt)`; append new; also refresh unread. Clear interval on unmount.
- [ ] **Step 5: Read receipts** — show "Seen" under the last of my messages when the other participant's `lastReadAt >= message.createdAt` (fetch the other participant's `lastReadAt` in `getMessages`/a summary; extend the read model if needed — add `otherLastReadAt` to the conversation payload).
- [ ] **Step 6: Verify** — `npx tsc --noEmit`; manual: two browsers (owner + a connected test user) send/receive within ~4s; unread clears; "Seen" appears.
- [ ] **Step 7: Commit.** `git commit -am "Messaging: conversation view, send, polling, read receipts"`

---

### Task 8: Composer features — emoji picker, image upload, edit/delete

**Files:**
- Modify: the client composer + message components from Task 7
- Reuse: `src/lib/supabase-storage.ts` (add a `uploadMessageImage` helper mirroring `uploadAvatar`) + a small upload route or reuse the pattern in `api/profile/photo/route.ts`

**Interfaces:** Consumes `editMessageAction`, `deleteMessageAction`, `sendMessageAction` (with `media`).

- [ ] **Step 1: Emoji picker** — a lightweight emoji button that inserts unicode into the input. Use a small static emoji list (no new dependency; a `const EMOJIS = [...]` grid in a popover) to honor the no-new-dep norm. Clicking inserts at cursor.
- [ ] **Step 2: Image upload** — file input → upload via a new `POST /api/messages/upload` (guard `requireUser`, validate type/size like `profile/photo/route.ts`, store via supabase-storage) → returns URL → include in `sendMessageAction(..., [url])`. Render `media` images in the message bubble.
- [ ] **Step 3: Edit/delete** — hover menu on own messages: Edit (inline input → `editMessageAction`, show "edited"), Delete (`deleteMessageAction`, render "This message was deleted").
- [ ] **Step 4: Verify** — `npx tsc --noEmit`; manual: send emoji, send image, edit, delete.
- [ ] **Step 5: Commit.** `git commit -am "Messaging: emoji picker, image attachments, edit/delete"`

---

### Task 9: "Message" entry point

**Files:**
- Modify: `src/app/(main)/[username]/profile-view.tsx` and/or `connections`/`AlumniProfileCard` actions — add a "Message" button for connected users.

**Interfaces:** Consumes `startConversationAction(otherId)` → returns `{ ok, conversationId }` → `router.push("/messages/{id}")`.

- [ ] **Step 1:** Add `startConversationAction` returning the conversation id. On a profile/connection card of a user you're connected to, show "Message"; onClick calls it and navigates. Hide/disable when `!canMessage` (or let the action's error surface a toast).
- [ ] **Step 2: Verify** — `npx tsc --noEmit`; manual: from a connected user's profile, "Message" opens (or creates) the conversation.
- [ ] **Step 3: Commit.** `git commit -am "Messaging: start-conversation entry point on profiles"`

---

### Task 10: Remove the mock + final checks

**Files:**
- Delete: `src/app/(main)/messages/chat-data.ts`
- Grep for remaining imports of `chat-data` and remove.

- [ ] **Step 1:** `grep -rn "chat-data" src` → remove all references (should be none after Tasks 6–8).
- [ ] **Step 2:** Delete `chat-data.ts`.
- [ ] **Step 3: Full verify** — `npx tsc --noEmit` (0), `npm test` (unit green), `npm run test:integration` (messaging + prior green), `npm run test:e2e` (smoke still green).
- [ ] **Step 4: Update `CLAUDE.md`** — change the `messages/` note from "Mock data in `messages/chat-data.ts`" to "Wired to `modules/messaging` (1:1 DMs, polling; Realtime = Slice 2)."
- [ ] **Step 5: Commit.** `git commit -am "Messaging: remove mock chat-data, wire-up complete"`

---

## Verification (whole slice)
- `npx tsc --noEmit` → 0
- `npm test` → unit green; `npm run test:integration` → messaging suite + prior green; `npm run test:e2e` → smoke green
- Manual two-user flow: start DM (connected only), send/receive within polling window, unread + "Seen", emoji, image, edit, delete.
- Migration auto-applies to prod on the next production deploy (empty tables, safe).

## Deferred to Slice 2
Supabase Realtime (JWT bridge + RLS) replacing polling; presence (online dots); its own spec + plan.
