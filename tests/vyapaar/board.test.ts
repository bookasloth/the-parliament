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

  it("places companies (3 pairs) and the five Indian-business event tiles", () => {
    for (const p of [3, 9, 15, 21, 27, 33]) expect(BOARD[p].kind).toBe("company");
    for (const p of [6, 17, 24, 30, 37]) expect(BOARD[p].kind).toBe("event");
    expect(BOARD[6].eventId).toBe("tax_return");
    expect(BOARD[17].eventId).toBe("festival");
    expect(BOARD[24].eventId).toBe("married");
    expect(BOARD[30].eventId).toBe("ed_raid");
    expect(BOARD[37].eventId).toBe("jnv_revisit");
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
