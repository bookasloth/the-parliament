import type { GameState } from "@/modules/vyapaar/engine/state"

/**
 * A payment/trade's `expiresAt` is a wall-clock deadline the SERVER stamps on
 * commit (`Date.now() + window`); the engine itself has no clock (see engine.ts /
 * payment-expiry.ts / trade-expiry.ts), so a rebuilt state leaves it 0 while the
 * stored state carries a real timestamp. It is therefore NOT part of the
 * deterministic replay.
 *
 * Zero it on both sides before comparing a rebuilt state against a stored one —
 * otherwise a (randomly seeded) playthrough that happens to queue a payment or
 * trade flakes on the timestamp alone. Everything else must still match exactly.
 */
export function zeroClock(state: GameState): GameState {
  return {
    ...state,
    trades: state.trades.map((t) => ({ ...t, expiresAt: 0 })),
    payments: (state.payments ?? []).map((p) => ({ ...p, expiresAt: 0 })),
  }
}
