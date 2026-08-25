# Vyapaar M3c — Turn Timer — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** AFK players can't stall a match. Each turn gets a 30s deadline (`turnExpiresAt`); a pg_cron→pg_net job hits an auto-resolve route that plays the minimal-legal move for any expired turn. Auto-intents are logged (replay stays deterministic). Clients show a countdown.

**Architecture:** A pure `nextAutoIntent` (engine) drives both `autoResolve` and the cron. A shared `commitMatchState` persists state+log+`turnExpiresAt`+settlement for both the intent path and the cron. The cron route is bearer-guarded and idempotent (FOR UPDATE + stale guard).

**Tech Stack:** Prisma, the engine, Next route handlers, `isAuthorizedCron`, `broadcastToTopic`/`matchTopic`, vitest. pg_cron + pg_net on Supabase.

## Global Constraints

- **Replay determinism:** every applied intent — including auto-resolved ones — is appended to `actionLog`, so `rebuildMatchState(seed, names, openingCash, actionLog)` still equals stored `state`. The cron must use `nextAutoIntent`→`applyIntent` and record the pairs.
- **Idempotent + race-safe cron:** resolve each match inside a `$transaction` with `SELECT … FOR UPDATE` on the match row + a stale guard (skip if not active or `turnExpiresAt > now`), so a real move that just advanced the turn is never clobbered and two overlapping cron ticks don't double-resolve.
- **Money/authority untouched:** settlement-by-increment, seat-from-auth, and the M3a/M3b serialization stay intact; the cron reuses the same settlement.
- **Style:** double-quoted, no semicolons in `src/modules`/`src/config`/`src/lib`; TSX per neighbors.
- **No DB access** except the local `*_test` DB via `npm run test:integration`. The pg_cron/pg_net SQL is delivered for manual prod apply.

---

### Task 1: Engine — `nextAutoIntent`

**Files:**
- Modify: `src/modules/vyapaar/engine/engine.ts` (`nextAutoIntent`; `autoResolve` uses it)
- Test: add to `tests/vyapaar/view-autoresolve.test.ts`

**Interfaces:** `nextAutoIntent(s: GameState): { seat: number; intent: Intent } | null`.

- [ ] **Step 1: Failing tests**

Add to `tests/vyapaar/view-autoresolve.test.ts`:
```ts
import { nextAutoIntent } from "@/modules/vyapaar/engine/engine"
// ...
describe("nextAutoIntent", () => {
  it("picks the minimal-legal step per phase", () => {
    const s = createGame(1, ["a", "b"])
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "roll" } })
    s.phase = "buy"; s.pendingCity = 0
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "decline" } })
    s.phase = "manage"; s.pendingCity = null
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "end_turn" } })
  })
  it("bids 0 for the first un-bid seat during an auction", () => {
    const s = createGame(1, ["a", "b"])
    s.phase = "auction"; s.auction = { cityId: 0, bids: [null, null] }
    expect(nextAutoIntent(s)).toEqual({ seat: 0, intent: { type: "bid", amount: 0 } })
    s.auction.bids[0] = 0
    expect(nextAutoIntent(s)).toEqual({ seat: 1, intent: { type: "bid", amount: 0 } })
  })
  it("returns null when the game is over", () => {
    const s = createGame(1, ["a", "b"]); s.ended = true
    expect(nextAutoIntent(s)).toBeNull()
  })
})
```

- [ ] **Step 2: Run → fail** (`nextAutoIntent` not exported).

- [ ] **Step 3: Implement**

```ts
/** The minimal-legal step for a stuck/timed-out position, or null if the game is over. */
export function nextAutoIntent(s: GameState): { seat: number; intent: Intent } | null {
  if (s.ended) return null
  switch (s.phase) {
    case "roll":
      return { seat: s.active, intent: { type: "roll" } }
    case "buy":
      return { seat: s.active, intent: { type: "decline" } }
    case "auction": {
      const seat = s.auction ? s.auction.bids.findIndex((b) => b === null) : -1
      return seat >= 0 ? { seat, intent: { type: "bid", amount: 0 } } : null
    }
    case "manage":
      return { seat: s.active, intent: { type: "end_turn" } }
    default:
      return null
  }
}
```
Refactor `autoResolve` to use it:
```ts
export function autoResolve(s: GameState): { state: GameState; events: EngineEvent[] } {
  const step = nextAutoIntent(s)
  if (!step) return { state: s, events: [] }
  return applyIntent(s, step.seat, step.intent) as { state: GameState; events: EngineEvent[] }
}
```

