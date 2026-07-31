# Security Audit — The Parliament (NNAWCA Alumni Network)

**Date:** 2026-07-31
**Branch:** `security-audit` (cut from `master`)
**Scope:** Full application — auth, authorization, API routes, server actions, payments, uploads, XSS, secrets, infra, dependencies.
**Method:** Manual review of the security-critical core (middleware, Auth.js config, admin gate) plus six parallel deep-dive passes (payments, API/IDOR, uploads/XSS, server actions, secrets/infra/headers/deps, auth-flows/admin-authz). Every High/critical finding below was read and confirmed in source.

---

## Executive summary

The codebase is **materially more secure than a typical pre-launch SaaS**. The fundamentals are done right:

- **No secrets** are committed or present in git history; `.gitignore` covers `.env*`; no hardcoded default `AUTH_SECRET`.
- **Payment signature verification is correct** — webhook HMAC is computed over the *raw* body with `crypto.timingSafeEqual`, fails closed on a missing secret; the Razorpay payment signature is verified constant-time; **pricing is server-authoritative** (client-sent amounts are never trusted).
- **No XSS** — zero `dangerouslySetInnerHTML` in app code, no markdown/HTML pipeline; all user text renders through auto-escaping JSX.
- **No mass-assignment / IDOR in the mutation surface** — every Prisma create/update uses explicit field lists (no `...body` spreads); resources are scoped to the session user; no client-supplied `userId` is trusted.
- **Password-reset flow is textbook** — `crypto.randomBytes(32)`, SHA-256 hashed at rest, 60-min expiry, single-use with sibling invalidation, no user enumeration.
- **All 7 `/api/admin/*` routes and admin pages self-gate** — there is **no** "any logged-in user can call an admin endpoint" hole, despite middleware not covering `/api`.

**No CRITICAL issues were found.** The exploitable gaps are: one **unauthenticated PII endpoint**, a **payment double-credit race**, and **no brute-force protection on login**. Everything else is Medium/Low hardening.

**Security Score: 78 / 100** (breakdown at the end).

### Central architectural fact (drives several findings)
`src/middleware.ts:30-38` returns `NextResponse.next()` for **everything under `/api`**. The JWT/onboarding gate therefore does **not** protect API handlers — each route must authenticate itself. Almost all do. The one that doesn't (Finding H1) is a real, anonymous exposure, not a defense-in-depth nit.

---

## Findings

### 🔴 HIGH

---

#### H1 — Unauthenticated member-PII scrape via `/api/community`
- **Severity:** High
- **Category:** Broken Access Control (OWASP A01) / Sensitive Data Exposure
- **Affected file:** `src/app/api/community/route.ts:8-27`
- **Affected endpoint:** `GET /api/community`

**Description.** The community directory endpoint has **no `requireUser()`/`auth()` check**. Because middleware skips `/api`, it is reachable fully anonymously. It returns paged directory rows — **`legalName` (real legal names — pseudonyms are disallowed platform-wide), `displayName`, `city`, `batch`, `house`, `membershipStatus`** — and accepts arbitrary `q`/`city`/`batch`/`house`/`membership` filters plus an incrementing `page`. This is a scriptable dump of the entire alumni body. The alumni population includes minors (the platform has guardian-consent handling), which raises the data-protection stakes.

**Attack scenario.**
```bash
# enumerate the whole roster, no auth
for p in $(seq 1 500); do curl -s "https://nnawca.org/api/community?page=$p"; done
# target individuals by city
curl -s "https://nnawca.org/api/community?city=Nagpur&verified=1"
```

**Business impact.** Bulk exfiltration of members' real names + location + membership tier by anyone on the internet; privacy/DPDP-Act exposure, doxxing risk for minors, competitor/spammer harvesting.

**Fix.** Add the same guard every other member route uses:
```ts
import { requireUser } from "@/modules/auth/session"
import { handleError } from "@/lib/api"

export async function GET(req: Request) {
  try {
    await requireUser()               // <-- add
    // ...existing body...
    return NextResponse.json({ rows, total, page, pageSize: PAGE_SIZE })
  } catch (e) {
    return handleError(e)
  }
}
```

---

