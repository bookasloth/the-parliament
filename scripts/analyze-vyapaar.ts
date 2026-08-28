import { prisma } from "@/lib/prisma";
import { analyzeLog, type LogStep } from "@/modules/vyapaar/analyze";

// Replay a finished (or in-progress) match and print what each seat did.
// Usage: npx tsx scripts/analyze-vyapaar.ts <matchId> [--json]
const matchId = process.argv[2];
const asJson = process.argv.includes("--json");
if (!matchId) {
  console.error("usage: npx tsx scripts/analyze-vyapaar.ts <matchId> [--json]");
  process.exit(1);
}

const m = await prisma.vyapaarMatch.findUnique({
  where: { id: matchId },
  select: { seed: true, state: true, actionLog: true, players: { select: { seat: true, openingCash: true }, orderBy: { seat: "asc" } } },
});
if (!m) { console.error("match not found"); process.exit(1); }

const state = m.state as { players: { name: string }[] };
const names = state.players.map((p) => p.name);
const openingCash = [...m.players].sort((a, b) => a.seat - b.seat).map((p) => p.openingCash);
const res = analyzeLog(Number(m.seed), names, openingCash, (m.actionLog as LogStep[]) ?? []);

if (asJson) {
  console.log(JSON.stringify(res, null, 2));
} else {
  console.log(`\nMatch ${matchId} — ${res.rounds} rounds, ${res.steps} decisions${res.durationMs != null ? `, ${Math.round(res.durationMs / 60000)}m` : ""}\n`);
  const pad = (v: unknown, n: number) => String(v).padEnd(n);
  const padS = (v: unknown, n: number) => String(v).padStart(n);
  console.log(pad("seat", 16) + ["buys", "co", "builds", "maxL", "rentIn", "rentOut", "trades", "jail", "payMs", "netWorth", "#"].map((h) => padS(h, 9)).join(""));
  for (const s of [...res.seats].sort((a, b) => a.placement - b.placement)) {
    console.log(
      pad(`${s.placement}. ${s.name}`.slice(0, 15), 16) +
      [s.cityBuys, s.companyBuys, s.builds, s.maxLevel, s.rentCollected, s.rentPaid,
        `${s.tradesAccepted}/${s.tradesProposed}`, s.jailTerms, s.avgPaymentMs ?? "-", s.finalNetWorth, s.placement]
        .map((v) => padS(v, 9)).join(""),
    );
  }
  console.log("\ntrades col = accepted/proposed · payMs = avg debt-clear latency (bots ≈ 0)\n");
  console.log("timeline (last 40):");
  for (const line of res.timeline.slice(-40)) console.log("  " + line);
}
process.exit(0);
