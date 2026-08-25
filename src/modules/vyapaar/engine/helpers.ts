import {
  CITIES,
  ZONES,
  HUB_RENT,
  HUB_PRICE,
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

/** Move money from `from` to `to` (seat or "pot"), liquidating as needed; forgives any shortfall. Returns amount actually paid. */
export function charge(
  s: GameState,
  from: number,
  amount: number,
  to: number | "pot",
  events?: EngineEvent[],
): number {
  if (s.players[from].cash < amount) liquidate(s, from, amount, events);
  const paid = Math.min(amount, s.players[from].cash);
  s.players[from].cash -= paid;
  if (to === "pot") s.pot += paid;
  else s.players[to].cash += paid;
  return paid;
}
