# Membership, Access & Entitlement Audit — The Parliament (NNAWCA)

**Date:** 2026-08-26 · **Branch:** `audit/membership-entitlements` · **Scope:** entire member-facing platform
**Method:** 8 parallel read-only codebase investigations (membership, calls, feed/ads, directory/profile, events/groups/jobs/business, messaging/notifications, games/economy, admin/RBAC/karma). Every claim is cited `file:line`. No code was changed.

> **Reading guide.** Current-state sections (1–3, 6, 7) are truthful audit. Future-state sections (4, 5, 8, 9, 10) are recommendations. Numbers I introduce are labelled **[assumption]** and reasoned from existing limits; where a call is genuinely the owner's, it says **Unknown — requires product decision**.

---

## 0. Implementation Log (what was fixed after the audit)

Branch `audit/membership-entitlements`. All changes ship with tests; full unit suite green (1028+), `tsc` clean.

**P0 — correctness / security / revenue** (commit `fix(membership): P0 …`)
- Assoc→Premium delta billing now honoured (charge delta, preserve renewal date) — `computePricing` + order metadata → claim → activation.
- Job-post draft bypass closed — gate moved into `createPost` + `publishDraft`.
- Dual source-of-truth drift closed — session `membershipStatus` claim now derives from `resolveActivePlan` (row truth); feed uses the claim + `isPaidTier`; `adminSetTier` normalizes `"free"`→`"student"`.
- Call quota race + pass double-spend closed (one-live-call-per-user guard + bind-once pass); webhook metering time-boxed (F6); kill-switch comment corrected (F5).
- Admin membership mutations require the new `membership:manage` permission (admin + super_admin).
- Promo codes gain expiry + total-redemption cap, enforced server-side.

**P1 — real tier differentiation + honest pricing** (commit `feat(membership): P1 …`)
- Ad ladder: premium/life/committee ad-free (feed + timewheel); associate reduced (1 ad/10); student capped teaser.
- `highlightedProfile` implemented (directory ring + badge + tier shown) — was dead config.
- Gallery per-tier storage quota (student 200MB → life 10GB), enforced on upload.
- **Pricing page reconciled to reality** — removed unbacked benefits (apply-to-be-mentor, mentorship pairing, recognition website/events, seva cells, scholarship wall, priority support, welfare/scholarship-report tier claims); surfaced the real, enforced differentiators (video-call minutes, ad-free feed, gallery storage, game archive, highlighted profile) with numbers pulled from config.

**P2 — hardening** (commit `feat(membership): P2 …`)
- DM anti-spam rate limits (new-conversation 20/hr, send 40/min).
- Certificate of Contribution retrievable — `GET /api/membership/certificate` + dedicated `membership.yearly_certificate` email (stopped reusing `welcome_premium`).
- Honesty sweep of all membership emails (welcome/expiry/upsell) to match the reconciled pricing.

**Deferred (product decisions / larger builds, intentionally NOT done):** real recurring Razorpay subscriptions (auto-renew); Coupon model + admin UI; building mentorship-pairing / seva-cells / scholarship-wall features (or deleting the flags); Vyapaar skill-gaming legal review; enforce-or-remove the karma capability unlocks; cross-pagination directory re-ranking (needs a computed sort column / migration); per-kind notification preferences; in-app "who viewed you" + full-text search. These remain as written in §9.

---

## 1. Executive Summary

- **~95 distinct capabilities** discovered across **~26 functional areas**: membership/billing, video calling, feed/content, ads, directory, search, profile, connections, messaging, notifications, web-push, WhatsApp, blood requests, announcements, bot, events, groups, jobs, business directory, mentorship, committee, daily games, Vyapaar + coin/shell economy, gallery, karma, admin/RBAC, moderation, verification.
- **Actual membership differentiation is tiny.** Of **18** benefit flags in `BENEFITS` (`src/config/membership.ts:25`), only **2 are truly enforced** (`jobs`, `businessListing`), **1 gates a dead no-op button** (`mentorApply`), and **15 are never read anywhere**. Real tier separation exists in only **4 places**: video-call quota, daily-game archive, feed pagination cap, and an ad-cadence rule.
- **The four tiers are nearly identical in practice.** Associate, Premium, and Life get the *same* feed ads, *same* directory, *same* search, *same* messaging, *same* everything except: jobs (Associate+), business listing + working call minutes (Premium/Life), and larger call quota (Life). **Associate vs Student differs by exactly one enforced thing (posting jobs + game archive + uncapped feed).** Premium vs Life differ only in call minutes and a life/committee-only "full followers list."
- **Major current-state problems (detail in §6–7):**
  - **Billing bug:** the advertised Associate→Premium "pay ₹500 difference, keep your renewal date" is **not honored** — checkout charges full ₹999 and resets the renewal date (`service.ts:88` vs `checkout/route.ts:33`, `activation.ts:36`).
  - **Two sources of truth for tier** (`User.membershipStatus` string vs `resolveActivePlan` over `Membership` rows) that **drift**: a **suspended member keeps premium perks** on the string path (games/directory/feed), and a `"free"`-valued account gets **full paid feed** because a gate compares `=== "student"` (`feed/page.tsx:95`).
  - **Entitlement bypass:** Student can post a paid "job opening" via the **draft→publish path**, which skips the gate (`compose/actions.ts:89` → `posts.ts:351`).
  - **Revenue leaks / abuse:** call quota has a **concurrent-call race** (start N calls, all pass) and a **student-pass double-spend race**; **promo codes** (`FOUNDER20` 20% off) are **infinitely reusable by anyone**.
  - **Subscriptions don't actually recur** — Razorpay plan IDs are placeholders; Associate/Premium are sold as one-time 365-day grants (`membership.ts:129`, `checkout/page.tsx:58`).
