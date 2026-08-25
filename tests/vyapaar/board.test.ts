import { describe, it, expect } from "vitest";
import { BOARD, CITY_POS } from "@/modules/vyapaar/engine/board";
import { CITIES } from "@/modules/vyapaar/engine/data";

describe("vyapaar board", () => {
  it("has 40 tiles with the corners fixed", () => {
    expect(BOARD).toHaveLength(40);
    expect(BOARD[0].kind).toBe("start");
    expect(BOARD[12].kind).toBe("monsoon"); // wide 13×9 corners
    expect(BOARD[20].kind).toBe("mandi");
    expect(BOARD[32].kind).toBe("taxraid");
  });

  it("places companies (3 pairs), gst, income, and card tiles", () => {
    for (const p of [3, 9, 15, 21, 27, 33]) expect(BOARD[p].kind).toBe("company");
    expect(BOARD[17].kind).toBe("gst");
    expect(BOARD[37].kind).toBe("income");
    for (const p of [6]) expect(BOARD[p].kind).toBe("upi");
    for (const p of [24, 30]) expect(BOARD[p].kind).toBe("headline");
  });

  it("fills the remaining 25 tiles with cities alphabetically by position", () => {
    const cityTiles = BOARD.filter((t) => t.kind === "city");
    expect(cityTiles).toHaveLength(25);
    // Alphabetical: names ascend along ascending board positions (BOARD is position-ordered).
    const names = cityTiles.map((t) => CITIES[t.cityId as number].name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
    for (const t of cityTiles) expect(CITY_POS[t.cityId as number]).toBe(t.pos);
    expect(CITIES).toHaveLength(25);
  });
});
