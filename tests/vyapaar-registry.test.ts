import { describe, it, expect } from "vitest"
import { GAMES, DAILY_GAMES, gameBySlug } from "@/config/games"

describe("games registry with kind", () => {
  it("every game has a kind", () => {
    for (const g of GAMES) expect(["daily", "multiplayer"]).toContain(g.kind)
  })
  it("vyapaar is a live multiplayer game", () => {
    const v = gameBySlug("vyapaar")
    expect(v).toBeTruthy()
    expect(v!.kind).toBe("multiplayer")
    expect(v!.status).toBe("live")
  })
  it("DAILY_GAMES excludes multiplayer", () => {
    expect(DAILY_GAMES.every((g) => g.kind === "daily")).toBe(true)
    expect(DAILY_GAMES.some((g) => g.slug === "vyapaar")).toBe(false)
  })
})
