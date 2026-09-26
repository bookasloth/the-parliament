import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { botIntent, driveBots, isBotUserId, BOT_USERS, findBotSwap, botAcceptsTrade } from "@/modules/vyapaar/bot";
import { CITIES } from "@/modules/vyapaar/engine/data";

describe("botIntent — the policy", () => {
  it("rolls in the roll phase and sits out jail", () => {
    const s = createGame(1, ["a", "b"], 25000);
    expect(botIntent(s, 0)).toEqual({ type: "roll" });
    s.phase = "jail"; s.players[0].halted = 3;
    expect(botIntent(s, 0)).toEqual({ type: "serve_jail" });
  });

  it("clears a debt it owes before doing anything else", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.payments = [{ id: 7, actor: 0, dir: "pay", amount: 500, party: "bank", reason: "rent", expiresAt: 0 }];
    expect(botIntent(s, 0)).toEqual({ type: "confirm_payment", paymentId: 7 });
  });

  it("buys a city that builds toward a zone, declines when it can't afford the reserve", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.phase = "buy"; s.pendingCity = 0; // Delhi, price 9000
    expect(botIntent(s, 0)).toEqual({ type: "buy" });
    s.players[0].cash = 9500; // buying would leave < RESERVE(2000)
    expect(botIntent(s, 0)).toEqual({ type: "decline" });
  });

  it("does not sprawl: declines a new zone once it already holds a full set elsewhere", () => {
    const s = createGame(1, ["a", "b"], 25000);
    for (const id of [0, 1, 2]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // North set
    s.phase = "buy"; s.pendingCity = 10; // an East city — a brand-new zone
    expect(botIntent(s, 0)).toEqual({ type: "decline" });
  });

  it("develops a controlled set in the manage phase, else ends the turn", () => {
    const s = createGame(1, ["a", "b"], 50000);
    for (const id of [0, 1, 2]) s.cities[id] = { owner: 0, level: 0, mortgaged: false };
    s.phase = "manage";
    const intent = botIntent(s, 0);
    expect(intent.type).toBe("develop");
    // no controlled set → end turn
    const s2 = createGame(1, ["a", "b"], 50000);
    s2.phase = "manage";
    expect(botIntent(s2, 0)).toEqual({ type: "end_turn" });
  });
});

describe("driveBots — plays whole games without error", () => {
  it("an all-bot table runs to a finished game", () => {
    const s = createGame(42, ["r", "m", "a"], 25000);
    const steps = driveBots(s, new Set([0, 1, 2]));
    expect(s.ended).toBe(true);
    expect(s.winner).not.toBeNull();
    expect(steps.length).toBeGreaterThan(20);
    // bots actually acquired property (they didn't just decline everything)
    const anyOwned = s.cities.some((c) => c.owner !== null) || s.companies.some((o) => o !== null);
    expect(anyOwned).toBe(true);
    // no negative cash left dangling on a live seat (settlement invariants hold)
    for (const p of s.players) if (!p.left) expect(p.cash).toBeGreaterThanOrEqual(0);
  });

  it("only drives bot seats — stops when a human is active", () => {
    const s = createGame(7, ["human", "bot"], 25000);
    const steps = driveBots(s, new Set([1])); // seat 0 is human, active
    expect(steps).toHaveLength(0); // active seat 0 isn't a bot → nothing driven
    expect(s.ended).toBe(false);
  });
});

describe("bot trading — mutual set-completing swaps", () => {
  // seat0: 2 of North (needs id2, held by seat1). seat1: 2 of West (needs id17, held by seat0).
  function crossHolding() {
    const s = createGame(1, ["a", "b"], 25000);
    for (const id of [0, 1]) s.cities[id] = { owner: 0, level: 0, mortgaged: false };
    s.cities[2] = { owner: 1, level: 0, mortgaged: false };
    for (const id of [15, 16]) s.cities[id] = { owner: 1, level: 0, mortgaged: false };
    s.cities[17] = { owner: 0, level: 0, mortgaged: false };
    return s;
  }

  it("finds the mutual swap and the recipient accepts it (both complete a set)", () => {
    const s = crossHolding();
    const swap = findBotSwap(s, 0, new Set([0, 1]));
    expect(swap).toBeTruthy();
    expect(swap!.to).toBe(1);
    expect(swap!.give.cities).toEqual([17]); // seat0 gives its West piece
    expect(swap!.get.cities).toEqual([2]);   // seat0 gets the North piece
    // recipient seat1 receives id17 → completes West, gives id2 → accept
    const offer = { id: 1, from: 0, to: 1, give: swap!.give, get: swap!.get, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer)).toBe(true);
  });

  it("refuses a trade that doesn't win a set", () => {
    const s = crossHolding();
    // offer seat1 a useless North piece for its West piece → seat1 would LOSE progress
    const offer = { id: 2, from: 0, to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [15] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer)).toBe(false);
  });

  it("bots actually trade during all-bot games", () => {
    let trades = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = createGame(seed, ["a", "b", "c", "d"], 200000);
      const steps = driveBots(s, new Set([0, 1, 2, 3]));
      trades += steps.filter((x) => x.intent.type === "trade_accepted" as string || x.intent.type === "propose_trade").length;
    }
    expect(trades).toBeGreaterThan(0);
  });
});

describe("bot identity", () => {
  it("recognises seeded bot user ids and rejects others", () => {
    expect(isBotUserId(BOT_USERS[0].id)).toBe(true);
    expect(isBotUserId("11111111-1111-4111-8111-111111111111")).toBe(false);
  });
});

describe("bot personas", () => {
  it("aggressive bids harder than cautious at auction", () => {
    const mk = () => {
      const s = createGame(1, ["a", "b"], 200000);
      s.phase = "auction";
      s.auction = { kind: "city", index: 0, bids: [null, null] } as unknown as typeof s.auction;
      return s;
    };
    const agg = botIntent(mk(), 0, "aggressive") as { type: "bid"; amount: number };
    const cau = botIntent(mk(), 0, "cautious") as { type: "bid"; amount: number };
    expect(agg.type).toBe("bid");
    expect(agg.amount).toBeGreaterThan(cau.amount);
  });

  it("reserve gates a marginal buy: aggressive buys, cautious declines", () => {
    const mk = () => {
      const s = createGame(1, ["a", "b"], CITIES[0].price + 1000); // only ₹1,000 over the price
      s.phase = "buy";
      s.pendingCity = 0;
      return s;
    };
    expect(botIntent(mk(), 0, "aggressive")).toEqual({ type: "buy" });   // reserve 500 ≤ 1000
    expect(botIntent(mk(), 0, "cautious")).toEqual({ type: "decline" }); // reserve 4000 > 1000
    expect(botIntent(mk(), 0, "normal")).toEqual({ type: "decline" });   // reserve 2000 > 1000
  });

  it("only aggressive takes a set-neutral land-grab (more cities in than out)", () => {
    const s = createGame(1, ["a", "b"], 200000);
    // seat 1 receives two cities in different zones, gives one — no set completes either way.
    const offer = { id: 1, from: 0, to: 1, give: { cash: 0, cities: [0, 6] }, get: { cash: 0, cities: [12] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer, "aggressive")).toBe(true);
    expect(botAcceptsTrade(s, offer, "normal")).toBe(false);
    expect(botAcceptsTrade(s, offer, "cautious")).toBe(false);
  });
});
