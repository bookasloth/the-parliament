# Support the Dev Team — Spec

**Status:** approved (decisions locked 2026-08-02) · **Branch:** `feat/support-dev-team`
**Scheduled build:** 2026-08-05 20:30 IST

A public tip/support page. Visitors buy virtual "coffee" and "toffee" units, optionally
leave a name + note, pay via Razorpay. Paid supporters appear on a tiered wall. An updates
page shows compact cards referencing real feed posts.

## Locked decisions

| Decision | Choice | Why |
|---|---|---|
| Payment gateway | **Razorpay** (existing `src/lib/razorpay.ts`) | Already wired; same as original site. Zero new cost/env. |
| Supporter storage | **Own table** `support_dev_team` | Fully independent per requirement; one campaign → no namespace column. |
| Auto-post on paid | **Text post to the feed via the existing `createPost` engine**, authored by `sndatarkar@gmail.com` | Reuse the real create-post path; no bespoke posting. Anonymous respected. |
| Updates page | **Dropped.** Updates are posted manually on the feed. | No `/updates` routes, no post references, no permalink page. |

## Routes

| Path | Auth | Purpose |
|---|---|---|
| `/support-dev-team` | public | Pick + pay panel |
| `/support-dev-team/supporters` | public | Tiered supporter wall |
| `POST /api/support-dev-team/order` | public (IP rate-limited) | Create pending row + Razorpay order |
| `POST /api/support-dev-team/confirm` | public | Verify signature → mark paid → side-effects |

All public paths added to `PUBLIC_ROUTES` in `src/proxy.ts`. Dynamic `[postId]` handled via a
`/support-dev-team` prefix allowance (proxy currently matches exact pathnames).

## Config (single source of truth) — `src/config/support-dev-team.ts`

- **Items:** Coffee ₹20/unit (presets [1,3,5], default 5), Toffee ₹5/unit (presets [2,5,10], default 5).
- **Custom quantity:** integer, clamped 1–1000.
- **Cover-fee:** optional 2%, added to the **charged** amount only (not shown in displayed total).
- **Currency:** INR, symbol ₹.
- **Tiers** (lifetime ₹, highest first): Pillars ≥2500 (crown), Guardians ≥1000 (shield),
  Torchbearers ≥1 (flame — floor, every paid supporter lands somewhere).

## Data model — `SupportContribution` (`@@map("support_dev_team")`)

Clone the `MembershipOrder` shape (UUID id, `@map` snake_case, `@db.Timestamptz`).

| Field | Type | Notes |
|---|---|---|
| id | uuid PK | |
| name | String? | null when anonymous or omitted |
| email | String | required, validated |
| message | String? | ≤250 chars |
| coffeeUnits | Int | 0–1000 |
| toffeeUnits | Int | 0–1000 |
| baseAmountPaise | Int | `(coffee*20 + toffee*5) * 100` |
| feeAmountPaise | Int | `coversFee ? round(base*0.02)*100 : 0` |
| totalAmountPaise | Int | base + fee |
| coversFee | Boolean | |
| anonymous | Boolean | |
| status | enum `pending`/`paid`/`failed` | default `pending` |
| razorpayOrderId | String? unique | attached after order create |
| razorpayPaymentId | String? | set on confirm |
| createdAt | DateTime | |

## Payment flow

1. **Order** — `POST /api/support-dev-team/order`
   - IP `enforceRateLimit({bucket:"support-order", identifier:ip, limit:5, windowSec:60})` → 429.
   - Validate email; clamp coffee/toffee to 0–1000 integers.
   - **Recompute amount server-side from config** — never trust client amount.
   - `base = coffee*20 + toffee*5`; reject if `base ≤ 0`. `fee = coversFee ? round(base*0.02) : 0`; `total = base+fee`.
   - Insert pending row. `rzp.orders.create({ amount: total*100, currency:"INR", receipt: rowId })`.
   - Attach `razorpayOrderId` to row. Return `{ orderId, keyId: publicKeyId(), amount: total*100, currency }`.

2. **Client checkout** — copied from `membership/checkout/page.tsx`: `loadRazorpayScript()` →
   `new window.Razorpay({...order_id})` → `rzp.open()`. Amount never passed client-side; gateway
   derives from server order. Handler posts success fields to confirm.

3. **Confirm** — `POST /api/support-dev-team/confirm` (sole `paid` writer)
   - Failure body → move row `pending → failed`, grant nothing.
   - Success body → `verifyPaymentSignature({orderId, paymentId, signature})` over `order_id|payment_id`
     BEFORE flipping to paid. Then `checkCapturedPayment` (status captured + amount matches order).
   - Idempotent flip: `updateMany({ where:{ id, status:{ not:"paid" } }, data:{ status:"paid", ... } })`
     — only the real `pending → paid` transition fires side-effects (auto-post).

## Security invariants (must hold)

- Price is **server-authoritative** (recomputed from config, client amount ignored).
- Paid-state is **server-authoritative**, gated on HMAC signature verification + capture check.
- The **confirm route is the only writer** of `status = paid`.
- Signature compare uses `crypto.timingSafeEqual` (via existing `safeEqual`).

## Auto-post on paid

On the real `pending → paid` transition, call the existing **`createPost`** engine
(`src/modules/feed/posts.ts`) with a `text` post — same path the app uses for normal feed posts.
Author = the `User` resolved by email **`sndatarkar@gmail.com`** (fallback `djlaxne@gmail.com`),
using that user's `schoolId`. Body is the thank-you copy; `isAnonymous` respected → "An anonymous
supporter." Posts to the main feed (no dedicated group). No system-account seed, no bespoke Post
insert.

## Out of scope (v1)

- **Updates page** — updates are posted manually on the feed.
- CAPTCHA (rate-limit covers basic abuse; add if abused).
- Refunds UI (Razorpay dashboard).
- Multi-campaign namespacing.
- Recurring support.
