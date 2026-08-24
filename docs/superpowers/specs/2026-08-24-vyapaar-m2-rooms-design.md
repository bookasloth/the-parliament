# Vyapaar M2 — Persistent Rooms — Design

**Date:** 2026-08-24
**Status:** Approved for planning
**Parent design:** `docs/superpowers/specs/2026-08-23-vyapaar-multiplayer-design.md` (§7 rooms, §2 models, §8 UI). Engine (PR #351) + M1 wallet (PR #352) are merged.

**Goal:** Persistent, resumable rooms — create/join by code, a browsable public lobby, membership that survives restarts (rejoin resumes your seat), and a daily inactivity TTL sweep — plus the first mounted Vyapaar UI (hub + room pages) which also homes the M1 wallet.

## Scope

**In:** `VyapaarRoom` + `VyapaarRoomMember` models + migration + RLS; room server actions (create / join / leave / set-visibility) + public-lobby query; the `/games/vyapaar` hub page and `/games/vyapaar/rooms/[code]` room page; a `kind` flag on the games registry so Vyapaar shows on `/games`; a daily Vercel TTL cron; and the M1 render-write fix (WalletBadge becomes a pure read).

**Out (M3+):** realtime seat presence / live member updates (M3), starting a match / `VyapaarMatch` / any engine wiring (M3), the turn timer (post-M3), game settlement.

## Decisions

1. **Non-realtime.** M2 rooms use plain fetch + revalidation; live seat presence is M3 (Supabase Realtime).
2. **TTL sweep = daily Vercel cron** (`/api/cron/vyapaar-rooms`, `isAuthorizedCron` + `CRON_SECRET`, entry in `vercel.json`), matching the 5 existing daily crons. `ROOM_TTL_DAYS = 30`; 30-day TTL needs only daily granularity (Hobby-safe). pg_cron is reserved for the sub-minute turn timer later.
3. **Multiple room memberships allowed.** The "one active game per user" rule is match-level (enforced at match start in M3+), not room-level. A user may sit in several rooms before any game starts.
4. **M1 render-write fix.** `WalletBadge` becomes a pure read (`getVyapaarBalance`, no write). Enrollment (`ensureVyapaarEnrollment`) is called once at the top of the force-dynamic, auth-gated hub page and defensively inside create/join actions — a deliberate single idempotent write, never buried in a reused read component.

## Data model (Prisma)

- **`VyapaarRoom`** — `id` (uuid), `code` (unique, 6-char), `hostId → User`, `visibility` (`"private" | "public"`, default `"private"`), `status` (`"open" | "in_game" | "expired"`, default `"open"`), `lastActiveAt` (timestamptz, default now), `createdAt`. `@@index([status, visibility, lastActiveAt])` for the lobby query; `@@index([status, lastActiveAt])` for the sweep.
- **`VyapaarRoomMember`** — `roomId → VyapaarRoom` (onDelete Cascade), `userId → User`, `seat` (0..5), `joinedAt`. PK `@@id([roomId, userId])`; `@@unique([roomId, seat])`.
- **`User`** relations: `vyapaarRoomsHosted VyapaarRoom[]`, `vyapaarRoomMemberships VyapaarRoomMember[]`.
- Migration: DDL only (pattern from M1's `20260824000000_vyapaar_wallet`, with `gen_random_uuid()`/`now()` defaults). RLS in `supabase/vyapaar-rooms-rls.sql` (manual apply).

## Code generation

`generateRoomCode()` — 6 chars from the unambiguous alphabet `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `0/O/1/I/L`), using the engine's or a local seeded/`crypto` RNG (server-side `crypto.randomInt` is fine here — this is not the deterministic engine). Unique among **active** rooms (`status IN (open, in_game)`); on the rare collision, retry (cap ~5 attempts, then error). Pure alphabet/length logic extracted for a unit test; uniqueness is enforced by a DB unique constraint on `code` + retry.

## Server layer — `src/modules/vyapaar/rooms.ts` (+ `rooms-actions.ts` `"use server"`)

- `createRoom(userId, visibility): Promise<{ code: string }>` — ensure enrollment; generate a unique code; create the room (`hostId = userId`, `lastActiveAt = now`) + the host membership (`seat: 0`) in one `$transaction`.
- `joinRoom(userId, code): Promise<{ seat: number }>` — ensure enrollment; resolve an **active, non-expired** room by code; if already a member, return the existing seat (rejoin — resumes seat); else assign the **lowest free seat 0..5** (reject `room_full` at 6); bump `lastActiveAt`; all in one `$transaction`. Race-safe seat assignment via the `@@unique([roomId, seat])` constraint + retry, or a `SELECT … FOR UPDATE`-style guarded insert.
- `leaveRoom(userId, roomId): Promise<void>` — remove the membership; if the host left and members remain, promote the lowest-seat member to `hostId`; if the room is now empty, set `status = "expired"`; bump `lastActiveAt`.
- `setRoomVisibility(userId, roomId, visibility)` — host-only (`ForbiddenError` otherwise); update visibility.
- `listPublicRooms(): Promise<PublicRoomCard[]>` — `status = "open"`, `visibility = "public"`, member count < 6, not expired; returns code, host display name, seat count. (Simple; add pagination only if needed — YAGNI.)
- `getRoom(code)` / `getRoomForMember(userId, code)` — room + members (seat, displayName) for the room page; non-members can view a public room's lobby, private rooms only for members.
- `sweepExpiredRooms(now): Promise<number>` — mark `open`/`in_game` rooms with `lastActiveAt < now - ROOM_TTL_DAYS` as `expired`; returns count. Pure cutoff logic unit-testable; the cron route calls it.
- Actions wrap these with `requireUser()` (server-derived actor, never client userId) and map `ForbiddenError` → `{ ok:false, error }`.

## UI — `src/app/(main)/games/vyapaar/`

- **`page.tsx`** (hub, `force-dynamic`, `requireUser`): calls `ensureVyapaarEnrollment(user.id)` once, then renders the `WalletBadge` (pure read), a "Create room" control (visibility toggle), a "Join by code" input, and the public lobby list (`listPublicRooms`). Standard page width, `lucide-react` icons.
- **`rooms/[code]/page.tsx`** (`force-dynamic`, `requireUser`): the room — member grid (up to 6 seats, filled/empty), the join-code, a leave button, and a publish/visibility toggle for the host. Non-realtime (a manual refresh / router.refresh after actions).
- **Registry:** add `kind: "daily" | "multiplayer"` to `GameConfig` (default existing entries to `"daily"`); add a Vyapaar entry (`kind: "multiplayer"`, `slug: "vyapaar"`, `status: "live"`, tagline/tint) that links to `/games/vyapaar`. The `/games` hub renders a multiplayer card linking to its own route; the daily-puzzle machinery (`LIVE_GAMES` periods/leaderboard/`[slug]` routes) must **skip** `kind !== "daily"` (audit those call sites and filter).

## Security / RLS (`supabase/vyapaar-rooms-rls.sql`, manual apply)

- All mutations server-side via Prisma (owner role); no client writes.
- `vyapaar_room`: a member may `SELECT` rooms they belong to; anyone may `SELECT` `status='open' AND visibility='public'` rows (public lobby). `vyapaar_room_member`: a user may `SELECT` rows for rooms they're a member of. Mirror `supabase/vyapaar-wallet-rls.sql` idiom (`auth.uid()`, no client write policies). (Belt-and-suspenders — reads go through the server today.)

## Testing (unit for pure logic, integration for DB orchestration — the M1 pattern)

- **Unit:** `generateRoomCode` alphabet/length/no-ambiguous-chars; lowest-free-seat selection; `sweepExpiredRooms` cutoff math (pure helper); host-promotion pick (lowest seat).
- **Integration (`tests/integration/vyapaar-rooms.itest.ts`):** create → host is seat 0 + membership row; join fills seat 1, second join seat 2; rejoin returns the same seat (no new row); room_full at 6; leave frees a seat; host leaving promotes the lowest-seat member; last member leaving expires the room; code uniqueness (two creates never collide); `listPublicRooms` shows only open/public/non-full; `sweepExpiredRooms` expires an old room and leaves a fresh one; visibility change is host-only.

## Acceptance

A member creates a room (gets a code, is seat 0), others join by code (seats 1..5, sixth join rejected), the public lobby lists open public rooms, rejoining resumes your seat, leaving frees it (host handoff / empty-room expiry work), and a room inactive > 30 days is swept to `expired`. The hub shows the wallet balance (25,000 for a new member) without a render-time write in the badge. No realtime, no match start (M3).
