// Email sponsor footer: a "Sponsored by" strip appended to NON-transactional
// mail only. Receipts, verification and password resets stay 100% ad-free — both
// for trust and for deliverability (promo content in a receipt reclassifies it as
// marketing and hurts inbox placement, and could bury a password reset in spam).
//
// Pure string work — no DB. The send path (email/service.ts) calls injectEmailSponsor
// on the rendered HTML and records the impression separately.

import { sponsorHref } from "@/config/sponsor-ads"

// Categories that carry the footer. Excludes transactional (receipts/auth),
// admin (internal ops), and institutional (official association comms).
const SPONSORED_EMAIL_CATEGORIES: ReadonlySet<string> = new Set([
  "lifecycle",
  "reminder",
  "wish",
  "engagement",
  "digest",
  "marketing",
])

export function isSponsoredEmailCategory(category: string): boolean {
  return SPONSORED_EMAIL_CATEGORIES.has(category)
}

const FONT =
  "'Poppins','Century Gothic',system-ui,-apple-system,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"

// The signature-bar row that opens emailShell's footer. We insert the sponsor
// strip immediately before it, so it sits between the body and the footer.
export const EMAIL_FOOTER_ANCHOR =
  '<tr><td style="font-size:0;line-height:0"><div style="display:flex;height:2px">'

// Copy is authored inline (with HTML entities) so the markup is always valid.
function sponsorStripHtml(): string {
  const url = sponsorHref("email")
  return `<tr><td style="padding:2px 32px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #EEF1F6"><tr><td style="padding:16px 0 2px">
<p style="margin:0 0 6px;font-family:${FONT};font-size:10px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;color:#AAB2C0">Sponsored</p>
<p style="margin:0 0 10px;font-family:${FONT};font-size:13.5px;line-height:1.62;color:#43506B"><strong style="color:#0C1D3D">Shubham Datarkar &mdash; Web &amp; Digital Marketing.</strong> Websites that turn visitors into customers &mdash; plus SEO &amp; ads to get your business found.</p>
<a href="${url}" style="font-family:${FONT};font-size:13px;font-weight:700;color:#009AE4;text-decoration:none">Get a free consultation &rarr;</a>
</td></tr></table>
</td></tr>`
}

/**
 * Insert the sponsor strip before the footer for eligible categories. Returns the
 * HTML unchanged for transactional/admin/institutional mail, or when the anchor is
 * absent (a body that didn't come from emailShell) — so it can never corrupt an
 * email it doesn't understand.
 */
export function injectEmailSponsor(html: string, category: string): string {
  if (!isSponsoredEmailCategory(category)) return html
  if (!html.includes(EMAIL_FOOTER_ANCHOR)) return html
  return html.replace(EMAIL_FOOTER_ANCHOR, sponsorStripHtml() + EMAIL_FOOTER_ANCHOR)
}
