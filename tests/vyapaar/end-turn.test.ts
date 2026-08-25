import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent, winnerOf, rankSeats } from "@/modules/vyapaar/engine/engine";
import { scoreOf } from "@/modules/vyapaar/engine/helpers";
import { MAX_ROUNDS } from "@/modules/vyapaar/engine/data";

describe("end_turn and end conditions", () => {
  it("advances the seat and bumps the round on wrap", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "manage";
    applyIntent(s, 0, { type: "end_turn" });
    expect(s.active).toBe(1);
    expect(s.round).toBe(1);
    expect(s.phase).toBe("roll");
    s.phase = "manage";
    applyIntent(s, 1, { type: "end_turn" });
    expect(s.active).toBe(0);
    expect(s.round).toBe(2);
  });

  it("refuses end_turn outside the manage phase", () => {
    const s = createGame(1, ["a", "b"]);
    s.phase = "roll";
    const r = applyIntent(s, 0, { type: "end_turn" });
    expect("error" in r).toBe(true);
  });

  it("ends the game after MAX_ROUNDS", () => {
    const s = createGame(1, ["a", "b"]);
    s.round = MAX_ROUNDS; // ending this turn wraps → round MAX_ROUNDS+1 > MAX_ROUNDS
    s.active = 1;
    s.phase = "manage";
    applyIntent(s, 1, { type: "end_turn" });
    expect(s.ended).toBe(true);
    expect(s.winner).not.toBeNull();
  });

  it("ends after the round completes once a player reaches 3 sets", () => {
    const s = createGame(1, ["a", "b"]);
    // seat 0 controls 3 full sets (groups 0,1,2 = cityIds 0..14)
    for (let id = 0; id <= 14; id++) s.cities[id].owner = 0;
    s.phase = "manage";
    applyIntent(s, 0, { type: "end_turn" }); // endRequested set, not wrapped yet
    expect(s.ended).toBe(false);
    expect(s.endRequested).toBe(true);
    s.phase = "manage";
    applyIntent(s, 1, { type: "end_turn" }); // wraps → ends
    expect(s.ended).toBe(true);
    expect(winnerOf(s)).toBe(0);
  });

  it("winnerOf breaks ties by controlled sets", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 7075;
    s.players[1].cash = 1000;
    for (let id = 0; id <= 2; id++) s.cities[id].owner = 1; // seat 1 controls a set, seat 0 owns nothing
    expect(scoreOf(s, 0)).toBe(scoreOf(s, 1)); // genuine tie on score
    expect(winnerOf(s)).toBe(1);
  });

  it("rankSeats is best-first and agrees with winnerOf", () => {
    const s = createGame(1, ["a", "b"]);
    s.players[0].cash = 7075;
    s.players[1].cash = 1000;
    for (let id = 0; id <= 2; id++) s.cities[id].owner = 1; // seat 1 controls North → tie broken by sets
    const order = rankSeats(s);
    expect(order[0]).toBe(winnerOf(s));
    expect(new Set(order)).toEqual(new Set([0, 1]));
  });
});
