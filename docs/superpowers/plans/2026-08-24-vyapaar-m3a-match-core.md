# Vyapaar M3a — Match Core — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire the engine to the server — start a match from a room (per-player wallet snapshot, one-active-match rule), apply intents through an authoritative RPC (seat from auth), persist state+log per intent, and settle wallets at game-over. Integration-tested, no UI.

**Architecture:** Extends the merged engine minimally (per-player opening cash). All match orchestration is server-side Prisma-transaction code (`src/modules/vyapaar/match.ts`) integration-tested against the local `*_test` DB; a thin route handler exposes it. Wallet settlement preserves the `wallet == Σ vyapaar_ledger.delta` invariant. No realtime, board UI, or turn timer (M3b/M3c).

**Tech Stack:** Prisma 7 (`@/lib/prisma`), Next.js Route Handlers (Node runtime), the Vyapaar engine (`@/modules/vyapaar/engine/*`), vitest (unit + `*.itest.ts`), `requireUser` (`@/modules/auth/session`), `ForbiddenError` (`@/lib/errors`).

## Global Constraints

- **Server-authoritative:** seat is derived from `requireUser()` → `VyapaarMatchPlayer`; any client-supplied seat is ignored. All mutations server-side.
- **Determinism preserved:** a match is reproducible from `(seed, names, openingCash[], actionLog)`. `createGame`'s array form must set per-player cash without any other behavior change.
- **Invariant:** `User.vyapaarWallet == Σ VyapaarLedger.delta` holds after settlement. Settlement **sets** `wallet = resultCash` and writes a `game_settlement` delta of `resultCash - openingCash`.
- **Snapshot-at-start / settle-at-end:** the wallet is NOT debited at start (only snapshotted into `openingCash`); the one-active-match rule prevents a second concurrent stake.
- **Style:** double-quoted, no semicolons in `src/modules`/`src/config` `.ts`. Migration `id`/timestamps use `gen_random_uuid()`/`now()`.
- **No DB access** except the local `*_test` DB via `npm run test:integration`. `npx prisma validate`/`generate` allowed.
- **Seats:** engine seats are contiguous `0..n-1`, assigned from room members ordered by their room seat.

---

### Task 1: Engine — per-player opening cash in `createGame`

**Files:**
- Modify: `src/modules/vyapaar/engine/state.ts` (`createGame`)
- Modify: `tests/vyapaar/create-game.test.ts` (add array-form cases)

**Interfaces:** `createGame(seed: number, names: string[], openingCash?: number | number[]): GameState`.

- [ ] **Step 1: Add the failing test cases**

Append to `tests/vyapaar/create-game.test.ts`:

```ts
it("assigns per-player opening cash from an array", () => {
  const g = createGame(1, ["a", "b", "c"], [1000, 2000, 3000])
  expect(g.players.map((p) => p.cash)).toEqual([1000, 2000, 3000])
})

it("still accepts a single number for all players", () => {
  const g = createGame(1, ["a", "b"], 5000)
  expect(g.players.map((p) => p.cash)).toEqual([5000, 5000])
})

it("throws when the openingCash array length != names", () => {
  expect(() => createGame(1, ["a", "b"], [1000])).toThrow()
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npx vitest run tests/vyapaar/create-game.test.ts`
Expected: FAIL — array form gives all players the same cash (or a type error).

- [ ] **Step 3: Implement**

In `state.ts` `createGame`, change the signature to `openingCash: number | number[] = START_CASH` and, right after the 2..6 length check, add:

```ts
if (Array.isArray(openingCash) && openingCash.length !== names.length) {
  throw new Error("vyapaar: openingCash array length must equal names length")
}
const cashFor = (i: number): number => (Array.isArray(openingCash) ? openingCash[i] : openingCash)
```

Then in the `players: names.map(...)` builder, take the index and use `cash: cashFor(i)`:

```ts
players: names.map((name, i) => ({
  name,
  cash: cashFor(i),
  pos: 0,
  halted: 0,
  doubles: 0,
  startupLaps: 0,
  startupPenalty: 0,
  freeUpgrades: 0,
})),
```

(Everything else in `createGame` — decks, cities, hubs — unchanged.)

- [ ] **Step 4: Run to verify it passes**

