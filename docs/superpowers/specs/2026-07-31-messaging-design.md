# Messaging (Direct Messages) — Design Spec

**Date:** 2026-07-31
**Status:** Approved, phased build

## Goal
Replace the mock `messages/` UI (`chat-data.ts`) with a real 1:1 direct-messaging
feature backed by the existing (bare) `Conversation` / `ConversationParticipant`
/ `Message` schema.

## Decisions
- **Scope:** 1:1 DMs only. The N-participant schema stays, so group chat is a
  later addition, not a rewrite.
- **Permissions:** you may DM a member only if a follow/connection exists in
  **either** direction (you follow them, or they follow you).
- **Delivery (phased):** Slice 1 uses **polling**; Slice 2 swaps in **Supabase
  Realtime** (messages + presence). Same UI both slices.
- **v1 features:** unread counts + last-read, read receipts ("seen"),
  edit/delete own messages, image attachments, emoji picker. Presence lands in
  Slice 2 (needs Realtime).

## Data model (extend existing models)
- **Conversation**
  - add `lastMessageAt DateTime?` `@map("last_message_at")` `@db.Timestamptz`, indexed — orders the sidebar.
  - add `dmKey String? @unique @map("dm_key")` — sorted `"<userA>:<userB>"` for 1:1, enables find-or-create with no duplicate conversations.
- **ConversationParticipant**
  - add `lastReadAt DateTime?` `@map("last_read_at")` — drives unread counts AND read receipts.
  - add `@@index([userId])` — list "my conversations".
- **Message**
  - add `editedAt DateTime?` `@map("edited_at")`.
  - add `media Json @default("[]")` — array of image URLs (mirrors `Post.media`).
  - add `@@index([conversationId, createdAt])` — pagination.
  - `body`, `deletedAt` (soft-delete) already exist. Emojis are unicode in `body` — no schema change.

`lastMessageAt` is bumped inside the `sendMessage` transaction (single writer).

Both target tables are empty on prod → migration adds cleanly. Migration is
hand-authored (like prior batches) and applied via the auto-migrate-on-deploy
path.

## Module: `src/modules/messaging/`
- `types.ts` — `ConversationSummary`, `MessageView`, etc.
- `service.ts`:
  - `canMessage(viewerId, otherId)` — follow/connection check (either direction). Throws `ForbiddenError` otherwise.
  - `findOrCreateConversation(viewerId, otherId)` — computes `dmKey`, upserts the conversation + both participant rows. Idempotent.
  - `listConversations(viewerId)` — the sidebar: other participant, last message preview, `lastMessageAt`, unread count (messages after my `lastReadAt`). Ordered by `lastMessageAt desc`.
  - `getMessages(viewerId, conversationId, { before?, limit })` — paginated, ascending; asserts viewer is a participant.
  - `sendMessage(viewerId, conversationId, { body, media })` — asserts participant + `canMessage`; creates message; bumps `lastMessageAt`; returns the message. (Slice 2: also publishes to Realtime.)
  - `editMessage` / `deleteMessage` — author-only; `editedAt` / `deletedAt`.
  - `markRead(viewerId, conversationId)` — set participant `lastReadAt = now()`.
- `realtime.ts` (Slice 2 only) — mint Supabase JWT from Auth.js session; server publish helper.

Server actions / route handlers live under `messages/` and `api/messages/*`,
each guarded by `requireUser()`.

## UI wiring (off `chat-data.ts`)
- **ChatSidebar** ← `listConversations` (real conversations, unread badges).
- **`messages/[conversationId]`** ← `getMessages`; composer sends via `sendMessage`.
  Slice 1: poll `getMessages` + unread every few seconds while open. Slice 2:
  subscribe to Realtime instead.
- **Composer** additions: emoji picker (client-only), image upload (existing
  Supabase storage helper → `message.media`), edit/delete controls on own messages.
- **Read receipts:** compare the other participant's `lastReadAt` to message `createdAt` → "Seen".
- **Presence** (Slice 2): green online dots via Supabase Realtime presence channel.
- Starting a DM: a "Message" button on profiles / connections → `findOrCreateConversation` → navigate to the conversation.

## Real-time architecture (Slice 2)
The app uses **Auth.js (NextAuth), not Supabase Auth**, so Supabase Realtime's
RLS (`auth.uid()`) has no identity by default. Bridge:
1. Server endpoint mints a short-lived JWT signed with the Supabase JWT secret,
   claims `{ sub: userId, role: "authenticated" }`.
2. Browser Supabase client uses that token.
3. **RLS policies** on `conversations` / `conversation_participants` / `messages`:
   a user may `SELECT` only rows for conversations they participate in. Writes
   still go through Prisma server-side (service role), so RLS is read-scoped for
   the subscription.
4. Client subscribes to Postgres changes on `messages` filtered by
   `conversation_id`, plus a presence channel per open conversation.

## Testing
Integration tests (existing pattern, local `_test` DB) on `service.ts`:
- `findOrCreateConversation` idempotent (same pair → same conversation via `dmKey`).
- `canMessage` gate (allowed with a follow, blocked without).
- unread count math (messages after `lastReadAt`).
- `sendMessage` bumps `lastMessageAt` + participant check.
- `editMessage` / `deleteMessage` author-only.
- `markRead` clears unread + drives read receipt.

## Phasing
- **Slice 1 (this plan):** schema migration + `messaging` module + full UI wiring
  with **polling**. All v1 features except presence. Integration-tested. Ships a
  complete, working DM product.
- **Slice 2 (follow-up):** Supabase Realtime (JWT bridge + RLS) replacing polling,
  plus presence. Its own spec/plan.

## Out of scope (v1)
Group chats, message reactions, typing indicators, message search, voice/video,
message forwarding.
