# Vyapaar — Indian-business event cells + pot removal

**Date:** 2026-08-25
**Status:** Approved design, ready for implementation plan
**Scope:** Vyapaar game engine + board UI. Replace the UPI/Headline card system with 5 fixed
"personal" Indian-business events, remove the free-parking pot, and rebalance.

---

## 1. Goal

Make the game's special (non-property, non-corner) cells feel personal and authentically Indian.
Today the five inside special cells run a generic Monopoly-style economy: two card decks
(UPI + Headline, 16 cards total) plus GST and Income-tax fees that feed a hidden "pot" a player
scoops at Mandi. We replace that with **five fixed, deterministic events** — each inside cell
always does one clear thing when landed on — and we delete the pot.

Corners are explicitly **out of scope for relabeling**: Start, Monsoon, Tax Raid keep their current
label and behavior. Mandi's *label* stays but its *payout* changes (see §4) because the pot it paid
out is being removed.

## 2. Current state (what exists today)

- **Inside special cells (5):** UPI (pos 6), GST (pos 17), Headline/"NEWS" (pos 24 and 30),
  Income (pos 37). See `src/modules/vyapaar/engine/data.ts` (`UPI_POS`, `GST_POS`, `HEADLINE_POS`,
  `INCOME_POS`).
- **Card decks:** `HEADLINE` and `UPI` arrays (8 cards each) in `data.ts`; `applyCard`/`drawCard`
  in `src/modules/vyapaar/engine/cards.ts`; draw order held in `state.headlineDeck` / `state.upiDeck`
  (`state.ts`), shuffled at game start.
- **Pot:** `state.pot` (`state.ts`). GST charges 10% of cash (cap ₹3000) to pot; Income charges a
  flat ₹1200 to pot; the `feeToPot`/`audit` card charges to pot. Landing on **Mandi** credits the
  whole pot to the player and resets it to 0. See `engine.ts` cases `gst`/`income`/`mandi`, and
  `charge(..., "pot")` in `helpers.ts`.
- **UI:** tile labels + icons + event-log strings in `src/components/vyapaar/MatchBoard.tsx`
  (`LABELS` map ~line 35, log formatter ~line 62, icon SVGs ~line 683). Pot is shown in the HUD
  (`view.pot`, MatchBoard ~line 268). `view.ts` exposes `pot`, `headlineLeft`, `upiLeft`.

## 3. The five events

`n` = number of players in the match (2..6). "Active" = the player who landed. Each event is a
**fixed effect on the cell** — no draw, no shuffle, no dice, no choice.

| Event | Give/Take | Active player | Each other player | Op |
|---|---|---|---|---|
| **Tax Return** | give | +1000 (from bank) | — | `cash` 1000 |
| **Got Married** | give | +500·(n−1) | −500 each | `collectEach` 500 |
| **Celebrate Festival** | take | −500·(n−1) | +500 each | `payEach` 500 |
| **ED Raided** | take | −1000 (bribe to bank) | — | `feeToBank` 1000 |
| **JNV Revisit** | take | −6000 | +6000/(n−1) each | `payEachSplit` 6000 |

Balance: **2 give / 3 take**. (A sixth event, *JNV Speaker* +6000, was designed but dropped —
there are only five cells and it was the mirror of Revisit; dropping it removes the one large
windfall, keeping swings smaller and fairer.)

### Money semantics
- **bank** = money appears/vanishes (no other player affected).
- `collectEach val` — every other (non-left) player pays the active player `val`. Already exists.
- `payEach val` — active player pays `val` to every other (non-left) player. **New op.**
- `payEachSplit val` — active player pays `val` **total**, split equally among the other
  (non-left) players (`val/(others)` each; integer rounding, remainder handling per §6). **New op.**
- `feeToBank val` — active player pays `val` to the bank (vanishes). **New op** (replaces the old
  `feeToPot` now that there is no pot).
- `cash val` — bank pays the active player `val`. Already exists.

Players who have `left` the game are excluded from "each other" counts and splits.

## 4. Cell mapping (the swap)

Positions are unchanged; only the effect and label of each inside cell changes. Order chosen so
give/take alternate around the ring rather than clumping.

| Pos | Was | → Event | Flow |
|---|---|---|---|
| 6 | UPI | **Tax Return** | give |
| 17 | GST | **Celebrate Festival** | take |
| 24 | News (Headline) | **Got Married** | give |
| 30 | News (Headline) | **ED Raided** | take |
| 37 | Income | **JNV Revisit** | take |

**Mandi (corner, pos 20):** pot removed → **bank pays the player a flat ₹3500** ("shopping") on
landing. New constant `MANDI_BONUS = 3500`. Label stays "MANDI".

## 5. Engine / data changes