Run: `npx vitest run tests/vyapaar/create-game.test.ts` → PASS. Then `npx vitest run tests/vyapaar/` (whole engine suite still green) + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/state.ts tests/vyapaar/create-game.test.ts
git commit -m "feat(vyapaar): createGame accepts per-player opening cash"
```

---

### Task 2: Prisma schema + migration + RLS

**Files:**
- Modify: `prisma/schema.prisma` (`VyapaarMatch`, `VyapaarMatchPlayer`, `User` stat fields + relations)
- Create: `prisma/migrations/20260824020000_vyapaar_match/migration.sql`
- Create: `supabase/vyapaar-match-rls.sql`

**Interfaces:** `prisma.vyapaarMatch` / `prisma.vyapaarMatchPlayer` + `User.vyapaarGamesPlayed`/`vyapaarWins`/`vyapaarBestNetWorth` for Tasks 3–4.

- [ ] **Step 1: Edit `prisma/schema.prisma`**

Add to `User` (next to the wallet fields + relations):
```prisma
  vyapaarGamesPlayed   Int       @default(0) @map("vyapaar_games_played")
  vyapaarWins          Int       @default(0) @map("vyapaar_wins")
  vyapaarBestNetWorth  Int       @default(0) @map("vyapaar_best_net_worth")
```
and the relation `vyapaarMatchPlayers VyapaarMatchPlayer[]`.

Add near the other Vyapaar models:
```prisma
model VyapaarMatch {
  id           String   @id @default(uuid()) @db.Uuid
  roomId       String   @map("room_id") @db.Uuid
  seed         BigInt
  state        Json
  actionLog    Json     @default("[]") @map("action_log")
  status       String   @default("active") @db.VarChar(10)
  activeSeat   Int      @default(0) @map("active_seat")
  turnExpiresAt DateTime? @map("turn_expires_at") @db.Timestamptz
  winnerSeat   Int?     @map("winner_seat")
  createdAt    DateTime @default(now()) @map("created_at") @db.Timestamptz
  endedAt      DateTime? @map("ended_at") @db.Timestamptz

  room    VyapaarRoom          @relation(fields: [roomId], references: [id], onDelete: Cascade)
  players VyapaarMatchPlayer[]

  @@index([roomId, status])
  @@index([status])
  @@map("vyapaar_match")
}

model VyapaarMatchPlayer {
  matchId     String @map("match_id") @db.Uuid
  userId      String @map("user_id") @db.Uuid
  seat        Int
  openingCash Int    @map("opening_cash")
  resultCash  Int?   @map("result_cash")
  placement   Int?

  match VyapaarMatch @relation(fields: [matchId], references: [id], onDelete: Cascade)
  user  User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@id([matchId, seat])
  @@unique([matchId, userId])
  @@map("vyapaar_match_player")
}
```
Add the `matches VyapaarMatch[]` relation to `VyapaarRoom` (back-relation for `roomId`).

- [ ] **Step 2: Validate + generate (no DB)**

Run: `npx prisma validate` (valid) then `npx prisma generate`.

- [ ] **Step 3: Hand-write `prisma/migrations/20260824020000_vyapaar_match/migration.sql`**

Match the M2 migration's style (`gen_random_uuid()`/`now()`, Prisma default index/constraint names):

```sql
-- AlterTable: Vyapaar player stats
ALTER TABLE "users" ADD COLUMN "vyapaar_games_played" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "vyapaar_wins" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "users" ADD COLUMN "vyapaar_best_net_worth" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "vyapaar_match" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "room_id" UUID NOT NULL,
    "seed" BIGINT NOT NULL,
    "state" JSONB NOT NULL,
    "action_log" JSONB NOT NULL DEFAULT '[]',
    "status" VARCHAR(10) NOT NULL DEFAULT 'active',
    "active_seat" INTEGER NOT NULL DEFAULT 0,
    "turn_expires_at" TIMESTAMPTZ,
    "winner_seat" INTEGER,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
    "ended_at" TIMESTAMPTZ,
    CONSTRAINT "vyapaar_match_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vyapaar_match_room_id_status_idx" ON "vyapaar_match"("room_id", "status");
CREATE INDEX "vyapaar_match_status_idx" ON "vyapaar_match"("status");

