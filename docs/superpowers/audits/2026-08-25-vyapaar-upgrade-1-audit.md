# Vyapaar Upgrade 1 — Audit & Phased Plan

Branch: `feat/vyapaar-upgrade-1`. Date: 2026-08-25.
Scope: 6 gameplay features (rent-collect, card-to-card trade, sell-to-bank, player-leave, collections, comeback) + a gameplay-flow/perf pass — on the **existing** engine, no rewrite.

> Terminology reconciliation: the feature brief says **"cards"** for tradeable property tokens. The engine has **no "cards" = properties** concept. Property tokens are **cities** (`CityState`, `cityId`) plus **companies** (`companyIndex`). Chance/community "cards" in code are the HEADLINE/UPI decks only. **Throughout this plan "card" (property) == `city`.** Companies are a separate token class (utility/railroad analog).

---

## 1. Current Architecture

**Engine** (`src/modules/vyapaar/engine/`) — pure, deterministic, framework-free. Single `GameState` (`state.ts:53-75`): `players[]`, `cities[25]`, `companies[6]`, `pot`, `active`, `phase`, `pendingCity`, `pendingCompany`, `auction`, `trade` (single slot), decks, `log`. Ownership stored **on the tile** (`CityState.owner`), not on the player. Money helpers: `credit` / `charge` (atomic transfer w/ auto-liquidation, `helpers.ts:80-134`). Rent single source of truth `rentFor` (`helpers.ts:37-48`); valuation single source of truth `netWorth` (`helpers.ts:62-73`). Intents applied by `applyIntent` (`engine.ts:231`) returning `{state,events} | {error}`.

**Server** (`src/modules/vyapaar/match.ts`) — `applyMatchIntent`: `requireUser` → map user→seat server-side (client seat ignored) → `validIntentShape` crash-guard → **`$transaction` + raw `SELECT … FOR UPDATE` on the match row** → `applyIntent` → `commitMatchState` (writes full `state` JSON blob + appends `{seat,intent}` to `actionLog`, stamps `activeSeat`/`turnExpiresAt`) → best-effort realtime broadcast. State is one JSON column; deterministic replay from `(seed, names, actionLog)`.

**Concurrency/atomicity** = the pessimistic `FOR UPDATE` row lock (`match.ts:177-181`). **No version column, no optimistic lock, no request-id idempotency.** Duplicate-click safety is *structural*: the lock serializes, and engine phase/pending guards make a replayed intent a no-op error (2nd `roll` → `cannot_roll_now`, 2nd `respond_trade` → `no_trade`, etc.).

**Turn timer** = Supabase `pg_cron` (~10s) → `POST /api/vyapaar/cron/timeouts` → `autoResolveExpiredTurns` → same `FOR UPDATE` lock + stale-guard re-check + loop `nextAutoIntent(state)` until seat changes/ended (`match.ts:212-251`, `engine.ts:468-484`). `TURN_SECONDS=30`. `turnExpiresAt` is deliberately **not** refreshed by off-turn actions (`match.ts:150-153`) to block collusion stalls.

**Realtime** — private Supabase channel `vyapaar-match:{id}`; server broadcasts a content-free `"state"` nudge; client refetches `GET /view` (per-seat masked `publicView`, `view.ts:32-63`). Backstops: 8s poll + 55min token refresh.

**Client** (`src/components/vyapaar/MatchBoard.tsx`) — one big `view` in `useState`, whole-board rerender, no memoization. Deed modal is the only buy surface. Presence tracked client-only (cosmetic, server ignores it).

## 2. Current Turn Flow (exact)

```
end_turn advances active seat → phase="roll"
 → player clicks ROLL (intent roll)
 → engine rolls 2 dice, moves token (pos = (pos+a+b) % 40), pays salary if passed Start
 → resolveTile auto-applies landing: rent/tax/GST/card/mandi/jail — ZERO clicks
     • unowned city/company → pendingCity/pendingCompany, phase="buy" (the ONE decision)
     • owned property → charge(rent) auto-transferred silently, phase→manage
 → phase="manage": optional develop/mortgage/sell/unmortgage
 → player clicks END TURN (required; phase must be "manage")
 → next player
```
Doubles → reroll. 3 doubles → jail. Client cost of a *do-nothing* turn = **2 clicks (Roll + End turn)**; buying a property = **4 clicks** (Roll → open-deed → Buy → End turn).

