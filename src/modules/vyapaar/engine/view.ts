import type { GameState, EngineEvent } from "./state";
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
  companies: (number | null)[];
  pot: number;
  active: number;
  phase: string;
  round: number;
  pendingCity: number | null;
  pendingCompany: number | null;
  auction: { kind: "city" | "company"; index: number; bidded: boolean[] } | null;
  trade: { from: number; to: number; give: unknown; get: unknown } | null;
  pendingRents: { id: number; payer: number; owner: number; cityId: number; amount: number }[];
  headlineLeft: number;
  upiLeft: number;
  ended: boolean;
  winner: number | null;
  lastRoll: [number, number] | null;
  log: EngineEvent[];
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
    companies: [...s.companies],
    pot: s.pot,
    active: s.active,
    phase: s.phase,
    round: s.round,
    pendingCity: s.pendingCity,
    pendingCompany: s.pendingCompany,
    auction: s.auction
      ? { kind: s.auction.kind, index: s.auction.index, bidded: s.auction.bids.map((b) => b !== null) }
      : null,
    trade: showTrade ? { from: s.trade!.from, to: s.trade!.to, give: s.trade!.give, get: s.trade!.get } : null,
    pendingRents: (s.pendingRents ?? []).map((r) => ({ id: r.id, payer: r.payer, owner: r.owner, cityId: r.cityId, amount: r.amount })),
    headlineLeft: s.headlineDeck.length,
    upiLeft: s.upiDeck.length,
    ended: s.ended,
    winner: s.winner,
    lastRoll: s.lastRoll,
    log: (s.log ?? []).slice(-12),
    you: seat,
  };
}
