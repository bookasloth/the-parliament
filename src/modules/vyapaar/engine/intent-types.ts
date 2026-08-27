import type { Intent } from "./state"

// Intent types a CLIENT may POST. This is the allow-list the intent route validates against.
// "expire_trade"/"expire_payment" are intentionally ABSENT — they are system-only intents the
// server applies during its expiry sweeps, never accepted from a client.
//
// Typed as Set<Intent["type"]> so adding a new Intent variant (or renaming one) without listing
// it here is a compile error — this is what stops the whitelist from drifting out of sync with
// the engine (the drift that once silently 400'd the jail bribe/sit-out buttons).
export const CLIENT_INTENT_TYPES: ReadonlySet<Exclude<Intent["type"], "expire_trade" | "expire_payment">> = new Set([
  "roll", "buy", "decline", "bid", "develop", "mortgage", "unmortgage", "sell",
  "propose_trade", "respond_trade", "counter_trade", "withdraw_trade",
  "confirm_payment", "restructure", "bribe_jail", "serve_jail", "leave_game", "end_turn",
] as const)