-- CreateTable
CREATE TABLE "vyapaar_match_player" (
    "match_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "seat" INTEGER NOT NULL,
    "opening_cash" INTEGER NOT NULL,
    "result_cash" INTEGER,
    "placement" INTEGER,
    CONSTRAINT "vyapaar_match_player_pkey" PRIMARY KEY ("match_id", "seat")
);

CREATE UNIQUE INDEX "vyapaar_match_player_match_id_user_id_key" ON "vyapaar_match_player"("match_id", "user_id");

ALTER TABLE "vyapaar_match" ADD CONSTRAINT "vyapaar_match_room_id_fkey"
    FOREIGN KEY ("room_id") REFERENCES "vyapaar_room"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vyapaar_match_player" ADD CONSTRAINT "vyapaar_match_player_match_id_fkey"
    FOREIGN KEY ("match_id") REFERENCES "vyapaar_match"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vyapaar_match_player" ADD CONSTRAINT "vyapaar_match_player_user_id_fkey"
    FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

- [ ] **Step 4: RLS — `supabase/vyapaar-match-rls.sql`**

Mirror `supabase/vyapaar-rooms-rls.sql`:
```sql
-- Vyapaar matches: readable only by their players; all writes via the DB owner role Prisma connects as (bypasses RLS).
ALTER TABLE "vyapaar_match" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vyapaar_match_player" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "vyapaar_match_select_player" ON "vyapaar_match";
CREATE POLICY "vyapaar_match_select_player" ON "vyapaar_match"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "vyapaar_match_player" p WHERE p.match_id = "vyapaar_match".id AND p.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "vyapaar_match_player_select_own_match" ON "vyapaar_match_player";
CREATE POLICY "vyapaar_match_player_select_own_match" ON "vyapaar_match_player"
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM "vyapaar_match_player" me WHERE me.match_id = "vyapaar_match_player".match_id AND me.user_id = auth.uid())
  );
```
(Note: `state` Json holds server-only fields; reads must go through the server's `publicView`, never raw supabase-js. RLS here is belt-and-suspenders.)

- [ ] **Step 5: Commit**

```bash
git add prisma/schema.prisma prisma/migrations supabase/vyapaar-match-rls.sql
git commit -m "feat(vyapaar): match + match-player schema, stats, migration, RLS"
```

---

### Task 3: `startMatch` + match module scaffolding + tests

**Files:**
- Create: `src/modules/vyapaar/match.ts` (`startMatch`; `rebuildMatchState` helper)
- Test: `tests/integration/vyapaar-match-start.itest.ts`

**Interfaces:**
- Consumes: `@/lib/prisma`, `@/lib/errors`, `./wallet` (`ensureVyapaarEnrollment`), engine `createGame`.
- Produces: `startMatch(userId, roomId): Promise<{ matchId: string }>`; `rebuildMatchState(seed, names, openingCash, actionLog): GameState` (for the replay test + M3c resume).

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/integration/vyapaar-match-start.itest.ts
import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch } from "@/modules/vyapaar/match"
import { getVyapaarBalance } from "@/modules/vyapaar/wallet"

async function mkUser() {
  const u = await prisma.user.create({
    data: { email: `m_${crypto.randomUUID()}@test.local`, legalName: "T" },
    select: { id: true },
  })
  return u.id
}
async function roomWith(n: number) {
  const host = await mkUser()
  const { code } = await createRoom(host, "public")
  const others: string[] = []
  for (let i = 1; i < n; i++) {
    const u = await mkUser()
    await joinRoom(u, code)
    others.push(u)
  }
  const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
  return { host, others, roomId: room!.id }
}

