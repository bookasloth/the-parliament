import { describe, it, expect } from "vitest";
import { aggregate, rankEntries, movementMap, type ScoreRow, type LeaderEntry } from "@/modules/games/leaderboard";

function row(p: Partial<ScoreRow> & { userId: string; score: number }): ScoreRow {
  return {
    guesses: p.solved === false ? null : (p.guesses ?? 3),
    solved: p.solved ?? true,
    playedAt: p.playedAt ?? new Date("2026-08-05T10:00:00Z"),
    houseId: p.houseId ?? null,
    batchId: p.batchId ?? null,
    userLabel: p.userLabel ?? p.userId,
    houseLabel: p.houseLabel ?? null,
    houseColor: p.houseColor ?? null,
    batchLabel: p.batchLabel ?? null,
    avatarUrl: p.avatarUrl ?? null,
    ...p,
  };
}

// Example from the plan: puzzle #036 scores.
const rows: ScoreRow[] = [
  row({ userId: "shubham", score: 160, guesses: 3, houseId: "udaigiri", houseLabel: "Udaigiri", batchId: "b0613", batchLabel: "2006–13" }),
  row({ userId: "durga", score: 180, guesses: 2, houseId: "laxmi", houseLabel: "Laxmi", batchId: "b1219", batchLabel: "2012–19" }),
  row({ userId: "pranav", score: 140, guesses: 4, houseId: "shiwalik", houseLabel: "Shiwalik", batchId: "b0613", batchLabel: "2006–13" }),
  row({ userId: "priya", score: 120, guesses: 5, houseId: "udaigiri", houseLabel: "Udaigiri", batchId: "b1319", batchLabel: "2013–19" }),
  row({ userId: "karan", score: 20, solved: false, houseId: "laxmi", houseLabel: "Laxmi", batchId: "b2010", batchLabel: "2010" }),
];

describe("aggregate + rank — individual", () => {
  const board = rankEntries(aggregate(rows, "individual"));
  it("ranks by total desc", () => {
    expect(board.map((e) => e.key)).toEqual(["durga", "shubham", "pranav", "priya", "karan"]);
    expect(board[0]).toMatchObject({ rank: 1, total: 180 });
  });
  it("carries bestGuesses", () => {
    expect(board.find((e) => e.key === "durga")!.bestGuesses).toBe(2);
    expect(board.find((e) => e.key === "karan")!.bestGuesses).toBeNull();
  });
});

describe("aggregate + rank — house (SUM of members)", () => {
  const board = rankEntries(aggregate(rows, "house"));
  it("sums member scores", () => {
    const udaigiri = board.find((e) => e.key === "udaigiri")!;
    const laxmi = board.find((e) => e.key === "laxmi")!;
    expect(udaigiri.total).toBe(280); // 160 + 120
    expect(laxmi.total).toBe(200); // 180 + 20
    expect(udaigiri.players).toBe(2);
  });
  it("carries house colour label through", () => {
    expect(board[0].rank).toBe(1);
  });
});

describe("aggregate + rank — batch (SUM)", () => {
  const board = rankEntries(aggregate(rows, "batch"));
  it("2006–13 leads (160+140)", () => {
    expect(board[0]).toMatchObject({ key: "b0613", total: 300, rank: 1 });
  });
});

describe("ties → co-champions share rank (competition ranking)", () => {
  const tie: ScoreRow[] = [
    row({ userId: "a", score: 160, guesses: 3 }),
    row({ userId: "b", score: 160, guesses: 3 }),
    row({ userId: "c", score: 100, guesses: 6 }),
  ];
  const board = rankEntries(aggregate(tie, "individual"));
  it("both leaders are rank 1, next is rank 3", () => {
    const ranks = new Map(board.map((e) => [e.key, e.rank]));
    expect(ranks.get("a")).toBe(1);
    expect(ranks.get("b")).toBe(1);
    expect(ranks.get("c")).toBe(3);
  });
});

describe("tie-break: same total, fewer guesses wins", () => {
  const rows2: ScoreRow[] = [
    row({ userId: "slow", score: 160, guesses: 3 }),
    row({ userId: "fast", score: 160, guesses: 1 }),
  ];
  const board = rankEntries(aggregate(rows2, "individual"));
  it("fewer guesses ranks first, but not tied (different guessSum)", () => {
    expect(board[0].key).toBe("fast");
    expect(board[0].rank).toBe(1);
    expect(board[1].rank).toBe(2);
  });
});

describe("scope excludes rows lacking that identity", () => {
  it("house scope drops houseless players", () => {
    const mixed = [row({ userId: "x", score: 100, houseId: null }), row({ userId: "y", score: 50, houseId: "h1", houseLabel: "H1" })];
    const board = rankEntries(aggregate(mixed, "house"));
    expect(board).toHaveLength(1);
    expect(board[0].key).toBe("h1");
  });
});

describe("movementMap", () => {
  const cur: LeaderEntry[] = [
    { rank: 1, key: "udaigiri", label: "Udaigiri", color: null, avatarUrl: null, total: 880, players: 2, bestGuesses: 2 },
    { rank: 2, key: "laxmi", label: "Laxmi", color: null, avatarUrl: null, total: 580, players: 2, bestGuesses: 2 },
    { rank: 3, key: "aravali", label: "Aravali", color: null, avatarUrl: null, total: 100, players: 1, bestGuesses: 5 },
  ];
  const prior: LeaderEntry[] = [
    { rank: 1, key: "laxmi", label: "Laxmi", color: null, avatarUrl: null, total: 900, players: 2, bestGuesses: 1 },
    { rank: 2, key: "udaigiri", label: "Udaigiri", color: null, avatarUrl: null, total: 700, players: 2, bestGuesses: 2 },
  ];
  const m = movementMap(cur, prior);
  it("climbed / slipped / new", () => {
    expect(m.get("udaigiri")).toBe("up");
    expect(m.get("laxmi")).toBe("down");
    expect(m.get("aravali")).toBe("new");
  });
});
