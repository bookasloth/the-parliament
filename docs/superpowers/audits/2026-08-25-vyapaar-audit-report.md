# Vyapaar — Full Audit Report

**Date:** 2026-08-25 · **Scope:** Vyapaar subsystem · **Dimensions:** Security · Correctness ·
Quality · Performance · **Method:** 4 parallel review passes → findings adversarially verified
against the code/schema → deduped + ranked. **This report changes no code** — triage below.

## Verdict per dimension
- **Security — strong.** Every entry point authenticates, seat is server-derived, raw SQL is
  parameterized, `publicView` leaks nothing, RLS complete (+ the M5a column-revoke). Only a
  theoretical non-constant-time cron compare.
- **Correctness — solid core, one liveness hole.** Money/settlement is lock-serialized,
  status-gated, idempotent, and never overdraws. No money bug. One griefing/liveness defect
  (out-of-turn intents reset the turn deadline) + minor robustness gaps.
- **Quality — unusually clean.** Good engine/DB separation, strong tests. A cluster of balance
  constants escaped `data.ts` (blocks M5b tuning) + a few dead symbols.
- **Performance — two real scaling risks.** Missing indexes on hot lookups and a quadratic
  `actionLog` rewrite; the rest is bounded by the 6-player / 100-match caps.

**Nothing Critical. 2 High, 8 Medium, 10 Low.** No blocker to the game running; the High/Medium
items matter as match count and game length grow.

---

## HIGH

### H1 · Perf · `VyapaarMatchPlayer` has no `userId`-prefixed index → seq-scan on every game-start and top-up
`prisma/schema.prisma:2510` · indexes are `@@id([matchId,seat])` + `@@unique([matchId,userId])`,
both prefixed by `matchId`. But `startMatch` ([match.ts:55](src/modules/vyapaar/match.ts)) and
`topUpVyapaarCoins` ([wallet.ts:43](src/modules/vyapaar/wallet.ts)) both do
`findFirst({ where: { userId, match: { status: "active" } } })` — a `userId`-only filter that
can't seek. Rows are never deleted, so after thousands of matches every start + every top-up
seq-scans the whole player table.
**Fix:** add `@@index([userId])` to `VyapaarMatchPlayer`. **Confidence:** High. **Verified.**

### H2 · Perf · `actionLog` is read-and-rewritten in full on every intent → O(T²) write volume per match
`commitMatchState` ([match.ts:145](src/modules/vyapaar/match.ts)) does
`[...match.actionLog, ...appended]` and writes the whole array; `applyMatchIntent` also
`select`s the full `actionLog` every intent. A match runs hundreds of intents → turn *k*
reads+writes *k* entries → cumulative bytes are quadratic; the per-intent SELECT/UPDATE payload
grows through the game. Worst on long 6-player games.
**Fix:** `actionLog` is replay/audit only — take it off the hot path. Either stop selecting +
rewriting it in `applyMatchIntent`/`commitMatchState`, or move it to an append-only
`VyapaarMatchLog` child table (one INSERT per intent, no read-modify-write).
**Confidence:** High. **Verified.**

---

## MEDIUM

### M1 · Correctness · Out-of-turn intents reset the active player's turn deadline → 2 colluders can stall a match indefinitely
`commitMatchState` ([match.ts:146](src/modules/vyapaar/match.ts)) stamps
`turnExpiresAt = now + 30s` on **every** committed intent. `propose_trade`/`respond_trade`/`bid`
are not in `ACTIVE_ONLY` ([engine.ts:34](src/modules/vyapaar/engine/engine.ts)), so any seat can
issue them during another player's turn. **Scenario:** P0 (active) is AFK; P1 proposes a trade
to P2, P2 declines, on repeat every <30s → the deadline keeps resetting → `autoResolveExpiredTurns`
never sees P0 expired → the match hangs. (A single actor is limited to one 30s bonus by the
`trade_pending` guard; the indefinite stall needs 2.)
**Fix:** only advance `turnExpiresAt` when the committed step belongs to the active seat / changes
`state.active` — pass a `resetTimer` flag that's false for off-turn trade/bid intents.
**Confidence:** High. **Verified.**

### M2 · Perf · Cron due-query has no `(status, turnExpiresAt)` index
`autoResolveExpiredTurns` ([match.ts:202](src/modules/vyapaar/match.ts)) filters
`status="active" AND turnExpiresAt <= now`; only `@@index([status])` exists, so every 10s tick
pulls all active matches and filters `turnExpiresAt` in memory.
**Fix:** add `@@index([status, turnExpiresAt])` → the empty-due-set tick becomes a 0-row index
range. **Confidence:** High. **Verified.**