- [ ] **Step 4: Run → pass**

`npx vitest run tests/vyapaar/view-autoresolve.test.ts` + `npx vitest run tests/vyapaar/` (whole engine suite; autoResolve refactor equivalence) + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/engine.ts tests/vyapaar/view-autoresolve.test.ts
git commit -m "feat(vyapaar): nextAutoIntent (drives autoResolve + the turn-timer cron)"
```

---

### Task 2: `turnExpiresAt` wiring + `commitMatchState`

**Files:**
- Create: `src/config/vyapaar-match.ts` (`TURN_SECONDS`)
- Modify: `src/modules/vyapaar/match.ts` (`turnExpiresAtFor`, `commitMatchState`, `startMatch`, `applyMatchIntent`, `getMatchView` return `turnExpiresAt`)
- Modify: `src/app/api/vyapaar/[matchId]/intent/route.ts` + `view/route.ts` (include `turnExpiresAt`)
- Test: add to `tests/integration/vyapaar-match-play.itest.ts`

**Interfaces:** `getMatchView(userId, matchId): Promise<{ view: PublicView; turnExpiresAt: string | null }>`; `applyMatchIntent(...): Promise<{ view; turnExpiresAt } | { error }>`; internal `commitMatchState(tx, match, state, appendedLog): Promise<Date | null>` (returns the new deadline).

- [ ] **Step 1: Failing test**

Add to `tests/integration/vyapaar-match-play.itest.ts`:
```ts
it("sets turnExpiresAt on start and after a move, null at game-over", async () => {
  const { host, matchId } = await twoPlayerMatch()
  const m0 = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { turnExpiresAt: true } })
  expect(m0!.turnExpiresAt).not.toBeNull() // set at start
  await applyMatchIntent(host, matchId, { type: "roll" })
  const m1 = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { turnExpiresAt: true } })
  expect(m1!.turnExpiresAt).not.toBeNull()
})
```
(Reuse the file's existing `twoPlayerMatch` helper.)

- [ ] **Step 2: Run → fail** (start doesn't set turnExpiresAt yet).

- [ ] **Step 3: Implement**

`src/config/vyapaar-match.ts`:
```ts
/** Seconds a player has to act before the turn-timer cron auto-resolves their move. */
export const TURN_SECONDS = 30
```

`match.ts` — add near the top:
```ts
import { TURN_SECONDS } from "@/config/vyapaar-match"