- **Major monetization opportunities (detail in §8):** ads are *not* reduced for paying members (all paid tiers see identical ads); `highlightedProfile` is sold but unbuilt; there's **no "who viewed your profile"** surface, **no gallery storage quota**, **no advanced/saved search tier**, and **no real event early-access**. These are the natural, non-punitive upgrade levers.
- **Security posture is otherwise strong:** route protection is genuinely server-enforced (middleware is presence-only backstop), admin RBAC (`requirePermission` re-reads DB) is tamper-proof, payment verification checks signature+capture+amount, and profile PII redaction is server-side. Karma *earning* is abuse-hardened. The weaknesses above are entitlement/billing logic, not auth.

---

## 2. Platform Feature Inventory

Legend — access cells: ✅ full · ⛔ none · number/desc = limit · **flag-only** = config exists, unenforced. Enforcement: FE / BE / both / none.

### 2.1 Membership & Billing
| Feature | Current Implementation | Backend | Access Rule | Enforcement | Student | Assoc | Premium | Life | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|---|
| Tier resolution (runtime) | `resolveActivePlan` over active `Membership` rows + `User.status`; grace-aware; fallback student | `membership-cycle.ts:55`, `service.ts:31` | authed | BE | base | assoc | premium | premium | `service.ts:49` | Working |
| Denormalized tier column | `User.membershipStatus` (default `"student"`) → JWT claim; **separate write** from row truth | `auth.ts:116`, `activation.ts:72` | — | both (divergent) | — | — | — | — | `schema.prisma:126` | **Partial (dual truth)** |
| Checkout / pricing | `computePricing` server-authoritative (base+₹30 fee+₹49 opt donation−promo, clamp≥0) | `checkout/route.ts:33`, `membership.ts:259` | authed | BE | — | buy | buy | buy | — | Working |
| Promo codes | Hardcoded 2-entry table, **no usage/expiry/per-user cap** | `membership.ts:239` | anyone | BE | — | ∞ reuse | ∞ | ∞ | `membership.ts:239` | **Partial** |
| Payment verify (client + webhook) | sig + `payments.fetch` capture/amount/order guard; atomic claim; webhook dedup | `verify/route.ts:37`, `webhook/route.ts:15` | order owner | BE | — | ✓ | ✓ | ✓ | — | Working |
| Assoc→Premium upgrade delta | UI promises ₹500 diff + keep date; checkout charges **full ₹999** + resets date | `service.ts:88` vs `checkout/route.ts:33` | authed | none | — | ✓ | — | — | `activation.ts:36` | **Broken** |
| Subscription auto-renew | `autoPay:true` set but plan IDs are placeholders; sold as one-time 365d | `activation.ts:63`, `membership.ts:129` | — | — | — | ✗ | ✗ | n/a | `checkout/page.tsx:58` | **Non-functional** |
| Expiry / grace | 30-day grace; cron flips row→expired, column→student; committee→reverts to life | `jobs.ts:63`, `activation.ts:222` | cron | BE | — | ✓ | ✓ | n/a | — | Working |
| Invoice PDF | numbered `NNAWCA/FY/000001`, owner-only signed serve | `invoice.ts:168` | owner | BE | — | ✓ | ✓ | ✓ | — | Working |
| Yearly certificate | issued to premium/life/committee; **no download route**; reuses `welcome_premium` email | `certificate.ts:8,67` | cron | BE | — | — | ✓ | ✓ | — | **Partial** |
| Committee invite | super-admin invites Life member; 7d TTL, 3yr tenure | `admin.ts:188` | super_admin | BE | — | — | — | invitable | — | Working |
| Admin grant/extend/revoke/refund | generic `requireAdmin` (not perm-scoped); Razorpay refund then record | `api/admin/membership/route.ts:67` | any admin | BE | — | ✓ | ✓ | ✓ | — | Working (over-broad) |

### 2.2 Video / Audio Calling
| Feature | Implementation | Access | Student | Assoc | Premium | Life | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| DM 1:1 call | LiveKit; server authz then token | conversation participant | pass only | included | included | included | `token/route.ts:26` | Working |
| Tier quota (per-call/day/week/month min) | `evaluateQuota` over rolling windows | tier limits | ⛔ (null) | 30/60/240/600 | 60/120/500/1500 | 90/180/700/2000 | `calls.ts:29-36` | Working (start-only) |
| Student pass | ₹30 / 30-min single pass, Razorpay, amount-verified | tiers w/o included calling | ✓ | n/a | n/a | n/a | `checkout/route.ts:19` | Working |
| Per-call minute cap | returned to client but **not enforced mid-call** (advisory) | — | — | 30 | 60 | 90 | `token/route.ts:45` | **Partial** |
| AMA room | any signed-in member; host/coHost publish, rest audience | signed-in | audience | audience | audience | audience | `service.ts:127` | Working |
| Platform budget kill-switch | auto-disable at 5000 min/30d; **claimed admin override doesn't exist** | all | ✓ | ✓ | ✓ | ✓ | `service.ts:58`, `calls.ts:53` | **Partial** |

