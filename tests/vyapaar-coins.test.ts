import { describe, it, expect } from "vitest"
import { COIN_PACKS, WELCOME_GRANT, coinsForPack } from "@/config/vyapaar-coins"
import { planTopUp } from "@/modules/vyapaar/wallet-logic"

describe("vyapaar coin config", () => {
  it("welcome grant is 25000", () => expect(WELCOME_GRANT).toBe(25000))
  it("has 5 packs with unique ids", () => {
    expect(COIN_PACKS).toHaveLength(5)
    expect(new Set(COIN_PACKS.map((p) => p.id)).size).toBe(5)
  })
  it("coinsForPack = coins + bonus", () => {
    expect(coinsForPack(COIN_PACKS[0])).toBe(15000) // 15000 + 0
    expect(coinsForPack(COIN_PACKS[1])).toBe(42500) // 40000 + 2500
    expect(coinsForPack(COIN_PACKS[4])).toBe(480000) // 400000 + 80000
  })
  it("coins per shell improves with bigger packs", () => {
    const rates = COIN_PACKS.map((p) => coinsForPack(p) / p.shells)
    for (let i = 1; i < rates.length; i++) expect(rates[i]).toBeGreaterThanOrEqual(rates[i - 1])
  })
})

describe("planTopUp", () => {
  it("rejects an unknown pack", () => {
    expect(planTopUp(9999, "nope")).toEqual({ ok: false, error: "unknown_pack" })
  })
  it("rejects when shells are short", () => {
    expect(planTopUp(99, "coins_15k")).toEqual({ ok: false, error: "insufficient_shells" })
  })
  it("plans a valid top-up with exact shell cost and coin credit", () => {
    expect(planTopUp(100, "coins_15k")).toEqual({
      ok: true,
      packId: "coins_15k",
      shellCost: 100,
      coinCredit: 15000,
    })
    expect(planTopUp(5000, "coins_400k")).toEqual({
      ok: true,
      packId: "coins_400k",
      shellCost: 2000,
      coinCredit: 480000,
    })
  })
})