describe("startMatch", () => {
  it("host starts, snapshots each wallet as opening cash, seats are contiguous, room in_game", async () => {
    const { host, others, roomId } = await roomWith(3)
    const hostBal = await getVyapaarBalance(host)
    const { matchId } = await startMatch(host, roomId)
    const players = await prisma.vyapaarMatchPlayer.findMany({
      where: { matchId }, orderBy: { seat: "asc" }, select: { userId: true, seat: true, openingCash: true },
    })
    expect(players.map((p) => p.seat)).toEqual([0, 1, 2])
    expect(players[0].userId).toBe(host)
    expect(players[0].openingCash).toBe(hostBal)
    const match = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { status: true, activeSeat: true } })
    expect(match).toMatchObject({ status: "active", activeSeat: 0 })
    const room = await prisma.vyapaarRoom.findUnique({ where: { id: roomId }, select: { status: true } })
    expect(room!.status).toBe("in_game")
    void others
  })

  it("rejects a non-host starter", async () => {
    const { others, roomId } = await roomWith(2)
    await expect(startMatch(others[0], roomId)).rejects.toThrow()
  })

  it("rejects a solo room (<2 members)", async () => {
    const host = await mkUser()
    const { code } = await createRoom(host, "public")
    const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
    await expect(startMatch(host, room!.id)).rejects.toThrow()
  })

  it("one-active-match: blocks starting when a member is already in an active match", async () => {
    const { host, others, roomId } = await roomWith(2)
    await startMatch(host, roomId) // host + others[0] now in a game
    // others[0] hosts a second room with a fresh player, tries to start → blocked (already in a game)
    const fresh = await mkUser()
    const { code } = await createRoom(others[0], "public")
    await joinRoom(fresh, code)
    const room2 = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
    await expect(startMatch(others[0], room2!.id)).rejects.toThrow(/already in a game/i)
  })
})
```

- [ ] **Step 2: Run it to verify it fails**

Run: `docker compose -f docker/docker-compose.yml up -d` then `npm run test:integration -- vyapaar-match-start` → FAIL (module missing).

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/match.ts
import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { ensureVyapaarEnrollment } from "./wallet"
import { createGame } from "./engine/state"
import type { GameState, Intent } from "./engine/state"
import { applyIntent } from "./engine/engine"
import crypto from "node:crypto"

/** Deterministic rebuild from stored inputs — replay/audit/resume. */
export function rebuildMatchState(
  seed: number,
  names: string[],
  openingCash: number[],
  log: { seat: number; intent: Intent }[],
): GameState {
  const s = createGame(seed, names, openingCash)
  for (const { seat, intent } of log) applyIntent(s, seat, intent)
  return s
}

export async function startMatch(userId: string, roomId: string): Promise<{ matchId: string }> {
  const room = await prisma.vyapaarRoom.findUnique({
    where: { id: roomId },
    select: {
      id: true, hostId: true, status: true,
      members: {
        orderBy: { seat: "asc" },
        select: { userId: true, seat: true, user: { select: { displayName: true, legalName: true } } },
      },
    },
  })
  if (!room) throw new ForbiddenError("Room not found")
  if (room.hostId !== userId) throw new ForbiddenError("Only the host can start the game")
  if (room.status !== "open") throw new ForbiddenError("Room is not open")
  if (room.members.length < 2 || room.members.length > 6) throw new ForbiddenError("Need 2 to 6 players")

  const memberIds = room.members.map((m) => m.userId)
  // One-active-match rule (double-spend guard).
  const busy = await prisma.vyapaarMatchPlayer.findFirst({
    where: { userId: { in: memberIds }, match: { status: "active" } },
    select: { user: { select: { displayName: true, legalName: true } } },
  })
  if (busy) throw new ForbiddenError(`${busy.user.displayName || busy.user.legalName} is already in a game`)

  for (const id of memberIds) await ensureVyapaarEnrollment(id)
  const fresh = await prisma.user.findMany({
    where: { id: { in: memberIds } },
    select: { id: true, vyapaarWallet: true },
  })
  const walletById = new Map(fresh.map((u) => [u.id, u.vyapaarWallet]))

  const seated = room.members // already ordered by room seat
  const names = seated.map((m) => m.user.displayName || m.user.legalName)
  const openingCash = seated.map((m) => walletById.get(m.userId) ?? 0)
  const seed = crypto.randomInt(2 ** 31)
  const state = createGame(seed, names, openingCash)

  const match = await prisma.vyapaarMatch.create({
    data: {
      roomId: room.id,
      seed: BigInt(seed),
      state: state as unknown as object,
      actionLog: [],
      status: "active",
      activeSeat: 0,
      players: {
        create: seated.map((m, i) => ({ userId: m.userId, seat: i, openingCash: openingCash[i] })),
      },
      room: undefined, // relation set via roomId
    },
    select: { id: true },
  })
  await prisma.vyapaarRoom.update({ where: { id: room.id }, data: { status: "in_game" } })
  return { matchId: match.id }
}
```