### 2.3 Feed, Content & Ads
| Feature | Implementation | Gate | Student | Assoc | Premium | Life | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| Post (text/image/link/quote/question) | `createPost` | auth only, **no karma/tier gate** | ✅ | ✅ | ✅ | ✅ | `posts.ts:132` | Live |
| Poll create | same path | **not** karma-gated (despite "Poller 100" copy) | ✅ | ✅ | ✅ | ✅ | `posts.ts:161` | Live |
| Post "job opening" | category gate on `benefits.jobs` | Assoc+ (**bypassable via draft**) | ⛔ | ✅ | ✅ | ✅ | `compose/actions.ts:33` | **Partial/bypass** |
| Post media | R2 presign, 64 MB/file, mime allowlist | both sides, **same for all tiers** | 64MB | 64MB | 64MB | 64MB | `media-limits.ts:6` | Live |
| Text-background picker | student gets gradient set, others SVG set | **FE-only** (BE stores any bg) | 8 grads | SVG | SVG | SVG | `text-backgrounds.ts:78`, `posts.ts:191` | Live (bypassable) |
| Comments / reactions / shares / saves / hashtags | standard | auth only | ✅ | ✅ | ✅ | ✅ | `posts.ts:471,600,623,693` | Live |
| Post awards (9, karma cost 20–50) | `spendKarma` real spend | **karma balance** (not tier) | karma | karma | karma | karma | `posts.ts:645` | Live |
| Post analytics | views/votes/comments/shares/top-commenters | **author-only** | author | author | author | author | `analytics/page.tsx:24` | Live |
| In-stream feed ads | 4 house ads woven; committee exempt; **student feed capped 5 items/2 ads, no load-more** | tier cadence | capped+2 ads | 1/5 | 1/5 | 1/5 | `feed-ads.ts:113`, `feed/page.tsx:84` | Live |
| Timewheel sidebar ad | rotating banner | **everyone equally** (incl. committee) | ✅ | ✅ | ✅ | ✅ | `feed-content.tsx:583` | Live |
| Karma capability thresholds | `thresholdFor` computes canPost/canComment/canPoll | **display-only, enforced nowhere** | — | — | — | — | `ledger.ts:424` | Display-only |

### 2.4 Directory, Search, Profile, Connections
| Feature | Implementation | Gate | Student | Assoc | Premium | Life | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| Alumni directory | paged roster, Prisma | authed member, **no tier check** (`BENEFITS.directory` dead) | ✅ | ✅ | ✅ | ✅ | `directory/service.ts:45`, `middleware.ts:20` | Real |
| Directory text search | ILIKE on name/username only | **free-for-all** | ✅ | ✅ | ✅ | ✅ | `directory/service.ts:54` | Real, ungated |
| Advanced filters (batch/house/tier/industry/city/verified/sort) | full facets | **ungated** | ✅ | ✅ | ✅ | ✅ | `community-client.tsx:202` | Real, ungated |
| Navbar "search" | link-builder → `?q=` deep-link; no typeahead/entity search; 5 hardcoded suggestions | none | placeholder | " | " | " | `PrivateNavbar.tsx:107` | Placeholder-ish |
| Profile view + visibility gate | public/alumni/connections/private; server PII redaction | BE, solid | ✅ | ✅ | ✅ | ✅ | `privacy.ts:50`, `load-profile.tsx:379` | Real |
| `highlightedProfile` perk | **DEAD CONFIG** — flag true for premium, never rendered | none | ⛔ | ⛔ | flag-only | flag-only | `membership.ts:15,77` | Dead |
| "Who viewed you" (ProfileView) | rows written on view; **only surfaced as weekly email**, no in-app UI | none | ✅ | ✅ | ✅ | ✅ | `view-digest.ts:10` | Partial |
| Full followers list | preview 10, full for life/committee only (ad-hoc, not a flag) | FE tier gate | 10 | 10 | 10 | all | `profile-view.tsx:542` | Enforced (ad-hoc) |
| Connections (follow) | unlimited, race-safe | **no cap** | ∞ | ∞ | ∞ | ∞ | `connections/service.ts:141` | Real |

### 2.5 Messaging, Notifications, Comms
| Feature | Implementation | Gate | Student | Assoc | Premium | Life | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| DM conversation + send | 1:1, Realtime broadcast, email nudge | **social edge (follow), NOT tier**; 5000-char cap; **no rate limit** | ✅ | ✅ | ✅ | ✅ | `messaging/service.ts:35,246` | Live |
| Chat themes (18 festive) | date/birthday driven | **free, not premium** | ✅ | ✅ | ✅ | ✅ | `chat-themes.ts:436` | Live |
| Notifications bell/email/push | coalescing, Redis, VAPID | self; **no per-kind preference model** | ✅ | ✅ | ✅ | ✅ | `notifications/service.ts:19` | Live |
| Blood request | WhatsApp fan-out to donor groups | **any member**, 5/hr, unmoderated (real paid sends) | ✅ | ✅ | ✅ | ✅ | `blood/actions.ts:19` | Live |
| WhatsApp group broadcast | AiSensy | **admin `whatsapp:send` only** | — | — | — | — | `whatsapp/actions.ts:10` | Live |
| Announcements banner | time-windowed | admin | — | — | — | — | `announcements/service.ts:7` | Live |
| Bot (NNAWCA system user) | welcome/announce/DM | in-process/admin | recipient | ✓ | ✓ | ✓ | `bot/service.ts:37` | Live |

