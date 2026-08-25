// Canonical Vyapaar constants — single source of truth. The balance harness
// tunes ONLY this file; the engine reads everything from here.

export type Zone = number; // index into ZONES

export const ZONES = ["North", "South", "East", "West", "Central"] as const;

/** Per-city rent ladder, levels 0..6: [base, 1House, 2House, 3House, 1Hotel, 2Hotel, 3Hotel]. */
export type RentRung = [number, number, number, number, number, number, number];

export interface CityDef {
  name: string;
  zone: Zone;
  price: number; // Buy
  rent: RentRung;
}

// 25 cities, authored ZONE-GROUPED so cityId 0-4 = North, 5-9 = South, 10-14 = East,
// 15-19 = West, 20-24 = Central. (Board placement is cheapest-first — board.ts sorts by price.)
export const CITIES: CityDef[] = [
  // North (zone 0)
  { name: "Delhi", zone: 0, price: 9000, rent: [450, 900, 1350, 2000, 2700, 3600, 4950] },
  { name: "Chandigarh", zone: 0, price: 6500, rent: [350, 650, 1000, 1450, 1950, 2600, 3600] },
  { name: "Jaipur", zone: 0, price: 5800, rent: [300, 600, 850, 1300, 1750, 2300, 3200] },
  { name: "Lucknow", zone: 0, price: 5200, rent: [250, 500, 800, 1150, 1550, 2100, 2850] },
  { name: "Dehradun", zone: 0, price: 4200, rent: [200, 400, 650, 950, 1250, 1700, 2300] },
  // South (zone 1)
  { name: "Bengaluru", zone: 1, price: 8800, rent: [450, 900, 1300, 1950, 2650, 3500, 4850] },
  { name: "Hyderabad", zone: 1, price: 8000, rent: [400, 800, 1200, 1750, 2400, 3200, 4400] },
  { name: "Chennai", zone: 1, price: 7500, rent: [400, 750, 1100, 1650, 2250, 3000, 4100] },
  { name: "Kochi", zone: 1, price: 4800, rent: [250, 500, 700, 1050, 1450, 1900, 2650] },
  { name: "Coimbatore", zone: 1, price: 4500, rent: [250, 450, 700, 1000, 1350, 1800, 2500] },
  // East (zone 2)
  { name: "Kolkata", zone: 2, price: 7200, rent: [350, 700, 1100, 1600, 2150, 2900, 3950] },
  { name: "Bhubaneswar", zone: 2, price: 5000, rent: [250, 500, 750, 1100, 1500, 2000, 2750] },
  { name: "Guwahati", zone: 2, price: 4600, rent: [250, 450, 700, 1000, 1400, 1850, 2550] },
  { name: "Patna", zone: 2, price: 4300, rent: [200, 450, 650, 950, 1300, 1700, 2350] },
  { name: "Ranchi", zone: 2, price: 3800, rent: [200, 400, 550, 850, 1150, 1500, 2100] },
  // West (zone 3)
  { name: "Mumbai", zone: 3, price: 9500, rent: [500, 950, 1450, 2100, 2850, 3800, 5250] },
  { name: "Pune", zone: 3, price: 6800, rent: [350, 700, 1000, 1500, 2050, 2700, 3750] },
  { name: "Ahmedabad", zone: 3, price: 6200, rent: [300, 600, 950, 1350, 1850, 2500, 3400] },
  { name: "Surat", zone: 3, price: 5500, rent: [300, 550, 850, 1200, 1650, 2200, 3000] },
  { name: "Vadodara", zone: 3, price: 4400, rent: [200, 450, 650, 950, 1300, 1750, 2400] },
  // Central (zone 4)
  { name: "Indore", zone: 4, price: 5600, rent: [300, 550, 850, 1250, 1700, 2250, 3100] },
  { name: "Bhopal", zone: 4, price: 4900, rent: [250, 500, 750, 1100, 1450, 1950, 2700] },
  { name: "Nagpur", zone: 4, price: 4700, rent: [250, 450, 700, 1050, 1400, 1900, 2600] },
  { name: "Raipur", zone: 4, price: 4000, rent: [200, 400, 600, 900, 1200, 1600, 2200] },
  { name: "Jabalpur", zone: 4, price: 3500, rent: [200, 350, 500, 800, 1050, 1400, 1900] },
];

export const UPGRADE_COST_RATIO = 0.1; // house/hotel cost per level = 10% of buy (tunable by harness)

/** Cost to raise a city one level. Table gives no house cost, so derive from buy price. */
export function upgradeCost(cityId: number): number {
  return Math.round(CITIES[cityId].price * UPGRADE_COST_RATIO);
}