(If `state as unknown as object` trips Prisma's `InputJsonValue` typing, cast via `JSON.parse(JSON.stringify(state))` or `Prisma.JsonNull`-adjacent helpers — the point is to persist the plain object. Do not persist a class instance; `GameState` is already a plain object.)

Wrap the `match.create` + `room.update` in a `prisma.$transaction([...])` (two writes) so a crash can't leave a match without flipping the room; the brief's split above is for readability — combine them in the implementation.

- [ ] **Step 4: Run it to verify it passes**

Run: `npm run test:integration -- vyapaar-match-start` (4 tests) + `npx tsc --noEmit`. Green. If Docker is down, report + rely on unit coverage where possible.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/match.ts tests/integration/vyapaar-match-start.itest.ts
git commit -m "feat(vyapaar): startMatch (wallet snapshot, one-active-match, seats)"
```

---

### Task 4: `applyMatchIntent` + settlement + tests

**Files:**
- Modify: `src/modules/vyapaar/match.ts` (`applyMatchIntent`, internal `settleMatch`)
- Test: `tests/integration/vyapaar-match-play.itest.ts`

**Interfaces:**
- Consumes: engine `applyIntent`, `publicView`, helpers `scoreOf`/`netWorth`, `controlledSets`.
- Produces: `applyMatchIntent(userId, matchId, intent): Promise<{ view: PublicView } | { error: string }>` (throws `ForbiddenError` for not-a-player / match-not-found).

**Design notes:**
- Load the `active` match + players; map `userId → seat` (throw `ForbiddenError("not_a_player")` if none). Rehydrate `state` from `match.state`. `applyIntent(state, seat, intent)`; on `{ error }` return `{ error }` (no write). On success, in one `$transaction`: update `match.state`/`actionLog`/`activeSeat`; if `state.ended`, `settleMatch(tx, matchId, state, players)` + mark over + reopen room. Return `{ view: publicView(state, seat) }`.
- `settleMatch`: rank seats by `scoreOf` desc (tiebreak `controlledSets` desc, then seat asc) for `placement`; per player set `resultCash`/`placement`, `user.vyapaarWallet = resultCash`, write `VyapaarLedger { delta: resultCash - openingCash, reason: "game_settlement", refId: matchId }`, and stats (`vyapaarGamesPlayed += 1`, `vyapaarWins += 1` if `seat === state.winner`, `vyapaarBestNetWorth = max(current, netWorth(state, seat))`).

- [ ] **Step 1: Write the failing integration test**

```ts
// tests/integration/vyapaar-match-play.itest.ts
import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch, applyMatchIntent } from "@/modules/vyapaar/match"
import type { GameState } from "@/modules/vyapaar/engine/state"

async function mkUser() {
  const u = await prisma.user.create({ data: { email: `mp_${crypto.randomUUID()}@test.local`, legalName: "T" }, select: { id: true } })
  return u.id
}
async function twoPlayerMatch() {
  const host = await mkUser(), b = await mkUser()
  const { code } = await createRoom(host, "public")
  await joinRoom(b, code)
  const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
  const { matchId } = await startMatch(host, room!.id)
  return { host, b, roomId: room!.id, matchId }
}
async function ledgerSum(userId: string) {
  const rows = await prisma.vyapaarLedger.findMany({ where: { userId }, select: { delta: true } })
  return rows.reduce((n, r) => n + r.delta, 0)
}

