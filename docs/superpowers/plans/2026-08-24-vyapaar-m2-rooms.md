# Vyapaar M2 — Persistent Rooms — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persistent, resumable Vyapaar rooms — create/join by code (rejoin resumes seat), a public lobby, host handoff + empty-room expiry, a daily inactivity TTL sweep — plus the first mounted Vyapaar UI (hub + room pages), and the M1 render-write fix.

**Architecture:** Mirrors the M1 wallet pattern — pure logic (`rooms-logic.ts`) unit-tested; Prisma-transaction orchestration (`rooms.ts`) integration-tested against the local `*_test` DB. Rooms are non-realtime this milestone (fetch + `router.refresh`). The daily TTL sweep is a Vercel cron matching the 5 existing daily crons. No match/engine/realtime (M3).

**Tech Stack:** Next.js App Router (`src/app/(main)/games/vyapaar/`), Prisma 7 (`@/lib/prisma`), vitest (unit + `*.itest.ts` integration), Tailwind, `lucide-react`, `requireUser` from `@/modules/auth/session`, `isAuthorizedCron` from `@/lib/cron-auth`.

## Global Constraints

- **Style:** double-quoted strings, no semicolons in `src/modules`/`src/config` `.ts` (match `shells.ts`); TSX components may use whatever the neighboring member components use (check an existing `components/shared/*`).
- **Server-authoritative:** every mutation derives the actor from `requireUser()` — never a client-supplied userId. Actions map `ForbiddenError` → `{ ok:false, error }`, rethrow others.
- **No DB access from the implementer** except the local `*_test` DB via `npm run test:integration` (guard hard-fails on non-local). `npx prisma validate`/`generate` allowed (no DB).
- **Room code:** 6 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no `0/O/1/I/L`); unique among active rooms (DB unique constraint + retry).
- **`MAX_SEATS = 6`, `ROOM_TTL_DAYS = 30`.** Seats are 0..5. Host is seat 0 at creation.
- **Non-realtime:** no Supabase Realtime this milestone.
- Migration `id`/`created_at` use `DEFAULT gen_random_uuid()` / `DEFAULT now()` (repo convention).

---

### Task 1: Rooms config + pure logic

**Files:**
- Create: `src/config/vyapaar-rooms.ts`
- Create: `src/modules/vyapaar/rooms-logic.ts`
- Test: `tests/vyapaar-rooms-logic.test.ts`

**Interfaces:**
- Produces: `ROOM_CODE_ALPHABET`, `ROOM_CODE_LEN` (=6), `MAX_SEATS` (=6), `ROOM_TTL_DAYS` (=30) from config; `generateRoomCode(rand?)`, `lowestFreeSeat(takenSeats)`, `pickNewHost(members)`, `isExpired(lastActiveAt, now, ttlDays?)` from rooms-logic.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar-rooms-logic.test.ts
import { describe, it, expect } from "vitest"
import { ROOM_CODE_ALPHABET, ROOM_CODE_LEN, MAX_SEATS, ROOM_TTL_DAYS } from "@/config/vyapaar-rooms"
import { generateRoomCode, lowestFreeSeat, pickNewHost, isExpired } from "@/modules/vyapaar/rooms-logic"

describe("vyapaar rooms config", () => {
  it("code alphabet excludes ambiguous chars", () => {
    expect(ROOM_CODE_LEN).toBe(6)
    for (const c of "01OIL") expect(ROOM_CODE_ALPHABET).not.toContain(c)
    expect(ROOM_CODE_ALPHABET.length).toBe(31) // 26 letters - 4 (O,I,L) + 10 digits - 2 (0,1) = 30? see impl
  })
  it("MAX_SEATS 6, TTL 30", () => {
    expect(MAX_SEATS).toBe(6)
    expect(ROOM_TTL_DAYS).toBe(30)
  })
})

describe("generateRoomCode", () => {
  it("produces ROOM_CODE_LEN chars all from the alphabet", () => {
    const code = generateRoomCode((n) => 0) // deterministic: always index 0
    expect(code).toHaveLength(6)
    expect(code).toBe(ROOM_CODE_ALPHABET[0].repeat(6))
    for (const ch of generateRoomCode()) expect(ROOM_CODE_ALPHABET).toContain(ch)
  })
})

describe("lowestFreeSeat", () => {
  it("returns 0 for an empty room", () => expect(lowestFreeSeat([])).toBe(0))
  it("fills the lowest gap", () => {
    expect(lowestFreeSeat([0, 1])).toBe(2)
    expect(lowestFreeSeat([0, 2])).toBe(1)
    expect(lowestFreeSeat([1, 2])).toBe(0)
  })
  it("returns null when full", () => expect(lowestFreeSeat([0, 1, 2, 3, 4, 5])).toBeNull())
})