// Companies replace the old generic hubs: 6 named companies in 3 pairs. No building —
// they charge a flat service fee, doubled to the pair rate when one owner holds both of a pair.
export const COMPANY_CATS = ["Travel", "Communication", "Food"] as const;
export interface CompanyDef {
  name: string;
  short: string;
  category: number; // index into COMPANY_CATS
  sub: string;
  partner: number; // index of the paired company
  buy: number;
  single: number; // service fee when the owner holds one of the pair
  pair: number; // service fee when the owner holds both
}
export const COMPANIES: CompanyDef[] = [
  { name: "Udta Firta Travels", short: "Udta Firta", category: 0, sub: "Travel Agency", partner: 1, buy: 5000, single: 500, pair: 2500 },
  { name: "The Bogus Airlines", short: "Bogus Airlines", category: 0, sub: "Airline", partner: 0, buy: 5000, single: 500, pair: 2500 },
  { name: "Timewheel Internet Pvt Ltd", short: "Timewheel", category: 1, sub: "Tech & Marketing", partner: 3, buy: 6000, single: 600, pair: 3000 },
  { name: "Book A Sloth", short: "Book A Sloth", category: 1, sub: "Appointment Booking", partner: 2, buy: 6000, single: 600, pair: 3000 },
  { name: "Fox and Bew", short: "Fox & Bew", category: 2, sub: "Cafe", partner: 5, buy: 4000, single: 400, pair: 2000 },
  { name: "Dabba", short: "Dabba", category: 2, sub: "Tiffin Delivery", partner: 4, buy: 4000, single: 400, pair: 2000 },
];
// Board positions per company index; each pair sits 6 tiles apart.
export const COMPANY_POS = [3, 9, 15, 21, 27, 33];

export const START_CASH = 7500; // fallback/bot opening stack (wallet mode overrides)
export const SALARY = 1200;
export const SALARY_UNDERDOG = 2100;
export const UNDERDOG_RATIO = 0.6; // underdog if your net worth < this × the leader's
export const SCRAPPY_MULT = 1.25; // rent ×this when the owner holds few cities
export const SCRAPPY_MAX_CITIES = 3; // "few" = this many or fewer
export const ZONE_DOUBLE = 2; // undeveloped base rent ×this when the owner controls the zone
// Comeback "Restructure": a one-time emergency advance for the underdog, repaid by a
// reduced salary over the next RESTRUCTURE_LAPS laps (drives the startupLaps/startupPenalty
// fields on PlayerState + the salary reduction in passStartSalary).
// ADVANCE = LAPS × PENALTY so it's self-repaying (net-neutral if you complete the laps).
export const RESTRUCTURE_ADVANCE = 3600; // ≈ one cheap property / 3× base salary
export const RESTRUCTURE_LAPS = 3;
export const RESTRUCTURE_PENALTY = 1200; // per-lap salary cut (3 × 1200 = 3600 repaid)
export const JAIL_TURNS = 2; // turns halted by Tax Raid / three doubles
export const SET_BONUS_NW = 1500;
export const MAX_ROUNDS = 40;
export const SETS_TO_END = 3;
export const SET_OWN_NEEDED = 3;
export const BLEND = 0.5;
export const MAX_LEVEL = 6; // base + 3 houses + 3 hotels (v2 rent ladder is length 7)
export const UNMORTGAGE_RATE = 0.55; // half + 10% interest
export const UPGRADE_SELL_RATIO = 0.5; // refund on forced upgrade sale during liquidation

// Board tile positions.
// Wide 13×9 board: the four corners are Start(0) / Monsoon(12) / Mandi(20) / Tax Raid(32).
export const START_POS = 0;
export const MONSOON_POS = 12; // bottom-left corner; also the "jail" tile Tax Raid sends to
export const MANDI_POS = 20; // top-left corner
export const TAXRAID_POS = 32; // top-right corner
export const MANDI_BONUS = 3500; // bank pays this on landing Mandi (replaces the removed pot)

// The five inside special cells are fixed Indian-business "events" — each does one clear,
// deterministic thing on landing (no card decks, no pot). See the indian-events design spec.
export type EventId = "tax_return" | "married" | "festival" | "ed_raid" | "jnv_revisit";
// cash: bank pays the active player. collectEach: every other player pays the active player.
// payEach: active player pays every other player. payEachSplit: active player pays `val` total,
// split equally among the others. feeToBank: active player pays the bank (money leaves the game).
export type EventOp = "cash" | "collectEach" | "payEach" | "payEachSplit" | "feeToBank";
export interface EventDef {
  id: EventId;
  op: EventOp;
  val: number;
}
export const EVENTS: Record<EventId, EventDef> = {
  tax_return: { id: "tax_return", op: "cash", val: 1000 },
  married: { id: "married", op: "collectEach", val: 500 },
  festival: { id: "festival", op: "payEach", val: 500 },
  ed_raid: { id: "ed_raid", op: "feeToBank", val: 1000 },
  jnv_revisit: { id: "jnv_revisit", op: "payEachSplit", val: 6000 },
};
// Fixed cell → event assignment (positions unchanged; give/take alternate around the ring).
export const EVENT_TILES: Record<number, EventId> = {
  6: "tax_return", 17: "festival", 24: "married", 30: "ed_raid", 37: "jnv_revisit",
};
