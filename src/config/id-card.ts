// Physical alumni ID-card pricing + print geometry. Money is always paise (Int).
// Change prices here — never inline them in routes.

const inr = (rupees: number) => rupees * 100

/** Price of one printed card. */
export const ID_CARD_PRICE_PAISE = inr(100)
/** Flat delivery fee per order (India, any pincode). Configurable. */
export const ID_CARD_DELIVERY_PAISE = inr(40)
/** Max cards a single order may request. */
export const ID_CARD_MAX_QTY = 10

/** Authoritative order total for a given quantity. Server recomputes this — the
 *  client-sent amount is never trusted. */
export function idCardTotalPaise(qty: number): number {
  const n = Math.max(1, Math.min(ID_CARD_MAX_QTY, Math.floor(qty)))
  return ID_CARD_PRICE_PAISE * n + ID_CARD_DELIVERY_PAISE
}

export function formatInr(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`
}

// Print geometry — CR80 (standard ID card) held vertically, 54×86mm.
// Rendered at ~600 DPI so the downloaded PNG prints crisp. Ratio 1:1.59.
export const CARD_MM = { w: 54, h: 86 }
export const CARD_PX = { w: 1276, h: 2032 }
