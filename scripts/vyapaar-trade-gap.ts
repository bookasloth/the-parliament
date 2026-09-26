/**
 * Post-hoc "what trades should have happened" analyzer for Vyapaar.
 *
 * Input: the JSON array produced by the solo-vs-bots SQL query (see the chat). Each row =
 * { seed, players_state, action_log, players:[{seat,openingCash,isBot}], winner_seat, ... }.
 *
 * For every game it replays the stored action log through the REAL engine and, at each state,
 * runs the game's own coachTips() for each seat to find TIER-A mutual set-completing swaps that
 * were available (both sides complete a set in one 1-for-1 trade — the only trade the engine
 * supports AND the one that decides games). It then marks each opportunity realized/missed by
 * cross-referencing trades actually accepted in the log.
 *
 *   npx tsx scripts/vyapaar-trade-gap.ts <games.json>
 *   npx tsx scripts/vyapaar-trade-gap.ts --selftest
 *
 * No DB access — you feed it the file exported from Supabase.
 */
import { createGame } from "../src/modules/vyapaar/engine/state";
import type { GameState, Intent, TradeSide } from "../src/modules/vyapaar/engine/state";
import { applyIntent } from "../src/modules/vyapaar/engine/engine";
import { publicView } from "../src/modules/vyapaar/engine/view";
import { coachTips } from "../src/modules/vyapaar/coach";
import { CITIES } from "../src/modules/vyapaar/engine/data";
import { readFileSync } from "node:fs";

type LogStep = { seat: number; intent: Intent; t?: number };
interface GameRow {
  id?: string;
  seed: string | number;
  players_state?: { name: string }[];
  action_log: LogStep[];
  players: { seat: number; openingCash: number; userId?: string; isBot: boolean }[];
  winner_seat?: number | null;
}

const firstName = (n: string) => n?.split(" ")[0] ?? n;
const cityName = (id: number) => CITIES[id]?.name ?? `#${id}`;
// Unordered key for a 1-for-1 swap so proposer/recipient direction doesn't matter.
const swapKey = (a: number[], b: number[]) => [...a, ...b].sort((x, y) => x - y).join("-");

interface Missed {
  round: number;
  by: string;       // seat that could have proposed
  with: string;     // the counterparty
  give: number[];
  get: number[];
}

function analyzeGame(row: GameRow) {
  const seed = Number(row.seed);
  const bySeat = [...row.players].sort((a, b) => a.seat - b.seat);
  const openingCash = bySeat.map((p) => p.openingCash);
  const names = (row.players_state ?? bySeat.map((_, i) => ({ name: `Seat ${i}` }))).map((p) => p.name);
  const isBot = new Map(bySeat.map((p) => [p.seat, p.isBot]));
  const label = (seat: number) => `${firstName(names[seat] ?? `Seat ${seat}`)}${isBot.get(seat) ? " (bot)" : ""}`;

  const s = createGame(seed, names, openingCash);

  // Realized 1-for-1 city swaps: map tradeId -> {give,get cities} from proposals, then capture
  // the swap on each trade_accepted.
  const offers = new Map<number, { give: number[]; get: number[] }>();
  const realized = new Set<string>();
  // Available Tier-A opportunities, keyed unordered, first-seen round + who.
  const opps = new Map<string, Missed>();

  for (const step of row.action_log) {
    if (step.intent.type === "propose_trade" || step.intent.type === "counter_trade") {
      // id is assigned by the engine on apply; capture after applying (below) via events.
    }
    const r = applyIntent(s, step.seat, step.intent);
    if (!("state" in r)) continue;

    for (const e of r.events as Record<string, unknown>[]) {
      if (e.type === "trade_proposed" || e.type === "trade_countered") {
        const intent = step.intent as Extract<Intent, { type: "propose_trade" | "counter_trade" }>;
        offers.set(Number(e.tradeId), { give: intent.give.cities ?? [], get: intent.get.cities ?? [] });
      }
      if (e.type === "trade_accepted") {
        const o = offers.get(Number(e.tradeId));
        if (o) realized.add(swapKey(o.give, o.get));
      }
    }

    // Scan every live seat for an available mutual-set swap (coach Tip kind "swap").
    if (s.ended) break;
    for (let seat = 0; seat < s.players.length; seat++) {
      if (s.players[seat].left) continue;
      const tips = coachTips(publicView(s, seat));
      for (const tip of tips) {
        if (tip.kind !== "swap" || !tip.trade) continue;
        const key = swapKey(tip.trade.give, tip.trade.get);
        if (!opps.has(key)) {
          opps.set(key, { round: s.round, by: label(seat), with: label(tip.trade.to), give: tip.trade.give, get: tip.trade.get });
        }
      }
    }
  }

  const missed: Missed[] = [];
  for (const [key, opp] of opps) if (!realized.has(key)) missed.push(opp);
  missed.sort((a, b) => a.round - b.round);

  return {
    id: row.id,
    seed,
    players: names.map((n, i) => label(i)),
    winner: row.winner_seat != null ? label(row.winner_seat) : "—",
    steps: row.action_log.length,
    tradesRealized: realized.size,
    mutualSwapsAvailable: opps.size,
    missedMutualSwaps: missed,
  };
}