describe("pickNewHost", () => {
  it("picks the lowest remaining seat", () => {
    expect(pickNewHost([{ userId: "b", seat: 3 }, { userId: "a", seat: 1 }])).toBe("a")
  })
  it("returns null for no members", () => expect(pickNewHost([])).toBeNull())
})

describe("isExpired", () => {
  const day = 86_400_000
  it("expires past the TTL", () => {
    const now = 1_000_000_000_000
    expect(isExpired(now - 31 * day, now)).toBe(true)
    expect(isExpired(now - 29 * day, now)).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/vyapaar-rooms-logic.test.ts` → FAIL (modules missing). (The alphabet-length assertion is intentionally checked against the impl below — adjust the expected number in Step 1 to match `ROOM_CODE_ALPHABET.length` once written; it is `"ABCDEFGHJKMNPQRSTUVWXYZ23456789".length === 30`. Set the test to `toBe(30)`.)

- [ ] **Step 3: Write the implementation**

```ts
// src/config/vyapaar-rooms.ts
/** Unambiguous room-code alphabet (no 0/O/1/I/L). */
export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
export const ROOM_CODE_LEN = 6
export const MAX_SEATS = 6
export const ROOM_TTL_DAYS = 30
```

```ts
// src/modules/vyapaar/rooms-logic.ts
// Pure, DB-free room helpers (unit-tested). Orchestration lives in rooms.ts.
import { ROOM_CODE_ALPHABET, ROOM_CODE_LEN, MAX_SEATS, ROOM_TTL_DAYS } from "@/config/vyapaar-rooms"

/** Build a room code. `rand(n)` returns an int in [0,n) — defaults to crypto. */
export function generateRoomCode(rand: (n: number) => number = cryptoInt): string {
  let out = ""
  for (let i = 0; i < ROOM_CODE_LEN; i++) out += ROOM_CODE_ALPHABET[rand(ROOM_CODE_ALPHABET.length)]
  return out
}

function cryptoInt(n: number): number {
  // Node crypto, server-side only. Not the deterministic game RNG.
  const { randomInt } = require("node:crypto") as typeof import("node:crypto")
  return randomInt(n)
}

/** Lowest seat in 0..MAX_SEATS-1 not in `taken`, or null if full. */
export function lowestFreeSeat(taken: number[]): number | null {
  const set = new Set(taken)
  for (let s = 0; s < MAX_SEATS; s++) if (!set.has(s)) return s
  return null
}

/** New host = the member with the lowest seat, or null if none remain. */
export function pickNewHost(members: { userId: string; seat: number }[]): string | null {
  if (members.length === 0) return null
  return members.reduce((lo, m) => (m.seat < lo.seat ? m : lo)).userId
}

/** True if a room's last activity is older than the TTL. */
export function isExpired(lastActiveAtMs: number, nowMs: number, ttlDays = ROOM_TTL_DAYS): boolean {
  return nowMs - lastActiveAtMs > ttlDays * 86_400_000
}
```

(If `require` in an ESM module trips the build, replace `cryptoInt` with a top-level `import { randomInt } from "node:crypto"` — this module is server-only, never imported by client components.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/vyapaar-rooms-logic.test.ts` → PASS.

- [ ] **Step 5: Commit**

```bash
git add src/config/vyapaar-rooms.ts src/modules/vyapaar/rooms-logic.ts tests/vyapaar-rooms-logic.test.ts
git commit -m "feat(vyapaar): rooms config + pure room helpers"
```

---

### Task 2: Prisma schema + migration + RLS

**Files:**
- Modify: `prisma/schema.prisma` (`VyapaarRoom`, `VyapaarRoomMember`, `User` relations)
- Create: `prisma/migrations/20260824010000_vyapaar_rooms/migration.sql`
- Create: `supabase/vyapaar-rooms-rls.sql`

**Interfaces:** Produces the `prisma.vyapaarRoom` / `prisma.vyapaarRoomMember` models for Task 3.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add to `User` (next to `vyapaarLedger`):
```prisma
  vyapaarRoomsHosted       VyapaarRoom[]
  vyapaarRoomMemberships   VyapaarRoomMember[]
```

Add near `VyapaarLedger`:
```prisma
model VyapaarRoom {
  id           String   @id @default(uuid()) @db.Uuid
  code         String   @unique @db.VarChar(6)
  hostId       String   @map("host_id") @db.Uuid
  visibility   String   @default("private") @db.VarChar(10)
  status       String   @default("open") @db.VarChar(10)
  lastActiveAt DateTime @default(now()) @map("last_active_at") @db.Timestamptz
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz

  host    User                @relation(fields: [hostId], references: [id], onDelete: Cascade)
  members VyapaarRoomMember[]

  @@index([status, visibility, lastActiveAt])
  @@index([status, lastActiveAt])
  @@map("vyapaar_room")
}

model VyapaarRoomMember {
  roomId   String   @map("room_id") @db.Uuid
  userId   String   @map("user_id") @db.Uuid
  seat     Int
  joinedAt DateTime @default(now()) @map("joined_at") @db.Timestamptz

  room VyapaarRoom @relation(fields: [roomId], references: [id], onDelete: Cascade)
  user User        @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([roomId, userId])
  @@unique([roomId, seat])
  @@map("vyapaar_room_member")
}
```

- [ ] **Step 2: Validate + generate (no DB)**

Run: `npx prisma validate` (valid) then `npx prisma generate` (client has the two new models).

- [ ] **Step 3: Hand-write `prisma/migrations/20260824010000_vyapaar_rooms/migration.sql`**

```sql
-- CreateTable
CREATE TABLE "vyapaar_room" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(6) NOT NULL,
    "host_id" UUID NOT NULL,
    "visibility" VARCHAR(10) NOT NULL DEFAULT 'private',
    "status" VARCHAR(10) NOT NULL DEFAULT 'open',
    "last_active_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "vyapaar_room_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vyapaar_room_code_key" ON "vyapaar_room"("code");
CREATE INDEX "vyapaar_room_status_visibility_last_active_at_idx" ON "vyapaar_room"("status", "visibility", "last_active_at");
CREATE INDEX "vyapaar_room_status_last_active_at_idx" ON "vyapaar_room"("status", "last_active_at");

-- CreateTable
CREATE TABLE "vyapaar_room_member" (
    "room_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seat" INTEGER NOT NULL,
    "joined_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT "vyapaar_room_member_pkey" PRIMARY KEY ("room_id", "user_id")
);

CREATE UNIQUE INDEX "vyapaar_room_member_room_id_seat_key" ON "vyapaar_room_member"("room_id", "seat");

ALTER TABLE "vyapaar_room" ADD CONSTRAINT "vyapaar_room_host_id_fkey"
    FOREIGN KEY ("host_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vyapaar_room_member" ADD CONSTRAINT "vyapaar_room_member_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "vyapaar_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vyapaar_room_member" ADD CONSTRAINT "vyapaar_room_member_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

(Confirm the exact index/constraint names Prisma expects by comparing to a freshly generated diff if available; the names above follow Prisma's default convention. If `prisma migrate status` later reports a name mismatch, rename to match.)

- [ ] **Step 4: RLS — `supabase/vyapaar-rooms-rls.sql`**

Read `supabase/vyapaar-wallet-rls.sql` to match the idiom, then:
```sql
-- Vyapaar rooms: members read their rooms; anyone reads open public rooms.
-- All writes are via the DB owner role Prisma connects as (bypasses RLS).
ALTER TABLE "vyapaar_room" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vyapaar_room_member" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vyapaar_room_select_public" ON "vyapaar_room";
CREATE POLICY "vyapaar_room_select_public" ON "vyapaar_room"
  FOR SELECT USING (status = 'open' AND visibility = 'public');

DROP POLICY IF EXISTS "vyapaar_room_select_member" ON "vyapaar_room";
CREATE POLICY "vyapaar_room_select_member" ON "vyapaar_room"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "vyapaar_room_member" m WHERE m.room_id = "vyapaar_room".id AND m.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "vyapaar_room_member_select_own_room" ON "vyapaar_room_member";
CREATE POLICY "vyapaar_room_member_select_own_room" ON "vyapaar_room_member"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "vyapaar_room_member" me WHERE me.room_id = "vyapaar_room_member".room_id AND me.user_id = auth.uid())
  );
```

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations supabase/vyapaar-rooms-rls.sql
git commit -m "feat(vyapaar): room + member schema, migration, RLS"
```

---

### Task 3: Rooms orchestration + wallet pure-read + integration tests

**Files:**
- Create: `src/modules/vyapaar/rooms.ts`
- Modify: `src/modules/vyapaar/wallet.ts` (add `getVyapaarBalance` — pure read, no grant)
- Test: `tests/integration/vyapaar-rooms.itest.ts`

**Interfaces:**
- Consumes: `@/lib/prisma`, `@/lib/errors`, `./rooms-logic`, `./wallet` (`ensureVyapaarEnrollment`), `@/config/vyapaar-rooms`.
- Produces: `createRoom(userId, visibility)`, `joinRoom(userId, code)`, `leaveRoom(userId, roomId)`, `setRoomVisibility(userId, roomId, visibility)`, `listPublicRooms()`, `getRoom(code)`, `sweepExpiredRooms(now)`; and `getVyapaarBalance(userId): Promise<number>` (wallet.ts).

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/integration/vyapaar-rooms.itest.ts
import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import {
  createRoom, joinRoom, leaveRoom, setRoomVisibility, listPublicRooms, getRoom, sweepExpiredRooms,
} from "@/modules/vyapaar/rooms"

async function mkUser() {
  const u = await prisma.user.create({
    data: { email: `room_${crypto.randomUUID()}@test.local`, legalName: "T" },
    select: { id: true },
  })
  return u.id
}

describe("vyapaar rooms", () => {
  it("create makes the host seat 0", async () => {
    const host = await mkUser()
    const { code } = await createRoom(host, "public")
    expect(code).toHaveLength(6)
    const room = await getRoom(code)
    expect(room!.hostId).toBe(host)
    expect(room!.members.find((m) => m.userId === host)!.seat).toBe(0)
  })

  it("join fills the lowest free seat and rejoin resumes the seat", async () => {
    const host = await mkUser(), a = await mkUser(), b = await mkUser()
    const { code } = await createRoom(host, "public")
    expect((await joinRoom(a, code)).seat).toBe(1)
    expect((await joinRoom(b, code)).seat).toBe(2)
    expect((await joinRoom(a, code)).seat).toBe(1) // rejoin, no new seat
    const room = await getRoom(code)
    expect(room!.members).toHaveLength(3)
  })

  it("rejects the 7th player", async () => {
    const host = await mkUser()
    const { code } = await createRoom(host, "public")
    for (let i = 0; i < 5; i++) await joinRoom(await mkUser(), code)
    await expect(joinRoom(await mkUser(), code)).rejects.toThrow(/full/i)
  })

  it("leaving frees a seat; host handoff promotes lowest seat; empty room expires", async () => {
    const host = await mkUser(), a = await mkUser()
    const { code } = await createRoom(host, "public")
    await joinRoom(a, code)
    let room = await getRoom(code)
    await leaveRoom(host, room!.id) // host leaves → a (seat 1) becomes host
    room = await getRoom(code)
    expect(room!.hostId).toBe(a)
    await leaveRoom(a, room!.id) // last member leaves → expired
    room = await getRoom(code)
    expect(room!.status).toBe("expired")
  })

  it("public lobby lists only open public non-full rooms", async () => {
    const h1 = await mkUser(), h2 = await mkUser()
    const pub = await createRoom(h1, "public")
    await createRoom(h2, "private")
    const codes = (await listPublicRooms()).map((r) => r.code)
    expect(codes).toContain(pub.code)
  })

  it("visibility change is host-only", async () => {
    const host = await mkUser(), a = await mkUser()
    const { code } = await createRoom(host, "private")
    const room = await getRoom(code)
    await joinRoom(a, code)
    await expect(setRoomVisibility(a, room!.id, "public")).rejects.toThrow()
    await setRoomVisibility(host, room!.id, "public")
    expect((await getRoom(code))!.visibility).toBe("public")
  })

  it("sweep expires an inactive room, leaves a fresh one", async () => {
    const h1 = await mkUser(), h2 = await mkUser()
    const stale = await createRoom(h1, "public")
    const fresh = await createRoom(h2, "public")
    const staleRoom = await getRoom(stale.code)
    await prisma.vyapaarRoom.update({
      where: { id: staleRoom!.id },
      data: { lastActiveAt: new Date(Date.now() - 31 * 86_400_000) },
    })
    const n = await sweepExpiredRooms(new Date())
    expect(n).toBeGreaterThanOrEqual(1)
    expect((await getRoom(stale.code))!.status).toBe("expired")
    expect((await getRoom(fresh.code))!.status).toBe("open")
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `docker compose -f docker/docker-compose.yml up -d` then `npm run test:integration -- vyapaar-rooms` → FAIL (module missing).

- [ ] **Step 3: Write the implementation**

Add to `src/modules/vyapaar/wallet.ts`:
```ts
/** Pure balance read — does NOT grant. Callers that must grant use ensureVyapaarEnrollment first. */
export async function getVyapaarBalance(userId: string): Promise<number> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { vyapaarWallet: true } })
  return u?.vyapaarWallet ?? 0
}
```

```ts
// src/modules/vyapaar/rooms.ts
import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { generateRoomCode, lowestFreeSeat, pickNewHost } from "./rooms-logic"
import { MAX_SEATS, ROOM_TTL_DAYS } from "@/config/vyapaar-rooms"

type Visibility = "private" | "public"

async function uniqueCode(): Promise<string> {
  for (let attempt = 0; attempt < 6; attempt++) {
    const code = generateRoomCode()
    const clash = await prisma.vyapaarRoom.findFirst({
      where: { code, status: { in: ["open", "in_game"] } },
      select: { id: true },
    })
    if (!clash) return code
  }
  throw new Error("could not allocate a unique room code")
}

export async function createRoom(userId: string, visibility: Visibility): Promise<{ code: string }> {
  await ensureVyapaarEnrollment(userId)
  const code = await uniqueCode()
  await prisma.vyapaarRoom.create({
    data: {
      code,
      hostId: userId,
      visibility,
      status: "open",
      members: { create: { userId, seat: 0 } },
    },
  })
  return { code }
}

export async function joinRoom(userId: string, code: string): Promise<{ seat: number }> {
  await ensureVyapaarEnrollment(userId)
  return prisma.$transaction(async (tx) => {
    const room = await tx.vyapaarRoom.findUnique({
      where: { code },
      select: { id: true, status: true, members: { select: { userId: true, seat: true } } },
    })
    if (!room || room.status === "expired") throw new ForbiddenError("Room not found")
    const mine = room.members.find((m) => m.userId === userId)
    if (mine) return { seat: mine.seat } // rejoin resumes seat
    const seat = lowestFreeSeat(room.members.map((m) => m.seat))
    if (seat === null) throw new ForbiddenError("Room is full")
    await tx.vyapaarRoomMember.create({ data: { roomId: room.id, userId, seat } })
    await tx.vyapaarRoom.update({ where: { id: room.id }, data: { lastActiveAt: new Date() } })
    return { seat }
  })
}

export async function leaveRoom(userId: string, roomId: string): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const room = await tx.vyapaarRoom.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, members: { select: { userId: true, seat: true } } },
    })
    if (!room) return
    await tx.vyapaarRoomMember.deleteMany({ where: { roomId, userId } })
    const remaining = room.members.filter((m) => m.userId !== userId)
    if (remaining.length === 0) {
      await tx.vyapaarRoom.update({ where: { id: roomId }, data: { status: "expired", lastActiveAt: new Date() } })
      return
    }
    const data: { lastActiveAt: Date; hostId?: string } = { lastActiveAt: new Date() }
    if (room.hostId === userId) data.hostId = pickNewHost(remaining)!
    await tx.vyapaarRoom.update({ where: { id: roomId }, data })
  })
}

export async function setRoomVisibility(userId: string, roomId: string, visibility: Visibility): Promise<void> {
  const room = await prisma.vyapaarRoom.findUnique({ where: { id: roomId }, select: { hostId: true } })
  if (!room) throw new ForbiddenError("Room not found")
  if (room.hostId !== userId) throw new ForbiddenError("Only the host can change visibility")
  await prisma.vyapaarRoom.update({ where: { id: roomId }, data: { visibility } })
}

export async function listPublicRooms() {
  const rooms = await prisma.vyapaarRoom.findMany({
    where: { status: "open", visibility: "public" },
    orderBy: { lastActiveAt: "desc" },
    select: {
      code: true,
      host: { select: { displayName: true, legalName: true } },
      _count: { select: { members: true } },
    },
    take: 50,
  })
  return rooms
    .filter((r) => r._count.members < MAX_SEATS)
    .map((r) => ({ code: r.code, host: r.host.displayName ?? r.host.legalName, seats: r._count.members }))
}

export async function getRoom(code: string) {
  return prisma.vyapaarRoom.findUnique({
    where: { code },
    select: {
      id: true, code: true, hostId: true, visibility: true, status: true,
      members: {
        orderBy: { seat: "asc" },
        select: { userId: true, seat: true, user: { select: { displayName: true, legalName: true } } },
      },
    },
  })
}

/** Mark active rooms idle past the TTL as expired. Returns the count. */
export async function sweepExpiredRooms(now: Date): Promise<number> {
  const cutoff = new Date(now.getTime() - ROOM_TTL_DAYS * 86_400_000)
  const res = await prisma.vyapaarRoom.updateMany({
    where: { status: { in: ["open", "in_game"] }, lastActiveAt: { lt: cutoff } },
    data: { status: "expired" },
  })
  return res.count
}
```

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test:integration -- vyapaar-rooms` (7 tests) + `npx vitest run tests/vyapaar-rooms-logic.test.ts` + `npx tsc --noEmit`. All green. If Docker is unavailable, report it and confirm unit + tsc are green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/rooms.ts src/modules/vyapaar/wallet.ts tests/integration/vyapaar-rooms.itest.ts
git commit -m "feat(vyapaar): room orchestration (create/join/leave/lobby/sweep) + wallet pure read"
```

---

### Task 4: Registry entry + daily TTL cron

**Files:**
- Modify: `src/config/games.ts` (add `kind` field + Vyapaar entry; audit `LIVE_GAMES` consumers)
- Create: `src/app/api/cron/vyapaar-rooms/route.ts`
- Modify: `vercel.json` (add the daily cron entry)
- Test: `tests/vyapaar-registry.test.ts`

**Interfaces:** Consumes `sweepExpiredRooms` (Task 3), `isAuthorizedCron` (`@/lib/cron-auth`). Produces the `kind` field on `GameConfig` and a `MULTIPLAYER_GAMES`/`DAILY_GAMES` split.

**Design notes:** `LIVE_GAMES` currently feeds the daily-puzzle periods/leaderboard/`[slug]` routes. After adding a `multiplayer` game, those consumers must operate only on **daily** games. Read `src/config/games.ts` and grep `LIVE_GAMES` usages; add `DAILY_GAMES = LIVE_GAMES.filter(g => g.kind === "daily")` and repoint the puzzle-only consumers (leaderboard cron, hub puzzle grid, `[slug]` route guard) to `DAILY_GAMES`, leaving `LIVE_GAMES` as "all live". Do not break Alfazy.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar-registry.test.ts
import { describe, it, expect } from "vitest"
import { GAMES, DAILY_GAMES, gameBySlug } from "@/config/games"

describe("games registry with kind", () => {
  it("every game has a kind", () => {
    for (const g of GAMES) expect(["daily", "multiplayer"]).toContain(g.kind)
  })
  it("vyapaar is a live multiplayer game", () => {
    const v = gameBySlug("vyapaar")
    expect(v).toBeTruthy()
    expect(v!.kind).toBe("multiplayer")
    expect(v!.status).toBe("live")
  })
  it("DAILY_GAMES excludes multiplayer", () => {
    expect(DAILY_GAMES.every((g) => g.kind === "daily")).toBe(true)
    expect(DAILY_GAMES.some((g) => g.slug === "vyapaar")).toBe(false)
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/vyapaar-registry.test.ts` → FAIL (`kind`/`DAILY_GAMES`/vyapaar missing).

- [ ] **Step 3: Implement**

In `src/config/games.ts`: add `kind: "daily" | "multiplayer"` to `GameConfig` and `GameKey` union (`| "vyapaar"`); set `kind: "daily"` on the three existing entries; add:
```ts
  {
    key: "vyapaar",
    slug: "vyapaar",
    kind: "multiplayer",
    name: "Vyapaar",
    tag: "Multiplayer property-trading board game",
    tint: "from-amber-50 to-white",
    code: "vyap",
    launchISO: "2026-08-24",
    status: "live",
    howTo: ["Create or join a room", "Roll, buy cities, build, trade", "Highest net worth wins"],
    unit: "match",
  },
```
Add `export const DAILY_GAMES = LIVE_GAMES.filter((g) => g.kind === "daily")` and repoint the puzzle-only consumers you found in the grep to `DAILY_GAMES`.

```ts
// src/app/api/cron/vyapaar-rooms/route.ts
import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { sweepExpiredRooms } from "@/modules/vyapaar/rooms"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const expired = await sweepExpiredRooms(new Date())
  return NextResponse.json({ ok: true, expired })
}
```

In `vercel.json` add to `crons`:
```json
    { "path": "/api/cron/vyapaar-rooms", "schedule": "40 0 * * *" }
```

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/vyapaar-registry.test.ts` + the full unit suite `npx vitest run` (confirm no Alfazy/leaderboard test broke from the `LIVE_GAMES`→`DAILY_GAMES` repointing) + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/config/games.ts src/app/api/cron/vyapaar-rooms vercel.json tests/vyapaar-registry.test.ts
git commit -m "feat(vyapaar): registry multiplayer kind + daily room TTL cron"
```

---

### Task 5: Hub + room pages + client components

**Files:**
- Create: `src/app/(main)/games/vyapaar/page.tsx` (hub)
- Create: `src/app/(main)/games/vyapaar/rooms/[code]/page.tsx` (room)
- Create: `src/components/vyapaar/CreateRoomButton.tsx`, `JoinByCode.tsx`, `PublicLobbyList.tsx`, `RoomActions.tsx` (client)
- Create: `src/modules/vyapaar/rooms-actions.ts` (`"use server"`)
- Modify: `src/components/vyapaar/WalletBadge.tsx` (use `getVyapaarBalance`, pure read)

**Interfaces:** Consumes `requireUser`, `rooms.ts`, `getVyapaarBalance`/`ensureVyapaarEnrollment`. Produces the server actions `createRoomAction`/`joinRoomAction`/`leaveRoomAction`/`setVisibilityAction`.

**Design notes:** verify `requireUser()`'s return (`SessionUser.id`) and how existing `(main)` pages read the user (some pass `requireUser()` result into components). Match `components/shared/*` styling conventions and page-width rule (`mx-auto max-w-[1400px] px-4 sm:px-6`). Pages are `force-dynamic`.

- [ ] **Step 1: Server actions**

```ts
// src/modules/vyapaar/rooms-actions.ts
"use server"

import { redirect } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { createRoom, joinRoom, leaveRoom, setRoomVisibility } from "@/modules/vyapaar/rooms"

export async function createRoomAction(visibility: "private" | "public") {
  const user = await requireUser()
  const { code } = await createRoom(user.id, visibility)
  redirect(`/games/vyapaar/rooms/${code}`)
}

export async function joinRoomAction(code: string): Promise<{ ok: false; error: string }> {
  const user = await requireUser()
  const clean = code.trim().toUpperCase()
  try {
    await joinRoom(user.id, clean)
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message }
    throw e
  }
  redirect(`/games/vyapaar/rooms/${clean}`)
}

export async function leaveRoomAction(roomId: string) {
  const user = await requireUser()
  await leaveRoom(user.id, roomId)
  redirect("/games/vyapaar")
}

export async function setVisibilityAction(roomId: string, visibility: "private" | "public") {
  const user = await requireUser()
  try {
    await setRoomVisibility(user.id, roomId, visibility)
    return { ok: true as const }
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false as const, error: e.message }
    throw e
  }
}
```

- [ ] **Step 2: WalletBadge → pure read**

```tsx
// src/components/vyapaar/WalletBadge.tsx
import { Coins } from "lucide-react"
import { getVyapaarBalance } from "@/modules/vyapaar/wallet"

export async function WalletBadge({ userId }: { userId: string }) {
  const balance = await getVyapaarBalance(userId)
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-sm font-semibold text-amber-700">
      <Coins className="h-4 w-4" aria-hidden />
      {balance.toLocaleString("en-IN")}
    </span>
  )
}
```

- [ ] **Step 3: Client components**

```tsx
// src/components/vyapaar/CreateRoomButton.tsx
"use client"
import { useState, useTransition } from "react"
import { createRoomAction } from "@/modules/vyapaar/rooms-actions"

export function CreateRoomButton() {
  const [pending, start] = useTransition()
  const [pub, setPub] = useState(false)
  return (
    <div className="flex items-center gap-3">
      <label className="flex items-center gap-1.5 text-sm text-gray-600">
        <input type="checkbox" checked={pub} onChange={(e) => setPub(e.target.checked)} /> Public
      </label>
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => createRoomAction(pub ? "public" : "private"))}
        className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
      >
        Create room
      </button>
    </div>
  )
}
```

```tsx
// src/components/vyapaar/JoinByCode.tsx
"use client"
import { useState, useTransition } from "react"
import { joinRoomAction } from "@/modules/vyapaar/rooms-actions"

export function JoinByCode() {
  const [code, setCode] = useState("")
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault()
        setErr(null)
        start(async () => {
          const res = await joinRoomAction(code)
          if (res && !res.ok) setErr(res.error)
        })
      }}
      className="flex items-center gap-2"
    >
      <input
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Enter room code"
        maxLength={6}
        className="rounded-lg border border-gray-200 px-3 py-2 text-sm uppercase"
      />
      <button type="submit" disabled={pending || code.length < 6} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">
        Join
      </button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </form>
  )
}
```

```tsx
// src/components/vyapaar/PublicLobbyList.tsx
import Link from "next/link"
import { listPublicRooms } from "@/modules/vyapaar/rooms"

export async function PublicLobbyList() {
  const rooms = await listPublicRooms()
  if (rooms.length === 0) return <p className="text-sm text-gray-500">No public rooms right now.</p>
  return (
    <ul className="grid gap-2">
      {rooms.map((r) => (
        <li key={r.code}>
          <Link
            href={`/games/vyapaar/rooms/${r.code}`}
            className="flex items-center justify-between rounded-lg border border-gray-200 px-4 py-2 text-sm hover:bg-gray-50"
          >
            <span className="font-medium">{r.host}&rsquo;s room</span>
            <span className="text-gray-500">{r.seats}/6 · {r.code}</span>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

```tsx
// src/components/vyapaar/RoomActions.tsx
"use client"
import { useTransition } from "react"
import { leaveRoomAction, setVisibilityAction } from "@/modules/vyapaar/rooms-actions"

export function RoomActions({ roomId, isHost, visibility }: { roomId: string; isHost: boolean; visibility: "private" | "public" }) {
  const [pending, start] = useTransition()
  return (
    <div className="flex items-center gap-3">
      {isHost && (
        <button
          type="button"
          disabled={pending}
          onClick={() => start(async () => { await setVisibilityAction(roomId, visibility === "public" ? "private" : "public") })}
          className="rounded-lg border px-3 py-1.5 text-sm disabled:opacity-50"
        >
          Make {visibility === "public" ? "private" : "public"}
        </button>
      )}
      <button
        type="button"
        disabled={pending}
        onClick={() => start(() => leaveRoomAction(roomId))}
        className="rounded-lg border border-red-200 px-3 py-1.5 text-sm text-red-600 disabled:opacity-50"
      >
        Leave
      </button>
    </div>
  )
}
```

- [ ] **Step 4: Pages**

```tsx
// src/app/(main)/games/vyapaar/page.tsx
import { requireUser } from "@/modules/auth/session"
import { ensureVyapaarEnrollment } from "@/modules/vyapaar/wallet"
import { WalletBadge } from "@/components/vyapaar/WalletBadge"
import { CreateRoomButton } from "@/components/vyapaar/CreateRoomButton"
import { JoinByCode } from "@/components/vyapaar/JoinByCode"
import { PublicLobbyList } from "@/components/vyapaar/PublicLobbyList"

export const dynamic = "force-dynamic"

export default async function VyapaarHub() {
  const user = await requireUser()
  await ensureVyapaarEnrollment(user.id) // one deliberate idempotent write; badge is a pure read

  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Vyapaar</h1>
        <WalletBadge userId={user.id} />
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Start a game</h2>
          <div className="grid gap-3">
            <CreateRoomButton />
            <JoinByCode />
          </div>
        </section>
        <section className="rounded-xl border border-gray-200 bg-white p-5">
          <h2 className="mb-3 font-semibold">Public rooms</h2>
          <PublicLobbyList />
        </section>
      </div>
    </div>
  )
}
```

```tsx
// src/app/(main)/games/vyapaar/rooms/[code]/page.tsx
import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getRoom } from "@/modules/vyapaar/rooms"
import { RoomActions } from "@/components/vyapaar/RoomActions"
import { MAX_SEATS } from "@/config/vyapaar-rooms"

export const dynamic = "force-dynamic"

export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params
  const user = await requireUser()
  const room = await getRoom(code.toUpperCase())
  if (!room || room.status === "expired") notFound()

  const isMember = room.members.some((m) => m.userId === user.id)
  const isHost = room.hostId === user.id
  const seats = Array.from({ length: MAX_SEATS }, (_, i) => room.members.find((m) => m.seat === i) ?? null)

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Room {room.code}</h1>
          <p className="text-sm text-gray-500">{room.visibility} · {room.status}</p>
        </div>
        {isMember && <RoomActions roomId={room.id} isHost={isHost} visibility={room.visibility as "private" | "public"} />}
      </div>
      <ul className="grid gap-2 sm:grid-cols-2">
        {seats.map((m, i) => (
          <li key={i} className="rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm">
            <span className="mr-2 text-gray-400">Seat {i + 1}</span>
            {m ? (
              <span className="font-medium">
                {m.user.displayName ?? m.user.legalName}
                {m.userId === room.hostId && <span className="ml-2 text-xs text-amber-600">host</span>}
              </span>
            ) : (
              <span className="text-gray-400">empty</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
```

- [ ] **Step 5: Verify in the browser**

Run the dev server and confirm: `/games/vyapaar` shows the wallet badge (25,000 for a fresh member), Create room redirects to the room page with you in seat 1 (host), Join-by-code + public lobby work. Check `read_console_messages`/`preview_logs` for errors. Then `npx tsc --noEmit` clean and `npm run lint` on the new files.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(main)/games/vyapaar" src/components/vyapaar src/modules/vyapaar/rooms-actions.ts
git commit -m "feat(vyapaar): rooms hub + room pages, wallet badge pure read"
```

---

## Self-Review

**Spec coverage:** models + migration + RLS (Task 2); code gen + seat/host/TTL pure logic (Task 1); create/join(rejoin)/leave(handoff/expiry)/visibility/lobby/sweep orchestration + wallet pure read (Task 3); registry `kind` + daily TTL cron (Task 4); hub + room pages + actions + WalletBadge fix (Task 5). ✓

**M1 render-write fix:** WalletBadge no longer writes (Task 5 Step 2); enrollment happens once in the force-dynamic hub page + defensively in create/join (Task 3). ✓

**Deferred (M3+):** realtime seat presence, match start / engine wiring, turn timer.

**Placeholder scan:** none — every step has real code; the two "grep and repoint `LIVE_GAMES`" and "match `requireUser` shape" notes are concrete audits, not deferred work.

**Type consistency:** `createRoom/joinRoom/leaveRoom/setRoomVisibility/listPublicRooms/getRoom/sweepExpiredRooms`, `lowestFreeSeat/pickNewHost/generateRoomCode/isExpired`, `getVyapaarBalance`, `MAX_SEATS/ROOM_TTL_DAYS`, `kind`/`DAILY_GAMES` are used consistently across tasks. Action names match component imports.

**Known simplifications (`ponytail:`):**
- Non-realtime — the room page reflects membership on load / after an action redirect; live updates are M3.
- `listPublicRooms` takes 50, no pagination (YAGNI until room volume warrants it).
- Multiple room memberships allowed; the one-active-match rule is enforced at match start (M3+).