### 2.6 Events, Groups, Jobs, Business, Mentorship
| Feature | Implementation | Gate | Student | Assoc | Premium | Life | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| Create/host event | any member, auto-published | **ungated** (no flag, spam surface) | ✅ | ✅ | ✅ | ✅ | `events/actions.ts:19` | Open |
| RSVP free / paid | Razorpay order for paid | open / payment | ✅ | ✅ | ✅ | ✅ | `events/actions.ts:94`, `orders.ts:14` | Working |
| Event early access | `earlyAccessEvents` flag **dead**; premium only gets earlier *notification* wave | notify stagger only | 6h late | 4h | 0h | 0h | `invites.ts:14` | **Flag dead** |
| Group join/leave | open (benefit true all tiers) | none | ✅ | ✅ | ✅ | ✅ | `groups/service.ts:391` | Open |
| Group create | no user-facing creation; auto-assign/admin | n/a | — | — | — | — | `groups/service.ts:356` | Admin/auto |
| "Group Leader" karma 250 | config threshold | **enforced nowhere** | — | — | — | — | `config/karma.ts` | Dead |
| Business listing create | admin-approved | `businessListing` (**enforced both sides**) | ⛔ | ⛔ | ✅ | ✅ | `business/new/actions.ts:23` | **Enforced** |
| Mentor apply | gates a **no-op button** (no action/route/model) | `mentorApply` FE display | ⛔ | ⛔ | no-op | no-op | `profile-view.tsx:530` | **Placeholder** |
| Mentorship pairing | **nonexistent** | `mentorshipPairing` dead | — | — | — | — | grep 0 | Dead |

### 2.7 Games, Vyapaar, Economy, Gallery
| Feature | Implementation | Gate | Student | Assoc | Premium | Life | Evidence | Status |
|---|---|---|---|---|---|---|---|---|---|
| Daily puzzles (Alfazy/Hit&Blow/Integra) | server re-grades, 1/day | any member | ✅ | ✅ | ✅ | ✅ | `games/actions.ts:105` | Live |
| Puzzle archive | **paid-tier gate** (`PAID_TIERS`) | Assoc+ (free window = today+yesterday) | ⛔ | ✅ | ✅ | ✅ | `games.ts:107`, `actions.ts:65` | Live |
| Game karma | hard-capped 0 | — | 0 | 0 | 0 | 0 | `actions.ts:161` | Live |
| Vyapaar rooms/matches | Monopoly-style, wagers **entire coin wallet** | any member, **no tier gate** | ✅ | ✅ | ✅ | ✅ | `match.ts:115,176` | Live |
| Coin wallet | 25k welcome grant; play-money | any member | ✅ | ✅ | ✅ | ✅ | `wallet.ts:8` | Live |
| Shells (real currency) | **Razorpay ₹100–2000 packs**; → coins one-way; also granted on membership buy | any member | ✅ | ✅ | ✅ | ✅ | `config/shells.ts:2` | Live |
| Shell checkout discount | 1 shell=₹1 off, ≤10% of balance | any member | ✅ | ✅ | ✅ | ✅ | `shell-discount.ts:33` | Live |
| Egg game | throw −1/+1, monthly resolve | ≥7-day targets, 10/day | ✅ | ✅ | ✅ | ✅ | `eggs.ts:5` | Live |
| Gallery view / upload | members-only; verified upload | **no tier gate**; 5MB/photo, 60/hr, **no total-storage quota** | ✅ | ✅ | ✅ | ✅ | `gallery/actions.ts:68` | Live |

### 2.8 Access-control machinery (not a member perk — the enforcement layer)
| Feature | Implementation | Enforcement | Evidence | Status |
|---|---|---|---|---|
| Route protection | per-page `requireUser`/`requireAdmin`; middleware = cookie-presence backstop only | BE authoritative | `session.ts:18`, `middleware.ts:8` | Solid |
| Admin RBAC | `can()` matrix + `requirePermission` re-reads DB (tamper-proof) | BE | `gate.ts:83` | Solid |
| Admin identity | `isSuperAdmin` ∨ email allowlist ∨ UserRole; separate `/auth/admin` | BE | `auth/admin.ts:28` | Solid |
| Moderation / verification | `requirePermission("content:moderate"/"verification:review")` | BE | `moderation/actions.ts:15` | Solid |
| Karma earning anti-abuse | daily caps, floors, Sybil weight, pair-cap, self-zero | BE txn-locked | `ledger.ts:105` | Solid |
| Karma capability unlocks | `thresholdFor` / `gateUser({karmaMin})` | **enforced nowhere** (dead) | `gate.ts:44`, `ledger.ts:424` | Gap |
| Rate limiting | Redis fixed-window | covers auth/uploads/reports/blood/gallery/admin | `rate-limit.ts:16` | Partial |
| Rate-limit **gaps** | **posts, comments, reactions, DMs, connection requests** uncovered | none | grep | **Gap** |