#### H2 — Payment double-credit race (non-atomic activation → duplicate memberships)
- **Severity:** High
- **Category:** Insecure Design / Race Condition (OWASP A04)
- **Affected files:** `src/app/api/membership/verify/route.ts:38-58`, `src/app/api/razorpay/webhook/route.ts:68-82`, `src/modules/membership/activation.ts:43-63`
- **Affected endpoints:** `POST /api/membership/verify`, `POST /api/razorpay/webhook`

**Description.** Both activation paths guard with a **read** of `order.status`, then activate, then **later** mark the order `paid` — non-atomic. There is **no DB unique constraint** on active membership (`Membership` has no `@@unique(userId,status)`; `razorpayPaymentId` / `razorpaySubscriptionId` are plain indexes). `activateMembership` does `updateMany(active → superseded)` then `create(active)`.

```ts
// verify/route.ts
if (order.status === "paid") { return ok({ alreadyActivated: true }) } // stale read
const activation = await activateMembership({ ... })                    // both racers pass
await prisma.membershipOrder.update({ ... status: "paid" ... })         // marked paid too late
```

**Attack scenario.** On every successful payment the client calls `/verify` **and** Razorpay fires `payment.captured` for the same order near-simultaneously — both see `status !== "paid"` and both activate. Or a user simply fires two parallel `/verify` calls. Result: **two active memberships for one payment**, duplicate `membershipEvent` rows, reset billing cycle/expiry, corrupted MRR/lifetime aggregates.

**Business impact.** Billing-integrity corruption, duplicate entitlements, unreliable revenue reporting, refund disputes.

**Fix.** Claim the order atomically; only activate if you won the claim.
```ts
const claimed = await prisma.membershipOrder.updateMany({
  where: { id: order.id, status: { not: "paid" } },
  data: { status: "paid", razorpayPaymentId, capturedAt: new Date() },
})
if (claimed.count === 0) return ok({ alreadyActivated: true }) // someone else won
// only now activate
const activation = await activateMembership({ ... })
```
Apply the same pattern in `handlePaymentCaptured`, and add a hard backstop: `@@unique([orderId])` on `Membership` (one membership per order) and/or a partial unique on active rows per user.

---

#### H3 — No rate limiting / lockout on login (credential brute force & stuffing)
- **Severity:** High
- **Category:** Identification & Authentication Failures (OWASP A07)
- **Affected file:** `src/lib/auth.ts:23-32`
- **Affected endpoint:** the Credentials callback (`/api/auth/callback/credentials`)

**Description.** Signup, forgot-password, reports, verification, and uploads are all rate-limited via the DB-backed `checkRateLimit`, but the **actual login path has none** — no failed-attempt counter, no lockout, no IP throttle. bcrypt cost 12 slows a single guess but does not stop an online attack running in parallel.

**Attack scenario.** Script the credentials callback with a common-password list against a known member email (emails are also enumerable — see L1 and H1), unlimited attempts. Credential-stuffing a breach list against the whole member base is likewise unthrottled.

**Business impact.** Account takeover, especially of admin accounts (admins log in through the same credentials provider at `/auth/admin`).

**Fix.** Wrap `authorize` with the existing limiter, keyed on both email and IP:
```ts
async authorize(credentials, req) {
  const email = (credentials?.email as string || "").toLowerCase()
  const ip = req?.headers?.get?.("x-forwarded-for")?.split(",")[0] ?? "unknown"
  await enforceRateLimit({ bucket: "auth.login.ip", identifier: ip, limit: 20, windowSec: 900 })
  await enforceRateLimit({ bucket: "auth.login.email", identifier: email, limit: 8, windowSec: 900 })
  // ...existing lookup + bcrypt.compare...
}
```
(Return `null` / throw past the cap.) Consider a short account cooldown after N consecutive failures.

---

### 🟠 MEDIUM

---

#### M1 — `/verify` grants membership on signature alone; payment capture never confirmed
- **Severity:** Medium · **Category:** Insecure Design (A04) · **File:** `src/app/api/membership/verify/route.ts:31-48`; order create at `checkout/route.ts:64-69`