**Failure paths today:** disconnect/leave = *unhandled server-side* — the "← Leave" link just navigates away; the player keeps their seat and cron auto-plays their turns forever. Simultaneous actions → serialized by `FOR UPDATE`. Duplicate request → rejected by phase guard. Stale client → 8s poll + broadcast reconcile. No-response → cron `nextAutoIntent` auto-advances after 30s.

## 3. Current Problems (ranked by player-felt impact)

| # | Problem | Type | Evidence |
|---|---------|------|----------|
| P1 | **Forced End-turn every turn** even with nothing to manage | UX | `MatchBoard.tsx:273`, `engine.ts:449` |
| P2 | **Actor refetches its own broadcast** (POST already returned the view) + **unconditional 8s poll** → double traffic, full rerenders | Perf/Arch | `match.ts:205` → `MatchBoard.tsx:101,117` |
| P3 | **Buy = 2 clicks + full-screen scrim** (rail button only opens the modal) | UX | `MatchBoard.tsx:267-271,429` |
| P4 | **Whole-board rerender, zero memoization**; 40 tiles + derived arrays recompute every poll | Perf | `MatchBoard.tsx:136-141,162-209` |
| P5 | **Rent is silent** — no feedback when you pay/receive; log panel only, no toast | UX | `resolveTile` engine.ts:143; no toast surface |
| P6 | **Out-of-turn intents don't extend the clock but DO run under the active turn** — M1 collusion-stall latent risk (already mitigated for single actor) | Multiplayer | audit M1, `match.ts:150-153` |
| P7 | Room lobby double-refresh (6s `router.refresh` + realtime) | Perf | `RoomRealtime.tsx:41` |
| P8 | `busy` greys ALL controls during each round-trip | UX | `MatchBoard.tsx:130` |

Not problems: token movement (instant), dice anim (420ms, reduced-motion-aware), cross-player modal blocking (none — modal state is client-local), artificial delays (none).

## 4. Existing Systems To Reuse (do NOT duplicate)

- **Atomic transaction**: everything inside `applyMatchIntent`'s `$transaction` after the `FOR UPDATE`. All new economic intents route through it automatically.
- **Money transfer**: `charge()` / `credit()` (`helpers.ts`). Rent/sell/trade money must go through these.
- **Rent value**: `rentFor()` — single source. Rent-collect must read from it, not recompute.
- **Valuation**: `netWorth()` half-price model — sell-to-bank & leave-liquidation value must reuse it. Existing `sell` intent already pays `floor(price/2)` (`engine.ts:392-408`).
- **Collections grouping**: **zones already exist** — `ZONES` (5, `data.ts:6`), `CityDef.zone`, `controlsSet`/`controlledSets` (3-of-5 threshold), `ZONE_DOUBLE` set-bonus rent ×2. Companies grouped in 3 pairs (`partner`, `companyServiceFee` pair rate). **Reuse zones as the collection unit — do not invent a second grouping.**
- **Trade**: `propose_trade`/`respond_trade` intents already exist (`engine.ts:410-446`), single-slot `s.trade`, re-validated atomically on accept, recipient-only response, legal off-turn.
- **Timeout model**: `nextAutoIntent` + cron loop. New pending states must add a `nextAutoIntent` branch.
- **Validation pattern**: discriminated `Result` union, `{error:"snake_case"}` codes, no zod.
- **Realtime**: `broadcastToTopic(matchTopic,…)` nudge + `/view` refetch.
- **Notifications**: none in-game to reuse — a toast surface is net-new (build minimal, drive from `view.log` deltas).

## 5. Risks

- **Idempotency is structural only** — a genuine double-submit that both land as *distinct legal* actions is not deduped. New rent-collect / sell must encode an already-done flag in `state` (clear a `pendingRent`, flip owner) so the 2nd request errors.
- **Rent-collect introduces a new pending state** blocking the *owner*, not the mover → must have a cron timeout fallback (auto-collect) or the game stalls if the owner is AFK. Never a permanent block.
- **Making trade non-blocking + off-turn** widens the M1 collusion surface — keep the `turnExpiresAt`-no-extend discipline; cap one active outgoing trade per proposer; 60s expiry via cron/state timestamp.
- **Player-leave is greenfield** — no seat-status field exists. Adding forfeit/liquidation touches turn-advance, pending rent, pending trades, ownership → highest-risk feature. Must cancel trades involving the leaver, release cities to bank, and never leave a stuck turn.
- **Collections economic buff** — engine already applies `ZONE_DOUBLE` at 3/5. A *stronger* completion (5/5) buff changes balance; economy is v2/un-tuned. Recommend values from the balance report, gate behind a config constant.
- **Comeback mechanic** — any cash injection is inflationary in a positive-sum economy (L10). Must be capped, one-shot, non-exploitable.
- Money invariant is **per-step cash-delta == emitted event amounts**, NOT global conservation. Preserve it; add engine assertions where tests can check.
- **No prod DB access** — every schema change ships as raw SQL the owner runs manually. Prefer state-JSON changes over new columns where possible (state is a blob → no migration).

