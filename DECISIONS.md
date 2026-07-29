# The Parliament — Product & Tech Decisions

**Date:** 2026-06-12. Captured interactively with the product owner. This is the **source of truth** for scope and stack; where it conflicts with older docs (`ALUMNI_REPUTATION_SYSTEM.md`, `SERVICE_ARCHITECTURE.md`), this document wins and those docs are to be reconciled.

---

## Product decisions

### Foundations
- **Reputation:** Adopt the **simple PRD Karma model** (0 Read · 25 Comment · 50 Post · 100 Poll · 250 Create Group · 500 Mentor Badge). The heavy 6-level ARS (levels, penalties, downgrades, admin tuning) is **shelved** for launch. *(Implementation note: keep a Karma transaction ledger underneath so a richer model can be layered later without a rewrite.)*
- **Tenancy:** **Single school now, schema-ready for multi-school** — include `school_id` on core tables from day 1.
- **Membership:** **Alumni + teachers + current students.** Students include minors → age-tiered safeguards required (below).
- **Names:** **Real legal names enforced**, matched against verification.
- **Identity — Division (multi-value, protected default):** "Division" is **not** a class section. It is a **multi-valued** affiliation. Every user is assigned the default division **"Nagpur"** automatically; this default **cannot be removed**. In edit-profile, a user may **add** further divisions (e.g. "Jind"). So a user has 1..N divisions, one of which (Nagpur) is the immutable default. *(House, Passing Year, Profession remain single-value identity fields.)*
- **Karma spec:** **FROZEN** — see `ALUMNI_REPUTATION_SYSTEM.md` (now the "Karma System" doc). All earning rules, anti-farming caps, anti-collusion rules, the +20 publisher daily cap, the −10 negative-only floor, downvote gating (7-day age + 25 earned), and revocable unlocks (keep-to-80%, 0-day grace) are locked for MVP.

### Verification (the moat)
- **Records source:** School will **not** provide an authoritative roster.
- **Primary method (reconciled):** Since there's no roster to match against, primary = **certificate/ID upload + founder review**; **alumni vouch** as a secondary path. *(Original answer picked "school-records match," which is impossible without records — resolved to upload+review.)*
- **Reviewers:** **Founder/you** approve at launch.
- **SLA:** **Same-day** approval. *(Watch ops load; founder-only + same-day is fine at low volume only.)*
- **Badges:** Verified Alumni, Teacher, Mentor, Trustee, Admin.

### Feed & content
- **Posting:** **All verified users can post** immediately (verification is the trust gate). Karma still gates higher-risk actions (polls 100, groups 250, mentor 500).
- **Commenting:** **Open to all verified** users (not gated at 25).
- **Two content dimensions:**
  - **Post format:** Image+Text, Text, Poll, Question, Link, Quote → later Video and chat-style (Tumblr-like). Extensible.
  - **Post category:** Career Update, Job Opening, Achievement, Startup, Seeking Help, Mentorship, School Memory, Event → **admin-editable, expandable beyond 8.**
- **Feed:** **Algorithmic ranking by default, with Reddit-style filters** (by category / batch / house / type).

### Directory, jobs, mentorship
- **Contact privacy:** Contact info **never shown by default.** A **mutual-consent exchange**: requester clicks "get contact info" (agreeing to share their own) → profile owner approves per-request, or sets **"always share"** in settings.
- **Jobs:** Apply via **external ATS link** per posting (referrals/openings can link out). *(Revisit in-app apply later to keep value in-community.)*
- **Resumes:** **External link only** for MVP (no file storage of CVs yet).
- **Mentorship:** **Request → mentor accepts → coordinate offline.** No in-app scheduler at MVP.

