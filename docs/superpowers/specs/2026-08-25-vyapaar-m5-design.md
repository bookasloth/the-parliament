# Vyapaar M5 — balance re-run + hardening + leaderboard

**Status:** design · **Date:** 2026-08-25 · **Branch:** `feat/vyapaar-m5`
**Depends on:** M3a/b/c (all merged + live in prod).

M5 is the final milestone in the original roadmap ([multiplayer-design.md] item 6). The
game is playable end-to-end; M5 makes it *fair, safe, and sticky*. It splits into three
independently-shippable slices, each its own plan + PR (same rhythm as M3a/b/c).

> **Residuals already closed (verified 2026-08-25):** the two deferred M3b items —
> `startMatch` member-lock TOCTOU and `topUpVyapaarCoins`-during-active-match — are
> **done**: `match.ts:59` locks member rows `FOR UPDATE` before the one-active-match
> re-check; `wallet.ts:43` rejects top-up while the user has an `active` match. M5 does
> **not** re-do these; it only adds a regression test for each (M5a).

---

## Slice M5a — Hardening (do first; protects the live game)

Security + integrity for the already-live match path. No schema change.

### 1. Rate-limit the intent route
`POST /api/vyapaar/[matchId]/intent` is the only authenticated write a client drives in a
tight loop; today it's unbounded. Reuse the existing `enforceRateLimit`
(`src/lib/rate-limit.ts`, Upstash) — do **not** write a new limiter.

- Bucket `vyapaar:intent`, identifier = `userId`, **limit 30 / 10s** (a legitimate turn
  is a handful of actions; 30/10s is generous headroom, blocks scripted floods).
- On limit: return `429` with `{ error: "rate_limited" }` (route already has an error
  funnel — add the `RateLimitedError` → 429 branch).
- **Fail-open** if Redis is unreachable (`checkRateLimit` throws): the game must not
  become unplayable because the limiter is down. Wrap in try/catch, log, allow.
  `// ponytail: fail-open — availability > flood-protection for a play-money game.`
- Also rate-limit `startMatchAction` and `topUpVyapaarCoins` (coarser: 10/60s) — cheap,
  closes the other two write loops.

### 2. Anti-cheat property tests (pure engine, DB-free)
The authority is already server-side (`applyIntent` + `FOR UPDATE`); these tests *prove*
the invariants hold across random play, catching any future regression. Extend
`tests/vyapaar/` with fast-check-style loops (no new dep — hand-rolled random driver over
`nextAutoIntent` + a fuzz intent generator, seeded, deterministic):

- **Out-of-turn rejected:** any `ACTIVE_ONLY` intent from `seat !== active` → `error`,
  state unchanged.
- **Money is fully accounted (not globally conserved):** buys/builds/mortgages move cash
  to/from an implicit bank and salary/cards inject it, so Σcash+pot is *not* invariant.
  The real invariant: **every per-step cash delta equals the sum of that step's event
  amounts** — no unexplained cash movement. Player-to-player + player-to-pot transfers net
  to zero; buy/develop/unmortgage are bank sinks; salary/`cash`/`cashAll`/mortgage/Mandi
  are sources — each must match its emitted event.
- **No negative cash:** after `charge`/liquidate, no player's cash < 0 (shortfall is
  forgiven, never overdrawn).
- **Replay determinism:** `rebuildMatchState(seed, names, opening, actionLog)` byte-equals
  the live-stepped state for N random games (already partially covered — promote to a
  property loop of ≥200 games).
