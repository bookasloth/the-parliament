import {
  CITIES,
  ZONES,
  COMPANIES,
  SET_OWN_NEEDED,
  SET_MULT,
  PAIR_MULT,
  DEV_MULT,
  TDS_RATE,
  UPGRADE_SELL_RATIO,
  SCRAPPY_MULT,
  SCRAPPY_MAX_CITIES,
  ZONE_DOUBLE,
  upgradeCost,
} from "./data";
import type { GameState, EngineEvent, Payment } from "./state";

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
  else if (controlsSet(s, c.owner, CITIES[cityId].zone)) rent = ladder[0] * ZONE_DOUBLE; // zone control doubles undeveloped base
  else rent = ladder[0];
  // Scrappy Landlord: owner holds few cities → rent multiplier
  if (citiesOwned(s, c.owner).length <= SCRAPPY_MAX_CITIES) rent = Math.round(rent * SCRAPPY_MULT);
  return rent;
}

export function companiesOwned(s: GameState, seat: number): number {
  return s.companies.filter((o) => o === seat).length;
}

/** Service fee when someone lands on company `i`: the pair rate if that owner holds BOTH of the pair, else the single rate. */
export function companyServiceFee(s: GameState, i: number): number {
  const owner = s.companies[i];
  if (owner === null) return 0;
  const bothOwned = s.companies[COMPANIES[i].partner] === owner;
  return bothOwned ? COMPANIES[i].pair : COMPANIES[i].single;
}

/**
 * Net worth = a transparent "cash-out value": what your whole empire is worth.
 * Cash + every property at FULL price (×SET_MULT if it's inside a completed set) +
 * every building at DEV_MULT its build cost + every company at full buy (×PAIR_MULT
 * if you own the pair). Mortgaged cards count at half (you've borrowed against them)
 * and earn no set premium. This IS the final score (see scoreOf).
 */
export function netWorth(s: GameState, seat: number): number {
  let nw = s.players[seat].cash;
  for (let id = 0; id < s.cities.length; id++) {
    const c = s.cities[id];
    if (c.owner !== seat) continue;
    if (c.mortgaged) {
      nw += Math.round(CITIES[id].price * 0.5); // borrowed against — half value, no set premium
    } else {
      const inSet = controlsSet(s, seat, CITIES[id].zone);
      nw += Math.round(CITIES[id].price * (inSet ? SET_MULT : 1));
    }
    nw += Math.round(c.level * upgradeCost(id) * DEV_MULT); // buildings pay off at game end
  }
  for (let i = 0; i < s.companies.length; i++) {
    if (s.companies[i] !== seat) continue;
    const pair = s.companies[COMPANIES[i].partner] === seat;
    nw += Math.round(COMPANIES[i].buy * (pair ? PAIR_MULT : 1));
  }
  return nw;
}

/**
 * Cash a city returns when voluntarily sold to the bank: the bank buys it back at
 * FULL price (0 if already mortgaged) plus the FULL build cost, then deducts a 2% TDS
 * on the gross — e.g. Mumbai ₹9,000 → ₹8,820. Selling always loses the 2%, so it can
 * never mint money. Single source of truth for the sell-to-bank payout.
 */
export function cityLiquidationValue(s: GameState, id: number): number {
  const c = s.cities[id];
  const cardValue = c.mortgaged ? 0 : CITIES[id].price;
  const buildingValue = c.level * upgradeCost(id);
  return Math.round((cardValue + buildingValue) * (1 - TDS_RATE));
}

/**
 * Real cash-out value used to SETTLE the coin wallet at game end: cash + what every
 * property and company would fetch if sold to the bank right now (full value − 2% TDS,
 * NO set/pair premium). Unlike netWorth this never mints coins — you recoup roughly what
 * you spent minus the 2% — so the coin economy stays conservative. netWorth (with the
 * ×1.4 / ×1.5 premiums) is kept purely for ranking + the net-worth shown on the results.
 */
export function liquidationWorth(s: GameState, seat: number): number {
  let w = s.players[seat].cash;
  for (let id = 0; id < s.cities.length; id++) if (s.cities[id].owner === seat) w += cityLiquidationValue(s, id);
  for (let i = 0; i < s.companies.length; i++) if (s.companies[i] === seat) w += Math.round(COMPANIES[i].buy * (1 - TDS_RATE));
  return w;
}

/**
 * Cash a city returns when its owner LEAVES: full cost basis, not the half-price
 * sell-to-bank penalty — leaving mustn't cost you your investment. Unmortgaged card
 * refunds full price; a mortgaged card refunds price minus the loan already taken
 * (floor(price/2)); buildings refund their full build cost.
 */
export function cityLeaveValue(s: GameState, id: number): number {
  const c = s.cities[id];
  const price = CITIES[id].price;
  const cardValue = c.mortgaged ? price - Math.floor(price / 2) : price;
  const buildingValue = c.level * upgradeCost(id);
  return cardValue + buildingValue;
}

// Final score is simply the net worth — the transparent cash-out value. No blend.
export function scoreOf(s: GameState, seat: number): number {
  return netWorth(s, seat);
}

export function credit(s: GameState, seat: number, amount: number): void {
  s.players[seat].cash += amount;
}

/** Queue an auto-payment for the actor to allow/claim. Server stamps the deadline later. */
export function queuePayment(s: GameState, p: Omit<Payment, "id" | "expiresAt">): void {
  if (!s.payments) s.payments = [];
  const id = s.nextPaymentId ?? 1;
  s.nextPaymentId = id + 1;
  s.payments.push({ ...p, id, expiresAt: 0 });
}

/** Sell upgrades (tallest first) then mortgage undeveloped until cash ≥ need or nothing left. */
export function liquidate(
  s: GameState,
  seat: number,
  need: number,
  events?: EngineEvent[],
): void {
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
    const refund = Math.floor(upgradeCost(best) * UPGRADE_SELL_RATIO);
    s.players[seat].cash += refund;
    events?.push({ type: "forced_sale", seat, cityId: best, amount: refund });
  }
  // 2. Mortgage undeveloped, unmortgaged cities.
  for (const id of citiesOwned(s, seat)) {
    if (s.players[seat].cash >= need) break;
    const c = s.cities[id];
    if (c.level === 0 && !c.mortgaged) {
      c.mortgaged = true;
      const raise = Math.floor(CITIES[id].price / 2);
      s.players[seat].cash += raise;
      events?.push({ type: "forced_mortgage", seat, cityId: id, amount: raise });
    }
  }
}

/** Move money from `from` to `to` (a seat, or "bank" = money leaves the game), liquidating as needed; forgives any shortfall. Returns amount actually paid. */
export function charge(
  s: GameState,
  from: number,
  amount: number,
  to: number | "bank",
  events?: EngineEvent[],
): number {
  if (s.players[from].cash < amount) liquidate(s, from, amount, events);
  const paid = Math.min(amount, s.players[from].cash);
  s.players[from].cash -= paid;
  if (to !== "bank") s.players[to].cash += paid; // "bank" → money simply leaves the game
  return paid;
}
