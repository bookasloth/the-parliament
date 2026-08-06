/**
 * Sample run — exercises the real Alfazy scoring + leaderboard pipeline on an
 * in-memory dataset (no DB) and prints the boards + who would be crowned.
 *   npx tsx scripts/sample-alfazy-run.ts
 */
import { gradeGame } from "../src/modules/games/alfazy";
import { aggregate, rankEntries, type ScoreRow, type Scope } from "../src/modules/games/leaderboard";
import { SCOPE_LABEL } from "../src/modules/games/format";

// Six real-ish players.
const PLAYERS = [
  { id: "shubham", name: "Shubham", house: ["udaigiri", "Udaigiri"], batch: ["b0613", "2006–13"] },
  { id: "durga", name: "Durga", house: ["laxmi", "Laxmi"], batch: ["b1219", "2012–19"] },
  { id: "pranav", name: "Pranav", house: ["shiwalik", "Shiwalik"], batch: ["b0613", "2006–13"] },
  { id: "rohan", name: "Rohan", house: ["aravali", "Aravali"], batch: ["b2008", "2008"] },
  { id: "priya", name: "Priya", house: ["udaigiri", "Udaigiri"], batch: ["b1319", "2013–19"] },
  { id: "karan", name: "Karan", house: ["laxmi", "Laxmi"], batch: ["b2010", "2010"] },
];

// (player, guesses-they-took) per day; word is HOUSE. undefined = didn't play.
const DAYS: Record<string, Record<string, string[]>> = {
  "2026-08-03": {
    shubham: ["CRANE", "MOUSE", "HOUSE"],
    durga: ["SLOTH", "HOUSE"],
    priya: ["PLANT", "STORM", "HOUSE"],
    karan: ["AAAAA", "BBBBB", "CCCCC", "DDDDD", "EEEEE", "FFFFF"],
  },
  "2026-08-04": {
    shubham: ["MOUSE", "HOUSE"],
    priya: ["ROUSE", "HOUSE"],
    karan: ["HOUSE"],
  },
  "2026-08-05": {
    shubham: ["CRANE", "MOUSE", "HOUSE"],
    durga: ["HOUSE"],
    pranav: ["PLANT", "MOUSE", "ROUSE", "HOUSE"],
    rohan: ["CRANE", "MOUSE", "HOUSE"],
    priya: ["A", "B", "C", "D", "HOUSE"].map((w) => w.padEnd(5, "X")),
    karan: ["AAAAA", "BBBBB", "CCCCC", "DDDDD", "EEEEE", "FFFFF"],
  },
};

function rowsFor(day: string): ScoreRow[] {
  const out: ScoreRow[] = [];
  for (const [pid, guesses] of Object.entries(DAYS[day])) {
    const p = PLAYERS.find((x) => x.id === pid)!;
    const g = gradeGame(guesses, "HOUSE");
    out.push({
      userId: p.id,
      score: g.score,
      guesses: g.solved ? g.guessesUsed : null,
      solved: g.solved,
      playedAt: new Date(`${day}T10:00:00Z`),
      houseId: p.house[0],
      houseLabel: p.house[1],
      houseColor: null,
      batchId: p.batch[0],
      batchLabel: p.batch[1],
      userLabel: p.name,
    });
  }
  return out;
}

function printBoard(title: string, rows: ScoreRow[], scope: Scope) {
  const board = rankEntries(aggregate(rows, scope));
  console.log(`\n  ${title} — ${SCOPE_LABEL[scope]}`);
  for (const e of board) {
    const best = scope === "individual" && e.bestGuesses ? `  best ${e.bestGuesses}/6` : "";
    const co = board.filter((x) => x.rank === e.rank).length > 1 && e.rank === 1 ? "  (co-champ)" : "";
    console.log(`    #${e.rank}  ${e.label.padEnd(10)} ${String(e.total).padStart(4)} pts${best}${co}`);
  }
}

console.log("======== ALFAZY SAMPLE RUN (word = HOUSE) ========");

// Daily (Aug 5)
const aug5 = rowsFor("2026-08-05");
console.log("\n--- DAILY · 2026-08-05 ---");
(["individual", "house", "batch"] as Scope[]).forEach((s) => printBoard("Daily", aug5, s));

// Weekly (Aug 3-5 combined)
const week = [...rowsFor("2026-08-03"), ...rowsFor("2026-08-04"), ...rowsFor("2026-08-05")];
console.log("\n--- WEEKLY · 2026-W32 (Mon–Sun) ---");
(["individual", "house", "batch"] as Scope[]).forEach((s) => printBoard("Weekly", week, s));

// Champions = rank-1 rows (ties → co-champions)
console.log("\n--- CHAMPIONS FROZEN (weekly) ---");
(["individual", "house", "batch"] as Scope[]).forEach((s) => {
  const board = rankEntries(aggregate(week, s));
  const champs = board.filter((e) => e.rank === 1);
  console.log(`    ${SCOPE_LABEL[s]}: ${champs.map((c) => `${c.label} (${c.total})`).join(", ")}`);
});
console.log("\n==================================================");
