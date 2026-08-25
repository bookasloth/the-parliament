# Vyapaar M3b — Realtime + Board — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Vyapaar playable in the browser — host starts a match, all players hit a live board, act via the M3a intent RPC, and see each other's moves in real time — plus the three required pre-wiring safety fixes.

**Architecture:** Reuse the existing Realtime bridge (`broadcast` → add a generic `broadcastToTopic`). Each committed intent broadcasts a nudge; clients refetch a per-seat `GET view` (server tailors `publicView`). Server logic is Prisma + the engine; the board is one client component. No turn timer (M3c), no visual-polish board.

**Tech Stack:** Next.js (App Router route handlers + a client component), Prisma 7, the Vyapaar engine, `@supabase/supabase-js` browser client (`getSupabaseBrowser`), `signRealtimeToken`, vitest (unit + `*.itest.ts`).

## Global Constraints

- **Server-authoritative:** seat from `requireUser()`; intents go through the M3a `POST …/intent`; the board never trusts local state for authority.
- **Money-safety fixes are prerequisites** — they must be in before the Start button is reachable (Task 1 lands before Task 4 wires it).
- **Realtime is a nudge, not the state.** The broadcast payload carries no private data; each client refetches its own seat-tailored `publicView`. Never broadcast raw `state` or another seat's private data.
- **Style:** double-quoted, no semicolons in `src/modules`/`src/config`/`src/lib` `.ts` (match neighbors); TSX per existing member components; `lucide-react` icons; page width per the games layout.
- **No DB access** except the local `*_test` DB via `npm run test:integration`. `prisma validate`/`generate` allowed.

---

### Task 1: Required pre-wiring safety fixes

**Files:**
- Modify: `src/modules/vyapaar/engine/engine.ts` (export `rankSeats`, `winnerOf` uses it)
- Modify: `src/modules/vyapaar/match.ts` (startMatch member-lock; settleMatch imports engine `rankSeats`)
- Modify: `src/modules/vyapaar/wallet.ts` (`topUpVyapaarCoins` active-match guard)
- Test: add to `tests/vyapaar/end-turn.test.ts` (rankSeats/winner) + `tests/integration/vyapaar-match-start.itest.ts` (lock path) + `tests/integration/vyapaar-wallet.itest.ts` (top-up guard)

**Interfaces:** `rankSeats(state: GameState): number[]` (best-first) exported from engine; `winnerOf` returns `rankSeats(state)[0]`; `match.ts` imports `rankSeats` from the engine (delete its local copy).

- [ ] **Step 1: Failing tests**

