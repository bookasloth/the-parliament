import { describe, it, expect } from "vitest";
import { createGame } from "@/modules/vyapaar/engine/state";
import { applyIntent } from "@/modules/vyapaar/engine/engine";
import { botIntent, driveBots, isBotUserId, BOT_USERS, findBestBotTrade, botAcceptsTrade } from "@/modules/vyapaar/bot";
import { CITIES, upgradeCost } from "@/modules/vyapaar/engine/data";

describe("botIntent — the policy", () => {
  it("rolls in the roll phase and sits out jail", () => {
    const s = createGame(1, ["a", "b"], 25000);
    expect(botIntent(s, 0)).toEqual({ type: "roll" });
    s.phase = "jail"; s.players[0].halted = 3; s.round = 25; // late game → sit it out (early-game would bribe)
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

  it("opens a new zone when flush, but declines it when cash is tight", () => {
    // Owning a set elsewhere no longer blocks a buy — a rich bot grabs affordable property
    // (the old 'never sprawl' rule is why loaded bots used to walk past deeds they could afford).
    const flush = createGame(1, ["a", "b"], 25000);
    for (const id of [0, 1, 2]) flush.cities[id] = { owner: 0, level: 0, mortgaged: false }; // North set
    flush.phase = "buy"; flush.pendingCity = 10; // East city (Kolkata, 7200) — a brand-new zone
    expect(botIntent(flush, 0)).toEqual({ type: "buy" });

    const tight = createGame(1, ["a", "b"], 25000);
    for (const id of [0, 1, 2]) tight.cities[id] = { owner: 0, level: 0, mortgaged: false };
    tight.players[0].cash = 12000; // 12000 − 7200 = 4800 < normal ample buffer (2000×3) → hold cash
    tight.phase = "buy"; tight.pendingCity = 10;
    expect(botIntent(tight, 0)).toEqual({ type: "decline" });
  });

  it("completes a set even when it spends below the normal reserve", () => {
    const s = createGame(1, ["a", "b"], 25000);
    for (const id of [0, 1]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // 2/3 of North
    s.players[0].cash = 6400; // Jaipur (id2) costs 5800 → leaves 600: over the 500 floor, under the 2000 reserve
    s.phase = "buy"; s.pendingCity = 2; // the completer
    expect(botIntent(s, 0)).toEqual({ type: "buy" }); // a set is worth spending deep for
  });

  it("targets the company PAIR: buys the partner to double fees, not a third loose company", () => {
    const s = createGame(1, ["a", "b"], 200000);
    s.companies[0] = 0; // owns Udta Firta (Travel pair with company 1)
    s.phase = "buy"; s.pendingCompany = 1; // its partner → completes the 5× pair
    expect(botIntent(s, 0)).toEqual({ type: "buy" });
    // already holds a full pair (0+1); a loose third company from another pair is declined
    s.companies[1] = 0;
    s.pendingCompany = 4; // Fox & Bew (a different pair) — not worth it as a single
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

  it("finds the best proposable trade and the recipient accepts it (both complete a set)", () => {
    const s = crossHolding();
    const swap = findBestBotTrade(s, 0, (to, offer) => botAcceptsTrade(s, offer, "normal"));
    expect(swap).toBeTruthy();
    expect(swap!.to).toBe(1);
    expect(swap!.give.cities).toEqual([17]); // seat0 gives its West piece
    expect(swap!.get.cities).toEqual([2]);   // seat0 gets the North piece
    // recipient seat1 receives id17 → completes West, gives id2 → accept
    const offer = { id: 1, from: 0, to: 1, give: swap!.give, get: swap!.get, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer)).toBe(true);
  });

  it("proposes to a HUMAN holder too (not bot-only), when both benefit", () => {
    const s = crossHolding(); // seat 1 is treated as a plain player here — no botSeats filter exists now
    const swap = findBestBotTrade(s, 0, (to, offer) => botAcceptsTrade(s, offer, "normal"));
    expect(swap?.to).toBe(1);
  });

  it("proposes nothing when no swap improves the bot's board", () => {
    const s = createGame(1, ["a", "b"], 200000); // fresh board, nobody owns anything
    const swap = findBestBotTrade(s, 0, () => true);
    expect(swap).toBeNull();
  });

  it("refuses a trade that doesn't win a set", () => {
    const s = crossHolding();
    // offer seat1 a useless North piece for its West piece → seat1 would LOSE progress
    const offer = { id: 2, from: 0, to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [15] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer)).toBe(false);
  });

  it("bots actively propose and answer trades during all-bot games", () => {
    let proposed = 0, answered = 0;
    for (let seed = 1; seed <= 5; seed++) {
      const s = createGame(seed, ["a", "b", "c", "d"], 200000);
      const steps = driveBots(s, new Set([0, 1, 2, 3]));
      proposed += steps.filter((x) => x.intent.type === "propose_trade").length;
      answered += steps.filter((x) => x.intent.type === "respond_trade").length;
    }
    expect(proposed).toBeGreaterThan(0);
    expect(answered).toBeGreaterThan(0);
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

  it("normal accepts a fair swap that advances toward a set; cautious refuses", () => {
    const s = createGame(1, ["a", "b"], 200000);
    s.cities[1] = { owner: 1, level: 0, mortgaged: false }; // seat1: North id1 (6500)
    s.cities[5] = { owner: 1, level: 0, mortgaged: false }; // seat1: South id5 (8800)
    // seat1 RECEIVES id0 (North 9000) → North goes 1→2 (advances), GIVES id5 (8800): receive ≥ give.
    const offer = { id: 1, from: 0, to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [5] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer, "normal")).toBe(true);
    expect(botAcceptsTrade(s, offer, "aggressive")).toBe(true);
    expect(botAcceptsTrade(s, offer, "cautious")).toBe(false);
  });

  it("only aggressive takes a fair land-grab that does NOT advance a set", () => {
    const s = createGame(1, ["a", "b"], 200000);
    s.cities[0] = { owner: 1, level: 0, mortgaged: false }; // seat1: North id0
    s.cities[1] = { owner: 1, level: 0, mortgaged: false }; // seat1: North id1 (best progress = 2)
    // seat1 RECEIVES id10+id11 (East, 12200) for id0 (9000): 2-in-1-out, fair, but East only reaches
    // 2 → best progress stays 2, so it does NOT advance. Only the land-grab persona takes it.
    const offer = { id: 2, from: 0, to: 1, give: { cash: 0, cities: [10, 11] }, get: { cash: 0, cities: [0] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer, "aggressive")).toBe(true);
    expect(botAcceptsTrade(s, offer, "normal")).toBe(false);
    expect(botAcceptsTrade(s, offer, "cautious")).toBe(false);
  });
});

describe("businessman bot traits", () => {
  it("coalition: an aggressive bot refuses to trade with the leader even for a set", () => {
    const s = createGame(1, ["a", "b"], 25000);
    s.cities[1] = { owner: 1, level: 0, mortgaged: false }; // seat1: North id1, id2 (2/3)
    s.cities[2] = { owner: 1, level: 0, mortgaged: false };
    s.cities[10] = { owner: 1, level: 0, mortgaged: false }; // a throwaway East card to give
    s.cities[0] = { owner: 0, level: 0, mortgaged: false }; // seat0 (the leader) holds the 3rd North
    // seat1 receives id0 → completes North; gives id10. A pure win for seat1.
    const offer = { id: 1, from: 0, to: 1, give: { cash: 0, cities: [0] }, get: { cash: 0, cities: [10] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer, "normal", 0)).toBe(true);      // normal takes the free set
    expect(botAcceptsTrade(s, offer, "aggressive", 0)).toBe(false); // schemer won't feed the leader
  });

  it("risk: an aggressive bot overpays (unfair value) to advance a set; normal won't", () => {
    const s = createGame(1, ["a", "b"], 200000);
    s.cities[0] = { owner: 1, level: 0, mortgaged: false }; // seat1: North id0
    s.cities[5] = { owner: 1, level: 0, mortgaged: false }; // seat1: South id5 (8800)
    // receive id1 (North 6500) advances North 1→2, give id5 (8800) → receive < give (unfair).
    const offer = { id: 1, from: 0, to: 1, give: { cash: 0, cities: [1] }, get: { cash: 0, cities: [5] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer, "aggressive")).toBe(true);
    expect(botAcceptsTrade(s, offer, "normal")).toBe(false);
  });

  it("over-leverage: aggressive builds past a prudent reserve where normal holds cash", () => {
    const s = createGame(1, ["a", "b"], 0);
    for (const id of [0, 1, 2]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // seat0 controls North
    s.phase = "manage";
    const minCost = Math.min(upgradeCost(0), upgradeCost(1), upgradeCost(2));
    s.players[0].cash = minCost + 500; // enough to build, but below the normal 2000 reserve after
    expect(botIntent(s, 0, "aggressive").type).toBe("develop");
    expect(botIntent(s, 0, "normal")).toEqual({ type: "end_turn" });
  });
});

describe("rebuilt bot — value buying, auctions, cash management", () => {
  it("bids OVER sticker for a set-completer (so a human can't just outbid at base+1)", () => {
    const s = createGame(1, ["a", "b"], 200000);
    for (const id of [0, 1]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // 2/3 of North
    s.phase = "auction";
    s.auction = { kind: "city", index: 2, bids: [null, null] } as unknown as typeof s.auction; // Jaipur completes North
    const bid = botIntent(s, 0, "aggressive") as { type: "bid"; amount: number };
    expect(bid.type).toBe("bid");
    expect(bid.amount).toBeGreaterThan(CITIES[2].price); // worth 1.3× price × 1.25 cap → above face
  });

  it("bribes out of jail early-game when flush; a cautious bot still sits it out", () => {
    const s = createGame(1, ["a", "b"], 50000);
    s.phase = "jail"; s.players[0].halted = 3; s.round = 2;
    expect(botIntent(s, 0, "normal")).toEqual({ type: "bribe_jail" });
    expect(botIntent(s, 0, "cautious")).toEqual({ type: "serve_jail" });
  });

  it("sits out jail late-game even if flush (property is already claimed)", () => {
    const s = createGame(1, ["a", "b"], 50000);
    s.phase = "jail"; s.players[0].halted = 3; s.round = 25; // past EARLY_ROUNDS
    expect(botIntent(s, 0, "normal")).toEqual({ type: "serve_jail" });
  });

  it("takes the underdog restructure advance before rolling", () => {
    const s = createGame(1, ["a", "b"], 1000);
    // seat1 is far ahead (cash + a city) → seat0 is the trailing underdog.
    s.players[1].cash = 60000;
    s.cities[0] = { owner: 1, level: 0, mortgaged: false };
    s.phase = "roll";
    expect(botIntent(s, 0, "normal")).toEqual({ type: "restructure" });
  });

  it("proposes a 2-for-1 when a single card wouldn't be accepted", () => {
    const s = createGame(1, ["a", "b"], 200000);
    // seat0: 2/3 North (0,1) + two spare East cards (11,12). seat1: holds North completer (2) + East 10.
    for (const id of [0, 1, 11, 12]) s.cities[id] = { owner: 0, level: 0, mortgaged: false };
    s.cities[2] = { owner: 1, level: 0, mortgaged: false };
    s.cities[10] = { owner: 1, level: 0, mortgaged: false };
    // A cautious recipient only accepts a trade that COMPLETES its set: one East card (10,11)=2 isn't
    // enough, but BOTH (10,11,12) is. So the only accepted offer is the 2-for-1.
    const swap = findBestBotTrade(s, 0, (to, offer) => botAcceptsTrade(s, offer, "cautious"));
    expect(swap).toBeTruthy();
    expect(swap!.to).toBe(1);
    expect([...(swap!.give.cities ?? [])].sort((a, b) => a - b)).toEqual([11, 12]);
    expect(swap!.get.cities).toEqual([2]);
  });
});

describe("archetypes — distinct personalities", () => {
  it("The Turtle never trades — refuses every offer and proposes nothing", () => {
    const s = createGame(1, ["a", "b"], 200000);
    for (const id of [0, 1]) s.cities[id] = { owner: 0, level: 0, mortgaged: false };
    s.cities[2] = { owner: 1, level: 0, mortgaged: false }; // a set-completer on offer
    const offer = { id: 1, from: 1, to: 0, give: { cash: 0, cities: [2] }, get: { cash: 0, cities: [1] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer, "turtle")).toBe(false);            // even a free set — refuses
    expect(findBestBotTrade(s, 0, () => true, "turtle")).toBeNull();    // never initiates
  });

  it("The Landlord hoards one zone — won't open a brand-new colour even when flush", () => {
    const s = createGame(1, ["a", "b"], 200000);
    s.cities[0] = { owner: 0, level: 0, mortgaged: false }; // started North
    s.phase = "buy"; s.pendingCity = 10; // East — a new zone
    expect(botIntent(s, 0, "landlord")).toEqual({ type: "decline" }); // focus: stay in North
    expect(botIntent(s, 0, "normal")).toEqual({ type: "buy" });       // a normal bot opens it when flush
  });

  it("The Trader proposes a mutual set-completing swap", () => {
    const s = createGame(1, ["a", "b"], 200000);
    for (const id of [0, 1]) s.cities[id] = { owner: 0, level: 0, mortgaged: false };
    s.cities[2] = { owner: 1, level: 0, mortgaged: false };
    for (const id of [15, 16]) s.cities[id] = { owner: 1, level: 0, mortgaged: false };
    s.cities[17] = { owner: 0, level: 0, mortgaged: false };
    const swap = findBestBotTrade(s, 0, (to, offer) => botAcceptsTrade(s, offer, "trader"), "trader");
    expect(swap?.to).toBe(1);
  });
});

describe("hidden coalition — bots gang the human", () => {
  it("a bot never initiates a trade with a human, even a mutually-completing one", () => {
    const s = createGame(1, ["human", "bot"], 200000);
    for (const id of [0, 1]) s.cities[id] = { owner: 1, level: 0, mortgaged: false }; // bot: 2/3 North
    s.cities[2] = { owner: 0, level: 0, mortgaged: false }; // human holds the North completer
    for (const id of [15, 16]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // human: 2/3 West
    s.cities[17] = { owner: 1, level: 0, mortgaged: false }; // bot holds the West completer
    const humans = new Set([0]);
    // Without the coalition the bot would gladly propose (both complete a set)…
    expect(findBestBotTrade(s, 1, (to, offer) => botAcceptsTrade(s, offer, "normal"), "normal")).toBeTruthy();
    // …but with the human flagged, it won't deal with them at all.
    expect(findBestBotTrade(s, 1, (to, offer) => botAcceptsTrade(s, offer, "normal", -1, humans), "normal", -1, humans)).toBeNull();
  });

  it("a bot refuses to hand a human the card that completes the human's set", () => {
    const s = createGame(1, ["human", "bot"], 200000);
    s.cities[0] = { owner: 1, level: 0, mortgaged: false };  // bot: North id0
    s.cities[17] = { owner: 1, level: 0, mortgaged: false }; // bot holds the human's West completer
    s.cities[1] = { owner: 0, level: 0, mortgaged: false };  // human: North id1 (to offer the bot)
    for (const id of [15, 16]) s.cities[id] = { owner: 0, level: 0, mortgaged: false }; // human: 2/3 West
    // Human offers the bot id1 (advances bot's North) for the bot's id17 (completes human's West).
    const offer = { id: 1, from: 0, to: 1, give: { cash: 0, cities: [1] }, get: { cash: 0, cities: [17] }, expiresAt: 0 };
    expect(botAcceptsTrade(s, offer, "normal")).toBe(true);                       // no coalition → fair swap, accepts
    expect(botAcceptsTrade(s, offer, "normal", -1, new Set([0]))).toBe(false);    // coalition → won't feed the human
  });
});