---

## 3. Current Membership Matrix (actual, verified)

| Capability | Student | Associate | Premium | Life | What actually enforces it |
|---|---|---|---|---|---|
| Directory, profiles, search, filters | ✅ | ✅ | ✅ | ✅ | Nothing (all identical) |
| Post/comment/poll/react/share | ✅ | ✅ | ✅ | ✅ | Nothing (karma ladder is display-only) |
| Post a **job opening** | ⛔* | ✅ | ✅ | ✅ | `benefits.jobs` (*draft path bypasses) |
| Feed pagination | **capped 5, no load-more** | full | full | full | `membershipStatus === "student"` string |
| In-stream ads | 2 (capped feed) | 1 per 5 posts | 1 per 5 posts | 1 per 5 posts | ad cadence; **paid tiers identical** |
| Timewheel sidebar ad | ✅ shown | ✅ shown | ✅ shown | ✅ shown | none (everyone) |
| Video calls | **pass only** (₹30/30min) | 30/60/240/600 min | 60/120/500/1500 | 90/180/700/2000 | `TIER_CALL_LIMITS` (real) |
| Daily-game archive | ⛔ | ✅ | ✅ | ✅ | `PAID_TIERS` string |
| Business listing | ⛔ | ⛔ | ✅ | ✅ | `benefits.businessListing` (real) |
| Full followers list | 10 | 10 | 10 | ✅ all | ad-hoc life/committee gate |
| Messaging (DM connections) | ✅ | ✅ | ✅ | ✅ | social edge, not tier |
| Vyapaar / coins / gallery / games | ✅ | ✅ | ✅ | ✅ | none |
| Certificate (yearly) | ⛔ | ⛔ | ✅ | ✅ | issued but no download route |
| Mentor apply / pairing, seva, scholarship wall, event early-access, highlighted profile, recognition | **all advertised, none enforced** | " | " | " | dead config |

**Tiers that are functionally identical today:** Associate ≈ Premium ≈ Life for *everything except* business listing + call minutes. Student differs from Associate by only: job posting, game archive, uncapped feed. **Premium vs Life differ by only call minutes + full-followers.** This is the core commercial problem: **there is almost no reason to pay more.**

---

## 4. Recommended Membership Matrix (future state)

Philosophy: **generous freemium.** Student stays genuinely useful (full community: directory, profiles, posting, groups, events, messaging, games, Vyapaar). Paid tiers buy *more/better/faster/quieter*, never basic access. Numbers marked **[a]** = assumption, tune in one config.

| # | Capability | Student | Associate | Premium | Life | Upgrade reason |
|---|---|---|---|---|---|---|
| 1 | Directory + profiles | Full | Full | Full | Full | Core — never gate |
| 2 | Basic search (name) | Full | Full | Full | Full | Core |
| 3 | Advanced filters (industry/city/batch/house) | 2 filters **[a]** | All filters | All + **saved searches** | All + saved | Recruiter/networker value |
| 4 | Full-text search (headline/company/skills) | ⛔ | ⛔ | ✅ | ✅ | Real discovery power |
| 5 | Post/comment/poll/react | Full | Full | Full | Full | Core (drop dead karma gate or enforce — decide) |
| 6 | Post job opening | ⛔ | ✅ | ✅ | ✅ | Keep (fix bypass) |
| 7 | Feed | Full (uncap; ads instead) **[a]** | Full | Full | Full | Don't cripple free feed; monetize via ads |
| 8 | In-stream ads | 1 per 4 posts **[a]** | 1 per 8 **[a]** | **None** | **None** | Classic "remove ads" |
| 9 | Timewheel sidebar ad | Shown | Shown | Hidden | Hidden | Quieter premium surface |
| 10 | Video calls | **1 free 15-min/mo [a]** + ₹30 passes | 30/60/240/600 | 60/120/500/1500 | 90/180/700/2000 | Taste → habit → upgrade |
| 11 | Group AMA host | ⛔ | ⛔ | ✅ **[a]** | ✅ | Premium capability |
| 12 | Daily-game archive | today+**7d [a]** | Full | Full | Full | Slightly more generous free window |
| 13 | Business listing | ⛔ | 1 listing **[a]** | Unlimited **[a]** | Unlimited | Ladder instead of on/off |
| 14 | "Who viewed your profile" | count only **[a]** | count | **full list + names** | full list | LinkedIn-proven upsell |
| 15 | Highlighted profile (rank + badge) | ⛔ | ⛔ | ✅ (build it) | ✅ | Visibility perk |
| 16 | Full followers list | 10 | ✅ | ✅ | ✅ | Small associate sweetener |
| 17 | Gallery storage | 200 MB **[a]** | 1 GB **[a]** | 5 GB **[a]** | 10 GB **[a]** | Storage ladder (currently ∞) |
| 18 | Event early access (real) | at open | at open | **24h early [a]** | 48h early **[a]** | Scarcity for popular events |
| 19 | Paid-event discount | ⛔ | 5% **[a]** | 10% **[a]** | 10% | Recurring value |
| 20 | Yearly certificate + badge | ⛔ | ⛔ | ✅ (add download) | ✅ | Recognition |
| 21 | Coin stipend (Vyapaar) | welcome grant | +monthly small **[a]** | +monthly larger **[a]** | +monthly | Engagement perk, not pay-to-win |
| 22 | Verification priority | normal queue | normal | **priority [a]** | priority | Convenience |
| 23 | Messaging | connections, rate-limited | connections | connections + higher rate **[a]** | higher rate | Anti-spam floor; premium headroom |
| 24 | Voting (governance) | ✅ if verified 30d | ✅ | ✅ | ✅ | Community right — never paywall |