## 6. Implementation Plan (dependency-aware)

Each phase: implement → `npm test` + relevant integration → build → report → next. TDD per project rule (test in same change). Migrations (if any) as raw SQL for the owner.

**Phase 1 — Gameplay flow + performance** (no new economy; de-risks everything after)
- Auto-end-turn: when entering `manage` with no legal management action available and no pending decision, engine auto-advances (or expose `autoEnd` in view so client fuses it). Keep manual end-turn when management *is* possible. Add `nextAutoIntent` parity.
- Auto-open deed on `phase==="buy"` client-side; make rail Buy buy-or-open in one hop.
- Kill actor self-refetch (use POST response view; ignore own broadcast); condition/loosen the 8s poll.
- Memoize board tiles + derived arrays; hoist `VB_CSS`.
- Toast surface (minimal) driven by `view.log` deltas → also serves P5/rent feedback.

**Phase 2 — Rent collection** (depends on P1 toast + turn model)
- New `pendingRent` in state (payer, owner, cityId, amount snapshot from `rentFor`). On landing on owned city, set it instead of auto-charging. Owner gets `COLLECT RENT` action → `charge` on collect; idempotent (clears `pendingRent`). `nextAutoIntent`/cron auto-collects on timeout (owner AFK) so the game never stalls. Payer's turn is NOT blocked from ending (rent pending resolves async or auto). Server validates ownership, live rent, balances, still-active, not-already-collected.

**Phase 3 — Card (city) trading** (extends existing trade)
- Restrict `TradeSide` to **cities only, no cash** for player trades (drop cash from proposer/receiver validation; keep multi-city both sides). One active outgoing trade per proposer. 60s expiry (`proposedAt` in state + `nextAutoIntent`/cron expiry). Accept/Decline exist; add **Counter-offer** (respond with a new proposal swapping from/to). Fully non-blocking (already off-turn). Keep atomic re-validate on accept.

**Phase 4 — Sell-to-bank + player exit**
- Sell: reuse existing `sell` intent value (`floor(price/2)`); brief confirm showing exact amount; atomic (owner→null). Already idempotent via owner guard.
- Leave (greenfield): add `left: boolean` to `PlayerState` (state blob, no migration). Intentional leave = new intent/action; disconnect = presence + cron. On leave: liquidate cities/companies to bank at `netWorth` city value, cancel all trades involving leaver, clear their pending rent (as owner → auto-collect or void; as payer → auto-charge), skip their turns, advance if it was their turn. Respect existing room-rejoin; treat brief disconnect as non-permanent (grace via presence + timeout) before liquidating.

**Phase 5 — Collections** (reuse zones)
- Surface zone completion in `view`: per-zone owned/total, complete flag, benefit text. Completion = own all 5 (stronger than the existing 3/5 control bonus). Benefit: recommend **+25% rent** on top of the existing ×2 zone-control (values from balance report; behind config constant, not blind). Collection UI panel in MatchBoard using existing pill/rail style. Integrate with trading (completing via trade triggers the buff).

**Phase 6 — Comeback mechanic** (after economy tested vs P2-P5)
- Recommend: **one-time "Restructure"** — a losing player (net worth < X% of leader, mirrors existing `isUnderdog` 0.6 ratio) may take a **single** capped emergency advance repaid via a salary penalty (reuse the existing `startupPenalty`/`startupLaps` machinery already in `PlayerState`). Fits the economy (reuses underdog + startup-penalty systems, no new money faucet beyond a capped, self-repaying loan). Full exploit analysis + prevention documented before implementing.

**Phase 7 — Final polish + full regression/multiplayer/race/disconnect testing.**

---

### Open decisions surfaced (defaulted, not gating)
- **Rent-collect timeout**: default to **auto-collect at turn-timeout** (30s, reuse `TURN_SECONDS`) — safest (owner never loses rent, game never stalls). Alternative (rent voided on timeout) rejected: punishes the AFK owner and changes economy.
- **Collection buff magnitude**: default **+25% rent** for full-zone (5/5) ownership, config-gated. Re-tune after Phase 5 playtest.
- **Comeback**: default the self-repaying underdog advance over a free grant (non-inflationary).
