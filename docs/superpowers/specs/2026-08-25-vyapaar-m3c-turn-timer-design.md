# Vyapaar M3c — Turn Timer — Design

**Date:** 2026-08-25
**Status:** Approved for planning
**Parent:** `docs/superpowers/specs/2026-08-23-vyapaar-multiplayer-design.md` (§5 turn timeout). Engine (#351), M1 (#352), M2 (#353), M3a (#354), M3b (#360) merged — the game is playable live.

**Goal:** Stop AFK/disconnected players from stalling a match. Each turn gets a ~30s deadline; a serverless cron (Supabase pg_cron + pg_net) hits an auto-resolve route that plays the minimal-legal move for any expired turn, so the game always progresses. Clients show a live countdown.

## Scope

**In:** set `turnExpiresAt` on every turn advance; expose a pure `nextAutoIntent` from the engine; a `commitMatchState` helper shared by the intent path and the cron; the `/api/vyapaar/cron/timeouts` auto-resolve route; the pg_cron + pg_net SQL (delivered to apply); plumb `turnExpiresAt` to the client + a countdown in `MatchBoard`; tests.

**Out:** anything else — this is the last M3 slice. Balance/harden/leaderboard = M5.

## Decisions

1. **`TURN_SECONDS = 30`** (design; tunable in one config const). **`turnExpiresAt` resets on every committed intent** that leaves the match active (simple: any activity gives the next required action a fresh 30s; on `ended`, set null). `startMatch` sets the first turn's deadline.
2. **The cron resolves a whole stuck turn per run** (loop the minimal-legal step until the active seat changes or the game ends), so a 10s tick doesn't drip one step per tick.
3. **Auto-resolved intents are appended to `actionLog`** (via `nextAutoIntent` → `applyIntent`), preserving the `(seed, names, openingCash, actionLog)` replay guarantee — the cron must not diverge stored state from a rebuild.
4. **pg_cron + pg_net**, not a Vercel/GitHub cron — sub-minute granularity is needed and Vercel Hobby can't do sub-daily.

## Engine change (additive)

Export `nextAutoIntent(state): { seat: number; intent: Intent } | null` — the minimal-legal step for a stuck position (roll in `roll`; decline in `buy`; the first not-yet-bid seat bids `0` in `auction`; `end_turn` in `manage`; `null` if `ended`). This is exactly what `autoResolve` already computes internally; refactor `autoResolve` to use it (`autoResolve` stays for the engine's own tests). Exposing the intent (not just the resulting state) lets the cron record it in `actionLog`.

## Server

- **`TURN_SECONDS`** in `src/config/vyapaar-coins.ts` or a small `src/config/vyapaar-match.ts` (const). `turnExpiresAtFor(state, now)` helper: `state.ended ? null : new Date(now + TURN_SECONDS*1000)`.
- **`commitMatchState(tx, match, state, appendedLog)`** in `match.ts` — the shared persist+settle used by BOTH `applyMatchIntent` and the cron: update `state`/`actionLog`(existing+appended)/`activeSeat`/`turnExpiresAt`(= turnExpiresAtFor); on `state.ended` set status "over"/winnerSeat/endedAt, `settleMatch`, reopen room. Refactor `applyMatchIntent` to call it (appendedLog = `[{seat, intent}]`); no behavior change beyond now also writing `turnExpiresAt`.
- **`startMatch`**: set `turnExpiresAt = turnExpiresAtFor(state, Date.now())` on the created match.
- **`autoResolveExpiredTurns(now): Promise<number>`** in `match.ts` — find `active` matches with `turnExpiresAt <= now` (indexed by `status`); for each, in a `$transaction` with the match row `SELECT … FOR UPDATE`: re-read; **stale guard** — skip if not active or `turnExpiresAt > now` (a real move already advanced it); then loop `nextAutoIntent(state)` → `applyIntent` (collecting the applied `{seat,intent}` into `appendedLog`) until the active seat changes or `ended` or a safety cap (e.g. 40 steps); `commitMatchState(tx, match, state, appendedLog)`; after commit, `broadcastToTopic(matchTopic(id), "state", {activeSeat, ended})`. Returns the count resolved.
- **`GET /api/vyapaar/cron/timeouts`** (Node): `isAuthorizedCron(header, CRON_SECRET)` → 401; else `autoResolveExpiredTurns(new Date())` → `{ ok, resolved }`. (GET so pg_net/Vercel-style callers work; guarded by the bearer secret.)

## Client

- `getMatchView` and `applyMatchIntent` return `turnExpiresAt` alongside the view (read from the match row). The `GET view` route and the intent POST include it in their JSON.
- `MatchBoard`: derive a countdown from `turnExpiresAt` (a 1s `setInterval` showing seconds remaining for the active seat; when ≤0 show "resolving…"). On the `"state"` nudge refetch it updates. Purely display — the server is authoritative; the cron does the actual resolve.

## pg_cron + pg_net SQL (delivered, applied on prod)

Delivered as `supabase/vyapaar-turn-timer-cron.sql` (run manually): `create extension if not exists pg_cron; create extension if not exists pg_net;` then `cron.schedule('vyapaar-turn-timeouts', '10 seconds', $$ select net.http_post(url := '<AUTH_URL>/api/vyapaar/cron/timeouts', headers := jsonb_build_object('Authorization', 'Bearer <CRON_SECRET>')) $$);`. The doc instructs the user to substitute their prod `AUTH_URL` + `CRON_SECRET`. (Send-side runs as the DB/cron; the route is bearer-guarded.)

## Testing

- **Engine unit:** `nextAutoIntent` returns the right step per phase (roll/buy→decline/auction→first-unbid-bid-0/manage→end_turn/ended→null); `autoResolve` still behaves (refactor is equivalence-preserving).
- **Integration:** `turnExpiresAt` is set on start + after an intent (active) and null on game-over; `autoResolveExpiredTurns` — an expired match advances (active seat changes / turn auto-played), a non-expired match is untouched (stale guard), the appended auto-intents keep `rebuildMatchState` equal to stored state (replay determinism through auto-resolve), and an auto-resolve that ends the game settles wallets (invariant holds) + reopens the room.
- **Cron route:** 401 without the bearer secret; resolves + returns a count with it.

## Acceptance

An active player who doesn't move within ~30s has their turn auto-played by the cron (roll → decline any buy → bid 0 in auctions → end turn), so the match never stalls; a player who does move resets their clock and is never auto-resolved (stale guard); auto-resolved turns are in `actionLog` so replay still reproduces state exactly; a game that auto-resolves to completion settles wallets and reopens the room; clients see a live countdown. pg_cron drives it every ~10s.