### Safety, growth, go-live
- **DMs:** **Connection-gated DMs** are in scope, with minor restrictions (below).
- **Alumni Map:** **Opt-in, city-level only**; minors excluded.
- **Cold start:** **School email blast** as the primary channel.
- **Notifications:** **Email only** at launch (verification approved, connection/contact request, new job in batch, mentorship request).
- **Minor safety (age-tiered):**
  - **Under-13 (Classes 6–7):** no direct messaging; interact only via **moderated** groups, posts, comments.
  - **Classes 8–12:** communicate within the verified school network and **approved alumni mentorship channels** only.
  - All conversations subject to **automated safety monitoring**; reporting + moderation; **restrictions on sharing personal contact info or external links**; relationship-based over stranger-to-stranger messaging.
  - *(Requires capturing DOB/class at signup + an age-gating engine; parental/guardian consent for minors.)*
- **Moderation:** **Founder + a report queue** (hide / warn / suspend / ban). Report button on posts, comments, profiles.
- **Go-live bar:** **Feature-complete MVP** (Login/Verify, Directory, Feed+Karma, Jobs) before opening to users.
- **Monetization:** **Revenue from day 1** — donations / sponsorships / scholarships via a payment gateway (adds payments, tax, refund scope).

---

## Feature checklist integration (JNV Nagpur)

The platform is the **JNV Nagpur** (Jawahar Navodaya Vidyalaya) alumni network — which is why "Division" is regional (Nagpur default, Jind etc.) and houses follow the Navodaya system.

- **Houses (6, colour-tagged):** Aravali–Blue, Nilgiri–Green, Shiwali–Red, **\<Yellow house name TBD\>**–Yellow, Indira–Orange, Laxmi–Pink. Stored with `color_name`/`color_hex`; shown as a profile tag.
- **Karma = single pool** (K1 **LOCKED**): one balance users earn AND spend. Read three ways — **Balance** (spendable), **Earned-30d** (drives unlocks, *not* reduced by spending), **Lifetime Earned** (leaderboards/milestones). Spending never revokes unlocks.
- **Batch = canonical 7-year cohort** (B1) chosen at signup, via the `batches` reference table (start_year, end_year=start+7, e.g. "2006-2013"). `profiles.batch_id` + batch groups key on it. Replaces the earlier loose batch_year/passing_year columns.
- **Activity karma added** (with anti-farm caps): daily login, profile fields/complete, add business, event attend/host/feedback, referral, donation. Values admin-configurable (`ALUMNI_REPUTATION_SYSTEM.md` §13).
- **Redemption / reward store** (§14) + **house leaderboards** (§15, ranked by Lifetime Earned). **Admin manual karma** allowed via `admin_adjustment`; moderation still never auto-changes karma (Q3).
- **Membership orthogonal to karma:** paid tiers (student/associate/premium/life) unlock premium perks; cannot bypass karma gates. Razorpay/UPI autopay.
- **Scope — phased (revised):**
  - **Phase 1 (launch):** Login/Verify · Profiles (houses/divisions) · Directory · **Connections** (contact-exchange + blocking + suggestions) · **Feed** (posts/comments/reactions/reshare/tagging/trending/spotlight/pinning) + **Karma** (activity karma + redemption + house leaderboards) · **Groups** (batch/house/dept/interest, auto-membership) · **Events** · **Business Directory** · **Membership/Payments/Donations** · **Rewards/Badges** · Alumni Map.
  - **Phase 2:** **Jobs/Referrals · Mentorship · Messaging** (connection-gated DMs, Socket.IO, minor-DM rules) · **Group chat**. Social graph + contact-exchange stay Phase 1.
