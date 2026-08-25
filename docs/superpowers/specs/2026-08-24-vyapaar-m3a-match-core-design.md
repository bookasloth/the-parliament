# Vyapaar M3a — Match Core — Design

**Date:** 2026-08-24
**Status:** Approved for planning
**Parent design:** `docs/superpowers/specs/2026-08-23-vyapaar-multiplayer-design.md` (§2 models, §3 authoritative server, §6 wallet lifecycle). Engine (PR #351), M1 wallet (#352), M2 rooms (#353) are merged.

**Goal:** Wire the ported engine to the server — start a match from a room (per-player wallet snapshot, one-active-match rule), apply intents through an **authoritative** RPC (engine over HTTP, seat derived from auth), persist state + action log on every intent, and **settle wallets** at game-over. Fully integration-testable with no UI. Realtime + board UI = M3b; turn timer = M3c.

## Scope

**In:** `VyapaarMatch` + `VyapaarMatchPlayer` models; `User` stat fields; a small additive `createGame` extension (per-player opening cash); `startMatch`; the intent RPC route + persistence; game-over settlement; migration + RLS; integration tests (incl. a replay/determinism test over stored inputs).

**Out:** realtime broadcast + the board UI + host Start button + pending-trade delivery (M3b); `turnExpiresAt` timer + auto-resolve cron (M3c — the column is added now but stays null); anything the engine already does.

## Engine change (additive, backward-compatible)

`createGame(seed, names, openingCash: number | number[] = START_CASH)`. When `openingCash` is an array (length must equal `names.length`), player `i` starts with `openingCash[i]`; a `number` keeps today's uniform behavior. This keeps wallet-mode's per-player opening stacks **inside** the deterministic inputs, so the replay guarantee becomes `(seed, names, openingCash[], action-log)`. Existing `createGame` callers/tests (number) are unaffected. Update the engine unit test to cover the array form.

## Data model (Prisma)

- **`VyapaarMatch`** — `id` (uuid), `roomId → VyapaarRoom` (onDelete Cascade), `seed BigInt`, `state Json` (full engine `GameState`, incl. server-only rng/deck), `actionLog Json @default("[]")` (array of `{ seat, intent }`), `status` (`"active" | "over"`, default `"active"`), `activeSeat Int @default(0)`, `turnExpiresAt DateTime?` (M3c — null this milestone), `winnerSeat Int?`, `createdAt`, `endedAt DateTime?`. `@@index([roomId, status])`, `@@index([status])` (M3c cron). `@@map("vyapaar_match")`.
- **`VyapaarMatchPlayer`** — `matchId → VyapaarMatch` (Cascade), `userId → User`, `seat Int` (engine seat 0..n-1), `openingCash Int`, `resultCash Int?`, `placement Int?`. `@@id([matchId, seat])`, `@@unique([matchId, userId])`, `@@map("vyapaar_match_player")`.
- **`User`** += `vyapaarGamesPlayed Int @default(0)`, `vyapaarWins Int @default(0)`, `vyapaarBestNetWorth Int @default(0)` (+ the `vyapaarMatchPlayers`/`vyapaarMatchesRoom?` relations as needed). These are the stat fields M1 deferred "to the settlement wire" — they land here.
- Migration DDL + `supabase/vyapaar-match-rls.sql` (match/player rows readable by their players; writes server-only) delivered as SQL, repo convention (gen_random_uuid()/now()).

## `startMatch(userId, roomId)` — `src/modules/vyapaar/match.ts`

One `$transaction`:
1. Load the room + members. Reject unless caller is the **host** (`ForbiddenError`), room `status === "open"`, and `2 ≤ members ≤ 6`.
2. **One-active-match rule:** for every member, verify no `VyapaarMatchPlayer` in an `active` match. If any is busy, `ForbiddenError` naming them ("X is already in a game"). This is the double-spend guard (a wallet can't back two games).
3. **Wallet snapshot (no deduction):** `ensureVyapaarEnrollment` each member; `openingCash[i] = member.vyapaarWallet` (read now). The wallet is **not** debited at start — it's snapshotted; settlement sets it to the final cash at game-over.
4. **Contiguous seats:** order members by their room seat, assign engine seats `0..n-1`; `names[i] = displayName || legalName`.
5. `seed = crypto.randomInt(2**31)` (server; not the deterministic engine RNG); `state = createGame(seed, names, openingCash)`.
6. Create `VyapaarMatch` (`state`, `actionLog: []`, `activeSeat: 0`, `status: "active"`) + one `VyapaarMatchPlayer` per seat (`userId`, `seat`, `openingCash`); set `room.status = "in_game"`.
7. Return `{ matchId }`.

## Intent RPC — `POST /api/vyapaar/[matchId]/intent` (Node runtime)

Body: `{ intent: Intent }`.
1. `requireUser`; load the `active` match (404 if missing/over).
2. Map `user.id → seat` via `VyapaarMatchPlayer` (403 `not_a_player` if none). **Seat is derived server-side; any client-supplied seat is ignored.**
3. Light shape/bounds validation of `intent` (type in the known set; numeric fields finite) before the engine; the engine does the authoritative rule validation.
4. Rate-limit per user (reuse the existing limiter if present; otherwise a simple per-user token bucket — note if deferred).
5. Rehydrate `state` from `match.state`; `applyIntent(state, seat, intent)`. On `{ error }` → `400 { error }` (no mutation). On success, in one `$transaction`: persist `state` (Json) + append `{ seat, intent }` to `actionLog` + `activeSeat = state.active`.
6. **If `state.ended`** → settle in the same transaction (see below), set `match.status = "over"`, `winnerSeat = state.winner`, `endedAt = now`, `room.status = "open"` (reusable for a rematch).
7. Return `publicView(state, seat)` for the caller (the private per-seat projection). (Other players get it via realtime in M3b; until then, a client would poll `GET` — a read endpoint may be added in M3b.)

## Settlement (game-over, in the same transaction)

For each player seat: `resultCash = state.players[seat].cash`; `placement` by descending `score` (engine's `scoreOf`, tiebreak controlled sets — reuse the engine's ranking). Then per player:
- `VyapaarMatchPlayer.resultCash = resultCash`, `.placement = placement`.
- `User.vyapaarWallet = resultCash` (**set**, snapshot/settle — not increment); write `VyapaarLedger { delta: resultCash - openingCash, reason: "game_settlement", refId: matchId }`.
- Stats: `vyapaarGamesPlayed += 1`; `vyapaarWins += 1` if this seat is `state.winner`; `vyapaarBestNetWorth = max(current, netWorth(state, seat))`.

**Invariant preserved:** before settlement `wallet == Σledger == openingCash`; setting `wallet = resultCash` and appending a `game_settlement` delta of `resultCash - openingCash` keeps `wallet == Σledger`. Since the wallet was never debited at start, no double-spend occurs and the one-active-match rule prevents a second concurrent stake.

## Determinism / resume

The match is fully reproducible from `(seed, names, openingCash[], actionLog)`: `createGame(seed, names, openingCash) + fold actionLog through applyIntent` must equal the stored `state`. This powers crash-resume and audit. An integration test asserts it.

## Security / RLS (`supabase/vyapaar-match-rls.sql`, manual apply)

- All mutations server-side; seat derived from auth; no client writes.
- `vyapaar_match` / `vyapaar_match_player`: a user may `SELECT` rows for matches they are a player in (mirror the rooms RLS `EXISTS`-on-membership idiom via `vyapaar_match_player`). No client write policies. (`state` Json contains server-only fields — but reads go through the server's `publicView`, not supabase-js, so RLS here is belt-and-suspenders; never expose raw `state` to clients.)

## Testing (integration against local `*_test` DB; unit for the engine change)

- **Engine unit:** `createGame` with a per-player `openingCash[]` sets each player's cash; number form unchanged; length-mismatch guarded.
- **startMatch:** host-only; `<2`/`>6` rejected; wallet snapshot into `openingCash`; contiguous seats from room order; room → `in_game`; one-active-match guard rejects when a member is already in an active match (naming them).
- **Intent RPC (call the handler / the `match.ts` apply function directly):** seat derived from the authed user (a different user's id can't act on another seat); non-player rejected; an illegal intent returns the engine's error and does not mutate; a legal intent persists `state` + appends to `actionLog` + advances `activeSeat`.
- **Full game → settlement:** drive a short game to `over`; assert each `wallet == resultCash`, a `game_settlement` ledger row with `delta = resultCash - openingCash`, `wallet == Σledger` still holds, stats updated (gamesPlayed/wins/bestNetWorth), `match.status = "over"`, `room.status = "open"`.
- **Replay:** `createGame(seed, names, openingCash) + fold(actionLog)` deep-equals the stored `state`.

## Acceptance

A host starts a match from an open room with ≥2 members (each member's wallet snapshotted as their opening stack, room → in_game, a member already in a game blocks the start); players act via the intent RPC (seat enforced from auth, illegal moves rejected by the engine, state + log persisted each move); on game-over every wallet is set to that player's final cash with a matching `game_settlement` ledger row (invariant intact) and stats updated, and the room reopens. No realtime, no board UI, no turn timer yet.
