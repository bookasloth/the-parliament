import {
  CITIES,
  HUB_POS,
  START_POS,
  MONSOON_POS,
  MANDI_POS,
  TAXRAID_POS,
  GST_POS,
  INCOME_POS,
  UPI_POS,
  HEADLINE_POS,
} from "./data";

export type TileKind =
  | "start"
  | "monsoon"
  | "mandi"
  | "taxraid"
  | "hub"
  | "gst"
  | "income"
  | "upi"
  | "headline"
  | "city";

export interface Tile {
  pos: number;
  kind: TileKind;
  cityId?: number;
  hubIndex?: number;
}

function buildBoard(): { board: Tile[]; cityPos: number[] } {
  const board: Tile[] = new Array(40);
  const specials = new Map<number, TileKind>();
  specials.set(START_POS, "start");
  specials.set(MONSOON_POS, "monsoon");
  specials.set(MANDI_POS, "mandi");
  specials.set(TAXRAID_POS, "taxraid");
  specials.set(GST_POS, "gst");
  specials.set(INCOME_POS, "income");
  HUB_POS.forEach((p) => specials.set(p, "hub"));
  UPI_POS.forEach((p) => specials.set(p, "upi"));
  HEADLINE_POS.forEach((p) => specials.set(p, "headline"));

  // CITIES is authored zone-grouped, so sort a copy by price for cheapest-first placement.
  const byPrice = CITIES.map((_, id) => id).sort((a, b) => CITIES[a].price - CITIES[b].price);
  const cityPos: number[] = [];
  let nextCity = 0;
  for (let pos = 0; pos < 40; pos++) {
    const kind = specials.get(pos);
    if (kind === "hub") {
      board[pos] = { pos, kind, hubIndex: HUB_POS.indexOf(pos) };
    } else if (kind) {
      board[pos] = { pos, kind };
    } else {
      const cityId = byPrice[nextCity++];
      board[pos] = { pos, kind: "city", cityId };
      cityPos[cityId] = pos;
    }
  }
  if (nextCity !== CITIES.length) {
    throw new Error(`board: assigned ${nextCity} cities, expected ${CITIES.length}`);
  }
  return { board, cityPos };
}

const built = buildBoard();
export const BOARD: Tile[] = built.board;
export const CITY_POS: number[] = built.cityPos;