- **Connections = contact exchange:** a connection request *is* the contact-exchange request; on accept, contacts mutually reveal per each side's settings (`contact_always_share`, `connection_auto_accept`). Blocking via `user_blocks`. Suggestions rule-based (house/batch/city/industry).
- **Feed details:** internal reshare (`post_shares`), tagging alumni/house/batch (`post_mentions`), top-5 trending (engagement), Alumni Spotlight (admin-curated or auto), pinned announcements, edit tracking, house badge. "Job opening/business promo/achievement/announcement" are **post categories** in the Phase-1 feed (dedicated Jobs module still Phase 2).
- **Groups:** types batch (7-yr cohort, keyed by passing_year) / house / department / interest. Permanent default groups (batch/house/dept) auto-joined and unleavable; interest groups join/leave; private groups need approval. Per-group moderators; group feed/polls/events; group chat = Phase 2.
- **Gamification:** games award karma; admin-configurable rules/retry/points; **game karma hard-capped per game/day** (most farmable source). **Phase-1 games (G1, all single-player):** Wordle, Bulls & Cows, Guess the Phrase, Tic Tac Toe vs NNAWCA AI. Real-time multiplayer duels + seasonal tournaments = Phase 2 (needs Socket.IO).
- **Karma Store:** the rewards catalogue is a marketplace of **digital products** (eBook, course access, event VIP, certificate, wallpaper, partner discount code). Filter by cost/category/latest/popularity; delivery via download/email/code; redemption deducts Balance and logs history. Phase 1.
- **General System Requirements** confirmed against existing decisions: RBAC (`user_roles`), JWT/OAuth2 (Auth.js), dedicated karma ledger (`karma_transactions`), real-time via Socket.IO/polling (Phase 2), analytics action log (`activity_events`), responsive (single Next.js app). No new infra.
- **Yellow house = Udaigiri.** Money in **whole rupees** (×100 at Razorpay). **No 80G** — org is a registered **Society without 80G cert**, donations issue standard receipts only.
- **Profile additions:** department, social links, WhatsApp opt-in, "visible on Google" public toggle (forced off for minors).
- New schema lives in **`MODULES_SCHEMA.md`** (Events, Business, Membership/Payments/Donations, Rewards/Badges); identity/karma changes in `CORE_PLATFORM_SCHEMA.md`.

## Tech decisions

**Scale envelope:** ≤ 5,000 registered users, < 1,000 DAU. Cost-sensitive, self-hosted.

| Area | Decision | Notes |
|------|----------|-------|
| Architecture | **Modular monolith** | Module boundaries as folders, not services. |
| App shape | **Single Next.js app (App Router) + React** | API-first (route handlers/tRPC) so a future mobile app reuses it. TypeScript end-to-end. |
| Database | **Self-hosted PostgreSQL** on the VPS | One instance; add backups + (optional) read replica later. |
| ORM | **Prisma** | Matches the TS stack; Prisma plugin available. |
| Auth | **Auth.js (NextAuth) + Postgres adapter** + custom alumni-verification | Reconciled from "managed auth" → self-hosted library, since hosting is a VPS (no paid hosted provider). Gives security primitives without hand-rolling crypto. |
| Async / events | **In-process events + pg-boss** (Postgres-backed jobs) | No RabbitMQ/Kafka. Karma processing, notifications, safety scans run as jobs. |
| Search | **Postgres full-text + `pg_trgm`** | Handles the Alumni Directory facets at 5k rows; no Elasticsearch. |
| File storage | **Cloudflare R2** (S3-compatible, free tier, no egress) | Private buckets + signed URLs for verification docs/avatars/post images. MinIO on the VPS is the self-hosted fallback. |
| Email | **Hostinger SMTP** (own) via Nodemailer | ⚠️ Low daily limits + shared-IP deliverability risk; plan a dedicated sender (SES/Resend) if emails hit spam. |
| Mobile OTP | **Deferred** — **email-only verification at launch** | Avoids India DLT/SMS cost. Add SMS/WhatsApp OTP later. |
| Payments | **Razorpay** | India-first (UPI/cards/netbanking), donation flows, payouts to school/scholarship accounts. |
| Hosting | **Hostinger VPS** (Mumbai/Singapore) | Self-managed: Nginx/Caddy + TLS, process mgmt, **PostgreSQL backups** (go-live blocker). **Zero-budget alternative: Oracle Cloud Always-Free — see note below.** |
| Deployment | **Docker Compose** (app + Postgres + Nginx, Redis optional) | Reproducible; GitHub Actions → SSH deploy; easy host migration. |
| Caching | **No Redis initially** | In-memory + Postgres. Add self-hosted Redis only if load/socket-scaling demands it. |
| Realtime (DMs) | **Socket.IO** in the app process | Trivial for <1k DAU on one VPS; Redis pub/sub only if multi-instance. |
| Alumni Map | **Leaflet + OpenStreetMap** | Free; geocode city→lat/long once on save and cache. |
| AI Connections | **Rule-based** (same batch / city / industry / house) | No ML at launch; simple SQL scoring. |

