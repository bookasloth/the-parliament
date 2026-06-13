# Membership & Email Communication — Backend / Database Plan

> **For Claude Code:** read this end-to-end before touching anything in `src/modules/membership/`, `src/lib/membership*.ts`, the Prisma schema's membership/email tables, or any email-sending code. This is the source of truth for the membership system and all platform email communication. If anything here conflicts with `CLAUDE.md`, `DECISIONS.md`, or `DATABASE_SCHEMA.md`, **stop and ask** rather than picking one silently.
>
> Status: **plan only** as of 2026-06-13. No code from this plan has been implemented yet. All 18 open decisions from the first draft have been resolved by the user on 2026-06-13 — see §10 (membership decisions) and §19 (email decisions) for the locked-in answers.

---

## 0. Identity, domains, and tone — do not get this wrong

- **Sender identity is NNAWCA**, not "JNV Nagpur".
  - NNAWCA = Nagpur Navodaya Alumni Welfare and Charitable Association — the legal entity, the voice of the platform, the body that collects payments / issues certificates / runs voting.
  - JNV Nagpur is the *school* the platform serves, not the sender.
  - Every email From-name, in-body greeting, footer, and signature reads "NNAWCA" or "The Parliament — by NNAWCA". Never "JNV Nagpur".
- **Domains**
  - Website / app: `nnawca.org`
  - SMTP sending: `username@nnawca.com` (note: `.com`, deliberately different from the `.org` site)
  - All in-email links point back to `nnawca.org`.
- **DMARC alignment caveat** — because sending domain (`nnawca.com`) differs from the site (`nnawca.org`), DMARC alignment will be **relaxed**, not strict. SPF + DKIM must be perfectly clean on `nnawca.com`; flag this when configuring DNS.

---

## 1. Tier model

Five tiers in the system. The upgrade path is strictly linear for members: `free → associate → premium → life`. Committee sits outside the upgrade path — it is an invitation, not a purchase.

| Code | Display | How obtained | Price (₹) | Cycle | Benefit tier |
|---|---|---|---|---|---|
| `free` | Free Member | Default on signup — every alumnus | 0 | Permanent | base |
| `associate` | Alumni Associate | Self-purchase (Subscription) | 499 / yr | Annual auto-renew | associate |
| `premium` | Alumni Premium | Self-purchase (Subscription) | 999 / yr | Annual auto-renew | premium |
| `life` | Life Member | Self-purchase (one-time Order) | 9,999 | Lifetime | premium |
| `committee` | Committee Member | Super-admin invite — **Life Members only** | 0 | 3 yr default | premium + committee flag |
| `inactive` | Inactive | Admin action (suspension/ban) | — | — | none |

**Key rule:** benefits derive from `benefitTier ∈ { base, associate, premium }`, not from `code`. `life` and `committee` share `benefitTier = 'premium'`. Every gate is one `switch(benefitTier)` — never `if (code === ...)`.

### 1a. The free tier — universal default, permanent

**Anyone who creates an account gets `free` tier instantly.** This is not restricted to current students. It is the permanent default state for every unupgraded alumnus.

- **Purpose:** lead capture + upsell funnel. A person who signs up gives NNAWCA their details and can be nudged toward Associate/Premium.
- **No academic-year cycle.** `free` tier never expires automatically. It only changes when the user upgrades or is suspended by an admin.
- **`passOutYear`** is still collected at onboarding (used for batch/house display, batch-reunion emails, directory filtering). It is **not** a tier gate for `free`.
- **Display:** the profile badge says "Free Member". The membership settings page shows "Upgrade to Associate" as the primary CTA.
- **Upsell touchpoints:** profile settings, gated feature walls (`/business/new`, `/mentors/apply`, job-post form), post-event-registration nudge, and the monthly "unlock more" email in the lifecycle series.

### 1b. Benefit matrix (canonical)

| Benefit | base (free) | associate | premium / life / committee |
|---|---|---|---|
| View full alumni directory | ✅ | ✅ | ✅ |
| Join online / offline events | ✅ | ✅ | ✅ |
| Join batch / house groups | ✅ | ✅ | ✅ |
| Post job openings / referrals | — | ✅ | ✅ |
| Apply to be a mentor | — | — | ✅ |
| Participate in welfare drives | ✅ | ✅ | ✅ |
| Access scholarship reports | ✅ | ✅ | ✅ |
| List own business in directory | — | — | ✅ |
| Receive event & activity updates | ✅ | ✅ | ✅ |
| Eligible for mentorship pairing | — | — | ✅ |
| Profile visibility to students | Normal | Normal | Highlighted |
| Recognition on website | — | — | ✅ |
| Recognition in events | — | — | ✅ |
| Eligibility for Seva Cells / leadership | — | — | ✅ |
| Voting rights in NNAWCA decisions | ✅ (verified only) | ✅ (verified only) | ✅ (verified only) |
| Name on Scholarship Supporters Wall | — | — | ✅ |
| Early access to limited-seat events | — | — | ✅ |
| Certificate of contribution (yearly) | — | — | ✅ |

### 1c. Committee tier — invite-only, Life Members only, super-admin only

This is the most restricted tier in the system. Three hard rules enforced in code:

