# Support the Dev Team — Implementation Plan

Companion to `2026-08-02-support-dev-team-spec.md`. Branch `feat/support-dev-team`.
3 PRs, ~10 build-hours. Follow the standing testing rule: money/auth/validation paths get vitest coverage in the same PR.

## Reuse map (do NOT rebuild)

| Need | Reuse | Path |
|---|---|---|
| HMAC verify, client, receipt | `verifyPaymentSignature`, `getRazorpay`, `publicKeyId`, `buildReceipt` | `src/lib/razorpay.ts` |
| Settlement guard | `checkCapturedPayment(payment, order)` | `src/modules/membership/payment-guard.ts` |
| Idempotent paid-flip | `updateMany({where:{status:{not:"paid"}}})` pattern | `src/modules/membership/claim.ts` |
| Auto-post thank-you | `createPost({authorId, schoolId, categoryKey, format:"text", body, isAnonymous})` | `src/modules/feed/posts.ts` |
| IP rate-limit | `enforceRateLimit` | `src/lib/rate-limit.ts` |
| Client checkout modal | `loadRazorpayScript` + modal + verify handler | `src/app/(main)/membership/checkout/page.tsx` |
| Order route shape | `requireUser`→zod→server price→`rzp.orders.create` (drop requireUser here) | `src/app/api/membership/checkout/route.ts` |
| Cards | `AlumniProfileCard` | `src/components/shared/AlumniProfileCard.tsx` |
| Public marketing UI kit | `Section`, `SectionHeading`, `Reveal`, `CtaBand` | `src/components/marketing/primitives` |
| Public route gate | `PUBLIC_ROUTES` set | `src/proxy.ts` |

## PR1 — Backend + config + tests (~4h)

**Schema**
- [ ] Add `SupportContribution` model + `SupportContributionStatus` enum to `prisma/schema.prisma` (fields per spec, `@@map("support_dev_team")`).
- [ ] `npx prisma migrate dev --name support_dev_team` → generate client.

**Config**
- [ ] `src/config/support-dev-team.ts` — items, presets, custom bounds, cover %, tiers. Export a `priceQuote({coffeeUnits, toffeeUnits, coversFee})` pure fn returning `{basePaise, feePaise, totalPaise}`.

**Routes**
- [ ] `src/app/api/support-dev-team/order/route.ts` — public POST. IP from `x-forwarded-for`. `enforceRateLimit` 5/60s → 429. Zod: email, coffeeUnits, toffeeUnits, coversFee, anonymous, name?, message?(≤250). Clamp units 0–1000. `priceQuote` server-side. Reject base≤0 (400). Insert pending row. `rzp.orders.create`. Attach `razorpayOrderId`. Return `{orderId, keyId, amount, currency}`.
- [ ] `src/app/api/support-dev-team/confirm/route.ts` — public POST. Two bodies:
  - failure → `updateMany` pending→failed.
  - success → `verifyPaymentSignature` → `getRazorpay().payments.fetch` + `checkCapturedPayment` → idempotent `updateMany({id, status:{not:"paid"}}, {status:"paid", razorpayPaymentId})`. If `updateMany.count === 1` → fire `autoPostThankYou(row)`.
- [ ] `src/modules/support/service.ts` — `autoPostThankYou(row)`: resolve author `User` by email `sndatarkar@gmail.com` (fallback `djlaxne@gmail.com`); call `createPost({authorId, schoolId: author.schoolId, categoryKey: <existing default>, format:"text", body: thankYouCopy(row), isAnonymous: row.anonymous})`. `tierFor(lifetimePaise)`, `supportersRanked()`.

**Prerequisite (accounts)**
- [ ] Thank-you author = existing account `sndatarkar@gmail.com` (resolve `User` by email; fallback `djlaxne@gmail.com`). No system-account seed, no group seed — posts to the main feed via `createPost`.
- [ ] Pick an existing `PostCategory` key for the thank-you post (inspect seeded categories). If none fits, add one idempotently to `scripts/seed.ts`.

**Tests — `tests/support.test.ts`**
- [ ] `priceQuote`: coffee-only, toffee-only, mixed, cover-fee rounding (e.g. base 25 → fee round(0.5)=1... confirm rounding rule), coversFee false → fee 0.
- [ ] unit clamp: negative → 0, >1000 → 1000, non-int reject.
- [ ] base≤0 rejected.
- [ ] email validation reject.
- [ ] HMAC reject on tampered signature (set `RAZORPAY_KEY_SECRET` in test).
- [ ] idempotent confirm: second call → count 0, no second post.
- [ ] rate-limit: 6th call in window → 429 (integration or mock counter).

## PR2 — Pick + pay page (~3h)

- [ ] `src/app/support-dev-team/page.tsx` (public, top-level — NOT under `(main)`). Panel: coffee qty (presets + custom), toffee qty, cover-fee toggle, anonymous toggle, name?, message?(≤250, counter), email (required). Live total (excl. fee). One Support button.
- [ ] Client checkout: copy `loadRazorpayScript` + modal + handler from membership checkout; POST order → open modal → POST confirm → success/failed/cancelled states.
- [ ] Add `/support-dev-team` to `PUBLIC_ROUTES`.
- [ ] Build with marketing primitives; brand `#009ae4`.

## PR3 — Supporter wall (~1.5h)

- [ ] `src/app/support-dev-team/supporters/page.tsx` — server component. `supportersRanked()` grouped into Pillars/Guardians/Torchbearers. `AlumniProfileCard` grid; anonymous → hidden name, generic avatar.
- [ ] Extend `PUBLIC_ROUTES` handling to allow the `/support-dev-team` **prefix** (proxy currently exact-match) so subpaths are public. Smallest change: `if (pathname === x || pathname.startsWith("/support-dev-team")) next()`.

_(Updates page dropped — updates are posted manually on the feed.)_

## Verification

- [ ] `npm run build` (type-check) green.
- [ ] `npm test` green.
- [ ] Manual: order → Razorpay test-mode pay → confirm → row `paid` → thank-you post appears on feed → supporter on wall.
- [ ] Logged-out: pick page + supporters wall reachable without signin bounce.

## Risks / notes

- Cover-fee rounding: decide paise-vs-rupee rounding explicitly in `priceQuote` and test it. Match membership `platformFee` convention.
- No new env keys. Migration auto-runs on prod deploy (existing pipeline).