> Vyapaar coin **stipends must not become pay-to-win** in matches that wager wallets — keep stipends cosmetic/small, or scope them to non-wagered rooms. **Unknown — requires product decision** (and a skill-gaming/legal review, see §8).

---

## 5. Feature-by-Feature Recommendations (problem → change → why)

1. **Ads (row 8–9).** *Problem:* Associate/Premium/Life see identical ads; paying removes nothing (`feed-ads.ts:120`). *Change:* frequency ladder Student 1/4 → Associate 1/8 → Premium/Life ad-free (both in-stream and timewheel). *Why:* "remove ads" is the single most understood reason to pay; today it doesn't exist.
2. **Assoc→Premium delta billing (P0).** *Problem:* charges full ₹999 and resets renewal despite promising ₹500 + kept date. *Change:* honor `payInr=delta` in checkout, preserve `endsAt`. *Why:* current behavior overcharges and is a trust/refund risk.
3. **Job-post bypass (P0).** *Problem:* draft→publish skips `benefits.jobs`. *Change:* move gate into `createPost`/`publishDraft` (root path all publishes route through). *Why:* the one working content gate is trivially bypassable.
4. **Dual tier truth (P0).** *Problem:* suspended user keeps perks; `"free"` gets full feed. *Change:* route every gate through `getCurrent()` resolver; delete raw `membershipStatus` reads; kill `"free"` synonym. *Why:* correctness + revenue integrity (§7, §10).
5. **Who-viewed-your-profile (row 14).** *Problem:* data captured, only emailed. *Change:* in-app page; count for free, names for Premium. *Why:* proven upsell, near-zero build (data exists at `view-digest.ts:10`).
6. **Highlighted profile (row 15).** *Problem:* sold, unbuilt (`membership.ts:15`). *Change:* rank premium members higher in directory + badge on `AlumniProfileCard`. *Why:* stop advertising a non-existent perk; give a real visibility reason.
7. **Search tiering (rows 3–4).** *Problem:* all search identical + name-only. *Change:* add headline/company/skills full-text as Premium; saved searches Premium; keep basic name search free. *Why:* discovery is the core alumni-network value; premium tier for power discovery.
8. **Gallery storage (row 17).** *Problem:* no total-storage quota, only per-file 5 MB (`gallery/actions.ts:68`). *Change:* per-tier total quota. *Why:* unbounded R2/Supabase cost today; natural storage ladder.
9. **Event early access (row 18).** *Problem:* `earlyAccessEvents` dead; only notification is staggered (`invites.ts:14`). *Change:* enforce a real registration-open window by tier. *Why:* turns a dead flag into a genuine scarcity perk.
10. **Call taste for Student (row 10).** *Problem:* Student gets zero included calling → no habit forms. *Change:* 1 free short call/month, then passes/upgrade. *Why:* generous free taste drives call-minute upgrades.
11. **Certificate (row 20).** *Problem:* issued to R2 but no download route + wrong email template (`certificate.ts:67`). *Change:* add `api/membership/certificate/[id]` + dedicated template. *Why:* a paid recognition perk users literally can't retrieve.
12. **DM anti-spam (row 23).** *Problem:* no rate limit on `sendMessage` (`messaging/service.ts:246`). *Change:* per-user send/new-conversation limits (generous floor for all; premium headroom). *Why:* spam protection, not a paywall.
13. **Karma unlocks — decide.** *Problem:* "Poller 100 / Poster 50 / Commenter 25" advertised, enforced nowhere. *Change:* either enforce in `createPost`/`createComment` or remove the copy. **Unknown — requires product decision.** *Why:* spec/implementation mismatch confuses users.

---

## 6. Entitlement & Permission Audit

**Enforcement quality by gate:**
- **Solid, server-authoritative, unbypassable:** auth/route protection (`session.ts:18`), admin RBAC (`gate.ts:83`, DB re-read), payment verify (`verify/route.ts:37`, sig+capture+amount), profile PII redaction (`load-profile.tsx:379`), business-listing gate (`business/new/actions.ts:23`), coin/shell money math (guarded `updateMany`, idempotent), server-side game re-grading (`actions.ts:139`).
- **Enforced but bypassable:** job-post gate (draft path, §5.3); text-background tier (FE-only, cosmetic, `posts.ts:191`).
- **Advisory / not enforced at boundary:** per-call minute cap (client ignores it, `token/route.ts:45`); platform budget kill-switch (only counts finished calls; claimed admin override absent, `service.ts:58`).
- **Race / atomicity:** call quota **not atomic** — usage written only at call end, so N concurrent calls all pass (F2); student-pass **double-spend** via rebinding (F3, `service.ts:167`); webhook dedup **over-suppresses** → under-metering (F6); rate-limit fixed-window allows up to 2× at window edges.
- **Missing server-side checks:** karma capability unlocks (dead, `ledger.ts:424`); 15/18 BENEFITS flags (never read); promo usage/expiry caps (none); rate limits on posts/comments/reactions/DMs/connections (none).

