# Vyapaar — Full Audit Plan

**Date:** 2026-08-25 · **Scope:** Vyapaar subsystem only · **Dimensions:** Security ·
Correctness/bugs · Code quality · Performance · **Status:** PLAN — awaiting go before any
audit runs.

Vyapaar is live in prod (engine → M1 wallet → M2 rooms → M3a/b/c match+realtime+timer →
M5a hardening). This audits the whole subsystem end-to-end against the four dimensions and
produces a ranked findings report. It does **not** change code — findings become follow-up
tasks you triage.

---

## 1. Surface under audit (what's in the product)

**Pure engine** (`src/modules/vyapaar/engine/`, ~1050 LOC, deterministic, DB-free)
`engine.ts` (applyIntent FSM, 10 intents, 453) · `helpers.ts` (rent/networth/charge/liquidate,
130) · `data.ts` (economy constants, 129) · `state.ts` (createGame, 123) · `cards.ts` (108) ·
`board.ts` (70) · `view.ts` (seat-tailored publicView, 59) · `rng.ts` (mulberry32, 22) ·
`replay.ts` (16).

**Server / trust boundary** (`src/modules/vyapaar/`)
`match.ts` (start, applyMatchIntent RPC, settlement, autoResolveExpiredTurns, 237) ·
`rooms.ts` (create/join/leave/lobby, 135) · `wallet.ts` (grant, top-up, 78) +
`wallet-logic.ts` · `rooms-logic.ts` · server actions (`match-actions`, `rooms-actions`,
`wallet-actions`).

**API routes** (`src/app/api/vyapaar/`)
`[matchId]/intent` (authoritative write, 78) · `[matchId]/view` (read, 24) ·
`cron/timeouts` (bearer-guarded auto-resolve, 16).

**Client** (`src/components/vyapaar/`, 8 files, 360 LOC) — MatchBoard (189) + room/wallet UI.
**Pages** — hub, room `[code]`, match `[matchId]`.
**Config** — `vyapaar-coins.ts`, `vyapaar-match.ts`, `vyapaar-rooms.ts`.
**DB security** — 6 SQL files (wallet/rooms/match/realtime RLS, cron, m5 column-revoke).
**Tests** — 15 files (unit + integration).

### Trust boundaries (the audit's spine)
1. **Client → intent route**: every move re-validated server-side by `applyIntent` under a
   per-match `FOR UPDATE` lock. Client is untrusted.
2. **publicView**: the ONLY state a client may see; must not leak `seed`/`rng`/deck order or
   opponents' hidden info. (Column-revoke closed the raw-supabase-js path; view is the app path.)
3. **Wallet ↔ coins**: shells→coins one-way; opening-cash snapshot; settlement increments.
   Money invariants must hold under concurrency.
4. **Cron**: bearer-guarded; auto-resolve must equal what a live player action would produce
   (replay-safe).

---

## 2. Methodology

Four review passes, one per dimension, each scoped to the surface above and run as a
**parallel review agent** (Agent tool, not the whole-repo reviewer — Vyapaar-scoped). Each
returns structured findings; I then **adversarially verify** each finding (confirm the failure
path actually reaches the sink, not a false positive) and **dedupe/rank** before writing the
report. No finding ships unverified.

**Severity:** Critical (money loss / cheat / data corruption / auth bypass) · High (exploitable
but bounded, or a real correctness bug) · Medium (edge-case bug, missing guard, perf cliff) ·
Low (quality, style, minor). Each finding: `severity · file:line · what · failure scenario ·
fix · confidence`.

**Output:** `docs/superpowers/audits/2026-08-25-vyapaar-audit-report.md` — ranked table +
per-finding detail, plus a one-line verdict per dimension. I will NOT fix anything in the audit
run; you triage which findings become tasks/PRs.

---

## 3. Per-dimension checklists (concrete, mapped to files)

### A. Security
- **Authz on every entry point**: `intent`/`view` routes + all server actions call
  `requireUser`; match/room membership enforced before act; no IDOR (acting as another seat,
  reading another match/room, `matchId`/`roomId` from the client trusted only after an
  ownership check).
