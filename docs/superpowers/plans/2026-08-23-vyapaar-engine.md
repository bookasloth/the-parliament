# Vyapaar Engine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the pure, deterministic, framework-free Vyapaar game engine — the "crown jewel" — porting the balance-validated ruleset from the design's Appendix A/B, with a fixed-seed replay test and a money-conservation property test proving fidelity.

**Architecture:** All engine code is pure TypeScript under `src/modules/vyapaar/engine/`, importing nothing from Supabase/Prisma/Next/HTTP. State is a plain serializable object; all randomness comes from a seeded PRNG kept *in* the state, so `(seed, names, action-log)` fully reproduces any game. The engine exposes `createGame`, `applyIntent` (validate → transition, or return an error), `publicView`, and `autoResolve`. Later phases (server RPC, wallet, rooms, realtime, cron) wrap this engine but never change it.

**Tech Stack:** TypeScript (strict), vitest (`tests/**/*.test.ts`, node env, `@/` → `src/`). No new dependencies.

## Global Constraints

- **Port the MECHANICS verbatim; use the v2 DATA.** The ruleset in the design's Appendix B (cards) and the turn/rent/auction/trade *mechanics* are authoritative — translate faithfully, do not "improve." But the **city/rent data is the v2 zoned table** in the design's 2026-08-24 addendum, which **supersedes** Appendix A. The v2 numbers are **NOT balance-validated** — the M5 harness re-validates them; the engine just reads them.
- **Determinism is mandatory.** No `Math.random`, no `Date.now`, no wall-clock inside the engine. All randomness flows through `nextRng(state)`, which mutates `state.rng`. Same inputs → identical output, always.
- **All constants live in `data.ts`.** The balance harness (a later phase) tunes only that file. No magic numbers anywhere else in the engine.
- **Engine is dependency-free.** Files under `engine/` import only from each other and from `data.ts`. Zero imports of Prisma, Supabase, Next, or Node built-ins beyond pure JS.
- **Naming:** files `kebab-case`; types `PascalCase`; functions/vars `camelCase`. Double-quoted strings, semicolons (match `src/modules/games/engines/`).
- **Player count:** `createGame` accepts **2–6** names (the design raises the reference cap of 4).
- **Rent model:** per-city 7-rung ladder `[base,1H,2H,3H,1Hotel,2Hotel,3Hotel]` = levels `0..6`, so **`MAX_LEVEL = 6`**. Cities are grouped into 5 **zones** (the "sets"); zone control (3 of 5 unmortgaged) doubles undeveloped base rent and unlocks development. **Upgrade cost is derived** (`round(price * UPGRADE_COST_RATIO)`, default 0.1) — the table gives no house cost.
- **cityId = index into `CITIES` (0..24)**, authored zone-grouped (North 0–4, South 5–9, East 10–14, West 15–19, Central 20–24). Board placement is cheapest-first by price (`board.ts` sorts). hubIndex = index into `HUB_POS` (0..3). seat = index into `players`.

---

### Task 1: `data.ts` — canonical constants

**Files:**
- Create: `src/modules/vyapaar/engine/data.ts`
- Test: `tests/vyapaar/data.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `ZONES`, `CITIES` (each with its own `rent` ladder), `upgradeCost(cityId)`, `UPGRADE_COST_RATIO`, `HUB_PRICE`, `HUB_RENT`, `HUB_POS`, `START_CASH`, `SALARY`, `SALARY_UNDERDOG`, `MONSOON_PAY`, `TAX_INCOME`, `GST_RATE`, `GST_CAP`, `SET_BONUS_NW`, `MAX_ROUNDS`, `SETS_TO_END`, `SET_OWN_NEEDED`, `BLEND`, `MAX_LEVEL`, `UNMORTGAGE_RATE`, `UPGRADE_SELL_RATIO`, `HEADLINE`, `UPI`, and the tile-position constants `START_POS`/`MONSOON_POS`/`MANDI_POS`/`TAXRAID_POS`/`GST_POS`/`INCOME_POS`/`UPI_POS`/`HEADLINE_POS`. Types `Zone`, `RentRung`, `CityDef`, `Card`, `CardOp`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/data.test.ts
import { describe, it, expect } from "vitest";
import { CITIES, ZONES, HEADLINE, UPI, HUB_RENT, upgradeCost, MAX_LEVEL } from "@/modules/vyapaar/engine/data";

describe("vyapaar data", () => {
  it("has 25 cities, 5 per zone, authored zone-grouped", () => {
    expect(CITIES).toHaveLength(25);
    expect(ZONES).toHaveLength(5);
    for (let z = 0; z < ZONES.length; z++) {
      expect(CITIES.filter((c) => c.zone === z)).toHaveLength(5);
    }
    // authored zone-grouped: cityIds 0-4 North, 5-9 South, etc.
    for (let z = 0; z < ZONES.length; z++) {
      for (let i = 0; i < 5; i++) expect(CITIES[z * 5 + i].zone).toBe(z);
    }
  });

  it("gives each city a 7-rung rent ladder (levels 0..6) that strictly climbs", () => {
    expect(MAX_LEVEL).toBe(6);
    for (const c of CITIES) {
      expect(c.rent).toHaveLength(7);
      for (let i = 1; i < c.rent.length; i++) expect(c.rent[i]).toBeGreaterThan(c.rent[i - 1]);
      expect(c.price).toBeGreaterThan(0);
    }
  });

  it("derives upgrade cost from buy price (10% default)", () => {
    // Delhi (cityId 0) price 9000 → 900/level
    expect(upgradeCost(0)).toBe(900);
    expect(upgradeCost(0)).toBeGreaterThan(0);
  });

  it("has 8 cards in each deck and HUB_RENT indexed by hubs owned", () => {
    expect(HEADLINE).toHaveLength(8);
    expect(UPI).toHaveLength(8);
    expect(HUB_RENT).toEqual([0, 750, 1500, 3000, 6000]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/data.test.ts`
Expected: FAIL — cannot resolve `@/modules/vyapaar/engine/data`.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/engine/data.ts
// Canonical Vyapaar constants — single source of truth. The balance harness
// tunes ONLY this file; the engine reads everything from here.

export type Zone = number; // index into ZONES

export const ZONES = ["North", "South", "East", "West", "Central"] as const;

/** Per-city rent ladder, levels 0..6: [base, 1House, 2House, 3House, 1Hotel, 2Hotel, 3Hotel]. */
export type RentRung = [number, number, number, number, number, number, number];

export interface CityDef {
  name: string;
  zone: Zone;
  price: number; // Buy
  rent: RentRung;
}

// 25 cities, authored ZONE-GROUPED so cityId 0-4 = North, 5-9 = South, 10-14 = East,
// 15-19 = West, 20-24 = Central. (Board placement is cheapest-first — board.ts sorts by price.)
export const CITIES: CityDef[] = [
  // North (zone 0)
  { name: "Delhi", zone: 0, price: 9000, rent: [450, 900, 1350, 2000, 2700, 3600, 4950] },
  { name: "Chandigarh", zone: 0, price: 6500, rent: [350, 650, 1000, 1450, 1950, 2600, 3600] },
  { name: "Jaipur", zone: 0, price: 5800, rent: [300, 600, 850, 1300, 1750, 2300, 3200] },
  { name: "Lucknow", zone: 0, price: 5200, rent: [250, 500, 800, 1150, 1550, 2100, 2850] },
  { name: "Dehradun", zone: 0, price: 4200, rent: [200, 400, 650, 950, 1250, 1700, 2300] },
  // South (zone 1)
  { name: "Bengaluru", zone: 1, price: 8800, rent: [450, 900, 1300, 1950, 2650, 3500, 4850] },
  { name: "Hyderabad", zone: 1, price: 8000, rent: [400, 800, 1200, 1750, 2400, 3200, 4400] },
  { name: "Chennai", zone: 1, price: 7500, rent: [400, 750, 1100, 1650, 2250, 3000, 4100] },
  { name: "Kochi", zone: 1, price: 4800, rent: [250, 500, 700, 1050, 1450, 1900, 2650] },
  { name: "Coimbatore", zone: 1, price: 4500, rent: [250, 450, 700, 1000, 1350, 1800, 2500] },
  // East (zone 2)
  { name: "Kolkata", zone: 2, price: 7200, rent: [350, 700, 1100, 1600, 2150, 2900, 3950] },
  { name: "Bhubaneswar", zone: 2, price: 5000, rent: [250, 500, 750, 1100, 1500, 2000, 2750] },
  { name: "Guwahati", zone: 2, price: 4600, rent: [250, 450, 700, 1000, 1400, 1850, 2550] },
  { name: "Patna", zone: 2, price: 4300, rent: [200, 450, 650, 950, 1300, 1700, 2350] },
  { name: "Ranchi", zone: 2, price: 3800, rent: [200, 400, 550, 850, 1150, 1500, 2100] },
  // West (zone 3)
  { name: "Mumbai", zone: 3, price: 9500, rent: [500, 950, 1450, 2100, 2850, 3800, 5250] },
  { name: "Pune", zone: 3, price: 6800, rent: [350, 700, 1000, 1500, 2050, 2700, 3750] },
  { name: "Ahmedabad", zone: 3, price: 6200, rent: [300, 600, 950, 1350, 1850, 2500, 3400] },
  { name: "Surat", zone: 3, price: 5500, rent: [300, 550, 850, 1200, 1650, 2200, 3000] },
  { name: "Vadodara", zone: 3, price: 4400, rent: [200, 450, 650, 950, 1300, 1750, 2400] },
  // Central (zone 4)
  { name: "Indore", zone: 4, price: 5600, rent: [300, 550, 850, 1250, 1700, 2250, 3100] },
  { name: "Bhopal", zone: 4, price: 4900, rent: [250, 500, 750, 1100, 1450, 1950, 2700] },
  { name: "Nagpur", zone: 4, price: 4700, rent: [250, 450, 700, 1050, 1400, 1900, 2600] },
  { name: "Raipur", zone: 4, price: 4000, rent: [200, 400, 600, 900, 1200, 1600, 2200] },
  { name: "Jabalpur", zone: 4, price: 3500, rent: [200, 350, 500, 800, 1050, 1400, 1900] },
];

export const UPGRADE_COST_RATIO = 0.1; // house/hotel cost per level = 10% of buy (tunable by harness)

/** Cost to raise a city one level. Table gives no house cost, so derive from buy price. */
export function upgradeCost(cityId: number): number {
  return Math.round(CITIES[cityId].price * UPGRADE_COST_RATIO);
}

export const HUB_PRICE = 4500;
export const HUB_RENT = [0, 750, 1500, 3000, 6000]; // indexed by hubs owner holds
export const HUB_POS = [5, 15, 25, 35];

export const START_CASH = 7500; // fallback/bot opening stack (wallet mode overrides)
export const SALARY = 1200;
export const SALARY_UNDERDOG = 2100;
export const MONSOON_PAY = 450; // reserved for balance tuning; landing on monsoon is "just visiting"
export const TAX_INCOME = 1200;
export const GST_RATE = 0.1;
export const GST_CAP = 3000;
export const SET_BONUS_NW = 1500;
export const MAX_ROUNDS = 12;
export const SETS_TO_END = 3;
export const SET_OWN_NEEDED = 3;
export const BLEND = 0.5;
export const MAX_LEVEL = 6; // base + 3 houses + 3 hotels (v2 rent ladder is length 7)
export const UNMORTGAGE_RATE = 0.55; // half + 10% interest
export const UPGRADE_SELL_RATIO = 0.5; // refund on forced upgrade sale during liquidation