1. **Remove the pot entirely.**
   - Delete `state.pot` (state.ts, `createGame`), `view.pot` (view.ts), and the HUD pot readout in
     MatchBoard (~line 268).
   - `helpers.charge`: change the sink type from `to: number | "pot"` to `to: number | "bank"`;
     the bank branch drops the money (no accumulation). Grep every `charge(... , "pot" ...)` caller
     and convert to `"bank"` or to the new per-player ops.
   - Mandi case in engine.ts: replace `credit(s, seat, s.pot); s.pot = 0` with
     `credit(s, seat, MANDI_BONUS)` and a `mandi` event carrying `amount: MANDI_BONUS`.

2. **Remove the card decks.**
   - Delete `HEADLINE`, `UPI` arrays and the now-dead `CardOp` variants
     (`cashAll`, `feePerCity`, `feeToPot`, `freeUpgrade`, `skipNext`, `downgradeRival`, `startup`,
     `perHeritage`, `perSet`) from data.ts.
   - Delete `state.headlineDeck` / `state.upiDeck` and their seeding in `createGame`; delete
     `view.headlineLeft` / `view.upiLeft`.
   - `cards.ts`: drop `drawCard` and the deck logic. Keep a small `applyEvent(s, eventId)` that
     switches over the five ops above and returns `EngineEvent[]`. `firstFreeUpgradeCity` and the
     `freeUpgrade`/`downgradeRival` helpers go away with their ops.

3. **New event model in data.ts.**
   ```ts
   export type EventId = "tax_return" | "married" | "festival" | "ed_raid" | "jnv_revisit";
   export type EventOp = "cash" | "collectEach" | "payEach" | "payEachSplit" | "feeToBank";
   export interface EventDef { id: EventId; op: EventOp; val: number; }
   export const EVENTS: Record<EventId, EventDef> = { /* the five rows in §3 */ };
   // Fixed cell → event assignment (replaces UPI_POS/GST_POS/HEADLINE_POS/INCOME_POS):
   export const EVENT_TILES: Record<number, EventId> = {
     6: "tax_return", 17: "festival", 24: "married", 30: "ed_raid", 37: "jnv_revisit",
   };
   export const MANDI_BONUS = 3500;
   ```
   Remove `GST_RATE`, `GST_CAP`, `TAX_INCOME`, `UPI_POS`, `GST_POS`, `HEADLINE_POS`, `INCOME_POS`,
   `STARTUP_LAPS`, `STARTUP_PENALTY` (startup card gone). `startupLaps`/`startupPenalty` on
   `PlayerState` and the salary-reduction logic they drove are removed too.

4. **Board.ts.** Replace the four special kinds `gst`/`income`/`upi`/`headline` with a single
   `TileKind` `"event"`; each event tile carries `eventId: EventId` (from `EVENT_TILES`). Corner and
   company/city placement is unchanged.

5. **Engine.ts landing switch.** Replace the `gst`/`income`/`upi`/`headline` cases with one
   `case "event"` that reads the tile's `eventId`, calls `applyEvent`, pushes an `event` engine
   event `{ type: "event", seat, event: eventId, ... }`, then `finishSegment`. Delete the
   `GST_RATE`/`GST_CAP`/`TAX_INCOME` imports and usage.

## 6. Edge cases & rules

- **Split rounding (JNV Revisit):** `per = Math.floor(6000 / others)`. The active player pays
  `per * others` (not a flat 6000) so no phantom rupees are created — each recipient gets exactly
  `per`, and the payer loses exactly `per * others`. Note: 6000 divides evenly for every valid
  count (others = 1..5 → 6000/others ∈ {6000,3000,2000,1500,1200}), so at the current value there is
  **never** a remainder — e.g. n=4 (others=3) → payer −6000, each other +2000. The floor logic
  exists only to stay safe if the harness retunes the value to a non-divisible number.
  (Alternative — pay a flat 6000 and hand the remainder to the first other player — is rejected to
  keep it symmetric and testable.)
- **Insufficient cash:** paying events (`payEach`, `payEachSplit`, `feeToBank`) route through
  `charge`, which already liquidates (sell upgrades, then mortgage) before paying, and pays only what
  can be raised. A player who still can't cover it pays what they have (existing partial-payment
  behavior); bankruptcy handling is unchanged.
- **Left players:** excluded from "each other" counts and from splits. If somehow only the active
  player remains non-left, per-other events are no-ops (loop over zero others).
- **2 players:** `n−1 = 1`, so collect/pay/split events move the full `val` between the two players;
  Revisit moves 6000 from active to the one opponent.

## 7. Testing (mandatory — money paths)