**Direct-API bypass:** calls, business, jobs (except draft), payments are all re-checked server-side — FE cannot forge identity or amount. The exploitable gaps are the **races** and the **draft job path**, not FE tampering.

**Lifecycle behavior:**
- **Upgrade:** works, except Assoc→Premium delta broken (§5.2); Premium→Life cancels sub, one-time.
- **Downgrade/expiry:** content **preserved** (only membership rows/column change, `activation.ts:259`); 30-day grace keeps benefits; committee auto-reverts to Life. **But** string-path readers over-entitle during the expiry-cron lag and for suspended users (§7).
- **Lifetime:** handled correctly (never lapses, excluded from expiry/reminder jobs).

---

## 7. Membership Architecture Problems

**Six overlapping representations of "tier" (root cause of drift):**
1. `BENEFITS[benefitTier]` — the real capability matrix (`membership.ts:25`). Authoritative intent.
2. `PLANS[PlanCode]` — plan metadata (`membership.ts:104`).
3. `Membership` rows → `resolveActivePlan` → `getCurrent().planCode/benefitTier` (`service.ts:49`). Authoritative runtime.
4. `User.membershipStatus` string + `session.user.membershipStatus` JWT claim — denormalized, **written separately** (`activation.ts:72`, `auth.ts:116`).
5. A **second vocabulary** where the value is `"free"` (never a valid `PlanCode`): `admin/users` panel, `admin/analytics TIER_ORDER`, `admin.ts:60`.
6. **Scattered raw string comparisons:** `feed/page.tsx:95,97` (`=== "student"`), `games.ts:110`/`actions.ts:65` (`PAID_TIERS`), `network-client.tsx:39` (`=== "life"`), `profile-view.tsx:542`, `PostComposer.tsx:232`, `feed-ads.ts:163,168`.

**Concrete drift incidents:**
- **Suspended premium user keeps perks.** `resolveActivePlan` returns `inactive/base` on `User.status` suspended (`membership-cycle.ts:60`), but suspension **doesn't rewrite** `membershipStatus`. String-path gates (games archive, directory tier, feed) still treat them premium. (Row-truth gates — business/jobs — correctly deny. So the *same user* is both premium and not, depending on feature.)
- **`"free"` ≠ `"student"`.** Admin can set tier `"free"`; `feed/page.tsx:95` caps only `=== "student"`, so a `"free"` user gets **full paid feed + load-more**, while games' `PAID_TIERS` treats `"free"` as unpaid. Two string readers disagree on the same value.
- **Expiry lag.** Between grace-end and hourly cron, `getCurrent` says `student` but column still says the paid tier — string readers over-entitle until cron flips it.