- **Bounded game:** every seeded random game reaches `ended` within `MAX_ROUNDS+1` wraps
  (guards against a phase deadlock the turn-timer can't resolve).

### 3. RLS audit (fill gaps, no rebuild)
Four RLS files are applied (`wallet`, `rooms`, `match`, `match-realtime`). Audit for gaps
and ship one consolidating `supabase/vyapaar-m5-rls-audit.sql` **only if** gaps are found:

- `vyapaar_match_player`, `vyapaar_ledger` — confirm row-level read is self/participants-only.
- Confirm no table grants `anon`/`authenticated` a direct `UPDATE`/`INSERT` that bypasses
  the server RPC (all mutation must route through the service-role server actions).
- Deliverable: a short findings note in the M5a plan + the SQL iff needed (owner applies
  manually, per the no-DB-access rule).

### 4. Regression tests for the closed residuals
One integration test each: (a) two concurrent `startMatch` on the same room → exactly one
match, other errors; (b) `topUpVyapaarCoins` during an `active` match → rejected.

**M5a done:** intent/start/top-up rate-limited (fail-open), property-test suite green,
RLS audited (+ SQL iff gaps), residual regression tests green. tsc + build.

---

## Slice M5b — Balance harness + tune `data.ts`

The economy is **v2, never balance-validated** (design §A warning). Build a headless
simulator, measure, then tune constants — including the **game-length** question (12
rounds ≈ 25–40 min for 4 humans; likely needs raising for a ~1h target).

### The harness (`scripts/vyapaar-balance.ts`, DB-free, deterministic)
Drive the pure engine with **bot policies** (not just `nextAutoIntent`, which always
declines — that never builds an economy). Two bots minimum:
- **Greedy:** buy if affordable; build whenever set-controlled + affordable; else end.
- **Thrifty:** buy only below a cash-fraction threshold; build only top-2 zones.

Run **N=2000 games** per config at **4 players** (also spot-check 5–6), fixed seed stream
(seed = game index — deterministic, replayable; no `Math.random`). Emit metrics:

| Metric | Why it matters | Healthy band (target) |
|---|---|---|
| Turns to end / est. minutes | game-length target | tune to **≥60 min** wall @ ~35s/turn |
| Win-rate by seat | seat fairness | each seat 20–30% (4p) |
| Win-rate greedy vs thrifty | strategy diversity | neither >65% |
| % games hitting `MAX_ROUNDS` vs 3-set early close | which end fires | want a mix, not 100% either |
| Median winner net-worth / opening | inflation check | winner ≈ 1.5–3× opening |
| % player-turns at cash 0 (forgiven) | death-spiral check | low; not everyone flatlining |
| Rounds until first zone control | pace | not turn 1, not never |

### Tuning knobs (all in `data.ts`)
`MAX_ROUNDS` (game length — primary lever for the 1h target, est. ~20–24), `SALARY` /
`SALARY_UNDERDOG`, opening stack (25k, set at grant not in data.ts — note in wallet),
`UPGRADE_COST_RATIO`, `SET_BONUS_NW`, `GST_RATE`/`GST_CAP`, `TAX_INCOME`, `SETS_TO_END`
(raise to 4 to delay early-close if games end too fast).

**Process:** harness → read metrics → adjust `data.ts` → re-run → converge. Commit the
harness + the tuned `data.ts` + a `docs/.../vyapaar-balance-report.md` (the before/after
tables). **Do not** hand-guess constants without a harness run behind them.

> ⚠ Changing `data.ts` constants (esp. `MAX_ROUNDS`) affects **new matches only**. A
> match in flight replays via `actionLog` + these constants; never change them while a
> real match is unsettled. Ship when no active matches (or gate behind a match-version).

**M5b done:** harness committed + runnable, `data.ts` tuned against real metrics, balance
report committed, rulebook’s round/length numbers updated to match, engine tests still green.

---

## Slice M5c — Leaderboard

Make results stick. Reuse the games leaderboard pattern (`src/modules/games/leaderboard.ts`,
`champions.ts`) — do not invent a new one. Stats already on `User`
(`vyapaarGamesPlayed`/`Wins`/`BestNetWorth`, written at settlement in M3a).

- `src/modules/vyapaar/leaderboard.ts`: top-N by wins (tiebreak best-net-worth), plus
  win-rate for players past a min-games floor (e.g. ≥5, avoids 1-game 100%).
- Page at `/games/vyapaar/leaderboard` (standard `max-w-[1400px]` list) + a link from the
  Vyapaar hub. Server component, Prisma read, no new mutation.
- Optional (only if cheap): a per-match result card at game end linking to the board.
- Test: leaderboard query ranking + the min-games floor (unit, seeded rows).

**M5c done:** leaderboard module + page + hub link, ranking test green, tsc + build.

---

## Sequencing
**M5a (hardening) → M5b (balance) → M5c (leaderboard).** M5a first: it protects the live
game and is pure-additive/low-risk. M5b is the biggest (new harness) and answers the
game-length question. M5c is additive polish. Each is its own plan + PR.

## Out of scope (post-M5)
Spectator mode, match history/replay UI, in-game chat, achievements/badges, INR coin store
(scrapped by owner decision), matchmaking/ELO.