1. **Eligibility prerequisite:** a user must have an active `life` Membership row to be invitable. The invite API checks this and rejects with 422 if the target user is not a current Life Member. Admin UI hides the invite button entirely for non-Life members.
2. **Invite authority:** only users with `User.isSuperAdmin = true` can send committee invites. Regular admins cannot. The invite endpoint verifies `isSuperAdmin` server-side (not just a role check in the UI).
3. **Flow:**
   - Super-admin opens the target user's profile in admin console → "Invite to Committee" button (only visible if target is Life Member).
   - A `CommitteeInvite` row is created (`status: 'pending'`, `expiresAt: now + 7 days`).
   - System emails the user: "You've been invited to join the NNAWCA Committee — accept within 7 days."
   - User clicks Accept → `Membership` row created (`source: 'committee_invite'`, `planCode: 'committee'`, `endsAt: now + 3yr`), their existing Life `Membership` row is set to `superseded` (but preserved as history — the Life payment record stays).
   - User clicks Decline or invite expires → `CommitteeInvite.status = 'declined'/'expired'`, no tier change.
   - On committee expiry (3 yr or admin revoke): user reverts to Life tier (their original life `Membership` row is re-activated, `status` set back to `active`). They are a Life Member again.

**Why only Life Members?** Committee represents the highest trust layer of NNAWCA governance. Requiring Life membership first ensures committee members have made a financial and long-term commitment before being granted governance access. It also keeps the eligibility check cheap (one DB lookup on `Membership`).

### 1d. Upgrade path

```
signup
  └── free (immediate, permanent)
        └── associate (₹499/yr subscription)
              └── premium (pay ₹500 difference, keep end date)
                    └── life (₹9,999 one-time; cancels active subscription)
                          └── committee (super-admin invite only; reverts to life on expiry)
```

Downgrade path (only via expiry or admin action):
```
committee → life (on committee expiry)
life      → free (admin revoke only; no natural expiry)
premium   → free (subscription lapsed + 30-day grace)
associate → free (subscription lapsed + 30-day grace)
any       → inactive (admin suspension)
```

### 1e. Voting eligibility — deviation from the original brief

The original matrix gave voting rights only to Associate+. **Overridden on 2026-06-13:**

- **Any verified member can vote** — free, associate, premium, life, committee — regardless of tier.
- **Anti-gaming guard:** ≥ 30 days active (any tier) before the poll opens.
- **Snapshot at poll-open time** into `PollEligibility` so mid-poll tier changes don't shift the voter list.
- `canVoteInNNAWCA(user)` checks `user.isVerified === true` AND `daysSinceFirstActive(user) >= 30`. The `benefits.voting` flag stays in the matrix for display copy only — the gate function does not use it.

---

## 2. Where things live

- Plan config: `src/config/membership.ts` — code-defined, not DB-backed (only 6 tiers, no admin pricing UI in v1).
- Cycle math: `src/lib/membership-cycle.ts`
- Gates: `src/lib/membership-gates.ts`
- Server actions / route handlers: `src/app/api/membership/*`, `src/app/api/admin/membership/*`, `src/app/api/razorpay/webhook`
- Background jobs: `src/modules/membership/jobs/*` (pg-boss handlers)
- Email infra: `src/modules/email/*` (sender, queue, template registry)
- Email templates: `emails/templates/*.mjml` (MJML source) → compiled to DB on admin save

---

## 3. Prisma schema additions

### 3a. Modify `User`

Keep existing fields, add:

```
membershipPlanCode   String    @default("free")  // free | associate | premium | life | committee | inactive
membershipCycleStart DateTime?
// membershipCycleEnd reuses existing membershipExpiresAt
passOutYear          Int?      // collected at onboarding; used for batch display + batch emails; NOT a tier gate
isSuperAdmin         Boolean   @default(false)   // only super-admins can invite to Committee
```

Removed from previous draft: `studentEligibleUntil` — the free tier is now permanent (no academic-year expiry), so this field is no longer needed as a tier gate. `passOutYear` is kept for display and email personalisation only.

Existing `membershipStatus` keeps its name but its values align to the tier codes above. Existing `membershipData` JSON is **not** used for anything queryable — debug snapshots only.

### 3b. New: `Membership` (history ledger — one row per cycle/grant)

```
id              String  @id @default(uuid())
userId          String  @index
planCode        String   // associate | premium | life | committee
benefitTier     String   // associate | premium  (snapshot so old grants still resolve correctly)
startedAt       DateTime
endsAt          DateTime?  // null for life
status          String     // active | expired | cancelled | refunded | superseded
amountPaise     Int
source          String     // purchase | renewal | upgrade | admin_grant | comp
orderId         String?    // FK -> MembershipOrder
grantedByUserId String?    // admin id for non-purchase rows
createdAt       DateTime @default(now())
@@index([userId, status, endsAt])
```

**One-active invariant:** at most one row per user with `status = 'active'` at any moment. Enforce in the transaction that activates a new plan: previous active rows go to `superseded` in the same `$transaction`.

### 3c. New: `MembershipOrder` (Razorpay order)

```
id                  String  @id @default(uuid())
userId              String  @index
planCode            String
amountPaise         Int
currency            String  @default("INR")
status              String   // created | attempted | paid | failed | refunded
razorpayOrderId     String  @unique
razorpayPaymentId   String?
razorpaySignature   String?
capturedAt          DateTime?
errorCode           String?
errorReason         String?
metadata            Json?    // upgrade-from, prorate context, etc.
createdAt           DateTime @default(now())
```

### 3d. New: `MembershipInvoice`

```
id              String  @id @default(uuid())
orderId         String  @unique
userId          String  @index
invoiceNumber   String  @unique  // NNAWCA/2026-27/000123 — yearly sequence
amountPaise     Int
gstAmountPaise  Int?              // null until GST decision (§10 Q6)
pdfKey          String?           // Cloudflare R2 key
issuedAt        DateTime @default(now())
```

### 3e. New: `MembershipRefund`

```
id                  String  @id @default(uuid())
orderId             String  @index
razorpayRefundId    String  @unique
amountPaise         Int
reason              String
status              String           // pending | processed | failed
processedAt         DateTime?
initiatedByUserId   String           // admin
```

