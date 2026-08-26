import type { GameState, EngineEvent, TradeSide } from "./state";
import { scoreOf, netWorth } from "./helpers";
import { canRestructure } from "./engine";
import { RESTRUCTURE_ADVANCE, RESTRUCTURE_LAPS } from "./data";

export interface PublicView {
  players: {
    name: string;
    cash: number;
    pos: number;
    halted: number;
    score: number;
    netWorth: number;
    left: boolean;
  }[];
  cities: { owner: number | null; level: number; mortgaged: boolean }[];
  companies: (number | null)[];
  active: number;
  phase: string;
  round: number;
  pendingCity: number | null;
  pendingCompany: number | null;
  auction: { kind: "city" | "company"; index: number; bidded: boolean[] } | null;
  trades: { id: number; from: number; to: number; give: TradeSide; get: TradeSide; expiresAt: number }[];
  pendingRents: { id: number; payer: number; owner: number; cityId: number; amount: number }[];
  payments: { id: number; dir: "pay" | "collect"; amount: number; party: number | "bank"; reason: string; expiresAt: number }[];
  ended: boolean;
  winner: number | null;
  lastRoll: [number, number] | null;
  log: EngineEvent[];
  you: number;
  youCanRestructure: boolean; // you qualify for the one-time comeback advance right now
  restructure: { advance: number; laps: number }; // terms to show on the comeback button
}

export function publicView(s: GameState, seat: number): PublicView {
  return {
    players: s.players.map((p, i) => ({
      name: p.name,
      cash: p.cash,
      pos: p.pos,
      halted: p.halted,
      score: scoreOf(s, i),
      netWorth: netWorth(s, i),
      left: p.left ?? false,
    })),
    cities: s.cities.map((c) => ({ owner: c.owner, level: c.level, mortgaged: c.mortgaged })),
    companies: [...s.companies],
    active: s.active,
    phase: s.phase,
    round: s.round,
    pendingCity: s.pendingCity,
    pendingCompany: s.pendingCompany,
    auction: s.auction
      ? { kind: s.auction.kind, index: s.auction.index, bidded: s.auction.bids.map((b) => b !== null) }
      : null,
    // only trades you're party to (mask others' negotiations)
    trades: (s.trades ?? [])
      .filter((t) => t.from === seat || t.to === seat)
      .map((t) => ({ id: t.id, from: t.from, to: t.to, give: t.give, get: t.get, expiresAt: t.expiresAt })),
    pendingRents: (s.pendingRents ?? []).map((r) => ({ id: r.id, payer: r.payer, owner: r.owner, cityId: r.cityId, amount: r.amount })),
    // only auto-payments YOU must act on (you're the actor)
    payments: (s.payments ?? [])
      .filter((p) => p.actor === seat)
      .map((p) => ({ id: p.id, dir: p.dir, amount: p.amount, party: p.party, reason: p.reason, expiresAt: p.expiresAt })),
    ended: s.ended,
    winner: s.winner,
    lastRoll: s.lastRoll,
    log: (s.log ?? []).slice(-12),
    you: seat,
    youCanRestructure: canRestructure(s, seat),
    restructure: { advance: RESTRUCTURE_ADVANCE, laps: RESTRUCTURE_LAPS },
  };
}
