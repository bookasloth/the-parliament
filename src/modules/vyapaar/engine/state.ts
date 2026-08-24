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