**Other fragilities:** promo table hardcoded (no coupon model); subscription plan IDs placeholder (auto-renew doesn't happen while reminder/expiry jobs assume it does); admin membership mutations use generic `requireAdmin` instead of a `membership:*` permission; certificate has no retrieval route.

---

## 8. Monetization Opportunities (better, not locked)

Ranked by value ÷ effort:

1. **Remove ads for paying members** — today the biggest missed lever; paid tiers see identical ads. Low effort (config + one gate). **High value.**
2. **"Who viewed your profile" (names = Premium)** — data already captured; needs only a page + gate. **High value, low effort.**
3. **Highlighted profile** (rank + badge) — already sold; build the render. **Medium/Medium.**
4. **Advanced + saved search / full-text discovery = Premium** — the core network value; today fully free and name-only. **High/Medium.**
5. **Gallery storage quota** — also closes an unbounded-cost hole. **Medium/Low.**
6. **Real event early-access + paid-event discount** — turns a dead flag into scarcity. **Medium/Medium.**
7. **Call-minute ladder polish + Student free taste** — infra already tiered; just tune numbers + add a taste. **Medium/Low.**
8. **Certificate + verification priority + coin stipend** — recognition/convenience perks that justify Life. **Low-Medium each.**

**Deliberately DO NOT paywall** (community core; paywalling would damage the network): directory access, viewing profiles, basic posting/commenting, joining groups, RSVPing free events, messaging connections, voting, playing today's games. Keep these generous.

**Flag for product/legal, not monetization:** Vyapaar wagers **real-money-funded coins** (Razorpay → shells → coins → wagered whole-wallet in matches, `match.ts:115`). With minors on the platform (guardian-consent per CLAUDE.md), this needs a **skill-gaming/gambling review** before any coin-stipend or coin-pack push. **Unknown — requires product/legal decision.**

---

## 9. Implementation Roadmap

### P0 — Fix immediately (correctness / revenue / security)
| Fix | Where | DB | API | FE | Risk | Complexity |
|---|---|---|---|---|---|---|
| Assoc→Premium delta billing (charge delta, keep date) | `checkout/route.ts:33`, `service.ts:88`, `activation.ts:36` | no | yes | yes | overcharge/refunds | M |
| Job-post draft bypass (gate in `publishDraft`/`createPost`) | `feed/posts.ts:351`, `compose/actions.ts:33` | no | yes | no | entitlement leak | S |
| Dual-truth drift: suspended keeps perks; `"free"`≠`"student"` | route gates to `getCurrent()`; drop `membershipStatus` string reads (`feed/page.tsx:95`, `games.ts:110`, `directory/service.ts:51`); remove `"free"` | maybe | yes | yes | over-entitlement | M |
| Call quota concurrency race (F2) + pass double-spend (F3) | `calls/service.ts:31,167` | maybe (lock/tx) | yes | no | revenue leak/abuse | M |
| Promo codes: add usage/expiry/per-user caps (or Coupon model) | `membership.ts:239` | yes | yes | no | revenue leak | M |
| Admin membership mutations → `requirePermission("membership:*")` | `api/admin/membership/route.ts:67` | no | yes | no | over-broad admin | S |
| Kill-switch: real admin override + count in-flight minutes (F5) | `calls/service.ts:58`, `calls.ts:53` | maybe | yes | maybe | LiveKit overrun cost | M |
| Webhook under-metering dedup (F6) | `calls/service.ts:191` | no | yes | no | free minutes | S |

### P1 — High-value monetization
| Change | Where | DB | API | FE |
|---|---|---|---|---|
| Ad-frequency ladder + premium ad-free (in-stream + timewheel) | `feed-ads.ts:120,163`, `feed-content.tsx:583` | no | no | yes |
| "Who viewed you" in-app (names = Premium) | new page + `view-digest.ts` data | no | maybe | yes |
| Implement `highlightedProfile` (rank + badge) | `directory/service.ts`, `AlumniProfileCard` | no | no | yes |
| Search: full-text + saved searches (Premium) | `directory/service.ts:54` | maybe (index) | yes | yes |
| Gallery per-tier storage quota | `gallery/actions.ts:68`, service | yes (sum) | yes | yes |
| Real event early-access window | `events/service.ts`, `invites.ts:14` | maybe | yes | yes |
| **Centralize entitlement resolver** (see §10) | new `src/lib/entitlements.ts` | no | — | — |

### P2 — Experience / UX
- Upgrade prompts + "X of Y used" indicators (calls remaining, storage used, ads).
- DM + posts/comments/reactions/connections rate limits (anti-spam floor).
- Certificate download route + correct email template (`certificate.ts:67`).
- Per-kind notification preference model (currently none; static manage link).
- Fix text-background BE validation (cosmetic, `posts.ts:191`).

### P3 — Future
- Real recurring subscriptions (Razorpay Plan IDs; make auto-renew actually happen).
- Coupon model + admin UI (replace hardcoded promo table).
- Build mentorship pairing / seva cells / scholarship wall (currently pure dead config) — or remove the marketing copy.
- Vyapaar skill-gaming/legal review before coin monetization push.
- Enforce-or-remove karma capability unlocks.

---

## 10. Recommended Source of Truth

**Target architecture (do not build yet — this is the design):**

```
Membership rows + User.status
        ↓  resolveActivePlan()            (already exists, keep)
   getCurrent().planCode / benefitTier
        ↓  NEW: resolveEntitlements(planCode, benefitTier)
   Entitlements { can(feature): bool, limit(feature): number|null }
        ↓
   every gate: entitlements.can("business.listing") / entitlements.limit("calls.perDayMin")
```

**Principles:**
1. **One resolver, one call.** A single `src/lib/entitlements.ts` returns a typed `Entitlements` object from `getCurrent()`. Every feature gate imports from it. No feature reads `User.membershipStatus` or a raw `plan === "..."` string ever again.
2. **One numeric-limits table, keyed by `PlanCode`,** in one config — `src/config/calls.ts`'s `TIER_CALL_LIMITS` is the **model to copy** (tune numbers, no code changes). Extend the pattern to ads cadence, storage, search, event-early-access, DM rate, coin stipend.
3. **Kill the denormalized string as an entitlement source.** Keep `membershipStatus` only as a cheap *display* hint (or derive it from the resolver at session build), and **delete the `"free"` value** — the vocabulary is `PlanCode` (`student|associate|premium|life|committee|inactive`), full stop. Make suspension write-through, or (better) let the resolver own suspension so no write-through is needed.
4. **Benefit flags become entitlement keys.** The 18 `BENEFITS` flags either get a real gate through the resolver or get deleted. No flag should exist that nothing reads.
5. **Karma vs tier stay distinct and both go through resolvers** — karma unlocks via `thresholdFor` (enforce or delete), tier via entitlements. Don't conflate them.

**Migration order:** ship the resolver (P1) → repoint the ~8 raw string readers to it (P0/P1) → delete `membershipStatus` string comparisons and the `"free"` synonym → then layer new monetization limits into the single numeric table (P1/P2).

---

### Appendix — Investigation coverage
8 parallel read-only audits: membership subsystem · calls/video · feed/content/ads · directory/profile/search/connections · events/groups/jobs/business/mentorship · messaging/notifications/whatsapp/blood/announcements/bot · games/vyapaar/economy/gallery · admin/RBAC/moderation/verification/karma. Every row cites `file:line`. Nothing was modified.
