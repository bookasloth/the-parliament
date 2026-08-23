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

export const HUB_PRICE = 4500;
export const HUB_RENT = [0, 750, 1500, 3000, 6000]; // indexed by hubs owner holds
export const HUB_POS = [5, 15, 25, 35];

export const START_CASH = 7500; // fallback/bot opening stack (wallet mode overrides)
export const SALARY = 1200;
export const SALARY_UNDERDOG = 2100;
export const MONSOON_PAY = 450; // reserved for balance tuning; landing on monsoon is "just visiting"
export const TAX_INCOME = 1200;
export const GST_RATE = 0.1;
export const GST_CAP = 3000;
export const SET_BONUS_NW = 1500;
export const MAX_ROUNDS = 12;
export const SETS_TO_END = 3;
export const SET_OWN_NEEDED = 3;
export const BLEND = 0.5;
export const MAX_LEVEL = 6; // base + 3 houses + 3 hotels (v2 rent ladder is length 7)
export const UNMORTGAGE_RATE = 0.55; // half + 10% interest
export const UPGRADE_SELL_RATIO = 0.5; // refund on forced upgrade sale during liquidation

// Board tile positions.
export const START_POS = 0;
export const MONSOON_POS = 10;
export const MANDI_POS = 20;
export const TAXRAID_POS = 30;
export const GST_POS = 17;
export const INCOME_POS = 37;
export const UPI_POS = [3, 23];
export const HEADLINE_POS = [7, 13, 27];

export type CardOp =
  | "cash"
  | "cashAll"
  | "collectEach"
  | "feePerCity"
  | "feeToPot"
  | "freeUpgrade"
  | "skipNext"
  | "downgradeRival"
  | "startup"
  | "perHeritage"
  | "perSet";

export interface Card {
  id: string;
  op: CardOp;
  val?: number;
}

export const HEADLINE: Card[] = [
  { id: "diwali", op: "cashAll", val: 900 },
  { id: "fuel", op: "feePerCity", val: 150 },
  { id: "bollywood", op: "collectEach", val: 300 },
  { id: "boom", op: "freeUpgrade" },
  { id: "audit", op: "feeToPot", val: 600 },
  { id: "windfall", op: "cash", val: 600 },
  { id: "jam", op: "skipNext" },
  { id: "demolition", op: "downgradeRival" },
];

export const UPI: Card[] = [
  { id: "cashback", op: "cash", val: 750 },
  { id: "startup", op: "startup", val: 1800 }, // +1800 now, salary -300 for 3 laps
  { id: "tourism", op: "perHeritage", val: 450 },
  { id: "refund", op: "cash", val: 600 },
  { id: "bankerror", op: "cash", val: 1200 },
  { id: "festival", op: "cashAll", val: 600 },
  { id: "bond", op: "cash", val: 900 },
  { id: "wedding", op: "perSet", val: 300 },
];
