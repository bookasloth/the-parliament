import { describe, it, expect } from "vitest"
import { createGame } from "@/modules/vyapaar/engine/state"
import { applyIntent } from "@/modules/vyapaar/engine/engine"
import { TRADE_UNION_BANK, TRADE_UNION_POOL } from "@/modules/vyapaar/engine/data"
import { CLIENT_INTENT_TYPES } from "@/modules/vyapaar/engine/intent-types"

const side = (cities: number[]) => ({ cash: 0, cities })

// 3-player game, seat 0 active so seats 1/2 may trade.
function game(cash = 25000) {
  const s = createGame(1, ["a", "b", "c"], cash)
  s.active = 0
  return s
}
function accept(s: ReturnType<typeof game>) {
  const id = s.trades[0].id
  return applyIntent(s, 2, { type: "respond_trade", tradeId: id, accept: true })
}

describe("trader's-union charge", () => {
  it("charges each trader the bank fee + splits the pool among the other players", () => {
    const s = game()
    s.cities[0].owner = 1 // Delhi (North)
    s.cities[6].owner = 2 // Hyderabad (South)
    const c1 = s.players[1].cash, c2 = s.players[2].cash, c0 = s.players[0].cash
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) })
    accept(s)
    // one other player (seat 0) → pool of 500 goes entirely to seat 0, per trader.
    const costEach = TRADE_UNION_BANK + TRADE_UNION_POOL // 1000
    expect(s.players[1].cash).toBe(c1 - costEach)
    expect(s.players[2].cash).toBe(c2 - costEach)
    expect(s.players[0].cash).toBe(c0 + TRADE_UNION_POOL * 2) // both traders paid seat 0
  })

  it("conserves money — everything the traders lose lands on bank + others", () => {
    const s = game()
    s.cities[0].owner = 1
    s.cities[6].owner = 2
    const before = s.players.reduce((t, p) => t + p.cash, 0)
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) })
    accept(s)
    const after = s.players.reduce((t, p) => t + p.cash, 0)
    // Only the bank fees leave the game: 2 traders × TRADE_UNION_BANK.
    expect(before - after).toBe(2 * TRADE_UNION_BANK)
  })

  it("with no other players (2-player game) only the bank fee applies", () => {
    const s = createGame(1, ["a", "b"], 25000)
    s.active = 0
    s.cities[0].owner = 0
    s.cities[6].owner = 1
    // seat 1 proposes to the active seat 0 (allowed — proposing is legal off your turn)
    applyIntent(s, 1, { type: "propose_trade", to: 0, give: side([6]), get: side([0]) })
    const c0 = s.players[0].cash, c1 = s.players[1].cash
    applyIntent(s, 0, { type: "respond_trade", tradeId: s.trades[0].id, accept: true })
    expect(s.players[0].cash).toBe(c0 - TRADE_UNION_BANK)
    expect(s.players[1].cash).toBe(c1 - TRADE_UNION_BANK)
  })

  it("rejects the trade when a trader can't afford the charge (no half-charge, no swap)", () => {
    const s = game(600) // < 1000 needed with one other player
    s.cities[0].owner = 1
    s.cities[6].owner = 2
    applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([0]), get: side([6]) })
    const r = accept(s)
    expect("error" in r && r.error).toBe("trade_charge_unaffordable")
    expect(s.cities[0].owner).toBe(1) // ownership unchanged
    expect(s.cities[6].owner).toBe(2)
    expect(s.players[1].cash).toBe(600) // no partial charge
  })
})

describe("set-lock: a developed colour set can't be broken up by trade", () => {
  it("blocks trading a set-mate once any city in that set has a house", () => {
    const s = game()
    // seat 1 owns all of North (cities 0..4) and builds a house on Delhi (0).
    for (const id of [0, 1, 2, 3, 4]) s.cities[id].owner = 1
    s.cities[0].level = 1 // house on Delhi → whole North set locked
    s.cities[6].owner = 2
    // try to trade Chandigarh (1, same set, level 0) away — must be rejected.
    const r = applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([1]), get: side([6]) })
    expect("error" in r && r.error).toBe("bad_give")
  })

  it("still allows trading a set-mate when the set has NO houses", () => {
    const s = game()
    for (const id of [0, 1, 2, 3, 4]) s.cities[id].owner = 1 // full North, undeveloped
    s.cities[6].owner = 2
    const r = applyIntent(s, 1, { type: "propose_trade", to: 2, give: side([1]), get: side([6]) })
    expect("state" in r).toBe(true)
  })
})

describe("client intent whitelist (jail regression guard)", () => {
  it("accepts the jail intents that the buttons dispatch", () => {
    // The bribe/sit-out buttons 400'd because the route whitelist had drifted; guard it here.
    expect(CLIENT_INTENT_TYPES.has("bribe_jail")).toBe(true)
    expect(CLIENT_INTENT_TYPES.has("serve_jail")).toBe(true)
  })
  it("excludes the system-only expiry intents", () => {
    expect((CLIENT_INTENT_TYPES as ReadonlySet<string>).has("expire_trade")).toBe(false)
    expect((CLIENT_INTENT_TYPES as ReadonlySet<string>).has("expire_payment")).toBe(false)
  })
})
