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