### Hosting note — zero-budget alternative (Oracle Cloud Always-Free)

Hostinger VPS is the only **paid** piece of the stack (~₹500–900/mo for a 2–4 vCPU / 8 GB plan).
At our scale (≤5k users, <1k DAU) a single box is plenty, and the Docker Compose setup is
host-portable — so the whole stack can move with no code changes.

- **Default (recommended for a live org):** stay on **Hostinger VPS**. Cheap, managed-enough,
  India-region (Mumbai/Singapore) low latency, and the deploy pipeline + docs already assume it.
  Reliability and ease matter for a community people depend on.
- **Zero-cost option:** **Oracle Cloud "Always Free"** — a *permanent* free tier offering up to
  **4 ARM vCPUs / 24 GB RAM (Ampere A1)**, ~200 GB storage, and a free egress allowance. That is
  more RAM than a typical paid Hostinger plan and can host our exact Docker Compose stack at **₹0/mo**.
  Nearest regions: **Mumbai / Hyderabad**.
  - Trade-offs to accept before switching: less hand-holding (pure cloud console + SSH, no cPanel),
    free ARM capacity can be hard to provision in popular regions, and Oracle has occasionally
    reclaimed idle free instances — slightly riskier for a live org than for a side project.
- **Either host:** the **`pg_dump` → Cloudflare R2** backup cron (go-live blocker) and offloading
  the critical-path verification email to **Resend** (free tier) de-risk the box without adding cost.

---

## Open conflicts / risks to resolve

1. **Verification path** — resolved to upload+review (no roster). Confirm the founder can sustain **same-day** review at expected signup volume; if not, relax SLA or add reviewers.
2. **Revenue day 1 + feature-complete MVP** together **expand launch scope** (payments compliance: Razorpay KYC, tax/80G receipts for donations, refunds). Consider whether payments can be a fast-follow to hit launch sooner.
3. **Minors on platform** drives substantial scope: DOB/class capture, age-gating engine, parental consent, automated safety monitoring of messages, link/contact-sharing filters. This is the single largest hidden cost in the MVP — needs its own mini-spec.
4. **Hostinger SMTP deliverability** — validate before relying on it for verification emails (the critical-path email).

---

## Next step
- ✅ **#1 done** — `ALUMNI_REPUTATION_SYSTEM.md` rewritten as the frozen Karma System.
- ✅ **#2 done** — `CORE_PLATFORM_SCHEMA.md` extended: `schools`/`houses`/`divisions` + `school_id`; identity (House single, Division multi w/ protected default, Passing Year, Profession, City, Company); `member_type` + DOB/`current_class` + age-tiers + `guardian_consents`; karma ledger (`user_karma`, `karma_transactions`, daily/pair counters); contact-exchange (`contact_reveal_requests` + `contact_always_share`); post `format` + `post_categories`.
- ⏭️ **#3 — Write the MVP PRD** (Login/Verify · Directory · Feed+Karma · Jobs) as the build spec, then scaffold.

### #2 modeling assumptions to confirm
- `member_type ∈ {alumni, student, teacher}`; Trustee/Admin are roles/badges, not member types.
- `batch_year` (cohort) and `passing_year` (graduation) kept as **distinct** fields (PRD lists both).
- House = single-value, fixed per-school list. Division default = "Nagpur" (one `is_default` per school), per-user default row is `is_protected`.
- Age-tier derived from class/DOB: Classes 6–7 = `minor_restricted` (no DMs), 8–12 = `minor_supervised`, else `adult`. Guardian consent required before a minor goes `active`.