function turnExpiresAtFor(state: GameState, nowMs: number): Date | null {
  return state.ended ? null : new Date(nowMs + TURN_SECONDS * 1000)
}
```
Extract the persist+settle block of `applyMatchIntent` into a shared helper (returns the written deadline):
```ts
async function commitMatchState(
  tx: Prisma.TransactionClient,
  match: { id: string; roomId: string; actionLog: unknown; players: { userId: string; seat: number; openingCash: number }[] },
  state: GameState,
  appendedLog: { seat: number; intent: Intent }[],
): Promise<Date | null> {
  const log = [...(match.actionLog as { seat: number; intent: Intent }[]), ...appendedLog]
  const expiresAt = turnExpiresAtFor(state, Date.now())
  await tx.vyapaarMatch.update({
    where: { id: match.id },
    data: {
      state: state as unknown as object,
      actionLog: log as unknown as object,
      activeSeat: state.active,
      turnExpiresAt: expiresAt,
      ...(state.ended ? { status: "over", winnerSeat: state.winner, endedAt: new Date() } : {}),
    },
  })
  if (state.ended) {
    await settleMatch(tx, match.id, state, match.players)
    await tx.vyapaarRoom.update({ where: { id: match.roomId }, data: { status: "open" } })
  }
  return expiresAt
}
```
(Use `Prisma.TransactionClient` — import `Prisma` from `@/generated/prisma/client` if the type isn't already available; if the codebase spells it differently, match that. `settleMatch` already takes the same `tx`.)

Refactor `applyMatchIntent`: its in-tx match `findUnique` must also `select` `roomId` + `actionLog`; replace the manual update/settle with `const expiresAt = await commitMatchState(tx, match, r.state, [{ seat: me.seat, intent }])`; make the transaction return `{ view: publicView(r.state, me.seat), turnExpiresAt: expiresAt }`; the function returns that (or `{ error }`). Keep the post-commit broadcast.

`startMatch`: on `vyapaarMatch.create`, add `turnExpiresAt: turnExpiresAtFor(state, Date.now())` to the data.

`getMatchView`: add `turnExpiresAt: true` to the select; return `{ view: publicView(state, me.seat), turnExpiresAt: match.turnExpiresAt?.toISOString() ?? null }`. Update its return type.

Routes: `view/route.ts` returns `{ view, turnExpiresAt }` (from getMatchView); `intent/route.ts` success returns `{ view: res.view, turnExpiresAt: res.turnExpiresAt }` (serialize Date → ISO string if `commitMatchState` returned a Date — convert in `applyMatchIntent`'s return, i.e. `turnExpiresAt: expiresAt?.toISOString() ?? null`, so the API always yields a string|null).

- [ ] **Step 4: Run → pass**

`docker compose -f docker/docker-compose.yml up -d` then `npm run test:integration -- vyapaar-match-play vyapaar-match-start vyapaar-match-view vyapaar-replay` (all pass — replay still holds; view/start/play unaffected beyond the new field) + `npx tsc --noEmit` + `npm run build`.

- [ ] **Step 5: Commit**

```bash
git add src/config/vyapaar-match.ts src/modules/vyapaar/match.ts "src/app/api/vyapaar/[matchId]" tests/integration/vyapaar-match-play.itest.ts
git commit -m "feat(vyapaar): turnExpiresAt on turn advance + shared commitMatchState"
```

---

### Task 3: `autoResolveExpiredTurns` + cron route + pg_cron SQL

**Files:**
- Modify: `src/modules/vyapaar/match.ts` (`autoResolveExpiredTurns`)
- Create: `src/app/api/vyapaar/cron/timeouts/route.ts` (GET)
- Create: `supabase/vyapaar-turn-timer-cron.sql`
- Test: `tests/integration/vyapaar-timeout.itest.ts`

**Interfaces:** `autoResolveExpiredTurns(now: Date): Promise<number>`; `GET /api/vyapaar/cron/timeouts`.

- [ ] **Step 1: Failing integration test**

```ts
// tests/integration/vyapaar-timeout.itest.ts
import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch, autoResolveExpiredTurns, rebuildMatchState } from "@/modules/vyapaar/match"
import type { GameState, Intent } from "@/modules/vyapaar/engine/state"

async function mkUser() {
  const u = await prisma.user.create({ data: { email: `to_${crypto.randomUUID()}@test.local`, legalName: "T" }, select: { id: true } })
  return u.id
}
async function match2() {
  const host = await mkUser(), b = await mkUser()
  const { code } = await createRoom(host, "public")
  await joinRoom(b, code)
  const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
  const { matchId } = await startMatch(host, room!.id)
  return { host, b, matchId }
}

describe("autoResolveExpiredTurns", () => {
  it("auto-plays an expired turn and advances the active seat", async () => {
    const { matchId } = await match2()
    // expire the turn
    await prisma.vyapaarMatch.update({ where: { id: matchId }, data: { turnExpiresAt: new Date(Date.now() - 1000) } })
    const before = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { activeSeat: true } })
    const n = await autoResolveExpiredTurns(new Date())
    expect(n).toBeGreaterThanOrEqual(1)
    const after = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { activeSeat: true, actionLog: true } })
    expect(after!.activeSeat).not.toBe(before!.activeSeat) // a full turn was auto-played
    expect((after!.actionLog as unknown[]).length).toBeGreaterThan(0) // auto-intents recorded
  })

  it("leaves a non-expired match untouched (stale guard)", async () => {
    const { matchId } = await match2() // turnExpiresAt ~30s in the future
    const n = await autoResolveExpiredTurns(new Date())
    const m = await prisma.vyapaarMatch.findUnique({ where: { id: matchId }, select: { activeSeat: true, actionLog: true } })
    expect(m!.activeSeat).toBe(0)
    expect((m!.actionLog as unknown[]).length).toBe(0)
    void n
  })

  it("keeps replay determinism through auto-resolve", async () => {
    const { matchId } = await match2()
    await prisma.vyapaarMatch.update({ where: { id: matchId }, data: { turnExpiresAt: new Date(Date.now() - 1000) } })
    await autoResolveExpiredTurns(new Date())
    const m = await prisma.vyapaarMatch.findUnique({
      where: { id: matchId },
      select: { seed: true, state: true, actionLog: true, players: { orderBy: { seat: "asc" }, select: { openingCash: true, user: { select: { displayName: true, legalName: true } } } } },
    })
    const names = m!.players.map((p) => p.user.displayName || p.user.legalName)
    const openingCash = m!.players.map((p) => p.openingCash)
    const rebuilt = rebuildMatchState(Number(m!.seed), names, openingCash, m!.actionLog as { seat: number; intent: Intent }[])
    expect(rebuilt).toEqual(m!.state as unknown as GameState)
  })
})
```

- [ ] **Step 2: Run → fail** (`autoResolveExpiredTurns` missing).

- [ ] **Step 3: Implement**

`match.ts`:
```ts
import { nextAutoIntent } from "./engine/engine"
import { broadcastToTopic, matchTopic } from "@/lib/supabase-realtime"