Add/adjust vitest in `tests/vyapaar/`. Every new op gets a case:
- `applyEvent` for each of the five events at n = 2, 3, 4 — assert active delta AND each other
  player's delta, and that total cash is conserved for player-to-player events (Married, Festival,
  Revisit) and correctly created/destroyed for bank events (Tax Return, ED Raided).
- **Split rounding:** Revisit at n = 4 → payer −6000, each other +2000 (divides evenly;
  conservation holds). Add one synthetic case calling the split with a non-divisible value (e.g.
  6001, others=3 → per=2000, payer −6000, remainder 1 stays with payer) to prove the floor guard.
- **Mandi:** landing credits exactly `MANDI_BONUS` and no pot is referenced.
- **Pot gone:** a game played to completion never touches a `pot` field (type-level: field removed).
- **Insufficient cash:** active player with < required cash on Festival/Revisit/ED liquidates then
  pays partial; assert no negative cash and correct recipients.
- Update existing tests that reference the pot, GST/Income fees, or the card decks
  (`tests/vyapaar/*.test.ts`) — several will need rewrites since the mechanics are gone.

## 8. UI (MatchBoard.tsx)

- `LABELS`: drop `gst`/`income`/`upi`/`headline`; add per-event labels keyed by `eventId`
  ("TAX RETURN", "GOT MARRIED", "FESTIVAL", "ED RAID", "JNV REVISIT") or a single "EVENT" kind that
  reads the tile's eventId for its label + icon.
- Icons (~line 683): give each event a duotone/line SVG (reuse GST/income/news/upi glyphs as
  starting points; add wedding + raid glyphs).
- Event-log formatter (~line 62): one human string per event, e.g.
  `${nm(seat)} got a ₹1000 tax return`, `${nm(seat)} paid ₹500 to everyone for the festival`,
  `${nm(seat)} was ED-raided for ₹1000`, `${nm(seat)} paid ₹6000 hosting the JNV revisit`,
  `${nm(seat)} collected ₹500 from everyone for the wedding`, `${nm(seat)} spent ₹3500 shopping at
  the mandi`.
- Remove the pot HUD readout (~line 268).

### 8b. Landing effect (per-event burst)

Small celebratory/impact burst over the landed token when an event fires — flavor per event, no new
dependency.

- **Reuse, don't add:** the festive keyframes already in `globals.css` (`festive-rise`,
  `festive-twinkle`, `festive-flicker`) and framer-motion (already imported in MatchBoard for the
  dice). No confetti library. `// ponytail: reuse festive glyph burst, add a lib only if a designer
  demands physics.`
- **Glyph + tone per event:**
  | Event | Glyphs | Tone |
  |---|---|---|
  | Tax Return | 💸 coins | positive (green) |
  | Got Married | 💐 ❤️ petals | positive (pink) |
  | Celebrate Festival | 🎉 🪔 confetti | positive (gold) |
  | ED Raided | 🚨 💥 | negative (red) + brief token shake |
  | JNV Revisit | 🎓 🎊 | neutral/positive (brand) |
- **Trigger:** the engine pushes `{ type: "event", seat, event: eventId }` (§5). The client fires
  the burst when a new `type:"event"` entry appears at the tail of `view.log`; track the last-seen
  log index in a `useRef` so a refetch/realtime re-render doesn't replay old bursts. Position the
  burst over the acting seat's token cell.
- **Shape:** ~4–6 glyphs, ~1.2s, index-derived offsets (deterministic; no `Math.random` needed since
  it's a transient client-only effect). Auto-unmount after the animation.
- **Reduced motion:** honor `prefers-reduced-motion` (MatchBoard already reads `reduce` for the
  dice) — skip the burst or show a single static glyph fade.
- **Scope guard:** this is decoration only. It must not gate turn flow, block input, or affect engine
  state; if it errors it fails silent.

## 9. Rebalance (final phase)

Killing GST removes the only **progressive** money-sink (it scaled with wealth, taxing leaders
hardest). All remaining sinks are flat (ED −1000, Festival −500·(n−1)) or fixed (Revisit −6000), so
without retuning the leader can snowball. After the mechanics land, rerun the balance harness
`scripts/vyapaar-balance.ts` (`npx tsx scripts/vyapaar-balance.ts 500`) and adjust **only** the
tunables in `data.ts` (city prices/rents, `SALARY`, event `val`s, `MANDI_BONUS`) until win-rate
spread and game length are back in range. The harness is DB-free and deterministic; it is the single
source of truth for the numbers.

## 10. Out of scope

- Corner cells' labels/behavior (Start, Monsoon, Tax Raid) — untouched. Mandi payout changes only
  because the pot is removed.
- Company cells, city rent ladders, trade/auction/rent systems — untouched except any harness number
  tweaks in §9.
- Per-player *flavor* variants of events (multiple texts per mechanic) — not in this cut; the five
  events are single-text.
