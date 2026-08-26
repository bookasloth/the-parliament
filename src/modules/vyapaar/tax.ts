// Capital-gains tax on end-of-game NET profit (resultCash − openingCash). Charged once
// at settlement (game end or on leave); losers and break-even players pay nothing.
// Progressive: each slab is taxed at its own rate, like income-tax brackets.
export const CAPITAL_GAINS_BRACKETS: { upTo: number; rate: number }[] = [
  { upTo: 2_000, rate: 0 }, // free allowance
  { upTo: 10_000, rate: 0.1 },
  { upTo: 25_000, rate: 0.2 },
  { upTo: Infinity, rate: 0.3 },
]

/** Tax owed on a net profit. Returns 0 for zero/negative profit. Result is rounded to a whole coin. */
export function capitalGainsTax(profit: number): number {
  if (profit <= 0) return 0
  let tax = 0
  let lower = 0
  for (const b of CAPITAL_GAINS_BRACKETS) {
    if (profit <= lower) break
    const slab = Math.min(profit, b.upTo) - lower
    tax += slab * b.rate
    lower = b.upTo
  }
  return Math.round(tax)
}