/** Auto-play the minimal-legal move for every turn past its deadline. Returns how many matches advanced. */
export async function autoResolveExpiredTurns(now: Date): Promise<number> {
  const due = await prisma.vyapaarMatch.findMany({
    where: { status: "active", turnExpiresAt: { lte: now } },
    select: { id: true },
    take: 100,
  })
  let resolved = 0
  for (const { id } of due) {
    const didResolve = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT id FROM "vyapaar_match" WHERE id = ${id}::uuid FOR UPDATE`
      const match = await tx.vyapaarMatch.findUnique({
        where: { id },
        select: { id: true, roomId: true, status: true, state: true, actionLog: true, turnExpiresAt: true, players: { select: { userId: true, seat: true, openingCash: true } } },
      })
      // Stale guard: a real move may have advanced the turn between the query and the lock.
      if (!match || match.status !== "active" || !match.turnExpiresAt || match.turnExpiresAt > now) return false
      const state = match.state as unknown as GameState
      const startSeat = state.active
      const appended: { seat: number; intent: Intent }[] = []
      let guard = 0
      while (!state.ended && state.active === startSeat && guard++ < 40) {
        const step = nextAutoIntent(state)
        if (!step) break
        applyIntent(state, step.seat, step.intent)
        appended.push(step)
      }
      if (appended.length === 0) return false
      await commitMatchState(tx, match, state, appended)
      return true
    })
    if (didResolve) {
      await broadcastToTopic(matchTopic(id), "state", {})
      resolved++
    }
  }
  return resolved
}
```
(Note: during an auction the active seat stays `startSeat` while other seats' bids are auto-filled, so the loop correctly drives roll→decline→auction→end_turn until the active seat changes; the `guard < 40` cap is a safety net.)

`src/app/api/vyapaar/cron/timeouts/route.ts`:
```ts
import { NextRequest, NextResponse } from "next/server"
import { isAuthorizedCron } from "@/lib/cron-auth"
import { autoResolveExpiredTurns } from "@/modules/vyapaar/match"

export const dynamic = "force-dynamic"
export const maxDuration = 60

export async function GET(req: NextRequest) {
  if (!isAuthorizedCron(req.headers.get("authorization"), process.env.CRON_SECRET)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 })
  }
  const resolved = await autoResolveExpiredTurns(new Date())
  return NextResponse.json({ ok: true, resolved })
}
```

`supabase/vyapaar-turn-timer-cron.sql`:
```sql
-- Vyapaar turn-timer: every ~10s, ping the auto-resolve route to advance any turn
-- past its 30s deadline. Substitute <AUTH_URL> (prod app origin) and <CRON_SECRET>
-- (the same value as the Vercel CRON_SECRET env). Run once on the prod DB.
create extension if not exists pg_cron;
create extension if not exists pg_net;

select cron.schedule(
  'vyapaar-turn-timeouts',
  '10 seconds',
  $$
  select net.http_post(
    url := '<AUTH_URL>/api/vyapaar/cron/timeouts',
    headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')
  );
  $$
);
-- To remove: select cron.unschedule('vyapaar-turn-timeouts');
```

- [ ] **Step 4: Run → pass**

`npm run test:integration -- vyapaar-timeout` (3 tests) + `npm run test:integration -- vyapaar-match-play vyapaar-replay` (no regression) + `npx tsc --noEmit` + `npm run build` (cron route compiles).

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/match.ts "src/app/api/vyapaar/cron" supabase/vyapaar-turn-timer-cron.sql tests/integration/vyapaar-timeout.itest.ts
git commit -m "feat(vyapaar): turn-timeout auto-resolve route + pg_cron SQL"
```

---

### Task 4: Client countdown

**Files:**
- Modify: `src/components/vyapaar/MatchBoard.tsx`
- Modify: `src/app/(main)/games/vyapaar/matches/[matchId]/page.tsx` (pass `turnExpiresAt` from the initial view)

**Interfaces:** `MatchBoard` accepts `initialTurnExpiresAt` and shows a live countdown for the active seat.

**Design notes:** the board page's `getMatchView` now returns `{ view, turnExpiresAt }`; pass both. In `MatchBoard`, keep `turnExpiresAt` in state, update it from the `GET view` refetch (`{ view, turnExpiresAt }`) and from the intent POST response; a 1s interval renders seconds-remaining while the match is active; ≤0 shows "resolving…". Display only — the cron does the work.

- [ ] **Step 1: Page passes turnExpiresAt**

In `matches/[matchId]/page.tsx`: `const { view, turnExpiresAt } = await getMatchView(...)` (it now returns both) → `<MatchBoard matchId={matchId} initialView={view} initialTurnExpiresAt={turnExpiresAt} />`.

- [ ] **Step 2: MatchBoard countdown**

Add to `MatchBoard`:
- Props: `initialTurnExpiresAt: string | null`.
- State: `const [turnExpiresAt, setTurnExpiresAt] = useState(initialTurnExpiresAt)` and `const [nowMs, setNowMs] = useState(() => Date.now())`.
- `refetch` sets both view and turnExpiresAt from the `{ view, turnExpiresAt }` JSON; `send` likewise from the POST response.
- A `useEffect` with `setInterval(() => setNowMs(Date.now()), 1000)` (cleared on unmount) — only needs to run while `!view.ended`.
- Render near the turn indicator: if `!view.ended && turnExpiresAt`, `const left = Math.max(0, Math.round((new Date(turnExpiresAt).getTime() - nowMs) / 1000))` → show `left > 0 ? `${left}s` : "resolving…"`.

(Keep everything else — realtime subscribe/refresh, all 10 intent controls — unchanged. Only add the countdown + thread `turnExpiresAt`.)

- [ ] **Step 3: Verify**

`npx tsc --noEmit` (clean) + `npm run build` (board route compiles) + `npm run lint` on MatchBoard.tsx. Browser click-through is auth+realtime gated → rely on tsc/build/lint; report.

- [ ] **Step 4: Commit**

```bash
git add src/components/vyapaar/MatchBoard.tsx "src/app/(main)/games/vyapaar/matches/[matchId]/page.tsx"
git commit -m "feat(vyapaar): live turn countdown on the match board"
```

---

## Self-Review

**Spec coverage:** `nextAutoIntent` (Task 1); `turnExpiresAt` on advance + `commitMatchState` + client-facing return (Task 2); `autoResolveExpiredTurns` + cron route + pg_cron SQL (Task 3); client countdown (Task 4). ✓

**Deferred (M5):** balance harness, leaderboard, rate-limit, polished board, the two carried concurrency residuals.

**Placeholder scan:** none — the `Prisma.TransactionClient` import note and "reuse twoPlayerMatch" are concrete guidance against real files.

**Type consistency:** `nextAutoIntent`, `turnExpiresAtFor`, `commitMatchState` (returns `Date|null`), `autoResolveExpiredTurns`, and the `{ view, turnExpiresAt: string|null }` return shape are consistent across match.ts, the two routes, and MatchBoard. `getMatchView`/`applyMatchIntent` return-type changes are reflected in every caller (routes + board page + MatchBoard).

**Known simplifications (`ponytail:`):**
- One expired turn resolved per match per cron run (the next player gets a fresh 30s + the next tick) — an all-AFK game auto-completes over several ticks; fine and bounded by `guard < 40` per turn.
- `turnExpiresAt` resets on every committed intent (activity extends the deadline) — simplest correct policy.
- Countdown is display-only; the server/cron is authoritative — a client clock skew just shows a slightly-off number, never affects resolution.
