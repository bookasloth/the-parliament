import { describe, it, expect } from "vitest";
import { BOARD, CITY_POS } from "@/modules/vyapaar/engine/board";
import { CITIES } from "@/modules/vyapaar/engine/data";

describe("vyapaar board", () => {
  it("has 40 tiles with the corners fixed", () => {
    expect(BOARD).toHaveLength(40);
    expect(BOARD[0].kind).toBe("start");
    expect(BOARD[10].kind).toBe("monsoon");
    expect(BOARD[20].kind).toBe("mandi");
    expect(BOARD[30].kind).toBe("taxraid");
  });

  it("places hubs, gst, income, and card tiles", () => {
    for (const p of [5, 15, 25, 35]) expect(BOARD[p].kind).toBe("hub");
    expect(BOARD[17].kind).toBe("gst");
    expect(BOARD[37].kind).toBe("income");
    for (const p of [3, 23]) expect(BOARD[p].kind).toBe("upi");
    for (const p of [7, 13, 27]) expect(BOARD[p].kind).toBe("headline");
  });

  it("fills the remaining 25 tiles with cities cheapest-first by position", () => {
    const cityTiles = BOARD.filter((t) => t.kind === "city");
    expect(cityTiles).toHaveLength(25);
    // Cheapest-first: buy price strictly increases along ascending board positions.
    const prices = cityTiles.map((t) => CITIES[t.cityId as number].price);
    for (let i = 1; i < prices.length; i++) expect(prices[i]).toBeGreaterThan(prices[i - 1]);
    for (const t of cityTiles) expect(CITY_POS[t.cityId as number]).toBe(t.pos);
    expect(CITIES).toHaveLength(25);
  });
});