### M3 · Perf · Settlement = ~24 sequential queries (×6 players) under the match `FOR UPDATE` lock
`settleMatch` ([match.ts:103](src/modules/vyapaar/match.ts)): per player `matchPlayer.update` +
`ledger.create` + `user.update` + `user.updateMany` = up to 24 serial pooler round-trips at
game-end, holding the match row lock the whole time (the `timeout:15000` concession). Capped at 6
but stretches the critical section to hundreds of ms and contends on `users` rows.
**Fix:** batch — one `createMany` for ledger rows, collapse the two `user` writes into one
guarded statement (or a single `UPDATE … FROM (VALUES …)`). ~24 round-trips → ~4.
**Confidence:** Medium.

### M4 · Perf · 10s cron has no overlap guard → ticks can overlap and lock-contend
Each due match is its own ≤15s transaction ([match.ts:201](src/modules/vyapaar/match.ts)). If many
matches expire together, one tick runs long while pg_cron fires the next at 10s → overlapping runs
grab the same `FOR UPDATE` locks (the stale-guard keeps it *correct*, just wasteful; a slow run can
approach `maxDuration=60`).
**Fix:** `pg_try_advisory_lock` at the top of `autoResolveExpiredTurns` so overlapping ticks no-op;
optionally bounded concurrency over the due set. **Confidence:** Medium.

### M5 · Quality · Balance constants hardcoded in the engine, bypassing `data.ts` (blocks M5b tuning)
`data.ts:1` promises "the harness tunes ONLY this file," but these are inline literals: Scrappy
multiplier `1.25` + `≤3` threshold ([helpers.ts:44](src/modules/vyapaar/engine/helpers.ts)),
zone-control double `*2` ([helpers.ts:41](src/modules/vyapaar/engine/helpers.ts)), startup `3`
laps/`300` penalty ([cards.ts:51](src/modules/vyapaar/engine/cards.ts)), jail `halted=2`
([engine.ts:86,256](src/modules/vyapaar/engine/engine.ts)), underdog `0.6*max`
([engine.ts:50](src/modules/vyapaar/engine/engine.ts)). The harness can't tune what it can't see.
**Fix:** hoist to named `data.ts` exports (`SCRAPPY_MULT`, `SCRAPPY_MAX_CITIES`, `ZONE_DOUBLE`,
`STARTUP_LAPS`, `STARTUP_PENALTY`, `JAIL_TURNS`, `UNDERDOG_RATIO`). **Do this as part of M5b.**
**Confidence:** High.

### M6 · Quality · `freeUpgrades` is a write-only dead field (bloats every stored `state` JSON)
Initialized ([state.ts:100](src/modules/vyapaar/engine/state.ts)) + incremented
([cards.ts:67](src/modules/vyapaar/engine/cards.ts)) but never read; the actual upgrade happens on
the next line via `s.cities[id].level += 1`. "Kept for audit" — nothing audits it.
**Fix:** delete the field + initializer + `+=1`. **Confidence:** High.

### M7 · Quality · `autoResolve()` is dead in production (test-only wrapper)
The real path ([match.ts:221](src/modules/vyapaar/match.ts)) calls `nextAutoIntent` in its own
loop; `autoResolve` ([engine.ts:449](src/modules/vyapaar/engine/engine.ts)) is only used by
`view-autoresolve.test.ts`.
**Fix:** delete `autoResolve` + its test block; keep the `nextAutoIntent` tests. **Confidence:** High.

### M8 · Test · Underdog-salary money branch untested
`isUnderdog` + `SALARY_UNDERDOG` payout ([engine.ts:50,54](src/modules/vyapaar/engine/engine.ts))
is a money branch with real logic; `roll.test.ts` only covers the default salary. Violates the
money-must-be-tested rule.
**Fix:** add a test: seat 0 clearly poorest (<60% of max NW) → pass-Start pays `SALARY_UNDERDOG`,
plus a ~60% boundary case. **Confidence:** High.

---

## LOW

### L1 · Security · Cron auth uses a non-constant-time `===` on the bearer
[cron-auth.ts:10](src/lib/cron-auth.ts) · `authHeader === \`Bearer ${secret}\`` short-circuits on
first mismatch. Theoretical timing side-channel to recover `CRON_SECRET`; network jitter dwarfs the
signal and a hit only forces already-expired turns (no money/authz gain). Fail-closed-on-unset is
already correct.
**Fix:** `crypto.timingSafeEqual` over length-guarded buffers. **Confidence:** High (non-constant);
Low (exploitable).

### L2 · Correctness · `applyIntent` return ignored inside the auto-resolve loop (latent)
[match.ts:221](src/modules/vyapaar/match.ts) always `appended.push(step)` without checking for
`{error}`. Not reachable today (no legal `nextAutoIntent` step errors), but if one ever did the loop
spins to `guard===40`, commits with `active===startSeat`, and every cron tick repeats → per-match
hang.
**Fix:** `const r = applyIntent(...); if ("error" in r) break;`. **Confidence:** High (ignored);
Medium (currently unreachable).

