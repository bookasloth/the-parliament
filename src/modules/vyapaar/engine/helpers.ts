import {
  CITIES,
  ZONES,
  COMPANIES,
  SET_OWN_NEEDED,
  SET_BONUS_NW,
  BLEND,
  UPGRADE_SELL_RATIO,
  SCRAPPY_MULT,
  SCRAPPY_MAX_CITIES,
  ZONE_DOUBLE,
  upgradeCost,
} from "./data";
import type { GameState, EngineEvent } from "./state";

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

export function netWorth(s: GameState, seat: number): number {
  let nw = s.players[seat].cash;
  for (let id = 0; id < s.cities.length; id++) {
    const c = s.cities[id];
    if (c.owner !== seat) continue;
    nw += CITIES[id].price * (c.mortgaged ? 0.35 : 0.5);
    nw += c.level * upgradeCost(id) * 0.5;
  }
  for (let i = 0; i < s.companies.length; i++) if (s.companies[i] === seat) nw += COMPANIES[i].buy * 0.5;
  nw += controlledSets(s, seat) * SET_BONUS_NW;
  return nw;
}

/**
 * Cash a city returns when sold to the bank: card value (half buy price, or 0 if
 * mortgaged) + property/building value (levels refunded at UPGRADE_SELL_RATIO).
 * Single source of truth for the sell-to-bank and leave-liquidation payouts.
 */
export function cityLiquidationValue(s: GameState, id: number): number {
  const c = s.cities[id];
  const cardValue = c.mortgaged ? 0 : Math.floor(CITIES[id].price / 2);
  const buildingValue = Math.floor(c.level * upgradeCost(id) * UPGRADE_SELL_RATIO);
  return cardValue + buildingValue;
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

export function scoreOf(s: GameState, seat: number): number {
  const cash = s.players[seat].cash;
  return cash + BLEND * (netWorth(s, seat) - cash);
}

export function credit(s: GameState, seat: number, amount: number): void {
  s.players[seat].cash += amount;
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
