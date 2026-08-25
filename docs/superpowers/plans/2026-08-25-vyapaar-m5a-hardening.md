# Vyapaar M5a — Hardening (implementation plan)

Spec: `docs/superpowers/specs/2026-08-25-vyapaar-m5-design.md` · Branch: `feat/vyapaar-m5`.
No schema change. Reuses `enforceRateLimit` (`src/lib/rate-limit.ts`).

### Task 1 — Anti-cheat property tests (pure engine, DB-free) — do first, highest value
New `tests/vyapaar/anti-cheat.test.ts`. Seeded fuzz driver (independent mulberry32, not the
engine rng) picks random *legal-ish* intents over N=300 games, 3–5 players. Assert per step:
- Out-of-turn `ACTIVE_ONLY` intent from a non-active seat → `{error}`, state byte-unchanged.
- Every cash delta is accounted: Σ over players of Δcash + Δpot equals the net of the step's
  emitted event amounts (transfers net 0; buy/develop/unmortgage are bank sinks;
  salary/cash/cashAll/mortgage/Mandi are sources). No unexplained movement.
- No player cash < 0 after any step.
- Bounded: every game reaches `ended` within `MAX_ROUNDS+1` round-wraps of forced auto-play.
- Replay: `rebuildMatchState`-equivalent (re-`applyIntent` the recorded log from a fresh
  `createGame`) byte-equals the live state, ≥200 games.

### Task 2 — Rate-limit the three write paths (fail-open)
- `intent/route.ts`: before `applyMatchIntent`, `try { enforceRateLimit({bucket:"vyapaar:intent",
  identifier:user.id, limit:30, windowSec:10}) } catch RateLimitedError → 429 {error:"rate_limited"};
  catch other → log + continue` (fail-open; availability > flood-block for play-money).
- `match-actions.ts startMatchAction`: same wrapper, `bucket:"vyapaar:start", 10/60s` → return
  `{ok:false,error:"rate_limited"}`.
- `wallet.ts topUpVyapaarCoins`: same wrapper, `bucket:"vyapaar:topup", 10/60s` → throw
  `ForbiddenError("Too many attempts — try again shortly")`.
- `// ponytail:` note the fail-open + why on each. No dedicated test for the try/catch glue
  (enforceRateLimit is already tested; wrapper is trivial).

### Task 3 — Residual regression test  ✅ already covered — no new code
Both guards already have integration coverage; duplicating them would be waste:
- topUp-during-active-match rejection → `tests/integration/vyapaar-wallet.itest.ts:72`
  ("blocks a coin top-up while the user is in an active match").
- `startMatch` one-active-match guard → `tests/integration/vyapaar-match-start.itest.ts:58`
  (asserts `/already in a game/i`).
- True parallel-tx race test deliberately skipped — the `FOR UPDATE` guard is the real
  protection; a deterministic race test isn't worth the flakiness. `// ponytail:` noted.

### Task 4 — RLS audit  ✅ done — one gap found + closed

**Audited** all 5 tables + realtime. Writes: every table has RLS enabled with **no**
INSERT/UPDATE/DELETE policy → non-owner roles default-deny; only Prisma's owner role
(bypasses RLS) mutates. Reads: `vyapaar_match_player`, `vyapaar_ledger`,
`vyapaar_room_member` are participant/self-scoped; `vyapaar_room` public-SELECT is limited
to `open`+`public` (intentional lobby discovery); realtime `messages` gated to match
players. All correct.

**GAP FOUND (hidden-information leak):** the `vyapaar_match` row-SELECT policy lets a
player read the row's `seed`/`state`/`action_log` columns via raw supabase-js. `seed`
deterministically generates every future die + card draw → a player could precompute the
whole game. The app never reads these via supabase-js (MatchBoard uses the server
`/view` + realtime subscribe only), so **column-revoking** them from `anon`/`authenticated`
closes it with zero app impact. Shipped `supabase/vyapaar-m5-rls-audit.sql` (owner applies
manually on prod). Row SELECT stays intact so the realtime EXISTS gate still resolves.

### Gate
tsc + build + `npm test` green → commit per task → PR when CI green (user merges).