describe("applyMatchIntent", () => {
  it("rejects a non-player and derives seat from the user", async () => {
    const { matchId } = await twoPlayerMatch()
    const stranger = await mkUser()
    await expect(applyMatchIntent(stranger, matchId, { type: "roll" })).rejects.toThrow()
  })

  it("rejects an illegal intent from the engine without mutating", async () => {
    const { b, matchId } = await twoPlayerMatch()
    // seat 1 (b) can't roll on seat 0's turn
    const res = await applyMatchIntent(b, matchId, { type: "roll" })
    expect("error" in res).toBe(true)
    const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { actionLog: true } })
    expect((m!.actionLog as unknown[]).length).toBe(0)
  })

  it("persists state + action log on a legal roll", async () => {
    const { host, matchId } = await twoPlayerMatch()
    const res = await applyMatchIntent(host, matchId, { type: "roll" })
    expect("view" in res).toBe(true)
    const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { actionLog: true } })
    expect((m!.actionLog as unknown[]).length).toBe(1)
  })

  it("settles wallets at game-over, preserving wallet == ledger sum", async () => {
    const { host, b, matchId } = await twoPlayerMatch()
    // Force game over by driving the stored state to ended, then apply one end_turn.
    // Simplest deterministic path: fetch state, set round to MAX_ROUNDS and active to the last seat, persist, then end_turn.
    const before = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { state: true } })
    const s = before!.state as unknown as GameState
    s.round = 12
    s.active = 1
    s.phase = "manage"
    await prisma.vyapaarMatch.update({ where: { id: matchId }, data: { state: s as unknown as object, activeSeat: 1 } })
    const res = await applyMatchIntent(b, matchId, { type: "end_turn" })
    expect("view" in res).toBe(true)
    const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { status: true, winnerSeat: true } })
    expect(m!.status).toBe("over")
    for (const uid of [host, b]) {
      const player = await prisma.vyapaarMatchPlayer.findFirst({ where: { matchId, userId: uid }, select: { resultCash: true } })
      const user = await prisma.user.findUnique({ where: { id: uid }, select: { vyapaarWallet: true } })
      expect(user!.vyapaarWallet).toBe(player!.resultCash)
      expect(await ledgerSum(uid)).toBe(user!.vyapaarWallet) // invariant
    }
    const room = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { room: { select: { status: true } } } })
    expect(room!.room.status).toBe("open")
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:integration -- vyapaar-match-play` → FAIL (`applyMatchIntent` missing).

- [ ] **Step 3: Implement — add to `match.ts`**

```ts
import { publicView, type PublicView } from "./engine/view"
import { scoreOf, netWorth, controlledSets } from "./engine/helpers"

function rankSeats(state: GameState): number[] {
  // seats ordered best-first: score desc, then controlledSets desc, then seat asc
  return state.players
    .map((_, seat) => seat)
    .sort((a, b) => {
      const sa = scoreOf(state, a), sb = scoreOf(state, b)
      if (sb !== sa) return sb - sa
      const ca = controlledSets(state, a), cb = controlledSets(state, b)
      if (cb !== ca) return cb - ca
      return a - b
    })
}

async function settleMatch(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  matchId: string,
  state: GameState,
  players: { userId: string; seat: number; openingCash: number }[],
): Promise<void> {
  const order = rankSeats(state)
  const placementBySeat = new Map<number, number>()
  order.forEach((seat, i) => placementBySeat.set(seat, i + 1))

  for (const p of players) {
    const resultCash = state.players[p.seat].cash
    await tx.vyapaarMatchPlayer.update({
      where: { matchId_seat: { matchId, seat: p.seat } },
      data: { resultCash, placement: placementBySeat.get(p.seat)! },
    })
    await tx.vyapaarLedger.create({
      data: { userId: p.userId, matchId, delta: resultCash - p.openingCash, reason: "game_settlement", refId: matchId },
    })
    await tx.user.update({
      where: { id: p.userId },
      data: {
        vyapaarWallet: resultCash,
        vyapaarGamesPlayed: { increment: 1 },
        vyapaarWins: p.seat === state.winner ? { increment: 1 } : undefined,
        vyapaarBestNetWorth: { set: undefined }, // replaced below
      },
    })
    // bestNetWorth needs a max against the current value — do it explicitly
    const nw = Math.round(netWorth(state, p.seat))
    await tx.user.updateMany({
      where: { id: p.userId, vyapaarBestNetWorth: { lt: nw } },
      data: { vyapaarBestNetWorth: nw },
    })
  }
}
```

(Note: `VyapaarLedger.matchId` — if the M1 ledger model has no `matchId` column, use `refId: matchId` only and drop `matchId` from the create. Check the schema; M1's ledger used `refId`. Prefer `refId: matchId`, omit a `matchId` field.)

Then `applyMatchIntent`:

```ts
export async function applyMatchIntent(
  userId: string,
  matchId: string,
  intent: Intent,
): Promise<{ view: PublicView } | { error: string }> {
  const match = await prisma.vyapaarMatch.findUnique({
    where: { id: matchId },
    select: { id: true, status: true, state: true, actionLog: true, players: { select: { userId: true, seat: true, openingCash: true } } },
  })
  if (!match || match.status !== "active") throw new ForbiddenError("Match not found")
  const me = match.players.find((p) => p.userId === userId)
  if (!me) throw new ForbiddenError("not_a_player")

  const state = match.state as unknown as GameState
  const r = applyIntent(state, me.seat, intent)
  if ("error" in r) return { error: r.error }

  const log = [...(match.actionLog as { seat: number; intent: Intent }[]), { seat: me.seat, intent }]
  await prisma.$transaction(async (tx) => {
    await tx.vyapaarMatch.update({
      where: { id: matchId },
      data: {
        state: r.state as unknown as object,
        actionLog: log as unknown as object,
        activeSeat: r.state.active,
        ...(r.state.ended
          ? { status: "over", winnerSeat: r.state.winner, endedAt: new Date() }
          : {}),
      },
    })
    if (r.state.ended) {
      await settleMatch(tx, matchId, r.state, match.players)
      // reopen the room for a rematch
      const m = await tx.vyapaarMatch.findUnique({ where: { id: matchId }, select: { roomId: true } })
      await tx.vyapaarRoom.update({ where: { id: m!.roomId }, data: { status: "open" } })
    }
  })
  return { view: publicView(r.state, me.seat) }
}
```

- [ ] **Step 4: Run to verify it passes**

Run: `npm run test:integration -- vyapaar-match-play` (4 tests) + `npm run test:integration -- vyapaar-match-start` (no regression) + `npx tsc --noEmit`. Green.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/match.ts tests/integration/vyapaar-match-play.itest.ts
git commit -m "feat(vyapaar): applyMatchIntent + game-over wallet settlement"
```

