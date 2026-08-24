// Pure, DB-free wallet decision logic (unit-tested). The DB orchestration lives in wallet.ts.
import { COIN_PACKS, coinsForPack, type CoinPackId } from "@/config/vyapaar-coins"

export type TopUpPlan =
  | { ok: false; error: "unknown_pack" | "insufficient_shells" }
  | { ok: true; packId: CoinPackId; shellCost: number; coinCredit: number }

export function planTopUp(shellBalance: number, packId: string): TopUpPlan {
  const pack = COIN_PACKS.find((p) => p.id === packId)
  if (!pack) return { ok: false, error: "unknown_pack" }
  if (shellBalance < pack.shells) return { ok: false, error: "insufficient_shells" }
  return { ok: true, packId: pack.id, shellCost: pack.shells, coinCredit: coinsForPack(pack) }
}