### L3 · Quality/Correctness · `replay.ts` duplicates `rebuildMatchState` and can't do per-seat opening stacks
`replay()` ([replay.ts:5](src/modules/vyapaar/engine/replay.ts)) is the same `createGame`+apply loop
as `rebuildMatchState` ([match.ts:40](src/modules/vyapaar/match.ts)) but takes a scalar
`openingCash` — it'd diverge on a real match with unequal wallets. Test-only (`determinism.test.ts`).
*(Reported by both the correctness and quality passes — merged.)*
**Fix:** delete `replay.ts`; have the test call `rebuildMatchState`. **Confidence:** High.

### L4 · Perf · MatchBoard refetches the full view on every broadcast (double-fetch + no coalesce)
[MatchBoard.tsx:40](src/components/vyapaar/MatchBoard.tsx) · the acting player double-fetches (POST
response already set the view, then its own broadcast refetches); a burst (cron auto-resolving
several turns) fires one refetch each. Bounded at 6 but wasteful.
**Fix:** debounce/coalesce `refetch` (~150ms trailing) + skip refetch on the client that just sent
the intent. **Confidence:** Medium.

### L5 · Perf · `startMatch` awaits `ensureVyapaarEnrollment` per member sequentially
[match.ts:55](src/modules/vyapaar/match.ts) · up to 6 serial transactions before the start tx.
**Fix:** `await Promise.all(memberIds.map(ensureVyapaarEnrollment))`. **Confidence:** High.

### L6 · Quality · `MONSOON_PAY` dead constant
[data.ts:67](src/modules/vyapaar/engine/data.ts) · `450` "reserved for tuning", no reader (monsoon
is "just visiting"). **Fix:** delete; re-add when a payout exists. **Confidence:** High.

### L7 · Quality · `getVyapaarWallet()` prod-unused (two near-identical read helpers)
[wallet.ts:22](src/modules/vyapaar/wallet.ts) · only integration tests call it; app uses
`ensureVyapaarEnrollment` + `getVyapaarBalance`. **Fix:** delete, or make it the one public read and
use it in the hub. **Confidence:** Medium.

### L8 · Quality · `joinRoomAction` return type omits the success (`void`) case
[rooms-actions.ts:14](src/modules/vyapaar/rooms-actions.ts) · typed `Promise<{ok:false;error}>` but
the success path `redirect()`s (throws) and never returns that. `startMatchAction` types it as
`… | void`. **Fix:** align the annotation to `… | void`. **Confidence:** High.

### L9 · Test · `skipNext` card op untested
[cards.ts:62](src/modules/vyapaar/engine/cards.ts) · the one card opcode with no test.
**Fix:** one assertion — `skipNext` increments `halted`. (Borderline YAGNI, trivial.) **Confidence:** High.

### L10 · Correctness · Settlement is positive-sum — every match net-mints coins (by design?)
In-game sources (salary, cash cards) exceed sinks (buy/auction cash destroyed; taxes route through
the neutral pot), so Σ wallet deltas at settlement > 0
([match.ts:120](src/modules/vyapaar/match.ts)). The per-user `wallet == Σledger` invariant still
holds; there's no *global* conservation. Harmless while coins are one-way non-cashable play-money,
but it inflates balances/leaderboards and would be a liability if coins ever became cashable.
**Fix (only if conservation is wanted):** make settlement zero-sum (redistribute a staked pool by
placement); otherwise document that a match is intentionally positive-sum. **Confidence:** High
(positive-sum); likely intended.

---

## By-design notes (not findings)
- **Room member names visible to anyone with the 6-char code**, regardless of `visibility`
  ([rooms/[code]/page.tsx](src/app/(main)/games/vyapaar/rooms/[code]/page.tsx)) — consistent with
  `joinRoom` being code-gated (invite-by-code). Conscious choice; flagged for awareness.
- `validIntentShape` in the intent route is a crash-guard only; the engine stays authoritative. Fine.
- `MEMORY.md` vyapaar note was stale at audit time but **already updated this session** — no action.

---

## Recommended triage order
1. **Quick wins (one small PR):** H1 + M2 indexes, L5 `Promise.all`, L8 type fix, L1
   `timingSafeEqual`, L2 loop-break guard. Cheap, high value, low risk.
2. **Fold into M5b (balance):** M5 hoist constants to `data.ts` (needed before tuning anyway),
   M6 delete `freeUpgrades`, M8 underdog-salary test.
3. **Own slice / heavier:** H2 `actionLog` off the hot path (schema change → child table), M3
   batch settlement, M4 cron advisory lock, M1 turn-timer reset fix.
4. **Cleanup, any time:** M7/L3/L6/L7/L9 dead-code + test-gap sweep.
5. **Decide, don't rush:** L10 (positive-sum economy) — a product call, only matters if coins ever
   become cashable. L4 client debounce — polish.