### 3f. New: `MembershipEvent` (audit ledger)

```
id           String  @id @default(uuid())
userId       String  @index
type         String     // purchased | renewed | upgraded | expired | granted | revoked | refunded | committee_invited | committee_accepted | committee_declined | committee_expired
prevPlan     String?
newPlan      String?
orderId      String?
actorUserId  String?    // admin who acted; null for self/system
metadata     Json?
createdAt    DateTime @default(now())
```

Powers admin analytics, dispute resolution, the profile "Membership History" tab, karma's leadership-eligibility checks.

### 3g. New: `CommitteeInvite`

```
id              String  @id @default(uuid())
userId          String  @index            // target (must be Life Member at invite time)
invitedByUserId String                    // must be isSuperAdmin = true
status          String  @default("pending")  // pending | accepted | declined | expired | revoked
message         String?                   // optional personal note from super-admin
expiresAt       DateTime                  // createdAt + 7 days
respondedAt     DateTime?
createdAt       DateTime @default(now())
@@index([userId, status])
```

When `accepted`: creates the `committee` Membership row, supersedes Life row, writes `MembershipEvent { type: 'committee_accepted' }`.
When the committee tenure expires: `membership:expire` job re-activates the original life `Membership` row, writes `MembershipEvent { type: 'committee_expired' }`, updates `User.membershipPlanCode = 'life'`.

---

## 4. Cycle math (`src/lib/membership-cycle.ts`)

Pure functions, no DB calls. Unit-testable.

- `academicYearFor(date) → { startYear, endYear }` — still used for invoice numbering (NNAWCA/2026-27/…) and batch-reunion email math.
- `resolveActivePlan(user, memberships, now) → { planCode, benefitTier, endsAt }`
  - Accepts the user record and their `Membership` rows.
  - Precedence (highest wins): `committee > life > premium > associate > free`.
  - `inactive` overrides everything — checked first, before any Membership lookup.
  - A `free` user has no `Membership` rows; function returns `{ planCode: 'free', benefitTier: 'base', endsAt: null }`.
  - Committee expiry re-activates life: the function finds the still-active life row and returns it.
- `nextRenewalDate(paidAt) → paidAt + 1 year` — used for subscription cycle display and reminder scheduling.

---

## 5. Gates (`src/lib/membership-gates.ts`)

Single module, used by route handlers, server actions, middleware, and UI:

```
benefitsFor(user)           -> BENEFITS[benefitTier]
canPostJob(user)            -> benefits.jobs
canListBusiness(user)       -> benefits.businessListing
canApplyAsMentor(user)      -> benefits.mentorApply
canVoteInNNAWCA(user)       -> benefits.voting
isHighlightedProfile(user)  -> benefits.highlightedProfile
isEligibleForSevaCell(user) -> benefits.sevaCells
```

- Server actions / route handlers throw 403 when blocked.
- `middleware.ts` enforces page-level gates (`/business/new`, `/mentors/apply`).
- UI uses these to hide/show CTAs (already partially wired in `PrivateNavbar`).

---

## 6. API surface

### Member-facing

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/membership/plans` | Plan list + price + benefits (server-driven UI) |
| `GET` | `/api/membership/me` | Current tier, expiry, in-grace flag, upgrade options |
| `GET` | `/api/membership/history` | Past `Membership` rows + invoices |
| `POST` | `/api/membership/checkout` | Body `{ planCode }` → create Razorpay order; returns `{ orderId, amountPaise, keyId }` |
| `POST` | `/api/membership/verify` | Body `{ orderId, paymentId, signature }` → verify HMAC, activate, log event, enqueue invoice + welcome email |
| `POST` | `/api/razorpay/webhook` | Signed webhook for `payment.captured`, `payment.failed`, `refund.created` — idempotent on `razorpayPaymentId` |
| `GET` | `/api/membership/invoice/[id]` | Signed R2 URL (owner-only) |
| `POST` | `/api/membership/cancel-autorenew` | Only if Q4 = yes |

### Admin

| Method | Path | Purpose | Auth |
|---|---|---|---|
| `POST` | `/api/admin/membership/committee/invite` | Send committee invite to a Life Member | **`isSuperAdmin` only** |
| `POST` | `/api/admin/membership/committee/revoke` | Revoke a committee member before tenure ends; user reverts to life | **`isSuperAdmin` only** |
| `GET` | `/api/admin/membership/committee/invites` | List pending / historical invites | `isSuperAdmin` only |
| `POST` | `/api/admin/membership/revoke` | Revoke paid tier, downgrade to `inactive` | Admin |
| `POST` | `/api/admin/membership/extend` | Extend expiry (goodwill) | Admin |
| `POST` | `/api/admin/membership/refund` | Razorpay-side refund + status flip | Admin |
| `GET` | `/api/admin/membership/stats` | Active counts/tier, MRR, churn, expiring-soon | Admin |

Member-facing committee accept/decline:

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/membership/committee/accept` | Accept pending invite → activates committee Membership |
| `POST` | `/api/membership/committee/decline` | Decline invite |

Every admin and member write creates a `MembershipEvent` with `actorUserId`.

---

## 7. Razorpay integration

- **Mode: Razorpay Subscriptions from day 1.** One-time Orders are used only for the `life` tier (no recurrence). All `associate` and `premium` activations go through Subscriptions with auto-renew.
- **Plan IDs (created once in Razorpay dashboard, stored in `src/config/membership.ts`):**
  - `assoc_annual_499` — ₹499 / year
  - `premium_annual_999` — ₹999 / year
  - `life_one_time_9999` — ₹9,999 one-time Order (not a Subscription)
