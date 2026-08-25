import {
  CITIES,
  COMPANY_POS,
  START_POS,
  MONSOON_POS,
  MANDI_POS,
  TAXRAID_POS,
  EVENT_TILES,
} from "./data";
import type { EventId } from "./data";

export type TileKind =
  | "start"
  | "monsoon"
  | "mandi"
  | "taxraid"
  | "company"
  | "event"
  | "city";

export interface Tile {
  pos: number;
  kind: TileKind;
  cityId?: number;
  companyIndex?: number;
  eventId?: EventId;
}

function buildBoard(): { board: Tile[]; cityPos: number[] } {
  const board: Tile[] = new Array(40);
  const specials = new Map<number, TileKind>();
  specials.set(START_POS, "start");
  specials.set(MONSOON_POS, "monsoon");
  specials.set(MANDI_POS, "mandi");
  specials.set(TAXRAID_POS, "taxraid");
  const eventAt = new Map<number, EventId>(Object.entries(EVENT_TILES).map(([p, id]) => [Number(p), id]));
  const companyAt = new Map<number, number>();
  COMPANY_POS.forEach((p, i) => companyAt.set(p, i));

  // Cities are placed in ALPHABETICAL order around the board.
  const byName = CITIES.map((_, id) => id).sort((a, b) => CITIES[a].name.localeCompare(CITIES[b].name));
  const cityPos: number[] = [];
  let nextCity = 0;
  for (let pos = 0; pos < 40; pos++) {
    const kind = specials.get(pos);
    if (companyAt.has(pos)) {
      board[pos] = { pos, kind: "company", companyIndex: companyAt.get(pos) };
    } else if (eventAt.has(pos)) {
      board[pos] = { pos, kind: "event", eventId: eventAt.get(pos) };
    } else if (kind) {
      board[pos] = { pos, kind };
    } else {
      const cityId = byName[nextCity++];
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