The endpoint validates the `orderId|paymentId` HMAC and activates. It never confirms with Razorpay that the payment is actually **captured** (status) or that the **amount matches** `order.amountPaise`. The signature only proves the (orderId, paymentId) pair is authentic — not that money settled. `orders.create` doesn't pass `payment_capture`, so if any order is authorize-only/manual-capture, an `authorized`-but-not-captured payment yields a valid signature and a free membership.

**Fix.** Treat `/verify` as UX-only and let the `payment.captured` webhook be the sole activator; **or** in `/verify` call `rzp.payments.fetch(paymentId)` and require `status === "captured"` **and** `amount === order.amountPaise` **and** `order_id === order.razorpayOrderId` before activating.

#### M2 — Webhook idempotency missing (`subscription.charged` / `subscription.activated`)
- **Severity:** Medium · **Category:** Insecure Design (A04) · **File:** `src/app/api/razorpay/webhook/route.ts:105-158`

`handleSubscriptionCharged` calls `activateMembership` **unconditionally on every delivery**; `handleSubscriptionActivated` guards with a non-transactional `findFirst` + `create` (racy, no unique constraint). Razorpay retries webhooks on any non-2xx and can deliver duplicates → repeated renewals, reset cycles, stacked events, corrupted aggregates.

**Fix.** Add a `ProcessedWebhookEvent { eventId String @unique }` table; `create`-or-skip on the per-charge payment id before activating. Add `@@unique` on `Membership.razorpaySubscriptionId` (active scope) and catch the unique-violation as the idempotency signal.

#### M3 — Two divergent `requireAdmin` definitions (inconsistent authZ boundary)
- **Severity:** Medium · **Category:** Broken Access Control (A01) · **Files:** `src/lib/gate.ts:60-61`, `src/modules/auth/session.ts:33-38`, `src/modules/auth/admin.ts:23-31`, `scripts/create-admin.ts`

`gate.requireAdmin` checks **only the `userRole` table** (roles `admin`/`founder`/`super_admin`) and *ignores* the `isSuperAdmin` flag and the `ADMIN_EMAILS` allowlist. `session.requireAdmin` checks `isAdmin` = `computeIsAdmin` (`isSuperAdmin` **OR** allowlist **OR** roles `admin`/`super_admin`, **not** `founder`). The `/api/admin/*` routes use the first; pages, server actions, and `users/invite` use the second. Consequences:

- The **bootstrap admin** provisioned by `create-admin.ts` (sets `isSuperAdmin: true`, **no** `userRole` row) passes middleware, admin pages, and `users/invite`, but is **403'd** by verification/membership/email admin routes — a lockout of the primary admin.
- A **`founder`**-role user is redirected out of the admin UI and rejected by the session guard, yet **can call the gate-based admin APIs directly** (grant memberships, send activation blasts, read the email outbox). Inconsistent trust boundary.

**Fix.** Collapse to one guard backed by `computeIsAdmin` (pass email + `isSuperAdmin` + roles) so every surface shares one definition; reconcile `founder` (add to `ADMIN_ROLES` or drop it from the gate list).

#### M4 — Self-signup marks email verified with no ownership check (impersonation/squatting)
- **Severity:** Medium · **Category:** Authentication Failures (A07) · **File:** `src/app/api/auth/signup/route.ts:89-98`

Signup sets `emailVerifiedAt = new Date()` and `status = "active"` immediately; there is **no email-verification token flow** (the only `verificationToken` use is `password_reset`). Anyone can register a fully active account under an email they don't own — squatting/impersonating real alumni emails and triggering welcome/anchor-follow side effects. *(May be an intentional consequence of the imported-member + activation-blast model — flag for a product decision.)*

**Fix.** Issue a verification token (reuse the `password-reset` pattern), leave `emailVerifiedAt` null and gate `active`/login until confirmed.

#### M5 — Unbounded presigned PUT size (storage/bandwidth DoS)
- **Severity:** Medium · **Category:** Insecure Design / DoS (A04) · **File:** `src/lib/r2.ts:61-84`

`MAX_BYTES` is returned to the client but **never enforced**. A SigV4 presigned PUT carries no `content-length-range` condition, so any authenticated caller can PUT an arbitrarily large object (multi-GB) to R2, bypassing the advisory 64 MB cap. The client-side size check is cosmetic. Sign-route rate limit is 30/hr → ~150 GB/hr/user.