- **Mandate flow:** UPI Autopay / card mandate set up at first checkout. User explicitly authorises recurring debit.
- **Receipt format:** `nnawca_{userId}_{epoch}` (Razorpay caps at 40 chars).
- **Notes on every Order/Subscription:** `{ userId, planCode, prevPlan }` for dashboard debugging.
- **Webhook events to subscribe:**
  - One-time Orders (life): `payment.captured`, `payment.failed`
  - Subscriptions: `subscription.activated`, `subscription.charged` (recurring renewal), `subscription.completed`, `subscription.cancelled`, `subscription.halted` (after 3 failed charges), `subscription.pending`, `subscription.updated`
  - Refund webhooks kept subscribed even though refunds are not offered (see §7a) — chargebacks/disputes still come through here.
- **HMAC verification** in both the verify endpoint (returned signature) and the webhook (`x-razorpay-signature`).
- **Idempotency:** the verify endpoint and the webhook share one upsert path keyed on `razorpayPaymentId`. Whichever runs first inserts the `Membership` row; the other becomes a no-op.
- **Atomicity:** Order/Subscription → Payment record → Membership activation happens in a single Prisma `$transaction`. No half-activated users.
- **Renewal handling:** on `subscription.charged`, create a new `Membership` row with `source='renewal'`, supersede the previous active row, extend `User.membershipExpiresAt`.
- **Failed-renewal handling:** on `subscription.halted`, mark the active `Membership` as expiring at `endsAt` (no early downgrade — 30-day grace applies), email the user to update payment method.
- **Cancel auto-renew UI:** `/api/membership/cancel-autorenew` calls Razorpay `subscriptions/{id}/cancel?cancel_at_cycle_end=1`. Membership stays active until current `endsAt`, then expires normally.
- **`MembershipOrder` table extended** with `razorpaySubscriptionId String?` to track the parent subscription. For renewals, multiple `Membership` rows share the same `razorpaySubscriptionId` across cycles.
- **Upgrade to Life (subscription → one-time):** when a subscriber pays for Life, the checkout endpoint first calls `razorpay.subscriptions.cancel({ subscriptionId, cancelAtCycleEnd: false })` to cancel the subscription **immediately** (the user is upgrading permanently; prorated days are not refunded per non-refund policy). Then creates the Life Order. The old subscription-based `Membership` row is set to `superseded` in the same activation `$transaction`. This must be atomic — if the Life Order payment fails, the subscription cancellation is NOT committed.
- **Free → paid checkout:** users on `free` tier have no subscription to cancel. Checkout creates a fresh subscription (associate/premium) or one-time Order (life) directly.

### 7a. Refund / chargeback handling — **NNAWCA is non-refundable**

- **Policy:** all membership payments are non-refundable contributions to NNAWCA. No refund window, no self-service cancellation refund. This is enforced at the checkout UX layer and disclosed on the invoice.
- **Required checkout disclosure:** a hard, explicit checkbox on the Razorpay checkout page that the user MUST tick before payment is enabled:
  > **"I understand this is a non-refundable contribution to NNAWCA. I have read the membership terms."**
  - The unchecked state blocks the "Pay" button.
  - The acknowledgement is logged in `MembershipOrder.metadata` as `{ refundPolicyAcknowledgedAt: ISO_timestamp }`.
- **Payment receipt template** carries the same line in the footer so the user has a written record.
- **`MembershipRefund` table is kept** for admin overrides only — chargebacks and bank disputes can still arrive. When a Razorpay dispute is raised:
  - `payment.dispute.created` webhook → admin notification (no auto-refund)
  - Admin reviews + decides whether to contest or accept
  - If accepted: admin manually issues refund via the admin endpoint, creates `MembershipRefund` row, downgrades user
- **Refund logic when admin does process one:** marks the originating `Membership` as `refunded` and downgrades the user **only if no later paid Membership exists**.

---

## 8. Background jobs (pg-boss)

All membership jobs use a per-user lock key `membership:user:{id}` to prevent concurrent state changes.

| Job | Schedule | Action |
|---|---|---|
| `membership:expire` | hourly | Find `Membership` rows where `endsAt < now() - 30 days` (grace included) AND `status='active'` → mark `expired`, downgrade `User.membershipPlanCode`; if downgraded plan was `committee`, re-activate the user's life `Membership` row instead of dropping to `free`; write `MembershipEvent` |
| `membership:reminder` | daily 09:00 IST | Email 30 / 14 / 7 / 1 day before `endsAt` — associate and premium only (life never expires; committee expiry handled separately) |
| `membership:committee-expiry-warning` | daily 09:00 IST | Email 60 / 30 / 7 days before committee `endsAt` — super-admin notified at T-30 so they can proactively re-invite |
| `membership:invite-expiry` | hourly | Expire `CommitteeInvite` rows where `expiresAt < now()` AND `status='pending'`; write `MembershipEvent { type: 'committee_expired' }` for the invite |
| `membership:reconcile-razorpay` | every 4 h | Pull recent payments, repair any `created`/`attempted` orders that actually succeeded (webhook drops) |
| `membership:invoice-generate` | on-demand | Build PDF, upload to R2, set `MembershipInvoice.pdfKey`, email |
| `membership:welcome` | on-demand | Tier-specific welcome email |
| `membership:certificate-yearly` | annual, Apr 1 | Generate "Certificate of Contribution" PDF for active premium/life/committee |
| `membership:upsell-nudge` | monthly | Email free members who haven't upgraded in 30/60/90 days with tailored "what you're missing" copy |

---

## 9. Side-effect entities (touched on activation / expiry)

