# Vyapaar — Companies (replace hubs) + alphabetical board

**Date:** 2026-08-25 · **Branch:** `feat/vyapaar-companies` · **Status:** design — awaiting go.

Turns the four generic **hubs** into six **named companies** in three pairs, adds the
**pair-service** mechanic, and re-orders cities **alphabetically** — bringing the live game up
to the approved board mockup. Pure engine + view + board-render change; **no DB schema
change** (game state is JSON).

> ⚠ **Breaking for in-flight matches.** State shape changes (`hubs` → `companies`) and the
> board layout changes, so any **active** match at deploy time will break on its next move,
> and old settled matches can't be re-replayed. This is pre-launch throwaway data (incl. the
> playtest match) — ship when no active match matters. No migration; nothing to run.

---

## 1. The six companies (3 pairs)

| Pair | Company | Category | Buy | Service (single) | Service (own both) |
|---|---|---|---|---|---|
| Travel | Udta Firta Travels (Travel Agency) | Travel | 5,000 | 500 | 2,500 |
| Travel | The Bogus Airlines (Airline) | Travel | 5,000 | 500 | 2,500 |
| Comms | Timewheel Internet Pvt Ltd (Tech & Marketing) | Communication | 6,000 | 600 | 3,000 |
| Comms | Book A Sloth (Appointment Booking) | Communication | 6,000 | 600 | 3,000 |
| Food | Fox and Bew (Cafe) | Food | 4,000 | 400 | 1,000 |
| Food | Dabba (Tiffin Delivery) | Food | 4,000 | 400 | 1,000 |

Rules: **no building** (no houses/hotels). Landing on a company you don't own → buy or
decline (→ auction, same as cities). Landing on a rival's company → pay the **service fee**:
the **pair rate** if that owner holds **both** companies of the pair, else the **single rate**.

> **Balance flag:** Travel & Comms pair rates are 5× the single fee; **Food is 2.5×** (1,000 vs
> 400). Implementing the numbers as given — confirm Food isn't a typo (2,000 would make it 5×).

## 2. Data (`data.ts`)
- Add `COMPANIES: { name, short, category, sub, partner, buy, single, pair }[]` (index 0–5;
  pairs = (0,1),(2,3),(4,5)).
- Remove `HUB_PRICE`, `HUB_RENT`, `HUB_POS`. Add `COMPANY_POS` (6 board positions).
- Keep the `SET_*`, salary, tax, etc. constants unchanged.

## 3. Board (`board.ts`)
- Tile kind `"hub"` → `"company"` carrying `companyIndex`.
- **Cities alphabetical** — replace the cheapest-first sort with a name sort for placement.
- 40 tiles = 4 corners (Start/Monsoon/Mandi/Tax Raid) + 25 cities + 6 companies + **5**
  specials. Current specials are 7 (UPI×2, Headline×3, GST, Income) → drop 2 (→ Headline×2,
  keep UPI×2 + GST + Income = 5, or similar). Company positions spread with each pair ~6
  tiles apart (matches the mockup; engine only needs valid distinct positions).

## 4. State (`state.ts`)
- `hubs: (number|null)[]` (len 4) → `companies: (number|null)[]` (len 6). `createGame`
  initialises `companies: [null×6]`.

## 5. Engine (`engine.ts`) + helpers
- `resolveTile` company branch: unowned → `pendingCompany` + `phase:"buy"`; owned by rival →
  `charge(service fee)`; owned by self → pass. (Mirrors the old hub branch.)
- `buy`/`decline` handle `pendingCompany` (buy → set owner; decline → **auction**, unlike hubs
  which weren't auctioned — companies ARE ownable-by-others so auction fits; **decision:** treat
  like cities = auction on decline. Confirm.)
- `helpers.companyServiceFee(s, i)` = owner holds both of the pair ? `pair` : `single`.
- `netWorth`: companies at 50% of buy (replaces hub valuation).
- Add `pendingCompany` to `GameState`; `nextAutoIntent` buy-phase decline covers it.

## 6. View (`view.ts`)
- `hubs` → `companies: (number|null)[]`; add `pendingCompany`. Drop hub fields.

## 7. Client (`MatchBoard.tsx`)
- Render company tiles from `view.companies` with real names (grey), category icon; company
  deed shows single + pair service, partner, "own both → pair rate", no build.
- Cities already render from board order → alphabetical automatically.
- Pending-company buy/decline wired like pending-city.

## 8. Tests
- Company buy sets owner; decline → auction. Single vs **pair** fee (own one vs both).
- Settlement/netWorth counts companies. Board: 6 companies + 25 alphabetical cities + 5
  specials, all positions distinct, pairs <7 apart. Replay determinism holds with companies.
- Money-accounting: buying a company removes exactly `buy`; service fee is a clean transfer.

## 9. Out of scope
Balance tuning of the new numbers (that's M5b), leaderboard, bots.

## Sequencing
One PR: engine + view + board + client + tests. Ship when no active match matters.