**Fix.** Use a presigned **POST** with a `content-length-range` policy condition, or HEAD the object after upload and delete-if-oversize before persisting it to a post.

#### M6 — Security headers entirely missing
- **Severity:** Medium · **Category:** Security Misconfiguration (A05) · **Files:** `next.config.ts`, `src/middleware.ts`

No `Content-Security-Policy`, `Strict-Transport-Security`, `X-Frame-Options`/`frame-ancestors`, `X-Content-Type-Options`, `Referrer-Policy`, or `Permissions-Policy` anywhere. For a payment app the notable gaps are **CSP** (XSS depth defense) and **clickjacking protection** on the checkout/membership flows. (Caddy *may* add some in the Docker prod stack, but the Vercel deploy has none.)

**Fix.** Add `async headers()` in `next.config.ts`:
```ts
async headers() {
  return [{
    source: "/:path*",
    headers: [
      { key: "X-Frame-Options", value: "DENY" },
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
      { key: "Content-Security-Policy", value: "default-src 'self'; img-src 'self' data: https:; script-src 'self' https://checkout.razorpay.com; frame-src https://api.razorpay.com https://checkout.razorpay.com; object-src 'none'; base-uri 'self'" },
    ],
  }]
}
```
(Tune the CSP to Razorpay's actual origins before enforcing.)

#### M7 — `next-auth` beta pinned loosely on a payment app
- **Severity:** Medium · **Category:** Vulnerable & Outdated Components (A06) · **File:** `package.json`

`next-auth ^5.0.0-beta.31` — a beta auth library gates the session/authz path that protects payments, and the caret allows silent minor drift. **Fix:** pin exactly (drop `^`), watch the changelog, and plan the move to a stable release before/soon after launch.

---

### 🟡 LOW / hardening

| ID | Severity | Category | Location | Issue & fix |
|----|----------|----------|----------|-------------|
| L1 | Low | Auth (A07) | `src/lib/auth.ts:27-29` | **Login timing enumeration** — non-existent user skips `bcrypt.compare` (~200 ms delta reveals which emails are registered). Fix: always compare against a dummy hash. |
| L2 | Low | DoS (A04) | `profile/photo`, `profile/cover`, `messages/upload` routes | **No rate limit** on the 3 Supabase upload routes (each reads full file into memory). Fix: add `enforceRateLimit` as in `uploads/sign`. |
| L3 | Low | Design | `src/lib/supabase-storage.ts:20-22` | **MIME trusted from declared type**, not magic bytes. Not XSS-exploitable (served with declared type, SVG not allowlisted) — defense-in-depth only. |
| L4 | Low | Design | `uploads/sign/route.ts:8-12`, `r2.ts:67-73` | **`ext` is client-chosen**, decoupled from the (correctly allowlisted) `contentType`; object can be keyed `.html` while stored `image/png`. Low risk unless a CDN re-types by extension. Fix: derive `ext` from `contentType`. |
| L5 | Low | Misconfig (A05) | `src/config/env.ts` | **Secrets fail-open** (`process.env.X ?? ""`); a missing Razorpay/SMTP/R2 secret silently becomes `""` instead of erroring. No runtime validation despite zod being installed. Fix: validate required env at boot with a zod schema. |
| L6 | Low | Misconfig (A05) | `docker/docker-compose.prod.yml:13,33`, `.env.example:16` | **Prod Postgres password defaults to `postgres`** (`${POSTGRES_PASSWORD:-postgres}`). Mitigated by internal-network `expose` (not `ports`). Fix: `${POSTGRES_PASSWORD:?set me}` so it fails loudly. |
| L7 | Low | Design | `razorpay/webhook/route.ts:70` | **Webhook prefers `payment.notes.planCode`** over `order.planCode` to decide the tier granted, decoupled from `order.amountPaise`. Not currently exploitable (notes are server-set, payload HMAC-verified). Fix: use `order.planCode` only. |
| L8 | Low | Design | `razorpay/webhook/route.ts:61-82` | **Captured amount never reconciled** against `order.amountPaise` before granting. Razorpay locks amount server-side, so defense-in-depth. Fix: assert `p.amount === order.amountPaise`. |
| L9 | Low | Misconfig | `razorpay.ts:38`, `env.ts` | **`RAZORPAY_WEBHOOK_SECRET` undocumented** and read directly (not surfaced in `env.ts`/CLAUDE.md). Fail-closed if unset, but easy to misconfigure. Fix: add to `env.ts` + docs. |
| L10 | Low | Business logic | `config/membership.ts:238-247` | **Promo codes (`FOUNDER20`, `JNV100`) have no per-user limit, cap, or expiry** — unlimited reuse. Revenue leak, not authZ. Fix: add a Coupon model with limits. |
| L11 | Low | Auth (A07) | `src/app/api/auth/reset/route.ts` | **No rate limit on reset submit.** Token is 256-bit so brute force is infeasible; a cheap throttle is nice-to-have. |
| L12 | Low | AuthZ | `admin/membership/route.ts:33-39,82-85` | **Admin refund trusts client `amountPaise`/`razorpayRefundId`** without cross-checking the order's paid amount. Admin-gated, so not externally exploitable. Fix: clamp `amountPaise ≤ order.amountPaid`. |
| L13 | Info | Design | `onboarding/save/route.ts:9-12` | **Unbounded arbitrary JSON** (`z.record(z.string(), z.unknown())`) stored per caller (own row). Not mass-assignment (never read back into `User`). Optional: cap size/keys. |
| L14 | Info | AuthZ | `houses`, `schools` routes | **Unauthenticated reference lists** (house/school names). Likely intentional for signup dropdowns; gate if the roster shouldn't be public. |
| L15 | Low | Logging (A09) | app-wide | **No centralized audit log** for auth events (login/failed-login) or most admin actions (membership/email admin actions do record `adminId`/`updatedBy`; verification/blast/invite do not persist an audit trail), and no alerting/monitoring. Fix: add an append-only `AuditLog` for admin + auth events. |

**Non-security correctness bug (noted, not scored):** the upgrade UI advertises associate→premium for the ₹500 delta (`service.ts:92-94`) but `checkout` always charges the **full** plan price (`computePricing`, `checkout/route.ts:33`) — upgrading associates are **over**-charged (favours the platform; a refund-liability/correctness issue, not a vuln).

---

## Phase-by-phase status

| Phase | Result |
|-------|--------|
| Architecture / threat model | Mapped. Auth = Auth.js JWT (Credentials only; Google config present but provider not wired). Middleware gates pages, **not** `/api`. Admin = `computeIsAdmin`. |
| OWASP Top 10 | A01 (H1, M3), A04 (H2, M1, M2, M5), A05 (M6, L5, L6), A06 (M7), A07 (H3, M4, L1), A09 (L15). A02 Crypto — **clean** (bcrypt-12, secure reset tokens). A03 Injection — **clean** (Prisma parameterized, no raw SQL with user input, no XSS). A08 Integrity — n/a. A10 SSRF — no user-controlled server-side fetch found. |
| Authentication | Reset flow textbook. Gaps: no login throttle (H3), no signup email verification (M4), timing enumeration (L1). |
| Authorization | Strong — no IDOR, no mass assignment, admin routes self-gate. Gap: divergent `requireAdmin` (M3). |
| API security | Input validation via zod widely; errors don't leak stack traces (`handleError` returns generic 500). Gap: H1 unauthenticated route. |
| Database | Prisma ORM throughout, parameterized; no raw dynamic SQL on user input; soft-delete respected in queries. No injection found. |
| File uploads | Allowlists exclude SVG/HTML; keys embed server-derived owner id (no traversal/overwrite); Content-Type signature-bound. Gaps: unbounded size (M5), 3 unthrottled routes (L2), declared-MIME trust (L3/L4). |
| XSS | **Clean** — no `dangerouslySetInnerHTML`, no HTML/markdown pipeline; links restricted to `http(s)`, `rel="noopener noreferrer"`. |
| Payments | Signatures + server pricing correct. Gaps: double-credit race (H2), capture check (M1), idempotency (M2), reconciliation (L7/L8). |
| Admin panel | Pages + APIs gated; `/auth/admin` is a themed login, no backdoor. Gap: gate divergence (M3). |
| Secrets | **Clean** — none committed, none in history, `.gitignore` correct, no default `AUTH_SECRET`. |
| Infrastructure | Migrations run on build; no source-map exposure; no wildcard CORS. Gaps: headers (M6), env fail-open (L5), prod DB default (L6). |
| Abuse cases | Login brute force (H3), unlimited fake accounts / email squatting (M4), member enumeration (H1/L1), promo reuse (L10), upload DoS (M5), webhook replay (M2). |
| Dependencies | Next 16.2.9 / React 19 / Prisma 7 current; `next-auth` beta the one concern (M7). `npm audit` not run (offline) — run it in CI. |
| Security headers | All missing (M6). |
| Logging | No secret/PII leakage in logs (good); no audit log / alerting (L15). |

---

## Final score

**Security Score: 78 / 100**

| Domain | Score | Notes |
|--------|------:|-------|
| Authentication | 6/10 | Reset flow excellent; **no login rate limit** and no signup email verification pull it down. |
| Authorization | 8/10 | No IDOR/mass-assignment; admin self-gates. Gate divergence is the deduction. |
| API security | 7/10 | Strong validation & error hygiene; one unauthenticated PII route. |
| Infrastructure | 6/10 | Clean CORS/migrations; **no security headers**, env fail-open, prod DB default. |
| Payments | 7/10 | Signatures + server pricing correct; **double-credit race** + idempotency gaps. |
| Data protection | 7/10 | No secret leakage, good scoping; anonymous directory scrape is the hole. |
| Dependencies | 7/10 | Current stack; next-auth beta on the auth path. |
| Secrets | 10/10 | Nothing committed, nothing in history, no defaults. Exemplary. |
| Headers | 3/10 | None present. |
| Monitoring/logging | 5/10 | No log leakage, but no audit trail or alerting. |

---

## Top 20 priority fixes before production

1. **H1** — Add `requireUser()` to `GET /api/community` (anonymous PII scrape). *(one line)*
2. **H2** — Make membership activation atomic (conditional `updateMany` claim) + add `@@unique([orderId])` on `Membership`.
3. **H3** — Rate-limit the login/credentials path (email + IP) using the existing `enforceRateLimit`.
4. **M1** — In `/verify`, require Razorpay payment `status === "captured"` and matching amount before activating (or make the webhook the sole activator).
5. **M2** — Add a `ProcessedWebhookEvent` dedup table + unique constraint on `razorpaySubscriptionId`; make `subscription.charged`/`activated` idempotent.
6. **M3** — Unify the two `requireAdmin` implementations on `computeIsAdmin`; reconcile the `founder` role.
7. **M6** — Add security headers (CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy) in `next.config.ts`.
8. **M4** — Require email verification on self-signup; stop auto-setting `emailVerifiedAt`/`active`.
9. **M5** — Enforce upload size server-side (presigned POST `content-length-range` or post-upload HEAD-and-delete).
10. **M7** — Pin `next-auth` to an exact version; track toward a stable release.
11. **L2** — Add rate limiting to `profile/photo`, `profile/cover`, `messages/upload`.
12. **L5** — Validate required env vars at boot with a zod schema (fail fast, no `?? ""` on secrets).
13. **L6** — Remove the `postgres` default from `docker-compose.prod.yml` (`${POSTGRES_PASSWORD:?}`); drop it from `.env.example`.
14. **L1** — Equalize login timing with a dummy bcrypt compare (kill email enumeration).
15. **L12** — Clamp admin refund `amountPaise ≤ order.amountPaid` server-side.
16. **L7 / L8** — Use `order.planCode` (not `notes`) and reconcile captured `amount` against `order.amountPaise` in the webhook.
17. **L9** — Surface `RAZORPAY_WEBHOOK_SECRET` in `env.ts` and document it.
18. **L15** — Add an append-only `AuditLog` for auth events (login/failed) and all admin actions; wire basic alerting.
19. **L10** — Add per-user/expiry caps to promo codes (Coupon model).
20. **L4 / L3** — Derive upload `ext` from the validated `contentType`; optionally sniff magic bytes. **+** run `npm audit` in CI and fix the membership upgrade over-charge billing bug.

---

*No source files were modified during this audit (read-only). All findings were confirmed against current source on the `security-audit` branch.*