- **Profile:** flip `highlightedProfile` flag (premium+); stripe colour shown by existing `AlumniProfileCard`.
- **ScholarshipSupporter:** insert row on first premium/life activation; soft-delete on revoke/refund.
- **MentorProfile:** existing model — gate creation behind `canApplyAsMentor`.
- **BusinessListing:** existing model — gate creation behind `canListBusiness`; on expiry, set `visible = false` (don't delete).
- **Voting:** when a poll/election opens, **snapshot** all eligible voter IDs into `PollEligibility` at open-time. Eligibility rule: `user.isVerified === true` AND `daysSinceFirstActive(user) >= 30`. Tier does **not** matter (see §1e). Mid-poll changes don't shift eligibility.
- **Committee revert on expiry:** the `membership:expire` job checks whether the expiring row's `planCode` is `committee`. If yes, instead of dropping to `free`, it looks up the user's most-recent life `Membership` row (`source: 'purchase'`, `planCode: 'life'`) and re-activates it (`status = 'active'`, `endsAt = null`). User stays a Life Member seamlessly.

---

## 10. Resolved decisions — membership (locked in 2026-06-13)

| # | Decision | Resolution | Notes for implementation |
|---|---|---|---|
| 1 | Life Member price | **₹9,999 one-time** | ~10× annual Premium. Stored in `src/config/membership.ts`. |
| 2 | Associate / Premium cycle anchor | **1 year from payment date** | No prorate, no Apr-aligned cycles for paid tiers. `free` tier has no cycle — it is permanent. |
| 3 | Associate → Premium upgrade | **Pay ₹500 difference, keep existing end date** | Same `Membership` row updated with new `planCode`/`benefitTier`; `MembershipEvent` logs `upgraded` with delta. Resets benefits, not the clock. |
| 4 | Auto-renew | **Razorpay Subscriptions from day 1** | See §7. Subscriptions for associate/premium; one-time Order only for life. Manage-autorenew UI required. |
| 5 | Grace period after expiry | **30 days** | After `endsAt`, tier benefits retained for 30 days. `Membership.status` stays `active` until grace ends, then `expired`. Renewal reminders extend through T+15. |
| 6 | GST applicability | **Defer — `gstAmountPaise` nullable** | Field exists in `MembershipInvoice`. NNAWCA's CA confirms before live launch. Invoice template handles both cases. |
| 7 | Refund policy | **NON-REFUNDABLE / donation-style** | See §7a. Hard checkbox at checkout. `MembershipRefund` table kept for admin overrides on chargebacks. |
| 8 | Committee tier tenure | **3 years default, admin can override at grant time** | Admin form pre-fills `endsAt = now + 3 years`. Auto-expires via standard `membership:expire` job. |
| 9 | Paid + free overlap | **Paid dominates; free resumes on paid expiry** | `free` is always the floor — if a paid Membership lapses (post grace), `User.membershipPlanCode` reverts to `'free'`. No DB row needed for free tier; it is the default. |
| 10 | Voting eligibility | **Any verified member with ≥30 days active, regardless of tier** | See §1c. `canVoteInNNAWCA(user)` checks `isVerified` + `daysSinceFirstActive >= 30`, NOT `benefits.voting`. Snapshot to `PollEligibility` at poll-open. |

---

## 11. Email communication — full surface

All categories below. Templates live in DB (editable), MJML source in repo.

### 11a. Transactional (immediate, can't fail silently)

| Trigger | Subject (draft) | Latency |
|---|---|---|
| Signup verified | "Welcome to The Parliament" | < 30 s |
| Password reset | "Reset your password" | < 30 s |
| New device sign-in | "New sign-in to your account" | < 1 min |
| Email change confirm | "Confirm your new email" | < 30 s |
| Payment receipt | "Your NNAWCA Associate/Premium membership is active" | < 1 min after `payment.captured` |
| Payment failed | "Payment couldn't be completed" | < 1 min |
| Refund processed | "Refund issued" | on `refund.processed` |
| Admin grant | "You've been granted [Committee/Premium] membership" | on grant |

### 11b. Membership lifecycle

| Trigger | Subject | Notes |
|---|---|---|
| Signup complete (free tier) | "You're in — here's The Parliament" | Welcome to free tier; what's available now; upgrade CTA |
| 7 days after signup, not upgraded | "Unlock more on The Parliament" | Soft upsell showing what Associate unlocks; no pressure tone |
| 30 days after signup, not upgraded | "Your alumni network is waiting" | Social proof (how many alumni from your batch are here); upgrade CTA |
| Associate activation | "Welcome to Alumni Associate — your benefits inside" | Full associate benefit list; subscription details; manage-plan link |
| Premium activation | "Welcome to Alumni Premium — you're highlighted" | Full premium benefit list; what's new vs associate |
| Upgrade (associate → premium) | "You're now Premium" | Diff-highlight (mentor apply, business listing, highlighted profile) |
| Auto-downgrade after expiry | "Your membership has lapsed" | What changed (back to Free); how to renew; subscription reactivation link |
| Committee invite received | "You've been invited to join the NNAWCA Committee" | Personal note from super-admin; accept/decline buttons; 7-day deadline |
| Committee invite accepted | "Welcome to the NNAWCA Committee" | Responsibilities, tenure end date, governance access details |
| Committee invite declined | (internal log only) | No email to admin; MembershipEvent logged |
| Committee tenure ending | "Your Committee tenure ends in [N] days" | At T-60, T-30, T-7; what happens next (revert to Life); re-invite at super-admin discretion |
| Committee expired / reverted to Life | "Your Committee tenure has ended — you remain a Life Member" | Graceful transition; thanks for service |
| Life Member activation | "Congratulations — you're now a Life Member of NNAWCA" | Certificate intro; recognition timeline; Supporters Wall mention |

### 11c. Reminders / warnings (scheduled)

| Type | Schedule | Tone |
|---|---|---|
| Membership expiry | T-30, T-14, T-7, T-1 days | First two soft, last two urgent |
| Membership expired (post) | T+1, T+15 | "Renew to restore access" |
| Profile incomplete | T+3, T+10, T+30 from onboarding start | Soft nudge with profile % |
| Event RSVP'd → reminder | T-7, T-1, T-2 hours | Day-of mobile-friendly |
| Event RSVP'd but not registered (paid event) | T-3 days | "Confirm your seat" |
| Pending verification documents | T+2, T+7, T+14 | Escalating |
| Unread messages digest | daily 09:00 IST if ≥1 unread > 24 h | Single digest, opt-out |
| Notifications digest | daily 19:00 IST if user hasn't logged in 7+ days | Roll-up |
| Mentor application stuck | T+7 from start | "Finish your mentor profile" |
| Scholarship application deadline | T-14, T-3, T-1 | Critical, no opt-out |

### 11d. Wishes

| Trigger | Source | Notes |
|---|---|---|
| Birthday | `User.dateOfBirth` | "Happy Birthday from **NNAWCA**" — not from "JNV Nagpur" |
| Joining anniversary on platform | `User.createdAt` | "1 year on The Parliament" |
| Membership anniversary | First `Membership.startedAt` per tier | "Thank you for [N] years of support" |
| School foundation day | static calendar | broadcast |
| Major Indian festivals (Diwali, Holi, Independence Day, Republic Day, Eid, Christmas) | static calendar | broadcast with batch-personalised greeting; reuse `chat-themes.ts` palette |
| Batch reunion anniversary | `User.passOutYear` | "20 years since the Class of [year] passed out" |

### 11e. Engagement & community

| Trigger | Cadence |
|---|---|
| New connection request | per-event |
| Connection accepted | per-event |
| Mention in post/comment | per-event |
| Reply to your post | per-event |
| New event in your city | weekly digest |
| New job/referral matching interests | weekly digest |
| Weekly community digest (top posts, new members in your batch/house) | weekly Sunday |
| Group activity digest | weekly per joined group |
| Karma milestone crossed | per-event |
| New scholarship round | broadcast |

### 11f. Admin / safety warnings

| Trigger | Notes |
|---|---|
| Post/comment reported and removed | "Your content was removed" + reason |
| Account flagged for review | Soft warning |
| Suspension applied | Strong tone, appeal link |
| Suspicious activity (multiple failed logins, IP change) | Security alert |
| Verification rejected | What to fix |
| Membership refund disputed | Internal-only to admin team |

### 11g. NNAWCA institutional

| Trigger | Notes |
|---|---|
| Election open / voting reminder | Associate+ only |
| AGM notice | All members |
| Annual report / yearly recap | Premium+ first (early-access perk), then all |
| Yearly Certificate of Contribution | Premium / Life only, every April |
| Scholarship Supporters Wall update | Premium / Life acknowledgement |

---

## 12. Email infra — DB additions

### 12a. `EmailTemplate`

```
id            String  @id @default(uuid())
code          String  @unique   // e.g., "membership.expiry.t_minus_7"
subject       String
htmlBody      String            // MJML-compiled HTML
textBody      String            // plaintext fallback
category      String            // transactional | lifecycle | reminder | wish | engagement | digest | admin | institutional
variables     Json              // declared {{vars}} for validation
isActive      Boolean @default(true)
updatedAt     DateTime @updatedAt
updatedBy     String?
```

### 12b. `EmailMessage` (outbox + audit)

```
id              String  @id @default(uuid())
userId          String? @index
toAddress       String
templateCode    String  @index
category        String  @index
subject         String
status          String   // queued | sending | sent | failed | bounced | suppressed
queuedAt        DateTime @default(now())
sentAt          DateTime?
error           String?
providerMsgId   String? @index   // Hostinger Message-ID for bounce tracking
metadata        Json?            // template vars snapshot
@@index([userId, queuedAt])
```

### 12c. `EmailPreference` (per-user opt-out granularity)

```
userId              String  @id
transactional       Boolean @default(true)   // locked on (legal/billing); UI shows but disables
lifecycle           Boolean @default(true)
reminders           Boolean @default(true)
wishes              Boolean @default(true)
engagement          Boolean @default(true)
digests             Boolean @default(true)
marketing           Boolean @default(true)
quietHoursStartIST  Int?    // 22 => 22:00 IST
quietHoursEndIST    Int?    // 7  => 07:00 IST
language            String  @default("en")    // future: "hi", "mr"
```

### 12d. `EmailSuppression`

```
emailAddress  String  @id
reason        String   // hard_bounce | complaint | unsubscribe_all | invalid
suppressedAt  DateTime @default(now())
```

Sender checks suppression before every queue. Hard bounces auto-add.

### 12e. `EmailUnsubscribeToken` (one-click List-Unsubscribe)

```
token     String  @id
userId    String
category  String   // category-scoped or "all"
expiresAt DateTime
```

---

## 13. Sending pipeline (pg-boss)

```
enqueue(templateCode, userId, vars)
   -> check EmailPreference (category allowed?)
   -> check EmailSuppression (toAddress sendable?)
   -> check quiet hours -> reschedule if inside
   -> insert EmailMessage status=queued
   -> publish 'email:send' job

worker 'email:send'
   -> render template (MJML -> HTML, plaintext)
   -> SMTP send via Nodemailer pool (Hostinger)
   -> record providerMsgId, sentAt
   -> on hard fail: status=failed, add to suppression if appropriate

worker 'email:digest:build'  (cron)
   -> aggregate unread notifications / weekly content
   -> enqueue single digest mail

worker 'email:bounce-poll'   (cron, IMAP)
   -> parse Hostinger bounce mailbox, update suppression
```

**Per-recipient rate cap:** max **4 non-transactional emails per 24 h** to one address. Transactional bypasses the cap.

---

## 14. Template system

- Author in **MJML** under `emails/templates/*.mjml` → compile to `EmailTemplate.htmlBody` at admin save time.
- Common partials: header (NNAWCA logo + brand blue), footer (legal entity, address, unsubscribe link, manage-preferences link).
- Variables typed in TS: `MembershipReminderVars = { firstName, planName, expiresOn, renewUrl }`. Sender validates against `EmailTemplate.variables` JSON before send.
- Plaintext fallback auto-generated from MJML markdown blocks. Don't hand-author both.
- Festive emails reuse the `chat-themes.ts` palette so Diwali/Holi mails are consistent with the in-app festive theme.
- **All copy uses "NNAWCA" as sender, never "JNV Nagpur".**

---

## 15. Deliverability (Hostinger SMTP, sending domain `nnawca.com`)

All DNS records configured on `nnawca.com` (sending domain), **not** `nnawca.org` (site).

- **SPF** on `nnawca.com`: `v=spf1 include:_spf.hostinger.com include:_spf.mail.hostinger.com ~all`
- **DKIM** on `nnawca.com`: enable Hostinger DKIM for every sending mailbox below
- **DMARC** on `nnawca.com`: start `p=none; rua=mailto:dmarc@nnawca.com`; tighten to `quarantine` after 4 weeks of clean reports
- **Alignment will be relaxed** (sending domain ≠ site domain) — that's acceptable but worth noting in the deliverability dashboard

### From addresses (split by purpose to protect reputation)

| Mailbox | Purpose |
|---|---|
| `noreply@nnawca.com` | transactional only |
| `community@nnawca.com` | lifecycle + wishes + digests |
| `events@nnawca.com` | event reminders |
| `admin@nnawca.com` | warnings, verification |
| `support@nnawca.com` | Reply-To inbox; must be monitored by a human |

### Other deliverability rules

- **List-Unsubscribe header** + `List-Unsubscribe-Post: List-Unsubscribe=One-Click` on every non-transactional send.
- **Bounce mailbox** on Hostinger, polled via IMAP, populates `EmailSuppression`.
- **Subject hygiene**: no all-caps, no `!!!`, no `Re:` unless actually a reply.
- **Test seeds** on Gmail / Outlook / Yahoo / Zoho before any broadcast (most alumni are on Gmail; Outlook for corporate alumni).

---

## 16. Send-time policy (the "don't be annoying" rules)

- **Quiet hours:** default 22:00 – 07:00 IST. Reschedule to 09:00 IST next day unless transactional.
- **Frequency cap:** 1 wish + 1 reminder + 1 digest per user per day max. Engagement events roll up into the daily digest if user already got 3 today.
- **Coalescing:** when two reminders fall within 4 hours, merge them (e.g., "Your membership expires in 7 days, and your event is tomorrow").
- **Per-category opt-out** respected on every queue, not just the unsubscribe page.
- **First-week new user:** no digests or wishes for 7 days — only transactional + onboarding sequence.
- **Inactive (lapsed > 12 months):** only quarterly re-engagement mail; if no opens, suppress further marketing.

---

## 17. Admin email tooling

`/admin/emails` (new section under existing admin shell — slate + indigo, lucide icons, no emoji):

- Templates list / edit with live preview, variable validation, send-to-self test.
- Outbox: filter by status, search by user, resend.
- Broadcast composer: pick template + segment (by tier / batch / house / city) + schedule.
- Suppression list: view, manually unsuppress (with reason audit).
- Deliverability dashboard: sent / delivered / bounced / complained per category per week.
- Bounce log.

Every template edit + broadcast send writes a `MembershipEvent`-style row (or a parallel `AdminEvent` if not yet created — TBD when admin audit log is built).

---

## 18. Integration with rest of the platform

- **Notifications model** (already exists): for every in-app notification, decide email parallel via `Notification.shouldEmail()` — driven by preference + dedupe.
- **Karma:** milestone crossings emit a `karma.milestone` template (engagement category) — opt-out respected.
- **Onboarding:** existing `OnboardingProgress` drives the profile-incomplete reminder series.
- **Events:** existing event RSVP flow enqueues `event:reminder` jobs at registration time.
- **Membership:** `membership:reminder` cron calls the email enqueue helper.

---

## 19. Resolved decisions — email (locked in 2026-06-13)

| # | Decision | Resolution | Notes for implementation |
|---|---|---|---|
| 1 | Languages at launch | **English only, structure for i18n** | `EmailTemplate.language` column exists from day 1, only `en` templates authored. Add Hindi/Marathi when there's signal. |
| 2 | Quiet hours | **22:00–07:00 IST (default)** | Configurable per-user via `EmailPreference.quietHoursStartIST/EndIST`. Non-transactional sends reschedule to 09:00 IST next day. |
| 3 | Digest frequency | **Weekly default** | Daily messages digest only fires if ≥1 unread > 24h. No per-category daily/weekly picker in v1 — adds preference UI complexity for marginal value. |
| 4 | Birthday wishes | **Default ON, easy opt-out** | `EmailPreference.wishes` default `true`. Greeting copy: "Happy Birthday from NNAWCA". DPDP notice in onboarding privacy summary covers DOB use for greetings. |
| 5 | Festival list | **Single `festivalGreetings` toggle, send all listed festivals to opted-in users** | Festival set: Diwali, Holi, Eid, Christmas, Independence Day, Republic Day. No religious profiling. Toggle default `true`. |
| 6 | Sending provider | **Hostinger SMTP for everything in v1** | All categories (transactional, lifecycle, reminders, wishes, digests, broadcasts) on Hostinger. Move marketing-tier to SES/Postmark/Resend in v2 when broadcast volume strains limits. **Monitor Hostinger's per-hour/per-day caps and add throttling to pg-boss workers accordingly — confirm exact limits with Hostinger before first broadcast.** |
| 7 | Bounce handling | **IMAP poll on Hostinger bounce mailbox (every 15 min)** | Cron worker `email:bounce-poll`. Parses NDRs, updates `EmailSuppression`. Acceptable latency for v1. Switch to webhook-based bounces when v2 marketing provider lands. |
| 8 | Certificate delivery | **PDF attached AND hosted on profile** | Generate PDF via Puppeteer/PDFKit, upload to R2, attach to email, also expose signed URL on `/profile/[username]/membership-history`. Attachment size kept <500 KB to protect deliverability. |

---

## 20. Build order recommendation

All decisions resolved — ready to start.

1. **`src/config/membership.ts`** (plan registry + benefit matrix — `free` as default, committee as invite-only flag) + **`src/lib/membership-cycle.ts`** (`academicYearFor` for invoice numbering, `resolveActivePlan` with committee-revert-to-life logic, `nextRenewalDate`) + **`src/lib/membership-gates.ts`** (`isSuperAdmin` guard for committee invite). Unit tests: `resolveActivePlan` for all 6 tier states including committee→life revert.
2. **Prisma migration**: `User` field additions (`membershipPlanCode @default("free")`, `membershipCycleStart`, `passOutYear`, `isSuperAdmin @default(false)`) + `Membership`, `MembershipOrder` (with `razorpaySubscriptionId`), `MembershipInvoice` (with nullable `gstAmountPaise`), `MembershipRefund`, `MembershipEvent`, `CommitteeInvite`, `PollEligibility`.
3. **Membership read APIs**: `/api/membership/me`, `/api/membership/plans`, `/api/membership/history`.
4. **Razorpay Plans setup** (one-time, in Razorpay dashboard): create `assoc_annual_499` + `premium_annual_999` Plan IDs; store in config.
5. **Razorpay Subscriptions flow**: `/api/membership/checkout` (creates Subscription for associate/premium, Order for life) → mandate setup UI → `/api/membership/verify` (HMAC + idempotent upsert) → `/api/razorpay/webhook` handling all subscription + payment events. **Hard checkbox** for non-refundable acknowledgement before payment is enabled (logged in `MembershipOrder.metadata`).
6. **Membership lifecycle jobs (pg-boss)**: `membership:expire` (hourly, includes 30-day grace + committee→life revert logic), `membership:reminder` (daily 09:00 IST for associate/premium), `membership:committee-expiry-warning` (daily), `membership:invite-expiry` (hourly), `membership:reconcile-razorpay` (every 4h), `membership:upsell-nudge` (monthly for free members). Wire `membership:expire` first so stale-state bugs surface during testing.
7. **Invoice generation** + R2 upload (Puppeteer-based PDF, GST line omitted while `gstAmountPaise = null`).
8. **Voting infra**: `PollEligibility` snapshotter, `canVoteInNNAWCA(user)` using the verified+30-day rule.
9. **Email infra**: `EmailTemplate`, `EmailMessage`, `EmailPreference` (incl. `wishes`, `festivalGreetings`, `quietHours*`), `EmailSuppression`, `EmailUnsubscribeToken` migrations + Nodemailer-on-Hostinger sender pipeline + IMAP `email:bounce-poll` cron. Author the **5 highest-priority templates first**:
   - signup verify (transactional)
   - password reset (transactional)
   - membership payment receipt (transactional, carries non-refundable line in footer)
   - membership welcome — Associate / Premium / Life (lifecycle)
   - membership expiry T-7 (reminder)
10. **Remaining email templates batched**: rest of lifecycle → reminders (T-30, T-14, T-1, T+1, T+15) → wishes (birthday, anniversary, festival broadcasts) → engagement (mention, reply, connection) → digests (weekly community, group activity, notifications).
11. **Yearly Certificate of Contribution**: PDF generator (Puppeteer + branded template), `membership:certificate-yearly` cron on Apr 1 for active premium/life, R2 upload, hosted at `/profile/[username]/membership-history`, attached to email.
12. **Admin tooling**: `/admin/membership` (grants, extensions, manual refunds for chargebacks, stats) and `/admin/emails` (templates, outbox, suppression, broadcasts, deliverability dashboard).

**Pre-launch checklist** (must be done before any real payment is taken):
- Re-enable auth (uncomment `middleware.ts` and `/api/onboarding/*` mocks).
- Confirm Hostinger SMTP rate limits and tune pg-boss worker throttling to match.
- DNS records on `nnawca.com`: SPF, DKIM (per mailbox), DMARC `p=none` initially.
- NNAWCA CA confirms GST stance; if applicable, populate `gstAmountPaise` calculation in checkout.
- Razorpay account in live mode, mandate-flow tested with real ₹1 transaction.
- Test seeds to Gmail, Outlook, Yahoo, Zoho for all 5 priority templates before opening signups.

**Invariant for the whole system:** never claim membership is active without a `MembershipEvent` row + `Membership.status='active'` row written in the same Prisma `$transaction`. The verify endpoint and the webhook must converge on this same upsert path keyed by `razorpayPaymentId`.
