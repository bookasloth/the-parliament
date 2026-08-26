import { CITIES, START_CASH } from "./data";

export type Phase = "roll" | "buy" | "auction" | "manage" | "jail";

export interface TradeSide {
  cash: number; // must be 0 — cash is never part of a player trade (kept for wire shape)
  cities: number[]; // cityIds
  companies?: number[]; // companyIndexes (optional on the wire; treated as [] when absent)
}

export type Intent =
  | { type: "roll" }
  | { type: "buy" }
  | { type: "decline" }
  | { type: "bid"; amount: number }
  | { type: "develop"; cityId: number }
  | { type: "mortgage"; cityId: number }
  | { type: "unmortgage"; cityId: number }
  | { type: "sell"; cityId: number }
  | { type: "propose_trade"; to: number; give: TradeSide; get: TradeSide }
  | { type: "respond_trade"; tradeId: number; accept: boolean }
  | { type: "counter_trade"; tradeId: number; give: TradeSide; get: TradeSide }
  | { type: "withdraw_trade"; tradeId: number }
  | { type: "expire_trade"; tradeId: number }
  | { type: "confirm_payment"; paymentId: number }
  | { type: "expire_payment"; paymentId: number }
  | { type: "restructure" }
  | { type: "bribe_jail" }
  | { type: "serve_jail" }
  | { type: "leave_game" }
  | { type: "end_turn" };

// A money move that waits on the actor's approval (allow within PAYMENT_SECONDS). If it
// isn't confirmed in time it auto-resolves with a penalty (pay 2×; the extra splits
// half-to-bank / half-among-others) or, for a bank windfall, is forfeited.
export interface Payment {
  id: number;
  actor: number; // seat that must confirm (payer for "pay", recipient for "collect")
  dir: "pay" | "collect";
  amount: number;
  party: number | "bank"; // "pay" → destination; "collect" → source (currently always "bank")
  reason: string; // e.g. "event:married", "event:ed_raid"
  expiresAt: number; // epoch ms; 0 until the server stamps it
}

export interface PlayerState {
  name: string;
  cash: number;
  pos: number;
  halted: number; // turns remaining halted (jail/monsoon)
  doubles: number; // doubles rolled so far this turn
  startupLaps: number; // laps remaining with reduced salary
  startupPenalty: number; // salary reduction per lap while startupLaps>0
  left: boolean; // player left/forfeited — skipped in turn rotation, can't win
  restructured: boolean; // has already taken the one-time comeback advance
}

export interface CityState {
  owner: number | null; // seat or null
  level: number; // 0..MAX_LEVEL
  mortgaged: boolean;
}

export interface AuctionState {
  kind: "city" | "company";
  index: number; // cityId or companyIndex, per `kind`
  bids: (number | null)[]; // per seat; null = not yet bid
}

export interface TradeOffer {
  id: number;
  from: number;
  to: number;
  give: TradeSide; // from → to (cities only)
  get: TradeSide; // to → from (cities only)
  expiresAt: number; // epoch ms; 0 until the server stamps it (see match.ts). Live for 60s.
}

export interface GameState {
  seed: number;
  rng: number; // live PRNG state
  players: PlayerState[];
  cities: CityState[]; // length 25, indexed by cityId
  companies: (number | null)[]; // length 6, indexed by companyIndex
  active: number; // active seat
  phase: Phase;
  round: number; // starts at 1
  pendingCity: number | null; // city just landed on, awaiting buy/decline
  pendingCompany: number | null; // company just landed on, awaiting buy/decline
  pendingDouble: boolean; // last roll was a double → roll again after resolution
  auction: AuctionState | null;
  trades: TradeOffer[]; // active proposals; at most one outgoing per player
  nextTradeId: number; // monotonic id source for trades
  payments?: Payment[]; // auto-payments awaiting allow/claim (see Payment)
  nextPaymentId?: number; // monotonic id source for payments
  endRequested: boolean; // someone hit SETS_TO_END → end when the round completes
  ended: boolean;
  winner: number | null;
  lastRoll: [number, number] | null; // most recent dice roll, for the UI
  log: EngineEvent[]; // rolling recent-events log (capped) for the client game-log panel
}

/** One thing that happened during an intent — for the UI log and tests. */
export interface EngineEvent {
  type: string;
  seat?: number;
  [k: string]: unknown;
}

export function createGame(seed: number, names: string[], openingCash: number | number[] = START_CASH): GameState {
  if (names.length < 2 || names.length > 6) {
    throw new Error("vyapaar: players must be 2..6");
  }
  if (Array.isArray(openingCash) && openingCash.length !== names.length) {
    throw new Error("vyapaar: openingCash array length must equal names length");
  }
  const cashFor = (i: number): number => (Array.isArray(openingCash) ? openingCash[i] : openingCash);
  const state: GameState = {
    seed,
    rng: seed >>> 0,
    players: names.map((name, i) => ({
      name,
      cash: cashFor(i),
      pos: 0,
      halted: 0,
      doubles: 0,
      startupLaps: 0,
      startupPenalty: 0,
      left: false,
      restructured: false,
    })),
    cities: CITIES.map(() => ({ owner: null, level: 0, mortgaged: false })),
    companies: [null, null, null, null, null, null],
    active: 0,
    phase: "roll",
    round: 1,
    pendingCity: null,
    pendingCompany: null,
    pendingDouble: false,
    auction: null,
    trades: [],
    nextTradeId: 1,
    payments: [],
    nextPaymentId: 1,
    endRequested: false,
    ended: false,
    winner: null,
    lastRoll: null,
    log: [],
  };
  return state;
}
