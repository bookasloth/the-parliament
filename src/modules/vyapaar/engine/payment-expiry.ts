import type { GameState, Intent } from "./state";
import { applyIntent } from "./engine";
import { PAYMENT_SECONDS } from "@/config/vyapaar-match";

/**
 * Stamp a real 10s deadline on any freshly-queued payment. The engine has no clock, so
 * events leave expiresAt=0; the server calls this after each intent apply (before commit).
 */
export function stampNewPayments(state: GameState, nowMs: number): void {
  for (const p of state.payments ?? []) {
    if (!p.expiresAt) p.expiresAt = nowMs + PAYMENT_SECONDS * 1000;
  }
}

/**
 * Auto-resolve payments past their deadline via system `expire_payment` intents (pay 2×
 * with the split, or forfeit a windfall). Returns the applied intents for the action log.
 */
export function sweepExpiredPayments(state: GameState, nowMs: number): { seat: number; intent: Intent }[] {
  const appended: { seat: number; intent: Intent }[] = [];
  for (const p of [...(state.payments ?? [])]) {
    if (p.expiresAt && p.expiresAt <= nowMs) {
      const intent: Intent = { type: "expire_payment", paymentId: p.id };
      const r = applyIntent(state, p.actor, intent);
      if (!("error" in r)) appended.push({ seat: p.actor, intent });
    }
  }
  return appended;
}

/** Soonest payment deadline (ms), or null. Lets the match layer wake the cron in time. */
export function soonestPaymentDeadline(state: GameState): number | null {
  let soonest: number | null = null;
  for (const p of state.payments ?? []) {
    if (p.expiresAt && (soonest === null || p.expiresAt < soonest)) soonest = p.expiresAt;
  }
  return soonest;
}