- **Out-of-turn / seat spoofing**: `applyMatchIntent` maps `userId`→seat server-side, never
  trusts a client-supplied seat. `ACTIVE_ONLY` enforced.
- **Info leaks**: `publicView` (view.ts) hides `seed`/`rng`/decks/opponent cash-hidden fields;
  cron & broadcast payloads leak nothing; re-verify the M5a column-revoke matches every
  server read path (nothing reads `state` via supabase-js).
- **Cron auth**: `isAuthorizedCron` constant-time compare; `CRON_SECRET` unset → fail-closed;
  no secret in logs.
- **Rate-limit**: intent/start/topup limits present; fail-open is acceptable *only* for
  play-money (confirm no security-critical path relies on it).
- **RLS**: re-read all 6 SQL files vs the Prisma schema — every table RLS-enabled, no client
  INSERT/UPDATE/DELETE policy, SELECT scoped; realtime topic gate correct.
- **Injection**: the raw `$executeRaw`/`$queryRaw` in match.ts use parameterization (no string
  interpolation of ids); room code generation not guessable/enumerable at scale.
- **Money authz**: top-up can't be driven for another user; settlement can't be triggered by a
  client; no negative/overflow amounts.

### B. Correctness / bugs
- **Money math**: `charge`/`liquidate`/settlement — no rounding drift, no double-credit, no
  negative cash; opening-cash snapshot vs live top-up interaction; settlement increment is
  idempotent (can't double-settle on retry/replay).
- **Concurrency/TOCTOU**: `FOR UPDATE` covers the whole read-modify-write in
  applyMatchIntent, startMatch, autoResolve; the M5a residuals stay closed; two intents / an
  intent racing the cron on the same match can't double-apply.
- **Turn-timer**: `turnExpiresAt` set/cleared on every branch (roll, buy, auction, manage,
  ended); auto-resolve loops a whole turn and can't infinite-loop or diverge from a live move;
  stale-guard correct.
- **Engine edge cases**: auction ties / all-pass / 0-cash bids; trade re-validation on accept;
  jail 3-doubles + break-out; bankruptcy-forgiveness never overdraws; deck reshuffle;
  MAX_ROUNDS / 3-set end conditions fire exactly once; `winnerOf` tiebreak.
- **State machine**: no phase can deadlock the timer can't resolve (property test asserts
  termination — confirm it covers auction/trade phases).
- **Replay determinism**: rebuild equals live for all paths incl. cron auto-resolve.
- **Error handling**: route error funnel returns correct codes; ForbiddenError vs 500; no
  unhandled rejection strands a match locked.

### C. Code quality
- Dead/unused code (e.g. `freeUpgrades` credit that's "kept for audit"); duplicated logic
  (rank/winner unified? rent modifiers in one place?); config drift (CLAUDE.md claims vs
  reality); over-engineering vs YAGNI.
- Test coverage gaps on money/authz/timer paths; any logic branch with no test.
- Naming/consistency with the rest of the codebase; magic numbers not in `data.ts`/config.

### D. Performance
- **Query shape**: N+1 in match/room reads; `applyMatchIntent`/`getMatchView` select only
  needed columns; settlement writes batched; no unbounded `findMany`.
- **Lock hold time**: the `FOR UPDATE` critical section does no network/CPU-heavy work while
  holding the row lock (settlement's ~24-query loop already got `timeout:15000` — confirm it's
  not pathological at 6 players).
- **Cron cost**: `autoResolveExpiredTurns` `due` query is indexed on `(status, turnExpiresAt)`;
  the 10s tick can't pile up; realtime broadcasts aren't chatty.
- **Client**: MatchBoard refetch-on-every-broadcast is O(1) per event, not a fan-out storm;
  no render-time writes.

---

## 4. Out of scope
Balance tuning (that's M5b — this audit only flags *broken* economy math, not un-fun numbers),
leaderboard (M5c, not built), the shared platform (auth/payments/feed/etc. — Vyapaar only),
and any code changes (audit reports; it does not fix).

---

## 5. On approval
On your go I run the four verified passes and deliver
`docs/superpowers/audits/2026-08-25-vyapaar-audit-report.md`. Est. a handful of parallel
agents; findings ranked, each with a concrete fix. Then you decide what becomes work.
