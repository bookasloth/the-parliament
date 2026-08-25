import type { GameState, Intent } from "./state";
import { applyIntent } from "./engine";
import { TRADE_SECONDS } from "@/config/vyapaar-match";

/**
 * Stamp a real 60s deadline on any freshly-created trade. The engine has no clock,
 * so propose/counter leave expiresAt=0; the server calls this after each intent
 * apply (before commit) to give the new offer its wall-clock expiry.
 */
export function stampNewTrades(state: GameState, nowMs: number): void {
  for (const t of state.trades ?? []) {
    if (!t.expiresAt) t.expiresAt = nowMs + TRADE_SECONDS * 1000;
  }
}

/**
 * Remove trades past their deadline by applying system `expire_trade` intents.
 * Returns the applied intents so the caller can append them to the action log
 * (keeps deterministic replay correct). Pure: only touches `state` + the clock.
 */
export function sweepExpiredTrades(state: GameState, nowMs: number): { seat: number; intent: Intent }[] {
  const appended: { seat: number; intent: Intent }[] = [];
  for (const t of [...(state.trades ?? [])]) {
    if (t.expiresAt && t.expiresAt <= nowMs) {
      const intent: Intent = { type: "expire_trade", tradeId: t.id };
      const r = applyIntent(state, t.from, intent);
      if (!("error" in r)) appended.push({ seat: t.from, intent });
    }
  }
  return appended;
}
