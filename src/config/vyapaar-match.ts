/** Seconds a player has to act before the turn-timer cron auto-resolves their move. */
export const TURN_SECONDS = 30

/** Extra seconds added to the deadline while an auction is running (everyone must bid). */
export const AUCTION_SECONDS = 20

/** Seconds to allow (or claim) an auto-payment before it auto-resolves with a penalty. */
export const PAYMENT_SECONDS = 10

/** Seconds a trade proposal stays live before it auto-expires. */
export const TRADE_SECONDS = 60
