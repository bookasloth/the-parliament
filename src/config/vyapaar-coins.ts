/** Play-money Vyapaar coins. One-way shell → coin packs; coins never convert back. */
export const WELCOME_GRANT = 25_000

export const COIN_PACKS = [
  { id: "coins_15k", shells: 100, coins: 15_000, bonus: 0 },
  { id: "coins_40k", shells: 250, coins: 40_000, bonus: 2_500 },
  { id: "coins_85k", shells: 500, coins: 85_000, bonus: 10_000 },
  { id: "coins_180k", shells: 1_000, coins: 180_000, bonus: 30_000 },
  { id: "coins_400k", shells: 2_000, coins: 400_000, bonus: 80_000 },
] as const

export type CoinPackId = (typeof COIN_PACKS)[number]["id"]

export function coinsForPack(pack: (typeof COIN_PACKS)[number]): number {
  return pack.coins + pack.bonus
}