// Board tile positions.
export const START_POS = 0;
export const MONSOON_POS = 10;
export const MANDI_POS = 20;
export const TAXRAID_POS = 30;
export const GST_POS = 17;
export const INCOME_POS = 37;
export const UPI_POS = [3, 23];
export const HEADLINE_POS = [7, 13, 27];

export type CardOp =
  | "cash"
  | "cashAll"
  | "collectEach"
  | "feePerCity"
  | "feeToPot"
  | "freeUpgrade"
  | "skipNext"
  | "downgradeRival"
  | "startup"
  | "perHeritage"
  | "perSet";

export interface Card {
  id: string;
  op: CardOp;
  val?: number;
}

export const HEADLINE: Card[] = [
  { id: "diwali", op: "cashAll", val: 900 },
  { id: "fuel", op: "feePerCity", val: 150 },
  { id: "bollywood", op: "collectEach", val: 300 },
  { id: "boom", op: "freeUpgrade" },
  { id: "audit", op: "feeToPot", val: 600 },
  { id: "windfall", op: "cash", val: 600 },
  { id: "jam", op: "skipNext" },
  { id: "demolition", op: "downgradeRival" },
];

export const UPI: Card[] = [
  { id: "cashback", op: "cash", val: 750 },
  { id: "startup", op: "startup", val: 1800 }, // +1800 now, salary -300 for 3 laps
  { id: "tourism", op: "perHeritage", val: 450 },
  { id: "refund", op: "cash", val: 600 },
  { id: "bankerror", op: "cash", val: 1200 },
  { id: "festival", op: "cashAll", val: 600 },
  { id: "bond", op: "cash", val: 900 },
  { id: "wedding", op: "perSet", val: 300 },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/data.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/data.ts tests/vyapaar/data.test.ts
git commit -m "feat(vyapaar): canonical engine data module"
```

---

### Task 2: `rng.ts` — seeded PRNG + shuffle

**Files:**
- Create: `src/modules/vyapaar/engine/rng.ts`
- Test: `tests/vyapaar/rng.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces: `nextRng(state: { rng: number }): number` (returns `[0,1)`, mutates `state.rng`); `rollDie(state): number` (1..6); `shuffle<T>(arr: T[], state): T[]` (Fisher-Yates, pure new array). All take a `{ rng: number }` holder so the caller passes the full `GameState`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/rng.test.ts
import { describe, it, expect } from "vitest";
import { nextRng, rollDie, shuffle } from "@/modules/vyapaar/engine/rng";

describe("vyapaar rng", () => {
  it("is deterministic for a given seed", () => {
    const a = { rng: 12345 };
    const b = { rng: 12345 };
    const seqA = [nextRng(a), nextRng(a), nextRng(a)];
    const seqB = [nextRng(b), nextRng(b), nextRng(b)];
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0,1)", () => {
    const s = { rng: 7 };
    for (let i = 0; i < 1000; i++) {
      const v = nextRng(s);
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("rolls dice in 1..6", () => {
    const s = { rng: 99 };
    for (let i = 0; i < 1000; i++) {
      const d = rollDie(s);
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(6);
    }
  });

  it("shuffle is deterministic and a permutation", () => {
    const src = [0, 1, 2, 3, 4, 5, 6, 7];
    const s1 = shuffle(src, { rng: 42 });
    const s2 = shuffle(src, { rng: 42 });
    expect(s1).toEqual(s2);
    expect([...s1].sort((a, b) => a - b)).toEqual(src);
    expect(s1).not.toEqual(src); // seed 42 actually reorders
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/rng.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/engine/rng.ts
// Seeded PRNG (mulberry32). State lives on the GameState (`rng` field) so games
// are fully reproducible and serializable. Never use Math.random in the engine.

export function nextRng(state: { rng: number }): number {
  let t = (state.rng = (state.rng + 0x6d2b79f5) | 0) >>> 0;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function rollDie(state: { rng: number }): number {
  return 1 + Math.floor(nextRng(state) * 6);
}

export function shuffle<T>(arr: T[], state: { rng: number }): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(nextRng(state) * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/rng.test.ts`
Expected: PASS. (If the `not.toEqual(src)` assertion fails because seed 42 happens to be identity — it will not for mulberry32 — pick another seed.)

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/rng.ts tests/vyapaar/rng.test.ts
git commit -m "feat(vyapaar): seeded PRNG and shuffle"
```

---

### Task 3: `board.ts` — 40-tile board build

**Files:**
- Create: `src/modules/vyapaar/engine/board.ts`
- Test: `tests/vyapaar/board.test.ts`

**Interfaces:**
- Consumes: `data.ts`.
- Produces: `type TileKind = "start"|"monsoon"|"mandi"|"taxraid"|"hub"|"gst"|"income"|"upi"|"headline"|"city"`; `interface Tile { pos: number; kind: TileKind; cityId?: number; hubIndex?: number }`; `BOARD: Tile[]` (length 40, module constant — NOT stored in state); `CITY_POS: number[]` (cityId → board pos).

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/board.test.ts
import { describe, it, expect } from "vitest";
import { BOARD, CITY_POS } from "@/modules/vyapaar/engine/board";
import { CITIES } from "@/modules/vyapaar/engine/data";

describe("vyapaar board", () => {
  it("has 40 tiles with the corners fixed", () => {
    expect(BOARD).toHaveLength(40);
    expect(BOARD[0].kind).toBe("start");
    expect(BOARD[10].kind).toBe("monsoon");
    expect(BOARD[20].kind).toBe("mandi");
    expect(BOARD[30].kind).toBe("taxraid");
  });

  it("places hubs, gst, income, and card tiles", () => {
    for (const p of [5, 15, 25, 35]) expect(BOARD[p].kind).toBe("hub");
    expect(BOARD[17].kind).toBe("gst");
    expect(BOARD[37].kind).toBe("income");
    for (const p of [3, 23]) expect(BOARD[p].kind).toBe("upi");
    for (const p of [7, 13, 27]) expect(BOARD[p].kind).toBe("headline");
  });

  it("fills the remaining 25 tiles with cities cheapest-first by position", () => {
    const cityTiles = BOARD.filter((t) => t.kind === "city");
    expect(cityTiles).toHaveLength(25);
    // Cheapest-first: buy price strictly increases along ascending board positions.
    const prices = cityTiles.map((t) => CITIES[t.cityId as number].price);
    for (let i = 1; i < prices.length; i++) expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    for (const t of cityTiles) expect(CITY_POS[t.cityId as number]).toBe(t.pos);
    expect(CITIES).toHaveLength(25);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/board.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/engine/board.ts
import {
  CITIES,
  HUB_POS,
  START_POS,
  MONSOON_POS,
  MANDI_POS,
  TAXRAID_POS,
  GST_POS,
  INCOME_POS,
  UPI_POS,
  HEADLINE_POS,
} from "./data";

export type TileKind =
  | "start"
  | "monsoon"
  | "mandi"
  | "taxraid"
  | "hub"
  | "gst"
  | "income"
  | "upi"
  | "headline"
  | "city";

export interface Tile {
  pos: number;
  kind: TileKind;
  cityId?: number;
  hubIndex?: number;
}

function buildBoard(): { board: Tile[]; cityPos: number[] } {
  const board: Tile[] = new Array(40);
  const specials = new Map<number, TileKind>();
  specials.set(START_POS, "start");
  specials.set(MONSOON_POS, "monsoon");
  specials.set(MANDI_POS, "mandi");
  specials.set(TAXRAID_POS, "taxraid");
  specials.set(GST_POS, "gst");
  specials.set(INCOME_POS, "income");
  HUB_POS.forEach((p) => specials.set(p, "hub"));
  UPI_POS.forEach((p) => specials.set(p, "upi"));
  HEADLINE_POS.forEach((p) => specials.set(p, "headline"));

  // CITIES is authored zone-grouped, so sort a copy by price for cheapest-first placement.
  const byPrice = CITIES.map((_, id) => id).sort((a, b) => CITIES[a].price - CITIES[b].price);
  const cityPos: number[] = [];
  let nextCity = 0;
  for (let pos = 0; pos < 40; pos++) {
    const kind = specials.get(pos);
    if (kind === "hub") {
      board[pos] = { pos, kind, hubIndex: HUB_POS.indexOf(pos) };
    } else if (kind) {
      board[pos] = { pos, kind };
    } else {
      const cityId = byPrice[nextCity++];
      board[pos] = { pos, kind: "city", cityId };
      cityPos[cityId] = pos;
    }
  }
  if (nextCity !== CITIES.length) {
    throw new Error(`board: assigned ${nextCity} cities, expected ${CITIES.length}`);
  }
  return { board, cityPos };
}

const built = buildBoard();
export const BOARD: Tile[] = built.board;
export const CITY_POS: number[] = built.cityPos;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/board.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/board.ts tests/vyapaar/board.test.ts
git commit -m "feat(vyapaar): 40-tile board build"
```

---

### Task 4: `state.ts` — types + `createGame`

**Files:**
- Create: `src/modules/vyapaar/engine/state.ts`
- Test: `tests/vyapaar/create-game.test.ts`

**Interfaces:**
- Consumes: `data.ts`, `rng.ts`.
- Produces: types `Phase`, `TradeSide`, `Intent`, `PlayerState`, `CityState`, `AuctionState`, `TradeOffer`, `GameState`, `EngineEvent`; and `createGame(seed: number, names: string[], openingCash?: number): GameState`. `openingCash` defaults to `START_CASH` (later phases pass the wallet snapshot).

**Type definitions used across all later tasks (define here, verbatim):**

```ts
// src/modules/vyapaar/engine/state.ts
import { CITIES, HEADLINE, UPI, START_CASH } from "./data";
import { shuffle } from "./rng";

export type Phase = "roll" | "buy" | "auction" | "manage";

export interface TradeSide {
  cash: number;
  cities: number[]; // cityIds
}

export type Intent =
  | { type: "roll" }
  | { type: "buy" }
  | { type: "decline" }
  | { type: "bid"; amount: number }
  | { type: "develop"; cityId: number }
  | { type: "mortgage"; cityId: number }
  | { type: "unmortgage"; cityId: number }
  | { type: "propose_trade"; to: number; give: TradeSide; get: TradeSide }
  | { type: "respond_trade"; accept: boolean }
  | { type: "end_turn" };

export interface PlayerState {
  name: string;
  cash: number;
  pos: number;
  halted: number; // turns remaining halted (jail/monsoon)
  doubles: number; // doubles rolled so far this turn
  startupLaps: number; // laps remaining with reduced salary
  startupPenalty: number; // salary reduction per lap while startupLaps>0
  freeUpgrades: number; // unused credits (from 'boom'); applied immediately, kept for audit
}

export interface CityState {
  owner: number | null; // seat or null
  level: number; // 0..MAX_LEVEL
  mortgaged: boolean;
}

export interface AuctionState {
  cityId: number;
  bids: (number | null)[]; // per seat; null = not yet bid
}

export interface TradeOffer {
  from: number;
  to: number;
  give: TradeSide; // from → to
  get: TradeSide; // to → from
}

export interface GameState {
  seed: number;
  rng: number; // live PRNG state
  players: PlayerState[];
  cities: CityState[]; // length 25, indexed by cityId
  hubs: (number | null)[]; // length 4, indexed by hubIndex
  pot: number;
  active: number; // active seat
  phase: Phase;
  round: number; // starts at 1
  pendingCity: number | null; // city just landed on, awaiting buy/decline
  pendingHub: number | null; // hub just landed on, awaiting buy/decline
  pendingDouble: boolean; // last roll was a double → roll again after resolution
  auction: AuctionState | null;
  trade: TradeOffer | null;
  headlineDeck: number[]; // draw order of HEADLINE indices; refilled+shuffled when empty
  upiDeck: number[]; // draw order of UPI indices
  endRequested: boolean; // someone hit SETS_TO_END → end when the round completes
  ended: boolean;
  winner: number | null;
}

/** One thing that happened during an intent — for the UI log and tests. */
export interface EngineEvent {
  type: string;
  seat?: number;
  [k: string]: unknown;
}

export function createGame(seed: number, names: string[], openingCash = START_CASH): GameState {
  if (names.length < 2 || names.length > 6) {
    throw new Error("vyapaar: players must be 2..6");
  }
  const state: GameState = {
    seed,
    rng: seed >>> 0,
    players: names.map((name) => ({
      name,
      cash: openingCash,
      pos: 0,
      halted: 0,
      doubles: 0,
      startupLaps: 0,
      startupPenalty: 0,
      freeUpgrades: 0,
    })),
    cities: CITIES.map(() => ({ owner: null, level: 0, mortgaged: false })),
    hubs: [null, null, null, null],
    pot: 0,
    active: 0,
    phase: "roll",
    round: 1,
    pendingCity: null,
    pendingHub: null,
    pendingDouble: false,
    auction: null,
    trade: null,
    headlineDeck: [],
    upiDeck: [],
    endRequested: false,
    ended: false,
    winner: null,
  };
  // Seed the decks so draws are deterministic from game start.
  state.headlineDeck = shuffle(HEADLINE.map((_, i) => i), state);
  state.upiDeck = shuffle(UPI.map((_, i) => i), state);
  return state;
}
```

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/create-game.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { HEADLINE, UPI } from "@/modules/vyapaar/engine/data";

describe("createGame", () => {
  it("rejects <2 or >6 players", () => {
    expect(() => createGame(1, ["solo"])).toThrow();
    expect(() => createGame(1, ["a", "b", "c", "d", "e", "f", "g"])).toThrow();
  });

  it("initialises players with the opening cash", () => {
    const g = createGame(1, ["a", "b", "c"], 25000);
    expect(g.players).toHaveLength(3);
    expect(g.players.every((p) => p.cash === 25000 && p.pos === 0)).toBe(true);
    expect(g.cities).toHaveLength(25);
    expect(g.hubs).toEqual([null, null, null, null]);
    expect(g.active).toBe(0);
    expect(g.phase).toBe("roll");
  });

  it("seeds full decks deterministically from the seed", () => {
    const a = createGame(777, ["a", "b"]);
    const b = createGame(777, ["a", "b"]);
    expect(a.headlineDeck).toEqual(b.headlineDeck);
    expect(a.upiDeck).toEqual(b.upiDeck);
    expect([...a.headlineDeck].sort()).toEqual(HEADLINE.map((_, i) => i));
    expect([...a.upiDeck].sort()).toEqual(UPI.map((_, i) => i));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/create-game.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

Create `state.ts` with the full content in the "Type definitions" block above.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/create-game.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/state.ts tests/vyapaar/create-game.test.ts
git commit -m "feat(vyapaar): game state types and createGame"
```

---

### Task 5: `helpers.ts` — money, ownership, sets, rent, net worth, score

**Files:**
- Create: `src/modules/vyapaar/engine/helpers.ts`
- Test: `tests/vyapaar/helpers.test.ts`

**Interfaces:**
- Consumes: `data.ts`, `state.ts`.
- Produces (pure functions over `GameState`):
  - `citiesOwned(s, seat): number[]` — cityIds owned by seat.
  - `controlsSet(s, seat, zone): boolean` — ≥ `SET_OWN_NEEDED` unmortgaged in the zone.
  - `controlledSets(s, seat): number` — count of controlled zones.
  - `rentFor(s, cityId): number` — full rent from the city's own ladder incl. zone-control base-double, development (`rent[level]`), Scrappy-Landlord ×1.25.
  - `hubRentFor(s, hubIndex): number` — `HUB_RENT[hubsOwnedByOwner]`.
  - `netWorth(s, seat): number` · `scoreOf(s, seat): number`.
  - `charge(s, from, amount, to): number` — moves money `from → to` with forced liquidation and shortfall-forgiveness; `to` is a seat index or `"pot"`. Returns the amount actually paid.
  - `credit(s, seat, amount): void` — add cash.
  - `liquidate(s, seat, need): void` — sell upgrades (tallest first) then mortgage undeveloped until `cash ≥ need` or nothing left.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/helpers.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import {
  controlsSet,
  controlledSets,
  rentFor,
  netWorth,
  scoreOf,
  charge,
  liquidate,
  citiesOwned,
} from "@/modules/vyapaar/engine/helpers";
import { CITIES, SET_BONUS_NW, BLEND, upgradeCost } from "@/modules/vyapaar/engine/data";

// North zone = cityIds 0..4 (authored zone-grouped).
function own(s: ReturnType<typeof createGame>, seat: number, ids: number[]) {
  for (const id of ids) s.cities[id].owner = seat;
}

describe("helpers", () => {
  it("detects zone control at 3 of 5 unmortgaged", () => {
    const s = createGame(1, ["a", "b"]);
    own(s, 0, [0, 1]);
    expect(controlsSet(s, 0, 0)).toBe(false);
    own(s, 0, [2]);
    expect(controlsSet(s, 0, 0)).toBe(true);
    s.cities[2].mortgaged = true;
    expect(controlsSet(s, 0, 0)).toBe(false); // mortgaged doesn't count
  });

  it("computes rent: base, zone-double, developed, and scrappy-landlord", () => {
    const s = createGame(1, ["a", "b"]);
    // Owner holds exactly 1 city (id 0=Delhi) → not a set, ≤3 cities → scrappy ×1.25
    own(s, 0, [0]);
    expect(rentFor(s, 0)).toBe(Math.round(CITIES[0].rent[0] * 1.25));
    // 4 cities in North (0..3) → controls North AND >3 cities so no scrappy
    own(s, 0, [1, 2, 3]);
    expect(rentFor(s, 0)).toBe(CITIES[0].rent[0] * 2); // zone control doubles undeveloped base
    // Develop city 0 to level 2 → rent[2]
    s.cities[0].level = 2;
    expect(rentFor(s, 0)).toBe(CITIES[0].rent[2]);
    // Mortgaged → 0
    s.cities[0].mortgaged = true;
    expect(rentFor(s, 0)).toBe(0);
  });

  it("net worth and score use the documented formula", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 1000;
    own(s, 0, [0, 1, 2]); // North set (3 cities) → controlledSets = 1
    const price = CITIES[0].price + CITIES[1].price + CITIES[2].price;
    const nw = 1000 + price * 0.5 + SET_BONUS_NW * 1;
    expect(netWorth(s, 0)).toBe(nw);
    expect(scoreOf(s, 0)).toBe(1000 + BLEND * (nw - 1000));
    expect(controlledSets(s, 0)).toBe(1);
    expect(citiesOwned(s, 0).sort((x, y) => x - y)).toEqual([0, 1, 2]);
  });

  it("charge liquidates then forgives an unpayable shortfall", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 100;
    own(s, 0, [24]); // Jabalpur price 3500 → mortgage raises floor(3500/2)=1750
    const paid = charge(s, 0, 5000, "pot"); // owes 5000, can raise 100+1750=1850
    expect(paid).toBe(1850);
    expect(s.players[0].cash).toBe(0);
    expect(s.cities[24].mortgaged).toBe(true);
    expect(s.pot).toBe(1850);
  });

  it("liquidate sells the tallest upgrades before mortgaging", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 0;
    own(s, 0, [0, 1, 2]);
    s.cities[0].level = 2;
    liquidate(s, 0, 1); // needs only a little → sells one upgrade off the tallest
    expect(s.cities[0].level).toBe(1);
    expect(s.players[0].cash).toBe(Math.floor(upgradeCost(0) * 0.5));
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/helpers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/engine/helpers.ts
import {
  CITIES,
  ZONES,
  HUB_PRICE,
  HUB_RENT,
  SET_OWN_NEEDED,
  SET_BONUS_NW,
  BLEND,
  UPGRADE_SELL_RATIO,
  upgradeCost,
} from "./data";
import type { GameState } from "./state";

export function citiesOwned(s: GameState, seat: number): number[] {
  const out: number[] = [];
  for (let id = 0; id < s.cities.length; id++) if (s.cities[id].owner === seat) out.push(id);
  return out;
}

export function controlsSet(s: GameState, seat: number, zone: number): boolean {
  let n = 0;
  for (let id = 0; id < CITIES.length; id++) {
    const c = s.cities[id];
    if (CITIES[id].zone === zone && c.owner === seat && !c.mortgaged) n++;
  }
  return n >= SET_OWN_NEEDED;
}

export function controlledSets(s: GameState, seat: number): number {
  let n = 0;
  for (let z = 0; z < ZONES.length; z++) if (controlsSet(s, seat, z)) n++;
  return n;
}

export function rentFor(s: GameState, cityId: number): number {
  const c = s.cities[cityId];
  if (c.owner === null || c.mortgaged) return 0;
  const ladder = CITIES[cityId].rent; // levels 0..6
  let rent: number;
  if (c.level >= 1) rent = ladder[c.level];
  else if (controlsSet(s, c.owner, CITIES[cityId].zone)) rent = ladder[0] * 2; // zone control doubles undeveloped base
  else rent = ladder[0];
  // Scrappy Landlord: owner holds ≤3 cities total → ×1.25
  if (citiesOwned(s, c.owner).length <= 3) rent = Math.round(rent * 1.25);
  return rent;
}

export function hubsOwned(s: GameState, seat: number): number {
  return s.hubs.filter((o) => o === seat).length;
}

export function hubRentFor(s: GameState, hubIndex: number): number {
  const owner = s.hubs[hubIndex];
  if (owner === null) return 0;
  return HUB_RENT[hubsOwned(s, owner)];
}

export function netWorth(s: GameState, seat: number): number {
  let nw = s.players[seat].cash;
  for (let id = 0; id < s.cities.length; id++) {
    const c = s.cities[id];
    if (c.owner !== seat) continue;
    nw += CITIES[id].price * (c.mortgaged ? 0.35 : 0.5);
    nw += c.level * upgradeCost(id) * 0.5;
  }
  nw += hubsOwned(s, seat) * HUB_PRICE * 0.5;
  nw += controlledSets(s, seat) * SET_BONUS_NW;
  return nw;
}

export function scoreOf(s: GameState, seat: number): number {
  const cash = s.players[seat].cash;
  return cash + BLEND * (netWorth(s, seat) - cash);
}

export function credit(s: GameState, seat: number, amount: number): void {
  s.players[seat].cash += amount;
}

/** Sell upgrades (tallest first) then mortgage undeveloped until cash ≥ need or nothing left. */
export function liquidate(s: GameState, seat: number, need: number): void {
  // 1. Sell upgrades — always take from the currently tallest owned city (keeps levels even).
  while (s.players[seat].cash < need) {
    let best = -1;
    let bestLevel = 0;
    for (const id of citiesOwned(s, seat)) {
      if (s.cities[id].level > bestLevel) {
        bestLevel = s.cities[id].level;
        best = id;
      }
    }
    if (best < 0) break;
    s.cities[best].level--;
    s.players[seat].cash += Math.floor(upgradeCost(best) * UPGRADE_SELL_RATIO);
  }
  // 2. Mortgage undeveloped, unmortgaged cities.
  for (const id of citiesOwned(s, seat)) {
    if (s.players[seat].cash >= need) break;
    const c = s.cities[id];
    if (c.level === 0 && !c.mortgaged) {
      c.mortgaged = true;
      s.players[seat].cash += Math.floor(CITIES[id].price / 2);
    }
  }
}

/** Move money from `from` to `to` (seat or "pot"), liquidating as needed; forgives any shortfall. Returns amount actually paid. */
export function charge(s: GameState, from: number, amount: number, to: number | "pot"): number {
  if (s.players[from].cash < amount) liquidate(s, from, amount);
  const paid = Math.min(amount, s.players[from].cash);
  s.players[from].cash -= paid;
  if (to === "pot") s.pot += paid;
  else s.players[to].cash += paid;
  return paid;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/helpers.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/helpers.ts tests/vyapaar/helpers.test.ts
git commit -m "feat(vyapaar): money/ownership/rent/score helpers"
```

---

### Task 6: `cards.ts` — event-card opcodes

**Files:**
- Create: `src/modules/vyapaar/engine/cards.ts`
- Test: `tests/vyapaar/cards.test.ts`

**Interfaces:**
- Consumes: `data.ts`, `state.ts`, `helpers.ts`.
- Produces: `drawCard(s, deck: "headline" | "upi"): { card: Card; events: EngineEvent[] }` — pops the top of the named deck (reshuffling a fresh deck when empty), applies its opcode to `s`, returns the card + events.

**Opcode semantics (apply to the active player unless noted):**
- `cash` → `credit(active, val)`.
- `cashAll` → every player `+val`.
- `collectEach` → active collects `val` from **each** other player (via `charge(other, val, active)`).
- `feePerCity` → active pays `val * citiesOwned(active).length` to the pot.
- `feeToPot` → active pays `val` to the pot.
- `startup` → active `+val` cash; `startupLaps = 3`, `startupPenalty = 300`.
- `perHeritage` → active `+val * (North-zone cities owned)` (zone 0 — v2 has no "Heritage" group).
- `perSet` → active `+val * controlledSets(active)`.
- `skipNext` → active `halted += 1`.
- `freeUpgrade` → auto-apply one legal even-build upgrade in a controlled set (cheapest legal city, level up by 1, free); no-op if none legal. Also increments `freeUpgrades` for audit.
- `downgradeRival` → drop the single highest rival building by one level (tie → lowest cityId); no-op if no rival building.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/cards.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyCard } from "@/modules/vyapaar/engine/cards";
import { citiesOwned } from "@/modules/vyapaar/engine/helpers";

describe("card opcodes", () => {
  it("cashAll credits every player", () => {
    const s = createGame(1, ["a", "b", "c"]);
    const before = s.players.map((p) => p.cash);
    applyCard(s, { id: "diwali", op: "cashAll", val: 900 });
    expect(s.players.map((p) => p.cash)).toEqual(before.map((c) => c + 900));
  });

  it("collectEach moves cash from every other player to the active player", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.active = 0;
    applyCard(s, { id: "bollywood", op: "collectEach", val: 300 });
    expect(s.players[0].cash).toBe(7500 + 600);
    expect(s.players[1].cash).toBe(7500 - 300);
    expect(s.players[2].cash).toBe(7500 - 300);
  });

  it("feePerCity charges the pot per owned city", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[1].owner = 0;
    applyCard(s, { id: "fuel", op: "feePerCity", val: 150 });
    expect(s.pot).toBe(300);
    expect(s.players[0].cash).toBe(7500 - 300);
  });

  it("startup grants cash and a 3-lap salary penalty", () => {
    const s = createGame(1, ["a", "b"]);
    applyCard(s, { id: "startup", op: "startup", val: 1800 });
    expect(s.players[0].cash).toBe(7500 + 1800);
    expect(s.players[0].startupLaps).toBe(3);
    expect(s.players[0].startupPenalty).toBe(300);
  });

  it("freeUpgrade builds one level on a controlled set for free", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[1].owner = 0;
    s.cities[2].owner = 0; // Heritage set controlled
    const cashBefore = s.players[0].cash;
    applyCard(s, { id: "boom", op: "freeUpgrade" });
    const total = citiesOwned(s, 0).reduce((n, id) => n + s.cities[id].level, 0);
    expect(total).toBe(1);
    expect(s.players[0].cash).toBe(cashBefore); // free
  });

  it("downgradeRival drops the tallest rival building", () => {
    const s = createGame(1, ["a", "b"]);
    s.active = 0;
    s.cities[5].owner = 1;
    s.cities[5].level = 3;
    applyCard(s, { id: "demolition", op: "downgradeRival" });
    expect(s.cities[5].level).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/cards.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/engine/cards.ts
import { CITIES, ZONES, HEADLINE, UPI, MAX_LEVEL } from "./data";
import type { Card } from "./data";
import type { GameState, EngineEvent } from "./state";
import { shuffle } from "./rng";
import { credit, charge, citiesOwned, controlsSet, controlledSets } from "./helpers";

/** Lowest even-build-legal level among owned cities of a controlled zone, for a free build. */
function firstFreeUpgradeCity(s: GameState, seat: number): number | null {
  let best: number | null = null;
  for (let z = 0; z < ZONES.length; z++) {
    if (!controlsSet(s, seat, z)) continue;
    const ids = citiesOwned(s, seat).filter(
      (id) => CITIES[id].zone === z && !s.cities[id].mortgaged,
    );
    const minLevel = Math.min(...ids.map((id) => s.cities[id].level));
    for (const id of ids) {
      if (s.cities[id].level === minLevel && s.cities[id].level < MAX_LEVEL) {
        // cheapest legal city that keeps building even
        if (best === null || CITIES[id].price < CITIES[best].price) best = id;
      }
    }
  }
  return best;
}

export function applyCard(s: GameState, card: Card): EngineEvent[] {
  const seat = s.active;
  const val = card.val ?? 0;
  const events: EngineEvent[] = [{ type: "card", seat, card: card.id }];
  switch (card.op) {
    case "cash":
      credit(s, seat, val);
      break;
    case "cashAll":
      s.players.forEach((_, i) => credit(s, i, val));
      break;
    case "collectEach":
      s.players.forEach((_, i) => {
        if (i !== seat) charge(s, i, val, seat);
      });
      break;
    case "feePerCity":
      charge(s, seat, val * citiesOwned(s, seat).length, "pot");
      break;
    case "feeToPot":
      charge(s, seat, val, "pot");
      break;
    case "startup":
      credit(s, seat, val);
      s.players[seat].startupLaps = 3;
      s.players[seat].startupPenalty = 300;
      break;
    case "perHeritage": {
      // v2 has no "Heritage" group; the tourism card now counts North-zone (zone 0) cities.
      const n = citiesOwned(s, seat).filter((id) => CITIES[id].zone === 0).length;
      credit(s, seat, val * n);
      break;
    }
    case "perSet":
      credit(s, seat, val * controlledSets(s, seat));
      break;
    case "skipNext":
      s.players[seat].halted += 1;
      break;
    case "freeUpgrade": {
      const id = firstFreeUpgradeCity(s, seat);
      s.players[seat].freeUpgrades += 1;
      if (id !== null) {
        s.cities[id].level += 1;
        events.push({ type: "free_upgrade", seat, cityId: id });
      }
      break;
    }
    case "downgradeRival": {
      let best = -1;
      let bestLevel = 0;
      for (let id = 0; id < s.cities.length; id++) {
        const c = s.cities[id];
        if (c.owner !== null && c.owner !== seat && c.level > bestLevel) {
          bestLevel = c.level;
          best = id;
        }
      }
      if (best >= 0) {
        s.cities[best].level -= 1;
        events.push({ type: "downgrade", cityId: best });
      }
      break;
    }
  }
  return events;
}

export function drawCard(
  s: GameState,
  deck: "headline" | "upi",
): { card: Card; events: EngineEvent[] } {
  const order = deck === "headline" ? s.headlineDeck : s.upiDeck;
  const cards = deck === "headline" ? HEADLINE : UPI;
  if (order.length === 0) {
    const fresh = shuffle(cards.map((_, i) => i), s);
    if (deck === "headline") s.headlineDeck = fresh;
    else s.upiDeck = fresh;
  }
  const idx = (deck === "headline" ? s.headlineDeck : s.upiDeck).shift() as number;
  const card = cards[idx];
  return { card, events: applyCard(s, card) };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/cards.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/cards.ts tests/vyapaar/cards.test.ts
git commit -m "feat(vyapaar): event-card opcodes and deck draw"
```

---

### Task 7: `engine.ts` part 1 — `roll`, movement, salary, `resolveTile`

**Files:**
- Create: `src/modules/vyapaar/engine/engine.ts`
- Test: `tests/vyapaar/roll.test.ts`

**Interfaces:**
- Consumes: all prior engine files.
- Produces: `applyIntent(s: GameState, seat: number, intent: Intent): { state: GameState; events: EngineEvent[] } | { error: string }`. This task implements ONLY the `roll` intent and its internal `resolveTile`; other intent types return `{ error: "not_implemented" }` for now (later tasks fill them in — DO NOT delete the stubs, extend the switch). `applyIntent` mutates and returns the same `state` object.
- Internal (not exported): `resolveTile(s)`, `passStartSalary(s, seat)`, `finishSegment(s)`.

**Design notes for the implementer:**
- `applyIntent` first rejects the wrong actor: `roll`/`buy`/`decline`/`develop`/`mortgage`/`unmortgage`/`end_turn` require `seat === s.active`; `bid`/`propose_trade`/`respond_trade` may come from other seats (validated in their own tasks). Reject any intent when `s.ended`.
- `roll` requires `s.phase === "roll"`.
- **Halted:** if `players[seat].halted > 0`, a roll of doubles frees them (`halted = 0`, then move normally); otherwise `halted--`, no move, `finishSegment` with no double.
- **Doubles:** increment `players[seat].doubles`; on the **third** double send to jail (`pos = 10`, `halted = 2`, `doubles = 0`, `pendingDouble = false`, `phase = "manage"`) and stop.
- **Move & salary:** `passed = pos + a + b >= 40`; `pos = (pos + a + b) % 40`; if `passed`, `passStartSalary`.
- `passStartSalary`: base = underdog? `SALARY_UNDERDOG` : `SALARY`; if `startupLaps > 0` then subtract `startupPenalty` and `startupLaps--`; credit the (floored at 0) result. Underdog = `netWorth(seat)` is the strict minimum **and** `< 0.6 * maxNetWorth` with `maxNetWorth > 0`.
- `finishSegment`: if `pendingDouble` (last roll was a double and not jailed) → `phase = "roll"` (roll again); else `phase = "manage"`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/roll.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";

// Force dice by pre-setting rng so the first roll is deterministic; instead we
// assert on invariants that hold for ANY roll to stay robust.
describe("roll intent", () => {
  it("rejects a roll from a non-active seat", () => {
    const s = createGame(1, ["a", "b"]);
    const r = applyIntent(s, 1, { type: "roll" });
    expect("error" in r).toBe(true);
  });

  it("moves the active player and leaves a valid phase", () => {
    const s = createGame(1, ["a", "b"]);
    const r = applyIntent(s, 0, { type: "roll" });
    expect("state" in r).toBe(true);
    if ("state" in r) {
      expect(s.players[0].pos).toBeGreaterThanOrEqual(0);
      expect(s.players[0].pos).toBeLessThan(40);
      expect(["roll", "buy", "manage", "auction"]).toContain(s.phase);
    }
  });

  it("pays salary when passing start", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].pos = 38; // any roll ≥2 wraps past start
    applyIntent(s, 0, { type: "roll" });
    expect(s.players[0].cash).toBeGreaterThanOrEqual(7500); // salary added (unless it landed on a fee tile that took more — assert ≥ opening minus max fee is fragile; salary path covered explicitly below)
  });

  it("frees a halted player only on doubles, else decrements halt", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].halted = 2;
    applyIntent(s, 0, { type: "roll" });
    // either freed (halted 0 and moved) or still halted (halted 1, pos 0)
    expect([0, 1]).toContain(s.players[0].halted);
    expect(s.phase === "manage" || s.phase === "buy" || s.phase === "roll").toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/roll.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/engine/engine.ts
import {
  SALARY,
  SALARY_UNDERDOG,
  GST_RATE,
  GST_CAP,
  TAX_INCOME,
} from "./data";
import type { GameState, Intent, EngineEvent } from "./state";
import { BOARD } from "./board";
import { rollDie } from "./rng";
import {
  rentFor,
  hubRentFor,
  netWorth,
  charge,
  credit,
} from "./helpers";
import { drawCard } from "./cards";

type Result = { state: GameState; events: EngineEvent[] } | { error: string };

const ACTIVE_ONLY = new Set<Intent["type"]>([
  "roll",
  "buy",
  "decline",
  "develop",
  "mortgage",
  "unmortgage",
  "end_turn",
]);

function isUnderdog(s: GameState, seat: number): boolean {
  const nws = s.players.map((_, i) => netWorth(s, i));
  const mine = nws[seat];
  const max = Math.max(...nws);
  if (max <= 0) return false;
  const isMin = nws.every((v, i) => i === seat || v >= mine) && nws.some((v, i) => i !== seat && v > mine);
  return isMin && mine < 0.6 * max;
}

function passStartSalary(s: GameState, seat: number, events: EngineEvent[]): void {
  let pay = isUnderdog(s, seat) ? SALARY_UNDERDOG : SALARY;
  const p = s.players[seat];
  if (p.startupLaps > 0) {
    pay -= p.startupPenalty;
    p.startupLaps--;
  }
  pay = Math.max(0, pay);
  credit(s, seat, pay);
  events.push({ type: "salary", seat, amount: pay });
}

/** Finish the current move segment: roll again on a double, else manage phase. */
function finishSegment(s: GameState): void {
  s.phase = s.pendingDouble ? "roll" : "manage";
}

function resolveTile(s: GameState, events: EngineEvent[]): void {
  const seat = s.active;
  const tile = BOARD[s.players[seat].pos];
  switch (tile.kind) {
    case "start":
    case "monsoon": // just visiting
      finishSegment(s);
      break;
    case "mandi":
      credit(s, seat, s.pot);
      events.push({ type: "mandi", seat, amount: s.pot });
      s.pot = 0;
      finishSegment(s);
      break;
    case "taxraid":
      s.players[seat].pos = 10;
      s.players[seat].halted = 2;
      s.pendingDouble = false;
      events.push({ type: "taxraid", seat });
      s.phase = "manage";
      break;
    case "gst": {
      const amt = Math.min(GST_CAP, Math.round(s.players[seat].cash * GST_RATE));
      charge(s, seat, amt, "pot");
      events.push({ type: "gst", seat, amount: amt });
      finishSegment(s);
      break;
    }
    case "income":
      charge(s, seat, TAX_INCOME, "pot");
      events.push({ type: "income", seat, amount: TAX_INCOME });
      finishSegment(s);
      break;
    case "upi": {
      const { card } = drawCard(s, "upi");
      events.push({ type: "draw", seat, deck: "upi", card: card.id });
      finishSegment(s);
      break;
    }
    case "headline": {
      const { card } = drawCard(s, "headline");
      events.push({ type: "draw", seat, deck: "headline", card: card.id });
      finishSegment(s);
      break;
    }
    case "hub": {
      const hi = tile.hubIndex as number;
      const owner = s.hubs[hi];
      if (owner === null) {
        s.pendingHub = hi;
        s.phase = "buy";
      } else if (owner !== seat) {
        const rent = hubRentFor(s, hi);
        charge(s, seat, rent, owner);
        events.push({ type: "hub_rent", seat, hubIndex: hi, amount: rent });
        finishSegment(s);
      } else {
        finishSegment(s);
      }
      break;
    }
    case "city": {
      const id = tile.cityId as number;
      const owner = s.cities[id].owner;
      if (owner === null) {
        s.pendingCity = id;
        s.phase = "buy";
      } else if (owner !== seat) {
        const rent = rentFor(s, id);
        charge(s, seat, rent, owner);
        events.push({ type: "rent", seat, cityId: id, to: owner, amount: rent });
        finishSegment(s);
      } else {
        finishSegment(s);
      }
      break;
    }
  }
}

export function applyIntent(s: GameState, seat: number, intent: Intent): Result {
  if (s.ended) return { error: "game_over" };
  if (ACTIVE_ONLY.has(intent.type) && seat !== s.active) return { error: "not_your_turn" };
  const events: EngineEvent[] = [];

  switch (intent.type) {
    case "roll": {
      if (s.phase !== "roll") return { error: "cannot_roll_now" };
      const p = s.players[seat];
      const a = rollDie(s);
      const b = rollDie(s);
      const isDouble = a === b;
      events.push({ type: "roll", seat, a, b });

      if (p.halted > 0) {
        if (isDouble) {
          p.halted = 0;
        } else {
          p.halted--;
          s.pendingDouble = false;
          s.phase = "manage";
          return { state: s, events };
        }
      }

      p.doubles += isDouble ? 1 : 0;
      s.pendingDouble = isDouble;
      if (isDouble && p.doubles >= 3) {
        p.pos = 10;
        p.halted = 2;
        p.doubles = 0;
        s.pendingDouble = false;
        s.phase = "manage";
        events.push({ type: "jail_doubles", seat });
        return { state: s, events };
      }

      const sum = p.pos + a + b;
      if (sum >= 40) passStartSalary(s, seat, events);
      p.pos = sum % 40;
      resolveTile(s, events);
      return { state: s, events };
    }
    default:
      return { error: "not_implemented" };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/roll.test.ts`
Expected: PASS. (The salary test may occasionally land on a fee tile; if it proves flaky, set `s.rng` to a value whose first two rolls are known — but the wrap-past-start salary credit runs *before* tile resolution, so `cash ≥ 7500` holds unless the tile is gst/income/rent. If flaky, change that test to seat the player at `pos = 0` and assert the `salary` event appears in `events` instead.)

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/engine.ts tests/vyapaar/roll.test.ts
git commit -m "feat(vyapaar): roll, movement, salary, tile resolution"
```

---

### Task 8: `engine.ts` part 2 — `buy`, `decline`, `bid` (auctions)

**Files:**
- Modify: `src/modules/vyapaar/engine/engine.ts` (extend the `applyIntent` switch)
- Test: `tests/vyapaar/buy-auction.test.ts`

**Interfaces:**
- Consumes: Task 7's `applyIntent` + `finishSegment`.
- Produces: handlers for `buy`, `decline`, `bid`. Internal `resolveAuction(s, events)`.

**Design notes:**
- `buy` (phase `buy`, active): if `pendingCity !== null` — cost = `CITIES[id].price`; if `cash < cost` return `{ error: "insufficient_funds" }`; else deduct, set owner, clear `pendingCity`, then `finishSegment`. If `pendingHub !== null` — same with `HUB_PRICE`, set `hubs[hi] = seat`.
- `decline` (phase `buy`, active): if `pendingHub !== null` — hubs are **not** auctioned; clear it, `finishSegment`. If `pendingCity !== null` — open a sealed-bid auction: `auction = { cityId, bids: players.map(() => null) }`, `phase = "auction"` (leave `pendingCity` set as the auctioned city).
- `bid` (phase `auction`, ANY seat): `amount` integer `≥ 0` and `≤ that seat's cash`; record `bids[seat]`. When every seat has bid, `resolveAuction`: highest `amount > 0` wins (tie → lowest seat index); winner pays their bid to the bank (cash out, not to pot), city owner = winner; all-zero → nobody buys. Clear `auction` + `pendingCity`, then `finishSegment` (based on the **active** player's `pendingDouble`).

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/buy-auction.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { CITIES } from "@/modules/vyapaar/engine/data";

function landActiveOnCity(s: ReturnType<typeof createGame>, cityId: number) {
  // put the active player into the buy phase for a specific city
  s.phase = "buy";
  s.pendingCity = cityId;
  s.pendingDouble = false;
}

describe("buy / decline / auction", () => {
  it("buys the pending city and deducts its price", () => {
    const s = createGame(1, ["a", "b"]);
    landActiveOnCity(s, 24); // Jabalpur 3500 (affordable on the 7500 default)
    const r = applyIntent(s, 0, { type: "buy" });
    expect("state" in r).toBe(true);
    expect(s.cities[24].owner).toBe(0);
    expect(s.players[0].cash).toBe(7500 - CITIES[24].price);
    expect(s.phase).toBe("manage");
  });

  it("rejects buying when short on cash", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 10;
    landActiveOnCity(s, 0); // Delhi 9000
    const r = applyIntent(s, 0, { type: "buy" });
    expect("error" in r).toBe(true);
    expect(s.cities[0].owner).toBeNull();
  });

  it("declining a city opens an auction; highest bid wins and pays", () => {
    const s = createGame(1, ["a", "b", "c"]);
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    expect(s.phase).toBe("auction");
    applyIntent(s, 0, { type: "bid", amount: 100 });
    applyIntent(s, 1, { type: "bid", amount: 500 });
    applyIntent(s, 2, { type: "bid", amount: 0 });
    expect(s.cities[0].owner).toBe(1);
    expect(s.players[1].cash).toBe(7500 - 500);
    expect(s.auction).toBeNull();
    expect(s.phase).toBe("manage");
  });

  it("all-zero auction leaves the city unowned", () => {
    const s = createGame(1, ["a", "b"]);
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    applyIntent(s, 0, { type: "bid", amount: 0 });
    applyIntent(s, 1, { type: "bid", amount: 0 });
    expect(s.cities[0].owner).toBeNull();
    expect(s.phase).toBe("manage");
  });

  it("ties go to the lowest seat index", () => {
    const s = createGame(1, ["a", "b"]);
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    applyIntent(s, 0, { type: "bid", amount: 300 });
    applyIntent(s, 1, { type: "bid", amount: 300 });
    expect(s.cities[0].owner).toBe(0);
  });

  it("rejects a bid above the seat's cash", () => {
    const s = createGame(1, ["a", "b"]);
    landActiveOnCity(s, 0);
    applyIntent(s, 0, { type: "decline" });
    const r = applyIntent(s, 1, { type: "bid", amount: 999999 });
    expect("error" in r).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/buy-auction.test.ts`
Expected: FAIL — `buy`/`decline`/`bid` return `not_implemented`.

- [ ] **Step 3: Write the implementation**

Add these imports at the top of `engine.ts`:

```ts
import { CITIES, HUB_PRICE } from "./data";
```

(Merge with the existing `./data` import — `CITIES`/`HUB_PRICE` alongside the salary/tax constants.)

Add a `resolveAuction` helper above `applyIntent`:

```ts
function resolveAuction(s: GameState, events: EngineEvent[]): void {
  const a = s.auction!;
  let winner = -1;
  let best = 0;
  a.bids.forEach((bid, seat) => {
    const amt = bid ?? 0;
    if (amt > best) {
      best = amt;
      winner = seat;
    }
  });
  if (winner >= 0 && best > 0) {
    s.players[winner].cash -= best;
    s.cities[a.cityId].owner = winner;
    events.push({ type: "auction_won", seat: winner, cityId: a.cityId, amount: best });
  } else {
    events.push({ type: "auction_passed", cityId: a.cityId });
  }
  s.auction = null;
  s.pendingCity = null;
  finishSegment(s);
}
```

Replace the `default:` arm of the switch with these cases (keep `default` returning `not_implemented`):

```ts
    case "buy": {
      if (s.phase !== "buy") return { error: "nothing_to_buy" };
      if (s.pendingCity !== null) {
        const id = s.pendingCity;
        const cost = CITIES[id].price;
        if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
        s.players[seat].cash -= cost;
        s.cities[id].owner = seat;
        s.pendingCity = null;
        events.push({ type: "buy", seat, cityId: id, amount: cost });
        finishSegment(s);
        return { state: s, events };
      }
      if (s.pendingHub !== null) {
        const hi = s.pendingHub;
        if (s.players[seat].cash < HUB_PRICE) return { error: "insufficient_funds" };
        s.players[seat].cash -= HUB_PRICE;
        s.hubs[hi] = seat;
        s.pendingHub = null;
        events.push({ type: "buy_hub", seat, hubIndex: hi, amount: HUB_PRICE });
        finishSegment(s);
        return { state: s, events };
      }
      return { error: "nothing_to_buy" };
    }

    case "decline": {
      if (s.phase !== "buy") return { error: "nothing_to_decline" };
      if (s.pendingHub !== null) {
        s.pendingHub = null; // hubs are not auctioned
        finishSegment(s);
        return { state: s, events };
      }
      if (s.pendingCity !== null) {
        s.auction = { cityId: s.pendingCity, bids: s.players.map(() => null) };
        s.phase = "auction";
        events.push({ type: "auction_start", cityId: s.pendingCity });
        return { state: s, events };
      }
      return { error: "nothing_to_decline" };
    }

    case "bid": {
      if (s.phase !== "auction" || !s.auction) return { error: "no_auction" };
      if (!Number.isInteger(intent.amount) || intent.amount < 0) return { error: "bad_bid" };
      if (intent.amount > s.players[seat].cash) return { error: "bid_exceeds_cash" };
      if (s.auction.bids[seat] !== null) return { error: "already_bid" };
      s.auction.bids[seat] = intent.amount;
      events.push({ type: "bid", seat, amount: intent.amount });
      if (s.auction.bids.every((b) => b !== null)) resolveAuction(s, events);
      return { state: s, events };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/buy-auction.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/engine.ts tests/vyapaar/buy-auction.test.ts
git commit -m "feat(vyapaar): buy, decline, and sealed-bid auctions"
```

---

### Task 9: `engine.ts` part 3 — `develop`, `mortgage`, `unmortgage`

**Files:**
- Modify: `src/modules/vyapaar/engine/engine.ts`
- Test: `tests/vyapaar/develop-mortgage.test.ts`

**Interfaces:**
- Consumes: Task 8 engine, `helpers.controlsSet`.
- Produces: handlers for `develop`, `mortgage`, `unmortgage`. Internal `minSetLevel(s, seat, group)`.

**Design notes:**
- `develop` (active, phase `roll` or `manage`): city owned by active; `controlsSet(active, zone)` true; not mortgaged; `level < MAX_LEVEL` (=6); **even-building** — `level` must equal the minimum unmortgaged level in that zone (can't exceed min). Cost `upgradeCost(cityId)`; require cash ≥ cost; deduct; `level++`.
- `mortgage` (active, phase `roll` or `manage`): owned by active; `level === 0`; not mortgaged. `cash += floor(price/2)`; `mortgaged = true`.
- `unmortgage` (active, phase `roll` or `manage`): owned by active; mortgaged. cost `round(price * UNMORTGAGE_RATE)`; require cash ≥ cost; deduct; `mortgaged = false`.
- Validate `cityId` is an integer in `0..24` first; else `{ error: "bad_city" }`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/develop-mortgage.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { CITIES, UNMORTGAGE_RATE, upgradeCost } from "@/modules/vyapaar/engine/data";

function ownNorthSet(s: ReturnType<typeof createGame>) {
  s.cities[0].owner = 0;
  s.cities[1].owner = 0;
  s.cities[2].owner = 0; // controls North (zone 0)
  s.phase = "manage";
}

describe("develop / mortgage", () => {
  it("develops only on a controlled set, enforcing even-building", () => {
    const s = createGame(1, ["a", "b"]);
    ownNorthSet(s);
    const cost = upgradeCost(0);
    const r = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("state" in r).toBe(true);
    expect(s.cities[0].level).toBe(1);
    expect(s.players[0].cash).toBe(7500 - cost);
    // even-building: can't take city 0 to level 2 while 1 and 2 are still level 0
    const r2 = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("error" in r2).toBe(true);
    expect(s.cities[0].level).toBe(1);
  });

  it("refuses development without set control", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0; // only one city
    s.phase = "manage";
    const r = applyIntent(s, 0, { type: "develop", cityId: 0 });
    expect("error" in r).toBe(true);
  });

  it("mortgages an undeveloped city for half price and blocks mortgaging a developed one", () => {
    const s = createGame(1, ["a", "b"]);
    ownNorthSet(s);
    applyIntent(s, 0, { type: "mortgage", cityId: 1 });
    expect(s.cities[1].mortgaged).toBe(true);
    expect(s.players[0].cash).toBe(7500 + Math.floor(CITIES[1].price / 2));
    // develop city 0 then it can't be mortgaged
    // (city 0 is level 0, set no longer controlled since city 1 mortgaged — re-own to test mortgage block)
    s.cities[1].mortgaged = false;
    s.cities[0].level = 1;
    const r = applyIntent(s, 0, { type: "mortgage", cityId: 0 });
    expect("error" in r).toBe(true);
  });

  it("unmortgages at price*0.55 rounded", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[0].mortgaged = true;
    s.phase = "manage";
    const cost = Math.round(CITIES[0].price * UNMORTGAGE_RATE);
    applyIntent(s, 0, { type: "unmortgage", cityId: 0 });
    expect(s.cities[0].mortgaged).toBe(false);
    expect(s.players[0].cash).toBe(7500 - cost);
  });

  it("rejects an out-of-range cityId", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "manage";
    const r = applyIntent(s, 0, { type: "develop", cityId: 999 });
    expect("error" in r).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/develop-mortgage.test.ts`
Expected: FAIL — handlers return `not_implemented`.

- [ ] **Step 3: Write the implementation**

Add imports (merge into existing `./data` and `./helpers` imports):

```ts
import { MAX_LEVEL, UNMORTGAGE_RATE, upgradeCost } from "./data";
import { controlsSet, citiesOwned } from "./helpers";
```

Add a helper above `applyIntent`:

```ts
function minSetLevel(s: GameState, seat: number, zone: number): number {
  const ids = citiesOwned(s, seat).filter(
    (id) => CITIES[id].zone === zone && !s.cities[id].mortgaged,
  );
  return ids.length ? Math.min(...ids.map((id) => s.cities[id].level)) : 0;
}

function canManage(s: GameState): boolean {
  return s.phase === "roll" || s.phase === "manage";
}
```

Add these cases to the switch (before `default`):

```ts
    case "develop": {
      if (!canManage(s)) return { error: "cannot_manage_now" };
      const id = intent.cityId;
      if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return { error: "bad_city" };
      const c = s.cities[id];
      const z = CITIES[id].zone;
      if (c.owner !== seat) return { error: "not_owner" };
      if (c.mortgaged) return { error: "mortgaged" };
      if (!controlsSet(s, seat, z)) return { error: "no_set_control" };
      if (c.level >= MAX_LEVEL) return { error: "max_level" };
      if (c.level > minSetLevel(s, seat, z)) return { error: "uneven_build" };
      const cost = upgradeCost(id);
      if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
      s.players[seat].cash -= cost;
      c.level++;
      events.push({ type: "develop", seat, cityId: id, level: c.level, amount: cost });
      return { state: s, events };
    }

    case "mortgage": {
      if (!canManage(s)) return { error: "cannot_manage_now" };
      const id = intent.cityId;
      if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return { error: "bad_city" };
      const c = s.cities[id];
      if (c.owner !== seat) return { error: "not_owner" };
      if (c.level !== 0) return { error: "sell_upgrades_first" };
      if (c.mortgaged) return { error: "already_mortgaged" };
      const raise = Math.floor(CITIES[id].price / 2);
      s.players[seat].cash += raise;
      c.mortgaged = true;
      events.push({ type: "mortgage", seat, cityId: id, amount: raise });
      return { state: s, events };
    }

    case "unmortgage": {
      if (!canManage(s)) return { error: "cannot_manage_now" };
      const id = intent.cityId;
      if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return { error: "bad_city" };
      const c = s.cities[id];
      if (c.owner !== seat) return { error: "not_owner" };
      if (!c.mortgaged) return { error: "not_mortgaged" };
      const cost = Math.round(CITIES[id].price * UNMORTGAGE_RATE);
      if (s.players[seat].cash < cost) return { error: "insufficient_funds" };
      s.players[seat].cash -= cost;
      c.mortgaged = false;
      events.push({ type: "unmortgage", seat, cityId: id, amount: cost });
      return { state: s, events };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/develop-mortgage.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/engine.ts tests/vyapaar/develop-mortgage.test.ts
git commit -m "feat(vyapaar): develop, mortgage, unmortgage"
```

---

### Task 10: `engine.ts` part 4 — `propose_trade`, `respond_trade`

**Files:**
- Modify: `src/modules/vyapaar/engine/engine.ts`
- Test: `tests/vyapaar/trade.test.ts`

**Interfaces:**
- Consumes: Task 9 engine.
- Produces: handlers for `propose_trade`, `respond_trade`. Internal `validTradeSide(s, seat, side)`.

**Design notes:**
- `propose_trade` (ANY seat — `from = seat`): reject if `s.trade !== null` (one pending offer at a time), if `intent.to === seat`, if `to` out of range. Validate both sides via `validTradeSide`: each listed city must be owned by the correct side, **level 0**, not mortgaged; `cash ≥ 0` and `≤ that side's cash`; no duplicate cityIds. Store `s.trade = { from: seat, to, give, get }`. No phase change.
- `respond_trade` (only `seat === s.trade.to`, else `{ error: "not_recipient" }`): if `!accept` → clear trade, event `trade_declined`. If `accept` → **re-validate both sides atomically** (assets may have changed); if invalid, clear the trade and return `{ error: "trade_invalid" }`. On success: move `give` cities from `from`→`to` and `get` cities from `to`→`from`; settle net cash (`from.cash += get.cash - give.cash`, `to.cash += give.cash - get.cash`); clear trade; event `trade_accepted`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/trade.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";

describe("trades", () => {
  it("swaps cities and settles net cash on accept", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0; // a owns Delhi (cityId 0)
    s.cities[6].owner = 1; // b owns Hyderabad (cityId 6)
    const r = applyIntent(s, 0, {
      type: "propose_trade",
      to: 1,
      give: { cash: 500, cities: [0] },
      get: { cash: 0, cities: [6] },
    });
    expect("state" in r).toBe(true);
    expect(s.trade).not.toBeNull();
    applyIntent(s, 1, { type: "respond_trade", accept: true });
    expect(s.cities[0].owner).toBe(1);
    expect(s.cities[6].owner).toBe(0);
    expect(s.players[0].cash).toBe(7500 - 500);
    expect(s.players[1].cash).toBe(7500 + 500);
    expect(s.trade).toBeNull();
  });

  it("only the recipient may respond", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.cities[0].owner = 0;
    applyIntent(s, 0, { type: "propose_trade", to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [] } });
    const r = applyIntent(s, 2, { type: "respond_trade", accept: true });
    expect("error" in r).toBe(true);
  });

  it("rejects proposing a developed city", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    s.cities[0].level = 1;
    const r = applyIntent(s, 0, { type: "propose_trade", to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [] } });
    expect("error" in r).toBe(true);
  });

  it("declining clears the pending offer", () => {
    const s = createGame(1, ["a", "b"]);
    s.cities[0].owner = 0;
    applyIntent(s, 0, { type: "propose_trade", to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [] } });
    applyIntent(s, 1, { type: "respond_trade", accept: false });
    expect(s.trade).toBeNull();
    expect(s.cities[0].owner).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/trade.test.ts`
Expected: FAIL — handlers return `not_implemented`.

- [ ] **Step 3: Write the implementation**

Add above `applyIntent`:

```ts
import type { TradeSide } from "./state";

function validTradeSide(s: GameState, seat: number, side: TradeSide): boolean {
  if (!Number.isInteger(side.cash) || side.cash < 0) return false;
  if (side.cash > s.players[seat].cash) return false;
  const seen = new Set<number>();
  for (const id of side.cities) {
    if (!Number.isInteger(id) || id < 0 || id >= CITIES.length) return false;
    if (seen.has(id)) return false;
    seen.add(id);
    const c = s.cities[id];
    if (c.owner !== seat || c.level !== 0 || c.mortgaged) return false;
  }
  return true;
}
```

Add cases to the switch:

```ts
    case "propose_trade": {
      if (s.trade !== null) return { error: "trade_pending" };
      const to = intent.to;
      if (!Number.isInteger(to) || to < 0 || to >= s.players.length || to === seat) {
        return { error: "bad_recipient" };
      }
      if (!validTradeSide(s, seat, intent.give)) return { error: "bad_give" };
      if (!validTradeSide(s, to, intent.get)) return { error: "bad_get" };
      s.trade = { from: seat, to, give: intent.give, get: intent.get };
      events.push({ type: "trade_proposed", seat, to });
      return { state: s, events };
    }

    case "respond_trade": {
      if (!s.trade) return { error: "no_trade" };
      if (seat !== s.trade.to) return { error: "not_recipient" };
      const t = s.trade;
      if (!intent.accept) {
        s.trade = null;
        events.push({ type: "trade_declined", seat });
        return { state: s, events };
      }
      // Atomic re-validation — assets may have changed since the proposal.
      if (!validTradeSide(s, t.from, t.give) || !validTradeSide(s, t.to, t.get)) {
        s.trade = null;
        return { error: "trade_invalid" };
      }
      for (const id of t.give.cities) s.cities[id].owner = t.to;
      for (const id of t.get.cities) s.cities[id].owner = t.from;
      s.players[t.from].cash += t.get.cash - t.give.cash;
      s.players[t.to].cash += t.give.cash - t.get.cash;
      s.trade = null;
      events.push({ type: "trade_accepted", from: t.from, to: t.to });
      return { state: s, events };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/trade.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/engine.ts tests/vyapaar/trade.test.ts
git commit -m "feat(vyapaar): atomic trades"
```

---

### Task 11: `engine.ts` part 5 — `end_turn`, round advance, end conditions, winner

**Files:**
- Modify: `src/modules/vyapaar/engine/engine.ts`
- Test: `tests/vyapaar/end-turn.test.ts`

**Interfaces:**
- Consumes: Task 10 engine, `helpers.controlledSets`, `helpers.scoreOf`.
- Produces: handler for `end_turn`; internal `endGame(s, events)`; exported `winnerOf(s): number` (highest score, tiebreak by controlled sets).

**Design notes:**
- `end_turn` (active, phase `manage` only — a pending double forces a re-roll, so `phase` will be `roll`, not `manage`): 
  - If `controlledSets(active) >= SETS_TO_END` → `s.endRequested = true`.
  - `wrapped = active + 1 >= players.length`; `active = (active + 1) % n`; if `wrapped` → `round++`.
  - Reset the **new** active player's `doubles = 0`, `s.pendingDouble = false`, `s.phase = "roll"`.
  - End check: if `round > MAX_ROUNDS` **or** (`endRequested && wrapped`) → `endGame`.
- `endGame`: `ended = true`; `winner = winnerOf(s)`; `phase = "manage"` (no further intents accepted because `ended` short-circuits `applyIntent`).
- `winnerOf`: max `scoreOf`; tie broken by `controlledSets` (higher wins); if still tied, lowest seat.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/end-turn.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, winnerOf } from "@/modules/vyapaar/engine/engine";

describe("end_turn and end conditions", () => {
  it("advances the seat and bumps the round on wrap", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "manage";
    applyIntent(s, 0, { type: "end_turn" });
    expect(s.active).toBe(1);
    expect(s.round).toBe(1);
    expect(s.phase).toBe("roll");
    applyIntent(s, 1, { type: "end_turn" });
    expect(s.active).toBe(0);
    expect(s.round).toBe(2);
  });

  it("refuses end_turn outside the manage phase", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "roll";
    const r = applyIntent(s, 0, { type: "end_turn" });
    expect("error" in r).toBe(true);
  });

  it("ends the game after MAX_ROUNDS", () => {
    const s = createGame(1, ["a", "b"]);
    s.round = 12; // MAX_ROUNDS
    s.active = 1; // ending this turn wraps → round 13 > 12
    s.phase = "manage";
    applyIntent(s, 1, { type: "end_turn" });
    expect(s.ended).toBe(true);
    expect(s.winner).not.toBeNull();
  });

  it("ends after the round completes once a player reaches 3 sets", () => {
    const s = createGame(1, ["a", "b"]);
    // seat 0 controls 3 full sets (groups 0,1,2 = cityIds 0..14)
    for (let id = 0; id <= 14; id++) s.cities[id].owner = 0;
    s.phase = "manage";
    applyIntent(s, 0, { type: "end_turn" }); // endRequested set, not wrapped yet
    expect(s.ended).toBe(false);
    expect(s.endRequested).toBe(true);
    applyIntent(s, 1, { type: "end_turn" }); // wraps → ends
    expect(s.ended).toBe(true);
    expect(winnerOf(s)).toBe(0);
  });

  it("winnerOf breaks ties by controlled sets", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 1000;
    s.players[1].cash = 1000;
    for (let id = 0; id <= 4; id++) s.cities[id].owner = 0; // seat 0 controls a set
    expect(winnerOf(s)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/end-turn.test.ts`
Expected: FAIL — `end_turn` returns `not_implemented`, `winnerOf` not exported.

- [ ] **Step 3: Write the implementation**

Add imports (merge): `import { SETS_TO_END, MAX_ROUNDS } from "./data";` and `import { controlledSets, scoreOf } from "./helpers";`.

Add above `applyIntent`:

```ts
export function winnerOf(s: GameState): number {
  let best = 0;
  for (let i = 1; i < s.players.length; i++) {
    const si = scoreOf(s, i);
    const sb = scoreOf(s, best);
    if (si > sb) best = i;
    else if (si === sb && controlledSets(s, i) > controlledSets(s, best)) best = i;
  }
  return best;
}

function endGame(s: GameState, events: EngineEvent[]): void {
  s.ended = true;
  s.winner = winnerOf(s);
  s.phase = "manage";
  events.push({ type: "game_over", seat: s.winner });
}
```

Add the `end_turn` case:

```ts
    case "end_turn": {
      if (s.phase !== "manage") return { error: "cannot_end_now" };
      if (controlledSets(s, seat) >= SETS_TO_END) s.endRequested = true;
      const wrapped = seat + 1 >= s.players.length;
      s.active = (seat + 1) % s.players.length;
      if (wrapped) s.round++;
      s.players[s.active].doubles = 0;
      s.pendingDouble = false;
      s.phase = "roll";
      events.push({ type: "end_turn", seat });
      if (s.round > MAX_ROUNDS || (s.endRequested && wrapped)) endGame(s, events);
      return { state: s, events };
    }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/end-turn.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/engine.ts tests/vyapaar/end-turn.test.ts
git commit -m "feat(vyapaar): end_turn, round advance, end conditions, winner"
```

---

### Task 12: `publicView` + `autoResolve`

**Files:**
- Create: `src/modules/vyapaar/engine/view.ts`
- Modify: `src/modules/vyapaar/engine/engine.ts` (add `autoResolve`)
- Test: `tests/vyapaar/view-autoresolve.test.ts`

**Interfaces:**
- `view.ts` produces `publicView(s: GameState, seat: number): PublicView` — a client-safe projection: strips `rng`, `seed`, and the deck ORDER (exposes only remaining counts `headlineLeft`/`upiLeft`); includes players (with `score` + `netWorth`), cities, hubs, pot, active, phase, round, auction (bids hidden until resolved — expose only which seats have bid), and the pending trade **only** for the recipient (`seat === trade.to`) or proposer (`seat === trade.from`). Type `PublicView` exported.
- `engine.ts` produces `autoResolve(s: GameState): { state: GameState; events: EngineEvent[] }` — the minimal-legal auto-play for a timed-out active player: if `phase === "roll"` → `roll`; if `phase === "buy"` → `decline`; if `phase === "auction"` → the active seat (and any seat that hasn't bid) bids `0`; if `phase === "manage"` → `end_turn`. Runs one legal step; the caller loops it until the active seat changes or the game ends.

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/view-autoresolve.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, autoResolve } from "@/modules/vyapaar/engine/engine";
import { publicView } from "@/modules/vyapaar/engine/view";

describe("publicView", () => {
  it("never leaks rng, seed, or deck order", () => {
    const s = createGame(123, ["a", "b"]);
    const v = publicView(s, 0) as Record<string, unknown>;
    expect(v.rng).toBeUndefined();
    expect(v.seed).toBeUndefined();
    expect(v.headlineDeck).toBeUndefined();
    expect(v.upiDeck).toBeUndefined();
    expect(typeof v.headlineLeft).toBe("number");
  });

  it("shows a pending trade only to the two parties", () => {
    const s = createGame(1, ["a", "b", "c"]);
    s.cities[0].owner = 0;
    applyIntent(s, 0, { type: "propose_trade", to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [] } });
    expect((publicView(s, 0) as Record<string, unknown>).trade).not.toBeNull();
    expect((publicView(s, 1) as Record<string, unknown>).trade).not.toBeNull();
    expect((publicView(s, 2) as Record<string, unknown>).trade).toBeNull();
  });
});

describe("autoResolve", () => {
  it("drives a stuck turn forward and eventually changes the active seat", () => {
    const s = createGame(9, ["a", "b"]);
    const startActive = s.active;
    let guard = 0;
    while (s.active === startActive && !s.ended && guard++ < 50) {
      autoResolve(s);
    }
    expect(s.active === startActive ? s.ended : true).toBe(true);
  });

  it("declines a buy when timed out", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "buy";
    s.pendingCity = 0;
    autoResolve(s);
    expect(s.cities[0].owner).toBeNull(); // declined → auction with all-zero later
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/view-autoresolve.test.ts`
Expected: FAIL — modules/exports missing.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/engine/view.ts
import type { GameState } from "./state";
import { scoreOf, netWorth } from "./helpers";

export interface PublicView {
  players: {
    name: string;
    cash: number;
    pos: number;
    halted: number;
    score: number;
    netWorth: number;
  }[];
  cities: { owner: number | null; level: number; mortgaged: boolean }[];
  hubs: (number | null)[];
  pot: number;
  active: number;
  phase: string;
  round: number;
  pendingCity: number | null;
  pendingHub: number | null;
  auction: { cityId: number; bidded: boolean[] } | null;
  trade: { from: number; to: number; give: unknown; get: unknown } | null;
  headlineLeft: number;
  upiLeft: number;
  ended: boolean;
  winner: number | null;
  you: number;
}

export function publicView(s: GameState, seat: number): PublicView {
  const showTrade = s.trade && (seat === s.trade.to || seat === s.trade.from);
  return {
    players: s.players.map((p, i) => ({
      name: p.name,
      cash: p.cash,
      pos: p.pos,
      halted: p.halted,
      score: scoreOf(s, i),
      netWorth: netWorth(s, i),
    })),
    cities: s.cities.map((c) => ({ owner: c.owner, level: c.level, mortgaged: c.mortgaged })),
    hubs: [...s.hubs],
    pot: s.pot,
    active: s.active,
    phase: s.phase,
    round: s.round,
    pendingCity: s.pendingCity,
    pendingHub: s.pendingHub,
    auction: s.auction
      ? { cityId: s.auction.cityId, bidded: s.auction.bids.map((b) => b !== null) }
      : null,
    trade: showTrade ? { from: s.trade!.from, to: s.trade!.to, give: s.trade!.give, get: s.trade!.get } : null,
    headlineLeft: s.headlineDeck.length,
    upiLeft: s.upiDeck.length,
    ended: s.ended,
    winner: s.winner,
    you: seat,
  };
}
```

Add `autoResolve` to `engine.ts`:

```ts
/** One minimal-legal step for a timed-out player. Caller loops until active changes or game ends. */
export function autoResolve(s: GameState): { state: GameState; events: EngineEvent[] } {
  if (s.ended) return { state: s, events: [] };
  const active = s.active;
  switch (s.phase) {
    case "roll":
      return applyIntent(s, active, { type: "roll" }) as { state: GameState; events: EngineEvent[] };
    case "buy":
      return applyIntent(s, active, { type: "decline" }) as { state: GameState; events: EngineEvent[] };
    case "auction": {
      // make every seat that hasn't bid pass, so the auction resolves
      const seat = s.auction!.bids.findIndex((b) => b === null);
      return applyIntent(s, seat, { type: "bid", amount: 0 }) as { state: GameState; events: EngineEvent[] };
    }
    case "manage":
      return applyIntent(s, active, { type: "end_turn" }) as { state: GameState; events: EngineEvent[] };
    default:
      return { state: s, events: [] };
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/view-autoresolve.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/modules/vyapaar/engine/view.ts src/modules/vyapaar/engine/engine.ts tests/vyapaar/view-autoresolve.test.ts
git commit -m "feat(vyapaar): publicView projection and autoResolve"
```

---

### Task 13: Determinism replay test + money-conservation property test

**Files:**
- Create: `src/modules/vyapaar/engine/replay.ts` (tiny helper — apply an action log)
- Test: `tests/vyapaar/determinism.test.ts`

**Interfaces:**
- `replay.ts` produces `replay(seed: number, names: string[], log: { seat: number; intent: Intent }[], openingCash?: number): GameState` — `createGame` then fold each `{seat,intent}` through `applyIntent`, ignoring entries that return an error (so a random-fuzz log still runs). Also `randomLegalLog(seed, names, steps)` for the property test: generate a log by repeatedly picking a legal intent via a seeded RNG and `autoResolve`-style heuristics, recording each successful `{seat,intent}`.
- The **money-conservation** invariant: at every step, `Σ players.cash + pot` may change ONLY by mint/burn deltas — salary/underdog credited, card `cash`/`cashAll`/`collectEach`(net zero)/`perHeritage`/`perSet`/`startup` credits, mandi payout (pot→cash, net zero), and forced-liquidation upgrade sale (mint) / mortgage (mint). To make the invariant checkable without enumerating every mint, assert the **weaker but robust** property: total money is **non-decreasing across bank-neutral transfers** is false (mints exist) — so instead assert that money only changes on steps whose events include a mint/burn event type, and is otherwise exactly conserved. See the test.

**Simpler, robust formulation used by the test:** classify each intent's events. If none of the events are in the MINT/BURN set (`salary`, `card`, `draw`, `mandi`, `develop`, `mortgage`, `unmortgage`, `buy`, `buy_hub`, `auction_won`, `free_upgrade`), then `Σcash + pot` must be **unchanged**. (`rent`, `hub_rent`, `gst`, `income`, `bid`, trades, `collectEach` are transfers among players/pot and conserve the cash+pot total — note gst/income move cash→pot, still inside the total; buy/develop/etc. move cash→bank, outside the total, hence flagged as burns; salary/mortgage/sale move bank→cash, mints.)

- [ ] **Step 1: Write the failing test**

```ts
// tests/vyapaar/determinism.test.ts
import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, autoResolve } from "@/modules/vyapaar/engine/engine";
import { replay } from "@/modules/vyapaar/engine/replay";
import { nextRng } from "@/modules/vyapaar/engine/rng";

function total(s: ReturnType<typeof createGame>): number {
  return s.players.reduce((n, p) => n + p.cash, 0) + s.pot;
}

// Events that move money in/out of the "cash + pot" universe (mint or burn).
const MINT_BURN = new Set([
  "salary",
  "card",
  "draw",
  "mandi",
  "develop",
  "mortgage",
  "unmortgage",
  "buy",
  "buy_hub",
  "auction_won",
  "free_upgrade",
  "downgrade",
]);

describe("determinism + money conservation", () => {
  it("replays a full auto-played game to the identical final state", () => {
    const names = ["a", "b", "c", "d"];
    const log: { seat: number; intent: import("@/modules/vyapaar/engine/state").Intent }[] = [];

    // Drive a full game via autoResolve, recording each successful concrete intent.
    const s = createGame(2026, names, 25000);
    let guard = 0;
    while (!s.ended && guard++ < 5000) {
      const active = s.active;
      const phase = s.phase;
      const intent =
        phase === "roll"
          ? { type: "roll" as const }
          : phase === "buy"
            ? { type: "decline" as const }
            : phase === "auction"
              ? { type: "bid" as const, amount: 0 }
              : { type: "end_turn" as const };
      const seat = phase === "auction" ? s.auction!.bids.findIndex((b) => b === null) : active;
      const before = JSON.stringify(s);
      const r = applyIntent(s, seat, intent);
      if ("state" in r) log.push({ seat, intent });
      else if (before !== JSON.stringify(s)) throw new Error("errored intent mutated state");
    }
    expect(s.ended).toBe(true);

    // Replaying the recorded log from the same seed reproduces the final state exactly.
    const s2 = replay(2026, names, log, 25000);
    expect(JSON.stringify(s2)).toBe(JSON.stringify(s));
  });

  it("conserves cash+pot except on explicit mint/burn steps (fuzz)", () => {
    const rngHolder = { rng: 4242 };
    for (let game = 0; game < 20; game++) {
      const n = 2 + Math.floor(nextRng(rngHolder) * 5); // 2..6
      const names = Array.from({ length: n }, (_, i) => `p${i}`);
      const s = createGame(1000 + game, names, 25000);
      let guard = 0;
      while (!s.ended && guard++ < 3000) {
        const before = total(s);
        const r = autoResolve(s);
        const events = "events" in r ? r.events : [];
        const touchedBank = events.some((e) => MINT_BURN.has(e.type));
        if (!touchedBank) {
          expect(total(s)).toBe(before); // pure transfer step conserves the total
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/vyapaar/determinism.test.ts`
Expected: FAIL — `replay` module missing.

- [ ] **Step 3: Write the implementation**

```ts
// src/modules/vyapaar/engine/replay.ts
import { createGame } from "./state";
import type { GameState, Intent } from "./state";
import { applyIntent } from "./engine";

export function replay(
  seed: number,
  names: string[],
  log: { seat: number; intent: Intent }[],
  openingCash?: number,
): GameState {
  const s = createGame(seed, names, openingCash);
  for (const { seat, intent } of log) {
    applyIntent(s, seat, intent); // errors are no-ops by construction of the log
  }
  return s;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run tests/vyapaar/determinism.test.ts`
Expected: PASS. If the money-conservation fuzz fails, the failing step's events reveal an untracked mint/burn — fix the ENGINE (not the test) so the money movement is intentional and event-tagged. This is the invariant catching a real port bug.

- [ ] **Step 5: Run the full engine suite + type-check**

Run: `npx vitest run tests/vyapaar/ && npx tsc --noEmit`
Expected: all Vyapaar tests PASS; no type errors in the engine.

- [ ] **Step 6: Commit**

```bash
git add src/modules/vyapaar/engine/replay.ts tests/vyapaar/determinism.test.ts
git commit -m "test(vyapaar): determinism replay + money-conservation invariant"
```

---

## Self-Review

**Spec coverage (design §1 "Engine" + 2026-08-24 v2 data addendum):**
- `data.ts` (v2 zoned per-city rent ladders, derived `upgradeCost`, `MAX_LEVEL=6`, both decks) → Task 1. ✓
- `rng.ts` (seeded PRNG in state) → Task 2. ✓
- `board.ts` (40-tile build) → Task 3. ✓
- `state.ts` + `createGame` (2–6 players, seeded decks) → Task 4. ✓
- Money/ownership/sets/rent/net worth/score + forced liquidation → Task 5. ✓
- `cards.ts` (all 16 opcodes, reshuffle-on-empty) → Task 6. ✓
- `roll`/movement/salary/underdog/doubles/jail/monsoon/`resolveTile` (all tile kinds) → Task 7. ✓
- `buy`/`decline`/`bid` + auction resolution (tie→lowest seat, all-zero→nobody) → Task 8. ✓
- `develop` (set control + even-building + max level) / `mortgage` / `unmortgage` → Task 9. ✓
- `propose_trade`/`respond_trade` (undeveloped only, recipient-only, atomic re-validation) → Task 10. ✓
- `end_turn`/round advance/`MAX_ROUNDS`/`SETS_TO_END` finish-the-round/winner+tiebreak → Task 11. ✓
- `publicView` (strips rng/seed/deck order; per-seat trade) + `autoResolve` → Task 12. ✓
- Fixed-seed replay == identical state; money-conservation property test → Task 13. ✓

**Deferred to later phase plans (correctly out of this engine plan):** Prisma models, wallet grant/settlement, rooms, realtime broadcast, the intent RPC route, pg_cron turn timer, the balance harness, and the UI. The engine is standalone and fully testable without any of them.

**Placeholder scan:** none — every step has real code.

**Type consistency:** `applyIntent` signature, `Intent`/`GameState`/`TradeSide`/`EngineEvent`/`PublicView` names, and `finishSegment`/`canManage`/`resolveAuction`/`winnerOf`/`autoResolve`/`publicView`/`replay` are used identically across tasks. `charge(from, amount, to)` and `credit(seat, amount)` signatures are stable from Task 5 onward.

**Known simplifications (`ponytail:` — surfaced, not bugs):**
- `MONSOON_PAY` is defined but unused (landing on monsoon is "just visiting"); kept for balance tuning.
- `UPGRADE_SELL_RATIO` (0.5) and forced-sale refund are a reasonable default the source spec did not pin down; the balance harness phase can tune it in `data.ts`.
- `freeUpgrades` is auto-applied immediately (no extra player decision) for determinism; the counter is kept for audit only.
- **v2 economy is unvalidated.** `UPGRADE_COST_RATIO = 0.1` (house cost = 10% of buy) is a derived default — the table gives no house cost. Zone control still doubles undeveloped base rent (no explicit column in the table). Salary/MAX_ROUNDS/opening-cash were validated for the OLD Appendix-A economy, not these numbers → the **M5 balance harness must re-validate and will likely tune `data.ts`**.
- The UPI "tourism" card (`perHeritage`) now counts **North-zone** cities — v2 has no "Heritage" group.
