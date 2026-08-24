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
        if (i !== seat) charge(s, i, val, seat, events);
      });
      break;
    case "feePerCity":
      charge(s, seat, val * citiesOwned(s, seat).length, "pot", events);
      break;
    case "feeToPot":
      charge(s, seat, val, "pot", events);
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
