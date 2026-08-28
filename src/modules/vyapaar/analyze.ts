import { createGame } from "./engine/state";
import { applyIntent } from "./engine/engine";
import { netWorth } from "./engine/helpers";
import { CITIES, COMPANIES } from "./engine/data";
import type { Intent } from "./engine/state";

// Post-hoc match analysis: replay a stored action log through the engine and report what
// each seat actually did — how it bought, built, traded, paid, and jailed — so bot policies
// can be tuned from real games. Pure (no DB); the script/route fetches the inputs.

export interface LogStep { seat: number; intent: Intent; t?: number }

export interface SeatStat {
  seat: number;
  name: string;
  cityBuys: number;
  companyBuys: number;
  builds: number;      // develop intents landed
  maxLevel: number;    // deepest a city reached (6 = 3 hotels)
  rentPaid: number;
  rentCollected: number;
  tradesProposed: number;
  tradesAccepted: number;   // trades this seat was party to that completed
  tradesDeclined: number;
  jailTerms: number;   // times sent to jail
  jailTurnsServed: number;
  bribes: number;
  paymentsResolved: number;
  avgPaymentMs: number | null; // mean time from a debt appearing to it clearing (null if untimed)
  finalNetWorth: number;
  placement: number;   // 1 = winner (by net worth)
}

export interface MatchAnalysis {
  rounds: number;
  steps: number;
  durationMs: number | null;
  winnerSeat: number | null;
  seats: SeatStat[];
  timeline: string[]; // compact, human-readable, meaningful moves only
}

export function analyzeLog(seed: number, names: string[], openingCash: number[], log: LogStep[]): MatchAnalysis {
  const s = createGame(seed, names, openingCash);
  const stat: SeatStat[] = names.map((name, i) => ({
    seat: i, name, cityBuys: 0, companyBuys: 0, builds: 0, maxLevel: 0, rentPaid: 0, rentCollected: 0,
    tradesProposed: 0, tradesAccepted: 0, tradesDeclined: 0, jailTerms: 0, jailTurnsServed: 0, bribes: 0,
    paymentsResolved: 0, avgPaymentMs: null, finalNetWorth: 0, placement: 0,
  }));
  const payLat: number[][] = names.map(() => []);
  const queuedAt = new Map<number, { actor: number; t: number }>();
  const timeline: string[] = [];
  const nm = (i: number) => names[i]?.split(" ")[0] ?? `seat ${i}`;
  const cty = (i: unknown) => CITIES[i as number]?.name ?? "?";
  let firstT: number | null = null, lastT: number | null = null;

  for (const step of log) {
    const r = applyIntent(s, step.seat, step.intent);
    if (!("state" in r)) continue; // an illegal replay step — skip, keep going
    if (step.t != null) { firstT ??= step.t; lastT = step.t; }

    for (const e of r.events as Record<string, unknown>[]) {
      const seat = typeof e.seat === "number" ? e.seat : -1;
      const amt = Number(e.amount) || 0;
      switch (e.type) {
        case "buy": stat[seat].cityBuys++; timeline.push(`R${s.round} ${nm(seat)} bought ${cty(e.cityId)}`); break;
        case "buy_company": case "auction_won":
          if (e.type === "buy_company" || e.kind === "company") stat[seat].companyBuys++; else stat[seat].cityBuys++;
          break;
        case "develop":
          stat[seat].builds++; stat[seat].maxLevel = Math.max(stat[seat].maxLevel, Number(e.level) || 0);
          timeline.push(`R${s.round} ${nm(seat)} built ${cty(e.cityId)} → L${e.level}`); break;
        case "payment_paid": stat[seat].rentPaid += amt; break;
        case "payment_penalty": stat[seat].rentPaid += 2 * amt; break;
        case "payment_collected": stat[seat].rentCollected += amt; break;
        case "trade_proposed": stat[seat].tradesProposed++; break;
        case "trade_accepted": {
          const from = Number(e.from), to = Number(e.to);
          stat[from].tradesAccepted++; stat[to].tradesAccepted++;
          timeline.push(`R${s.round} ${nm(from)} ⇄ ${nm(to)} traded`); break;
        }
        case "trade_declined": stat[seat].tradesDeclined++; break;
        case "taxraid": case "jail_doubles": case "ed_raid_jail":
          stat[seat].jailTerms++; timeline.push(`R${s.round} ${nm(seat)} → jail`); break;
        case "jail_served": stat[seat].jailTurnsServed++; break;
        case "bribe": stat[seat].bribes++; break;
      }
    }

    // Payment latency: track when a debt appears vs when it clears, per actor.
    const now = new Map((s.payments ?? []).map((p) => [p.id, p]));
    for (const [id, p] of now) if (!queuedAt.has(id)) queuedAt.set(id, { actor: p.actor, t: step.t ?? 0 });
    for (const [id, q] of [...queuedAt]) {
      if (now.has(id)) continue;
      stat[q.actor].paymentsResolved++;
      if (step.t != null && q.t) payLat[q.actor].push(step.t - q.t);
      queuedAt.delete(id);
    }
  }

  for (let i = 0; i < stat.length; i++) {
    stat[i].finalNetWorth = Math.round(netWorth(s, i));
    stat[i].avgPaymentMs = payLat[i].length ? Math.round(payLat[i].reduce((a, b) => a + b, 0) / payLat[i].length) : null;
  }
  const order = [...stat].sort((a, b) => b.finalNetWorth - a.finalNetWorth);
  order.forEach((st, i) => (stat[st.seat].placement = i + 1));

  return {
    rounds: s.round,
    steps: log.length,
    durationMs: firstT != null && lastT != null ? lastT - firstT : null,
    winnerSeat: s.winner,
    seats: stat,
    timeline,
  };
}