---

### Task 5: Intent RPC route + replay test

**Files:**
- Create: `src/app/api/vyapaar/[matchId]/intent/route.ts`
- Test: `tests/integration/vyapaar-replay.itest.ts`

**Interfaces:** `POST /api/vyapaar/[matchId]/intent` (Node runtime) — body `{ intent }`, returns `publicView` JSON or an error status.

**Design notes:** thin handler over `applyMatchIntent`. `requireUser`; parse+validate the body has an `intent` object whose `type` is one of the known Intent types; map results: engine `{ error }` → `400`; `ForbiddenError` → `403` (or `404` for match-not-found — keep it simple: `403` for not_a_player, `404` when the match isn't found — distinguish by message or return `404` for "Match not found"); success → `200` with the `publicView`. Route handlers run on Node by default; do NOT add `export const runtime = "edge"`.

- [ ] **Step 1: Write the failing replay integration test**

```ts
// tests/integration/vyapaar-replay.itest.ts
import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch, applyMatchIntent, rebuildMatchState } from "@/modules/vyapaar/match"
import type { GameState, Intent } from "@/modules/vyapaar/engine/state"

async function mkUser() {
  const u = await prisma.user.create({ data: { email: `rp_${crypto.randomUUID()}@test.local`, legalName: "T" }, select: { id: true } })
  return u.id
}

describe("match replay determinism", () => {
  it("rebuild(seed,names,openingCash,log) equals the stored state", async () => {
    const host = await mkUser(), b = await mkUser()
    const { code } = await createRoom(host, "public")
    await joinRoom(b, code)
    const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
    const { matchId } = await startMatch(host, room!.id)

    // Drive a few legal turns using each state's active player.
    for (let i = 0; i < 8; i++) {
      const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { state: true, status: true } })
      if (m!.status !== "active") break
      const s = m!.state as unknown as GameState
      const seatUser = s.active === 0 ? host : b
      const intent: Intent = s.phase === "roll" ? { type: "roll" } : s.phase === "buy" ? { type: "decline" } : s.phase === "auction" ? { type: "bid", amount: 0 } : { type: "end_turn" }
      const actor = s.phase === "auction" ? (s.auction!.bids.findIndex((x) => x === null) === 0 ? host : b) : seatUser
      await applyMatchIntent(actor, matchId, intent)
    }

    const final = await prisma.vyapaarMatch.findUnique({
      where: { id: matchId },
      select: { seed: true, state: true, actionLog: true, players: { orderBy: { seat: "asc" }, select: { openingCash: true, user: { select: { displayName: true, legalName: true } } } } },
    })
    const names = final!.players.map((p) => p.user.displayName || p.user.legalName)
    const openingCash = final!.players.map((p) => p.openingCash)
    const rebuilt = rebuildMatchState(Number(final!.seed), names, openingCash, final!.actionLog as { seat: number; intent: Intent }[])
    expect(JSON.stringify(rebuilt)).toBe(JSON.stringify(final!.state))
  })
})
```

- [ ] **Step 2: Run to verify it fails**

Run: `npm run test:integration -- vyapaar-replay` → initially may pass/fail depending on `rebuildMatchState` (added in Task 3) — the intent this step verifies is the replay determinism. If Task 3/4 are done it should pass; run it to confirm determinism holds. (If it fails, the persisted `state` diverges from a fresh rebuild — investigate BigInt/Json round-trip of `seed`/`rng` before proceeding.)

- [ ] **Step 3: Write the route handler**

```ts
// src/app/api/vyapaar/[matchId]/intent/route.ts
import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { applyMatchIntent } from "@/modules/vyapaar/match"
import type { Intent } from "@/modules/vyapaar/engine/state"

const INTENT_TYPES = new Set([
  "roll", "buy", "decline", "bid", "develop", "mortgage", "unmortgage", "propose_trade", "respond_trade", "end_turn",
])

export async function POST(req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  const user = await requireUser()
  const { matchId } = await params
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "bad_body" }, { status: 400 })
  }
  const intent = (body as { intent?: Intent })?.intent
  if (!intent || typeof intent !== "object" || !INTENT_TYPES.has((intent as { type?: string }).type ?? "")) {
    return NextResponse.json({ error: "bad_intent" }, { status: 400 })
  }
  try {
    const res = await applyMatchIntent(user.id, matchId, intent)
    if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 })
    return NextResponse.json({ view: res.view })
  } catch (e) {
    if (e instanceof ForbiddenError) {
      const status = e.message === "Match not found" ? 404 : 403
      return NextResponse.json({ error: e.message }, { status })
    }
    throw e
  }
}
```

- [ ] **Step 4: Verify**

Run: `npm run test:integration -- vyapaar-replay` (determinism holds) + `npx tsc --noEmit` + `npm run build` (the new route compiles on the Node runtime). Green.

- [ ] **Step 5: Commit**

```bash
git add "src/app/api/vyapaar" tests/integration/vyapaar-replay.itest.ts
git commit -m "feat(vyapaar): authoritative intent RPC route + replay determinism test"
```

---

## Self-Review

**Spec coverage:** engine per-player cash (Task 1); models + stats + migration + RLS (Task 2); startMatch with wallet snapshot / one-active-match / contiguous seats / room→in_game (Task 3); applyMatchIntent + settlement (wallet set, ledger delta, invariant, stats, room reopen) (Task 4); authoritative RPC route + replay determinism (Task 5). ✓

**Deferred (M3b/M3c):** realtime broadcast, board UI, host Start button, pending-trade delivery, `turnExpiresAt` timer + auto-resolve cron (column added, stays null).

**Placeholder scan:** none — the two "check the ledger has/omits `matchId`" and Json-cast notes are concrete implementation guidance, not deferred work.

**Type consistency:** `startMatch`/`applyMatchIntent`/`rebuildMatchState`/`settleMatch`/`rankSeats`, `VyapaarMatch`/`VyapaarMatchPlayer` fields (`state`/`actionLog`/`activeSeat`/`openingCash`/`resultCash`/`placement`/`winnerSeat`), engine imports (`createGame`/`applyIntent`/`publicView`/`scoreOf`/`netWorth`/`controlledSets`) are consistent across tasks.

**Known simplifications (`ponytail:`):**
- Wallet snapshot-not-debit at start; the one-active-match rule is the double-spend guard.
- `state` Json persisted whole (incl. server-only rng/deck); clients only ever get `publicView` — never expose raw `state`.
- No read endpoint yet (`GET`); the caller gets the fresh `publicView` from the POST, and M3b adds realtime + any polling read.
- Settlement `bestNetWorth` uses a guarded `updateMany(where lt)` for the max — simpler than a read-modify-write inside the loop.