Add to `tests/vyapaar/end-turn.test.ts`:
```ts
import { rankSeats } from "@/modules/vyapaar/engine/engine"
// ... inside describe:
it("rankSeats is best-first and agrees with winnerOf", () => {
  const s = createGame(1, ["a", "b"])
  s.players[0].cash = 7075
  s.players[1].cash = 1000
  for (let id = 0; id <= 2; id++) s.cities[id].owner = 1 // seat 1 controls North → tie broken by sets
  const order = rankSeats(s)
  expect(order[0]).toBe(winnerOf(s))
  expect(new Set(order)).toEqual(new Set([0, 1]))
})
```
Add to `tests/integration/vyapaar-wallet.itest.ts` (needs a helper to put a user in an active match — import `startMatch`, `createRoom`, `joinRoom`):
```ts
it("blocks a coin top-up while the user is in an active match", async () => {
  const host = await makeUser(9999), b = await makeUser()
  const { createRoom, joinRoom } = await import("@/modules/vyapaar/rooms")
  const { startMatch } = await import("@/modules/vyapaar/match")
  const { code } = await createRoom(host.id ?? host, "public") // adjust to your makeUser return
  await joinRoom((b.id ?? b), code)
  const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
  await startMatch((host.id ?? host), room!.id)
  await expect(topUpVyapaarCoins((host.id ?? host), "coins_15k")).rejects.toThrow(/in a game/i)
})
```
(Adapt to the file's existing `makeUser` shape.)

- [ ] **Step 2: Run → fail**

`npx vitest run tests/vyapaar/end-turn.test.ts` (rankSeats not exported) and `npm run test:integration -- vyapaar-wallet` (guard missing).

- [ ] **Step 3: Implement**

**engine.ts** — add `rankSeats`, refactor `winnerOf`:
```ts
/** Seats best-first: score desc, then controlledSets desc, then seat asc. */
export function rankSeats(s: GameState): number[] {
  return s.players
    .map((_, seat) => seat)
    .sort((a, b) => {
      const sa = scoreOf(s, a), sb = scoreOf(s, b)
      if (sb !== sa) return sb - sa
      const ca = controlledSets(s, a), cb = controlledSets(s, b)
      if (cb !== ca) return cb - ca
      return a - b
    })
}

export function winnerOf(s: GameState): number {
  return rankSeats(s)[0]
}
```
(Ensure `scoreOf`/`controlledSets` are imported in engine.ts — they already are for `winnerOf`.)

**match.ts** — replace the local `rankSeats` with an import from the engine (`import { applyIntent, rankSeats } from "./engine/engine"`); delete the local `rankSeats` definition. In `startMatch`, wrap the whole body in one interactive transaction that locks the members first:
```ts
export async function startMatch(userId: string, roomId: string): Promise<{ matchId: string }> {
  const room0 = await prisma.vyapaarRoom.findUnique({ where: { id: roomId }, select: { members: { select: { userId: true } } } })
  if (!room0) throw new ForbiddenError("Room not found")
  const memberIds = room0.members.map((m) => m.userId).sort()
  for (const id of memberIds) await ensureVyapaarEnrollment(id)

  return prisma.$transaction(async (tx) => {
    // Lock the participating users' rows so concurrent starts sharing a member serialize.
    await tx.$executeRaw`SELECT id FROM "users" WHERE id = ANY(${memberIds}::uuid[]) ORDER BY id FOR UPDATE`
    const room = await tx.vyapaarRoom.findUnique({
      where: { id: roomId },
      select: { id: true, hostId: true, status: true, members: { orderBy: { seat: "asc" }, select: { userId: true, user: { select: { displayName: true, legalName: true, vyapaarWallet: true } } } } },
    })
    if (!room) throw new ForbiddenError("Room not found")
    if (room.hostId !== userId) throw new ForbiddenError("Only the host can start the game")
    if (room.status !== "open") throw new ForbiddenError("Room is not open")
    if (room.members.length < 2 || room.members.length > 6) throw new ForbiddenError("Need 2 to 6 players")
    const busy = await tx.vyapaarMatchPlayer.findFirst({
      where: { userId: { in: room.members.map((m) => m.userId) }, match: { status: "active" } },
      select: { user: { select: { displayName: true, legalName: true } } },
    })
    if (busy) throw new ForbiddenError(`${busy.user.displayName || busy.user.legalName} is already in a game`)

    const seated = room.members
    const names = seated.map((m) => m.user.displayName || m.user.legalName)
    const openingCash = seated.map((m) => m.user.vyapaarWallet)
    const seed = crypto.randomInt(2 ** 31)
    const state = createGame(seed, names, openingCash)
    const match = await tx.vyapaarMatch.create({
      data: {
        roomId: room.id, seed: BigInt(seed), state: state as unknown as object, actionLog: [],
        status: "active", activeSeat: 0,
        players: { create: seated.map((m, i) => ({ userId: m.userId, seat: i, openingCash: openingCash[i] })) },
      },
      select: { id: true },
    })
    await tx.vyapaarRoom.update({ where: { id: room.id }, data: { status: "in_game" } })
    return { matchId: match.id }
  })
}
```
(Enrollment is done before the tx — it has its own tx and must not nest; the wallet it grants is then read fresh inside the locked tx via `user.vyapaarWallet`.)

**wallet.ts** — add the guard at the top of `topUpVyapaarCoins`:
```ts
const inGame = await prisma.vyapaarMatchPlayer.findFirst({ where: { userId, match: { status: "active" } }, select: { matchId: true } })
if (inGame) throw new ForbiddenError("You're in a game — finish it before buying coins")
```

- [ ] **Step 4: Run → pass**

`npx vitest run tests/vyapaar/end-turn.test.ts` + `npm run test:integration -- vyapaar-match-start vyapaar-match-play vyapaar-wallet` (no regression; new guard/lock pass) + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/engine.ts src/modules/vyapaar/match.ts src/modules/vyapaar/wallet.ts tests/vyapaar/end-turn.test.ts tests/integration/vyapaar-wallet.itest.ts
git commit -m "fix(vyapaar): startMatch member-lock, top-up-in-match guard, unified ranker"
```

---

### Task 2: Realtime plumbing (broadcastToTopic + nudge + token action)

**Files:**
- Modify: `src/lib/supabase-realtime.ts` (`matchTopic`, `broadcastToTopic`, refactor `broadcast`)
- Modify: `src/modules/vyapaar/match.ts` (`applyMatchIntent` broadcasts a nudge after commit)
- Create: `src/modules/vyapaar/match-actions.ts` (`realtimeTokenAction`)
- Test: `tests/vyapaar-realtime-topic.test.ts` (unit)

**Interfaces:** `matchTopic(matchId): string`; `broadcastToTopic(topic, event, payload): Promise<void>`; `realtimeTokenAction(): Promise<{ token: string; userId: string } | null>`.

- [ ] **Step 1: Failing unit test**

```ts
// tests/vyapaar-realtime-topic.test.ts
import { describe, it, expect } from "vitest"
import { matchTopic, conversationTopic } from "@/lib/supabase-realtime"

describe("realtime topics", () => {
  it("matchTopic namespaces by match id", () => {
    expect(matchTopic("abc")).toBe("vyapaar-match:abc")
    expect(matchTopic("abc")).not.toBe(conversationTopic("abc"))
  })
})
```

- [ ] **Step 2: Run → fail** (`matchTopic` not exported).

- [ ] **Step 3: Implement**

**supabase-realtime.ts:**
```ts
export function matchTopic(matchId: string): string {
  return `vyapaar-match:${matchId}`
}

/** Push an event to any private topic (best-effort, after response flush). */
export async function broadcastToTopic(topic: string, event: string, payload: unknown): Promise<void> {
  try {
    after(() => postToTopic(topic, event, payload))
  } catch {
    await postToTopic(topic, event, payload)
  }
}
```
Refactor the existing `broadcast` to delegate (no behavior change):
```ts
export async function broadcast(conversationId: string, event: string, payload: unknown): Promise<void> {
  await broadcastToTopic(conversationTopic(conversationId), event, payload)
}
```

**match.ts** `applyMatchIntent`: after the `await prisma.$transaction(...)` returns (outside the tx), add:
```ts
await broadcastToTopic(matchTopic(matchId), "state", { activeSeat: r.state.active, ended: r.state.ended })
```
(import `broadcastToTopic`, `matchTopic` from `@/lib/supabase-realtime`.)

**match-actions.ts:**
```ts
"use server"
import { optionalUser } from "@/modules/auth/session"
import { signRealtimeToken } from "@/lib/supabase-realtime"

export async function realtimeTokenAction(): Promise<{ token: string; userId: string } | null> {
  const u = await optionalUser()
  if (!u) return null
  return { token: signRealtimeToken(u.id), userId: u.id }
}
```
(Confirm `optionalUser`'s shape in `src/modules/auth/session.ts`; if only `requireUser` exists, use it and catch.)

- [ ] **Step 4: Run → pass**

`npx vitest run tests/vyapaar-realtime-topic.test.ts` + `npx vitest run tests/*.test.ts` (messaging tests unaffected by the `broadcast` refactor) + `npx tsc --noEmit`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/supabase-realtime.ts src/modules/vyapaar/match.ts src/modules/vyapaar/match-actions.ts tests/vyapaar-realtime-topic.test.ts
git commit -m "feat(vyapaar): match realtime topic + broadcast nudge + token action"
```

---

### Task 3: GET view endpoint + startMatchAction

**Files:**
- Modify: `src/modules/vyapaar/match.ts` (`getMatchView(userId, matchId)`)
- Create: `src/app/api/vyapaar/[matchId]/view/route.ts` (GET)
- Modify: `src/modules/vyapaar/match-actions.ts` (`startMatchAction`)
- Test: `tests/integration/vyapaar-match-view.itest.ts`

**Interfaces:** `getMatchView(userId, matchId): Promise<PublicView>` (throws `ForbiddenError` not_a_player / "Match not found"); `GET /api/vyapaar/[matchId]/view`; `startMatchAction(roomId)`.

- [ ] **Step 1: Failing integration test**

```ts
// tests/integration/vyapaar-match-view.itest.ts
import { describe, it, expect } from "vitest"
import "./guard"
import { prisma } from "@/lib/prisma"
import { createRoom, joinRoom } from "@/modules/vyapaar/rooms"
import { startMatch, getMatchView } from "@/modules/vyapaar/match"

async function mkUser() {
  const u = await prisma.user.create({ data: { email: `mv_${crypto.randomUUID()}@test.local`, legalName: "T" }, select: { id: true } })
  return u.id
}

describe("getMatchView", () => {
  it("returns the caller's seat-tailored publicView; rejects a non-player", async () => {
    const host = await mkUser(), b = await mkUser()
    const { code } = await createRoom(host, "public")
    await joinRoom(b, code)
    const room = await prisma.vyapaarRoom.findUnique({ where: { code }, select: { id: true } })
    const { matchId } = await startMatch(host, room!.id)
    const hostView = await getMatchView(host, matchId)
    expect(hostView.you).toBe(0)
    expect(hostView.players).toHaveLength(2)
    const bView = await getMatchView(b, matchId)
    expect(bView.you).toBe(1)
    const stranger = await mkUser()
    await expect(getMatchView(stranger, matchId)).rejects.toThrow()
  })
})
```

- [ ] **Step 2: Run → fail** (`getMatchView` missing).

- [ ] **Step 3: Implement**

**match.ts** `getMatchView`:
```ts
export async function getMatchView(userId: string, matchId: string): Promise<PublicView> {
  const match = await prisma.vyapaarMatch.findUnique({
    where: { id: matchId },
    select: { state: true, players: { select: { userId: true, seat: true } } },
  })
  if (!match) throw new ForbiddenError("Match not found")
  const me = match.players.find((p) => p.userId === userId)
  if (!me) throw new ForbiddenError("not_a_player")
  return publicView(match.state as unknown as GameState, me.seat)
}
```

**view/route.ts:**
```ts
import { NextRequest, NextResponse } from "next/server"
import { requireUser } from "@/modules/auth/session"
import { ForbiddenError } from "@/lib/errors"
import { handleError } from "@/lib/api"
import { getMatchView } from "@/modules/vyapaar/match"

export async function GET(_req: NextRequest, { params }: { params: Promise<{ matchId: string }> }) {
  let user
  try {
    user = await requireUser()
  } catch (e) {
    return handleError(e)
  }
  const { matchId } = await params
  try {
    const view = await getMatchView(user.id, matchId)
    return NextResponse.json({ view })
  } catch (e) {
    if (e instanceof ForbiddenError) {
      return NextResponse.json({ error: e.message }, { status: e.message === "Match not found" ? 404 : 403 })
    }
    throw e
  }
}
```

**match-actions.ts** add:
```ts
import { redirect } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { startMatch } from "@/modules/vyapaar/match"
import { ForbiddenError } from "@/lib/errors"

export async function startMatchAction(roomId: string): Promise<{ ok: false; error: string } | void> {
  const user = await requireUser()
  let matchId: string
  try {
    const res = await startMatch(user.id, roomId)
    matchId = res.matchId
  } catch (e) {
    if (e instanceof ForbiddenError) return { ok: false, error: e.message }
    throw e
  }
  redirect(`/games/vyapaar/matches/${matchId}`)
}
```

- [ ] **Step 4: Run → pass**

`npm run test:integration -- vyapaar-match-view` + `npx tsc --noEmit` + `npm run build` (routes compile).

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/match.ts "src/app/api/vyapaar/[matchId]/view" src/modules/vyapaar/match-actions.ts tests/integration/vyapaar-match-view.itest.ts
git commit -m "feat(vyapaar): GET match view endpoint + startMatchAction"
```

---

### Task 4: Board route + MatchBoard client + room Start/Enter

**Files:**
- Create: `src/app/(main)/games/vyapaar/matches/[matchId]/page.tsx`
- Create: `src/components/vyapaar/MatchBoard.tsx` (client)
- Modify: `src/app/(main)/games/vyapaar/rooms/[code]/page.tsx` (Start button for host, Enter link when in_game)
- Create: `src/components/vyapaar/StartGameButton.tsx` (client)

**Interfaces:** consumes `getMatchView`, `realtimeTokenAction`, the intent RPC, `startMatchAction`; the engine's `BOARD`/`CITIES`/`HUB_POS` (from `@/modules/vyapaar/engine/*`) for tile labels.

**Design notes:** functional, utilitarian. The board reads only the broadcast-nudged `publicView`; every action POSTs to `/api/vyapaar/[matchId]/intent` and, on `{error}`, shows it inline. `you` (the caller's seat) comes from the page (server-known) and from the view's `you`. Import `BOARD`/`CITIES` for names/prices; ownership/level/mortgaged come from `view.cities`.

- [ ] **Step 1: Board page (server)**

```tsx
// src/app/(main)/games/vyapaar/matches/[matchId]/page.tsx
import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getMatchView } from "@/modules/vyapaar/match"
import { ForbiddenError } from "@/lib/errors"
import { MatchBoard } from "@/components/vyapaar/MatchBoard"

export const dynamic = "force-dynamic"

export default async function MatchPage({ params }: { params: Promise<{ matchId: string }> }) {
  const { matchId } = await params
  const user = await requireUser()
  let view
  try {
    view = await getMatchView(user.id, matchId)
  } catch (e) {
    if (e instanceof ForbiddenError) notFound()
    throw e
  }
  return <MatchBoard matchId={matchId} initialView={view} />
}
```

- [ ] **Step 2: MatchBoard (client)** — real code

```tsx
// src/components/vyapaar/MatchBoard.tsx
"use client"

import { useCallback, useEffect, useState } from "react"
import { getSupabaseBrowser } from "@/lib/supabase-browser"
import { realtimeTokenAction } from "@/modules/vyapaar/match-actions"
import { CITIES } from "@/modules/vyapaar/engine/data"
import type { PublicView } from "@/modules/vyapaar/engine/view"
import type { Intent } from "@/modules/vyapaar/engine/state"

const MATCH_TOPIC = (id: string) => `vyapaar-match:${id}`

export function MatchBoard({ matchId, initialView }: { matchId: string; initialView: PublicView }) {
  const [view, setView] = useState<PublicView>(initialView)
  const [err, setErr] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const you = view.you

  const refetch = useCallback(async () => {
    const res = await fetch(`/api/vyapaar/${matchId}/view`, { cache: "no-store" })
    if (res.ok) setView((await res.json()).view)
  }, [matchId])

  useEffect(() => {
    let channel: ReturnType<ReturnType<typeof getSupabaseBrowser>["channel"]> | null = null
    let cancelled = false
    ;(async () => {
      const auth = await realtimeTokenAction()
      if (!auth || cancelled) return
      const sb = getSupabaseBrowser()
      await sb.realtime.setAuth(auth.token)
      channel = sb.channel(MATCH_TOPIC(matchId), { config: { private: true } })
      channel.on("broadcast", { event: "state" }, () => { void refetch() }).subscribe()
    })()
    return () => { cancelled = true; if (channel) void getSupabaseBrowser().removeChannel(channel) }
  }, [matchId, refetch])

  const send = useCallback(async (intent: Intent) => {
    setErr(null); setBusy(true)
    try {
      const res = await fetch(`/api/vyapaar/${matchId}/intent`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }),
      })
      const data = await res.json()
      if (!res.ok) setErr(data.error ?? "error")
      else setView(data.view)
    } finally {
      setBusy(false)
    }
  }, [matchId])

  const myTurn = view.active === you && !view.ended
  const canManage = myTurn && (view.phase === "roll" || view.phase === "manage")
  const myCities = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === you)

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Vyapaar match</h1>
        <span className="text-sm text-gray-500">Round {view.round} · pot {view.pot.toLocaleString("en-IN")} · {view.ended ? `over — winner seat ${view.winner}` : `seat ${view.active}'s turn`}</span>
      </header>

      <section className="grid gap-2 sm:grid-cols-2">
        {view.players.map((p, seat) => (
          <div key={seat} className={`rounded-lg border p-3 text-sm ${seat === view.active ? "border-brand" : "border-gray-200"}`}>
            <div className="font-medium">{p.name} {seat === you && "(you)"}</div>
            <div className="text-gray-600">cash {p.cash.toLocaleString("en-IN")} · pos {p.pos} · net {Math.round(p.netWorth).toLocaleString("en-IN")}{p.halted ? " · halted" : ""}</div>
          </div>
        ))}
      </section>

      {err && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600">{err}</p>}

      <section className="flex flex-wrap gap-2">
        {myTurn && view.phase === "roll" && <button disabled={busy} onClick={() => send({ type: "roll" })} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Roll</button>}
        {myTurn && view.phase === "buy" && view.pendingCity !== null && <>
          <button disabled={busy} onClick={() => send({ type: "buy" })} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Buy {CITIES[view.pendingCity].name} ({CITIES[view.pendingCity].price})</button>
          <button disabled={busy} onClick={() => send({ type: "decline" })} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Decline</button>
        </>}
        {myTurn && view.phase === "buy" && view.pendingHub !== null && <>
          <button disabled={busy} onClick={() => send({ type: "buy" })} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Buy hub</button>
          <button disabled={busy} onClick={() => send({ type: "decline" })} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">Decline</button>
        </>}
        {view.phase === "auction" && view.auction && !view.auction.bidded[you] && <BidControl busy={busy} max={view.players[you].cash} onBid={(amount) => send({ type: "bid", amount })} />}
        {canManage && <button disabled={busy} onClick={() => send({ type: "end_turn" })} className="rounded-lg border px-4 py-2 text-sm disabled:opacity-50">End turn</button>}
      </section>

      {canManage && myCities.length > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold">Your cities</h2>
          <ul className="grid gap-1">
            {myCities.map((c) => (
              <li key={c.id} className="flex items-center justify-between rounded border border-gray-200 px-3 py-1.5 text-sm">
                <span>{CITIES[c.id].name} · L{c.level}{c.mortgaged ? " · mortgaged" : ""}</span>
                <span className="flex gap-1">
                  <button disabled={busy} onClick={() => send({ type: "develop", cityId: c.id })} className="rounded border px-2 py-0.5 text-xs disabled:opacity-50">Develop</button>
                  {c.mortgaged
                    ? <button disabled={busy} onClick={() => send({ type: "unmortgage", cityId: c.id })} className="rounded border px-2 py-0.5 text-xs disabled:opacity-50">Unmortgage</button>
                    : <button disabled={busy} onClick={() => send({ type: "mortgage", cityId: c.id })} className="rounded border px-2 py-0.5 text-xs disabled:opacity-50">Mortgage</button>}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {view.trade && view.trade.to === you && (
        <section className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm">
          <p className="mb-2 font-medium">Seat {view.trade.from} proposed a trade.</p>
          <div className="flex gap-2">
            <button disabled={busy} onClick={() => send({ type: "respond_trade", accept: true })} className="rounded-lg bg-brand px-3 py-1.5 text-white disabled:opacity-50">Accept</button>
            <button disabled={busy} onClick={() => send({ type: "respond_trade", accept: false })} className="rounded-lg border px-3 py-1.5 disabled:opacity-50">Decline</button>
          </div>
        </section>
      )}

      <TradePropose view={view} you={you} busy={busy} onPropose={(intent) => send(intent)} />
    </div>
  )
}

function BidControl({ busy, max, onBid }: { busy: boolean; max: number; onBid: (n: number) => void }) {
  const [amt, setAmt] = useState(0)
  return (
    <span className="flex items-center gap-1">
      <input type="number" min={0} max={max} value={amt} onChange={(e) => setAmt(Math.max(0, Math.min(max, Number(e.target.value))))} className="w-24 rounded border px-2 py-1 text-sm" />
      <button disabled={busy} onClick={() => onBid(amt)} className="rounded-lg bg-brand px-3 py-1.5 text-sm text-white disabled:opacity-50">Bid</button>
    </span>
  )
}

function TradePropose({ view, you, busy, onPropose }: { view: PublicView; you: number; busy: boolean; onPropose: (i: Intent) => void }) {
  const [to, setTo] = useState<number | "">("")
  const [give, setGive] = useState<number[]>([])
  const [get, setGet] = useState<number[]>([])
  const [giveCash, setGiveCash] = useState(0)
  const [getCash, setGetCash] = useState(0)
  if (view.ended || view.trade) return null
  const mine = view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === you && c.level === 0 && !c.mortgaged)
  const theirs = to === "" ? [] : view.cities.map((c, id) => ({ ...c, id })).filter((c) => c.owner === to && c.level === 0 && !c.mortgaged)
  const toggle = (arr: number[], set: (a: number[]) => void, id: number) => set(arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])
  return (
    <details className="rounded-lg border border-gray-200 p-3 text-sm">
      <summary className="cursor-pointer font-semibold">Propose a trade</summary>
      <div className="mt-2 grid gap-2">
        <label>To seat:{" "}
          <select value={to} onChange={(e) => { setTo(e.target.value === "" ? "" : Number(e.target.value)); setGet([]) }} className="rounded border px-2 py-1">
            <option value="">—</option>
            {view.players.map((p, seat) => seat !== you ? <option key={seat} value={seat}>{seat}: {p.name}</option> : null)}
          </select>
        </label>
        <div>You give: {mine.map((c) => <label key={c.id} className="mr-2"><input type="checkbox" checked={give.includes(c.id)} onChange={() => toggle(give, setGive, c.id)} /> {CITIES[c.id].name}</label>)} + cash <input type="number" min={0} value={giveCash} onChange={(e) => setGiveCash(Math.max(0, Number(e.target.value)))} className="w-20 rounded border px-1" /></div>
        <div>You get: {theirs.map((c) => <label key={c.id} className="mr-2"><input type="checkbox" checked={get.includes(c.id)} onChange={() => toggle(get, setGet, c.id)} /> {CITIES[c.id].name}</label>)} + cash <input type="number" min={0} value={getCash} onChange={(e) => setGetCash(Math.max(0, Number(e.target.value)))} className="w-20 rounded border px-1" /></div>
        <button disabled={busy || to === ""} onClick={() => onPropose({ type: "propose_trade", to: to as number, give: { cash: giveCash, cities: give }, get: { cash: getCash, cities: get } })} className="justify-self-start rounded-lg bg-brand px-3 py-1.5 text-white disabled:opacity-50">Send offer</button>
      </div>
    </details>
  )
}
```

- [ ] **Step 3: StartGameButton + room-page wiring**

```tsx
// src/components/vyapaar/StartGameButton.tsx
"use client"
import { useState, useTransition } from "react"
import { startMatchAction } from "@/modules/vyapaar/match-actions"

export function StartGameButton({ roomId }: { roomId: string }) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  return (
    <span className="flex items-center gap-2">
      <button disabled={pending} onClick={() => { setErr(null); start(async () => { const r = await startMatchAction(roomId); if (r && !r.ok) setErr(r.error) }) }} className="rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Start game</button>
      {err && <span className="text-sm text-red-600">{err}</span>}
    </span>
  )
}
```
In `rooms/[code]/page.tsx`: when `isHost && room.status === "open"` render `<StartGameButton roomId={room.id} />`; when `room.status === "in_game"`, look up the active match id (`getRoom` can return `matches` filtered to active, or a small helper `activeMatchId(roomId)`) and render an `Enter game` `<Link href={/games/vyapaar/matches/${matchId}}>`. Add a `activeMatchId(roomId)` helper to `match.ts` if needed (`prisma.vyapaarMatch.findFirst({ where: { roomId, status: "active" }, select: { id: true } })`).

- [ ] **Step 4: Verify**

`npx tsc --noEmit` (clean) + `npm run build` (all vyapaar routes + the board compile; watch for client/server boundary errors — `MatchBoard`/`StartGameButton`/`TradePropose`/`BidControl` are `"use client"`, the pages are server). `npm run lint` on new files. Browser click-through is auth-gated + realtime → manual; rely on tsc/build/lint here and report.

- [ ] **Step 5: Commit**

```bash
git add "src/app/(main)/games/vyapaar/matches" src/components/vyapaar/MatchBoard.tsx src/components/vyapaar/StartGameButton.tsx "src/app/(main)/games/vyapaar/rooms/[code]/page.tsx" src/modules/vyapaar/match.ts
git commit -m "feat(vyapaar): live match board, realtime updates, host start + enter"
```

---

## Self-Review

**Spec coverage:** fixes (startMatch member-lock, top-up guard, unified ranker) → Task 1; realtime (broadcastToTopic/matchTopic, nudge, token action) → Task 2; GET view + startMatchAction → Task 3; board route + MatchBoard (all 10 intents) + room Start/Enter → Task 4. ✓

**Deferred (M3c/later):** turn timer + auto-resolve; polished visual board; room-channel auto-redirect on start (Enter link instead).

**Placeholder scan:** none — the "adapt makeUser shape" / "confirm optionalUser" / "add activeMatchId if needed" notes are concrete guidance against real files.

**Type consistency:** `rankSeats`/`winnerOf`, `matchTopic`/`broadcastToTopic`, `getMatchView`/`startMatchAction`/`realtimeTokenAction`, `PublicView`/`Intent` used consistently; `MatchBoard`'s reads (`view.cities[id]`, `view.auction.bidded`, `view.trade.to`, `view.pendingCity`) match `PublicView`'s shape from M3a.

**Known simplifications (`ponytail:`):**
- Realtime nudge carries no state; clients refetch (simple + reconnect-safe; a little chattier than pushing state).
- Board is utilitarian (list of cities, buttons) — a visual 40-tile board is a later pass.
- Non-host members reach the board via an "Enter game" link (no auto-redirect) — realtime room-channel redirect is a nice-to-have.
- `enrollment` runs before the startMatch lock tx (its own tx can't nest); the locked tx reads the freshly-granted wallet.
