# Vyapaar M3b — Realtime + Board — Design

**Date:** 2026-08-24
**Status:** Approved for planning
**Parent:** `docs/superpowers/specs/2026-08-23-vyapaar-multiplayer-design.md` (§3 server, §4 realtime, §8 UI). Engine (#351), M1 (#352), M2 (#353), M3a (#354) merged.

**Goal:** Make Vyapaar actually playable in the browser — a host starts a match from a room, all players land on a live board, act through the M3a intent RPC, and see each other's moves in real time. Plus the required pre-wiring safety fixes carried from M3a. No turn timer (M3c); no visual-polish board (later).

## Scope

**In:** the three required pre-wiring fixes; realtime plumbing (generic `broadcastToTopic` + `matchTopic`, a broadcast-nudge on each committed intent, a vyapaar realtime-token action); a per-seat `GET view` endpoint; a host **Start** action + button; the match **board route** + a functional `MatchBoard` client covering **all 10 intents**; an "Enter game" link on the room page for non-host members.

**Out:** turn timer / auto-resolve (M3c); a polished visual board (later); spectators; rematch flow beyond the room reopening.

## Decisions

1. **Realtime = broadcast-nudge + per-seat GET view.** On each committed intent, broadcast a lightweight `"state"` nudge to the match channel; every client refetches `GET /api/vyapaar/[matchId]/view`, which returns `publicView(state, seat)` tailored to the requester (including their pending trade). Reconnect/initial-load = the same fetch. Mirrors the messaging pattern; keeps pending-trade privacy server-side.
2. **Functional board, all 10 intents, utilitarian styling.** Render state + controls for every intent; a real 40-tile visual board is a later pass.

## Required pre-wiring fixes (must land before the Start button is reachable)

1. **`startMatch` one-active-match TOCTOU** (`match.ts`): wrap the whole operation in one interactive `$transaction` that first locks the participating users' rows — `SELECT id FROM users WHERE id IN (...) ORDER BY id FOR UPDATE` (sorted to avoid deadlock) — then re-checks the one-active-match guard **and** room status **inside** the transaction, then creates. This serializes any concurrent starts that share a member (not just same-room), closing the double-book race.
2. **Top-up during an active match** (`wallet.ts` `topUpVyapaarCoins`): reject with `ForbiddenError("You're in a game — finish it before buying coins")` if the user has a `VyapaarMatchPlayer` row in an `active` match. (Settlement-by-increment already makes it invariant-safe; this is the clearer "stake is locked" semantics + defense-in-depth.)
3. **Unify the rankers**: export `rankSeats(state): number[]` (best-first: score desc → controlledSets desc → seat asc) from the engine; make `winnerOf` return `rankSeats(state)[0]`, and have `match.ts` `settleMatch` import the engine's `rankSeats` for `placement` — one source of truth so winner and placement #1 can never desync.

## Realtime plumbing

- **`src/lib/supabase-realtime.ts`:** add `matchTopic(matchId) = "vyapaar-match:" + matchId` and export a generic `broadcastToTopic(topic, event, payload)` (the same `after()`/best-effort wrapper `broadcast` uses, calling the existing private `postToTopic`). Refactor `broadcast` to delegate to it (`broadcastToTopic(conversationTopic(id), …)`) — no behavior change.
- **`applyMatchIntent`** (`match.ts`): after the transaction commits, `broadcastToTopic(matchTopic(matchId), "state", { activeSeat: r.state.active, ended: r.state.ended })` — a nudge, not the state. Best-effort (never fails the move).
- **`realtimeTokenAction`** for vyapaar: a `"use server"` action returning `{ token: signRealtimeToken(user.id), userId }` (mirror `messages/actions.ts`; put it in `src/modules/vyapaar/match-actions.ts` or reuse the messaging one).

## Endpoints & actions

- **`GET /api/vyapaar/[matchId]/view`** (Node): `requireUser` → seat via `VyapaarMatchPlayer` → `publicView(state, seat)` (seat-tailored, includes the caller's pending trade). 401/403 (`not_a_player`)/404 (`Match not found`)/200 mapping like the intent route (reuse `handleError` for auth). Serves initial load, reconnect, and post-nudge refetch.
- **`startMatchAction(roomId)`** (`"use server"`): `requireUser` → `startMatch(user.id, roomId)` → `redirect("/games/vyapaar/matches/" + matchId)`; map `ForbiddenError` for the button to surface (host-only / <2 players / member busy).
- The intent RPC (`POST …/intent`) is unchanged from M3a.

## UI

- **`src/app/(main)/games/vyapaar/matches/[matchId]/page.tsx`** (server, `force-dynamic`, `requireUser`): verify the caller is a player (`getRoom`-style; else `notFound`/redirect to the room); fetch the initial `publicView`; render `<MatchBoard matchId view you={seat} />`.
- **`src/components/vyapaar/MatchBoard.tsx`** (client): on mount, call `realtimeTokenAction`, `supabase.realtime.setAuth(token)`, subscribe to `matchTopic` (private channel), and on a `"state"` event refetch `GET view` (also an initial fetch + a manual "refresh"); render:
  - **State readout:** each player's seat/name/cash/position/net-worth/score, whose turn it is, pot, round, phase, cards-left.
  - **Board/ownership:** a simple list of the 40 tiles (or 25 cities + 4 hubs) with owner/level/mortgaged; your own cities flagged.
  - **Phase controls (only when it's your turn, except bid/trade):** `roll`; `buy`/`decline` (when on a buyable tile); an **auction bid** input (any seat, when phase=auction and you haven't bid); `develop`/`mortgage`/`unmortgage` on your cities (manage phases); `end_turn`; a **trade** panel — propose (pick a recipient seat, your cities to give + cash, their cities to get + cash) and, when you're the recipient of a pending trade, **accept/decline**. Each control POSTs the intent, shows the returned error inline on failure.
- **Room page** (`rooms/[code]/page.tsx`): add a host **Start game** button (visible to the host when `room.status==="open"` and members ≥2) wired to `startMatchAction`; and for everyone, when `room.status==="in_game"`, an **Enter game** link to the active match's board. (Auto-redirect via a room-channel nudge is a nice-to-have, not required — members can click Enter.)

## Testing

- **Fixes (integration):** `startMatch` — a second start sharing a member fails (the guard now holds under the locking tx; assert sequentially since deterministic concurrency is hard, plus verify the lock path exists); `topUpVyapaarCoins` throws when the user is in an active match; `rankSeats` unit test (engine) — order + `winnerOf===rankSeats[0]`, incl. a genuine score-tie broken by controlledSets.
- **GET view (integration):** returns the caller's seat-tailored `publicView`; a non-player gets 403; includes the recipient's pending trade but not others'.
- **startMatchAction:** creates the match + redirects (or surfaces ForbiddenError).
- **Realtime helpers (unit):** `matchTopic` string; `broadcastToTopic` delegation (broadcast still targets the conversation topic — no regression).
- **Board client:** build-verified (tsc + `next build`); extract any pure helper (e.g. deriving available actions from a publicView) for a unit test. Full click-through is manual (auth-gated, realtime).

## Acceptance

A host clicks **Start** in a room with ≥2 members → all members reach the board (host redirected; others via Enter) → players roll/buy/decline/bid/develop/mortgage/trade/end-turn through the intent RPC, and each committed move nudges every client to refetch and re-render within ~a second → at game-over wallets settle (M3a) and the room reopens. Concurrent double-starts sharing a member are rejected; top-ups are blocked during a match; winner and placement #1 always agree. No turn timer yet.