function report(rows: GameRow[]) {
  console.log(`\n=== Vyapaar trade-gap analysis: ${rows.length} game(s) ===\n`);
  for (const row of rows) {
    const a = analyzeGame(row);
    console.log(`Game ${a.id ?? a.seed}  seed=${a.seed}  steps=${a.steps}`);
    console.log(`  players: ${a.players.join(", ")}   winner: ${a.winner}`);
    console.log(`  trades actually made: ${a.tradesRealized}   mutual set-swaps that existed: ${a.mutualSwapsAvailable}   MISSED: ${a.missedMutualSwaps.length}`);
    if (a.missedMutualSwaps.length) {
      for (const m of a.missedMutualSwaps) {
        console.log(`    R${m.round}: ${m.by} ⇄ ${m.with} — ${m.by} gives ${m.give.map(cityName).join("+")} for ${m.get.map(cityName).join("+")} (both complete a set). Never happened.`);
      }
    } else {
      console.log(`    (no missed mutual set-swaps — every set-completing trade on offer was taken, or none existed)`);
    }
    console.log("");
  }
}

// --- self-test: a hand-built mutual-one-away board must surface exactly one swap opportunity ---
function selftest() {
  const s = createGame(1, ["You", "Bot"], [50000, 50000]);
  // You (0): North cities 0,1 + East city 10.  Bot (1): East cities 11,12 + North city 2.
  // → You one short of North (need city2, Bot holds it); Bot one short of East (need city10, you hold it).
  [0, 1, 10].forEach((id) => (s.cities[id].owner = 0));
  [11, 12, 2].forEach((id) => (s.cities[id].owner = 1));
  const tips = coachTips(publicView(s, 0));
  const swap = tips.find((t) => t.kind === "swap");
  if (!swap || !swap.trade) throw new Error("selftest FAIL: no swap tip detected");
  const key = swapKey(swap.trade.give, swap.trade.get);
  if (key !== swapKey([10], [2])) throw new Error(`selftest FAIL: wrong swap ${JSON.stringify(swap.trade)}`);
  console.log("selftest OK — mutual set-swap detected:", `give ${cityName(swap.trade.give[0])} get ${cityName(swap.trade.get[0])}`);
}

const arg = process.argv[2];
if (arg === "--selftest") {
  selftest();
} else if (arg) {
  const raw = readFileSync(arg, "utf8").trim();
  let parsed = JSON.parse(raw);
  // Unwrap Supabase's `[{ json_agg: [...] }]` shape (and a few common variants).
  if (Array.isArray(parsed) && parsed.length && parsed[0]?.json_agg) parsed = parsed[0].json_agg;
  else if (parsed?.json_agg) parsed = parsed.json_agg;
  const rows: GameRow[] = Array.isArray(parsed) ? parsed : parsed.rows ?? parsed.data ?? [parsed];
  report(rows);
} else {
  console.error("usage: tsx scripts/vyapaar-trade-gap.ts <games.json> | --selftest");
  process.exit(1);
}
