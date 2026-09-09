# NNAWCA Badge & Achievement System — Research Report

_Date: 2026-09-09 · Status: research only, no production code changed · Author: Claude (Opus)_

> Scope note: this is a **research + proposal** document. Nothing in `src/` or the schema was
> modified. Section headings follow the brief (A–L) plus reference-design analysis, a reuse
> classification, and a final Recommended Direction.

---

## TL;DR

The platform is **much further along than the brief assumes.** `Badge` + `UserBadge` Prisma models
already exist, with an `autoCriteria Json` slot and `source` defaulting to `"auto"`. `loadProfile`
already fetches a user's badges, and an `AchievementsPanel` already sits in the profile right rail —
**but the badge grid inside it is stubbed out and never rendered, and nothing in the codebase ever
reads `autoCriteria`.** Badges today are 100% admin-assigned by hand.

So this is **not** a greenfield build. It is: (1) write the auto-award **engine** (the one genuinely
missing piece), (2) seed a **badge catalogue** into the existing `Badge` table, (3) **render** the
grid that's already stubbed, (4) add a **My Achievements** page (mirroring the existing
`/[username]/karma` page), and (5) optionally a **leaderboard**. The three reference HTML files are a
Bootstrap theme — their **information architecture and badge catalogue are gold; none of their
CSS/JS transfers** to the Next.js + Tailwind + React stack.

The backend has the exact primitives an award engine wants: a single `awardKarma` chokepoint, a real
**transactional outbox** with dedupe + at-least-once idempotent handlers, `pg_cron` draining every
15s, a union-typed `sendNotification`, and battle-tested anti-abuse patterns (`oncePerEntity`,
`KarmaPairDay`, daily caps, unique constraints).

---

## A. Existing Implementation Audit

### A.1 Data models that already exist (`prisma/schema.prisma`)

| Model | Line | What it is | Relevance |
|---|---|---|---|
| `Badge` | 1704 | `key`, `label`, `description?`, `iconUrl?`, **`autoCriteria Json?`**, `@@unique([schoolId, key])` | The badge catalogue table. Already multi-school scoped. `autoCriteria` is a **never-read** placeholder for rules. |
| `UserBadge` | 1720 | PK `(userId, badgeId)`, **`source @default("auto")`**, `awardedAt` | The unlock record. `source` distinguishes auto vs manual. |
| `RewardItem` | 1658 | karma **store** catalogue (`karmaCost`, `deliveryType`, `codePool`) | Spend-karma shop. **Not** achievements — do not conflate. |
| `KarmaRedemption` | 1684 | a user redeeming a `RewardItem` | store purchases. |
| `KarmaThreshold` | 1106 | DB-backed karma tiers per school | closest existing "level" concept. |
| `GameChampion` | 1994 | frozen game-period winners | existing "trophy case" data. |

**No** `Achievement`, `Streak`, or `rewards` module (`src/modules/rewards/` does not exist).

### A.2 The one thing that's actually missing

`autoCriteria` is declared but **grepped-for-and-never-read** anywhere in `src/`. `UserBadge` is only
ever written by the manual admin path:
- `POST /api/admin/users/[id]/badges` → `setBadge()` in `src/modules/admin/users.ts:500`, which writes
  `source: "manual"` and audit-logs `admin.user.badge_add/remove`.

**There is no auto-award engine.** That is the core of this build.

### A.3 UI surfaces that already exist

- **Profile right rail** (`src/app/(main)/[username]/profile-view.tsx:604`, `:647-657`) already mounts
  `<AchievementsPanel>` and `loadProfile` already selects `userBadges` (`load-profile.tsx:110-114`).
- **`AchievementsPanel.tsx`** already receives `badges`/`totalBadges`, computes
  `shown = badges.slice(0, 6)` and `overflow` (`:38-39`) — **but never renders a badge grid.** It only
  renders Collectables (Eggs/Karma/Shells) + `<TrophyCase>`. Rendering the grid is a small edit.
- **`TrophyCase.tsx`** — self-fetching, top-2 + "View all", tinted icon tiles. The closest existing
  "badge row" pattern.
- **Member karma page** `src/app/(main)/[username]/karma/page.tsx` — the exact route pattern to mirror
  for `/[username]/achievements`.
- **Admin**: `/admin/karma` and `/admin/rewards` are **both fully built** (not stubs). All primitives
  for a `/admin/badges` CRUD exist in `admin-ui.tsx` (`PageHeader`, `StatCard`, `Table*`, `Modal`,
  `useRowAction`, `ToastProvider`).

---

## B. Reusable Code Inventory

| Existing file | Component / code | Reusable? | What to reuse | Required changes |
|---|---|---|---|---|
| `prisma/schema.prisma:1704` | `Badge` model + `autoCriteria` | **REUSE** | Store catalogue here; use `autoCriteria` JSON as the rule DSL | Add columns: `category`, `rarity`, `isHidden`, `displayPriority`, `repeatable`, `activeFrom/To`, `progressTarget` (or fold into `autoCriteria`) |
| `prisma/schema.prisma:1720` | `UserBadge` | **REUSE** | Unlock record; `source` already distinguishes auto/manual | Add `progress Int?`, keep PK `(userId,badgeId)` as the idempotency guard |
| `src/modules/karma/ledger.ts:161` | `awardKarma`, `oncePerEntity` | **ADAPT** | Call-site pattern + `oncePerEntity` idempotency template | Don't extend karma; **mirror** the once-per-entity guard for badge grants |
| `src/modules/outbox/*` | `enqueueOutbox`, `drainOutbox`, handler registry | **REUSE** | Add `evaluate_badges` type + idempotent handler; enqueue inside producer txn with `dedupeKey` | New handler in `handlers.ts`; new enqueue calls at mutation sites |
| `src/modules/notifications/service.ts:88` | `sendNotification` union helper | **ADAPT** | Add `achievement_unlocked` to `NotificationKind`, reuse row (badge icon as `imageUrl`) | Add kind + link in `links.ts`; no migration (`type` is free VarChar) |
| `src/components/shared/AchievementsPanel.tsx` | badge grid stub (`shown`/`overflow`) | **REBUILD** | The panel + slice logic; finish the render | Render a `<BadgeGrid>` of `shown` + "+N" overflow linking to `/[username]/achievements` |
| `src/components/shared/TrophyCase.tsx` | tinted icon-tile row + tone classes | **ADAPT** | Icon-tile visual, self-fetch action pattern | Generalize into `BadgeCard`/`BadgeGrid` |
| `src/components/shared/AlumniProfileCard.tsx` | `footer` + `actions` props | **REUSE** | Leaderboard/podium member cards — put rank in `footer` | None; props already optional/backward-compatible |
| `src/components/shared/profile-kit.tsx` | `Card`, `SectionTitle`, `R_CARD`/`R_EL` | **REUSE** | Card shell + radius tokens for new pages | None |
| `src/config/alfazy-trophies.ts:38` + `admin-ui.tsx:66` | `TROPHY_TONE_CLASS`, `statusBadgeClass` | **ADAPT** | Ready-made `bg-*-50 text-*-700 ring-*-200` maps → **rarity color vocabulary** | Define a 5-tier `RARITY_TONE` map from these |
| `src/config/membership-colors.ts` | `MEMBERSHIP_TIERS`, house CSS vars | **REUSE** | Source colors from here, don't add a 4th copy | None |
| `globals.css` confetti keyframes (`:214`,`:255`) | `alfazy-confetti-fall` etc. | **REUSE** | Unlock celebration animation | None |
| `src/app/(main)/[username]/karma/page.tsx` | owner-gated per-profile sub-route | **REUSE (pattern)** | Copy structure for `/[username]/achievements` | New page, same `isOwner` gate |
| `src/app/api/admin/users/[id]/badges/route.ts` + `setBadge` | manual award/revoke | **REUSE** | Manual grants (committee, trophies, bug-hunter) already work | None |
| `src/app/admin/admin-ui.tsx` | full admin primitive kit | **REUSE** | Build `/admin/badges` catalogue CRUD | New page only |

---

## C. Behaviour / Event Inventory (what the platform can measure)

Legend: **✅ counter** (denormalized, cheap) · **✅ count** (must aggregate rows) · **⏱ timestamped**
(history exists → streaks/tenure derivable) · **🔒 manual/admin** · **❌ not measurable today**.

| Behaviour | Source | Measurable? | Notes |
|---|---|---|---|
| Account created | `User.createdAt` | ✅ ⏱ | tenure |
| Profile completed | `User.profileCompletion` (0–100), `Profile.isComplete` | ✅ | denormalized score |
| Email/phone verified | `User.emailVerifiedAt`, `mobileVerifiedAt`, `isVerified` | ✅ ⏱ | |
| Posts created | `Post` rows by `authorId` | ✅ count ⏱ | indexed; decide repost inclusion (`format="repost"`) |
| Comments written | `Comment` by `authorId` | ✅ count ⏱ | **no author index** → scans |
| Comments received | `Post.commentCount` | ✅ counter | per-post; per-user needs join |
| Upvotes received | `Post.upvoteCount` | ✅ counter | |
| Comment upvotes received | `Comment.likeCount` | ✅ counter | drives the reference "Commentator" ladder |
| Reactions given | `Reaction` by `userId` | ✅ count ⏱ | **not** userId-indexed; `KarmaDailyCounter.likesMade` has per-day rollup |
| Shares given / received | `PostShare` / `Post.shareCount` | ✅ | |
| Follows (both directions) | `Follow` | ✅ count ⏱ | followers indexed |
| Profile views received | `ProfileView.count` (sum) | ✅ counter | **no per-view history** (only `lastViewedAt`) → "Legend: 1095 views/365d" is only measurable as a running total, not a windowed one |
| Saved posts | `SavedPost` | ✅ count ⏱ | |
| Awards given/received | `PostAward` | ✅ count ⏱ | `userId` = giver |
| Polls created / voted | `Poll` (via post author) / `PollVote` | ✅ count ⏱ | poll vote awards **no karma** |
| Payments / membership | `Membership`, `MembershipEvent`, `MembershipOrder` (paise) | ✅ ⏱ | avoid `Payment` (no writer) |
| Donations / sponsorship | `Donation`, `Contribution` (tiered) | ✅ ⏱ | drives "Giving Back" ladder + ₹-threshold donor badges |
| Login / active days | `KarmaTransaction` (`daily_login`) + `ActivityEvent` | ✅ derive ⏱ | **no stored streak**; compute distinct-day. `User.lastLoginAt` is single value |
| Groups joined/created/led | `GroupMember` (`role`), `Group.createdBy` | ✅ count ⏱ | |
| Events hosted/RSVP/attended | `Event.hostId`, `EventRsvp`, `EventAttendance.checkedInAt` | ✅ count ⏱ | attended = `checkedInAt IS NOT NULL` |
| Messages sent | `Message` by `senderId` | ✅ count ⏱ | sender+time indexed |
| Karma earned (lifetime/30d) | `UserKarma` + `KarmaTransaction` | ✅ ⏱ | **exclude reversal rows** (`reasonCode="reversal"`) |
| Eggs thrown / received | `EggThrow`, `User.eggBalance` | ✅ ⏱ | powers "The Welcoming" / "Chickened" |
| Referrals | `User.invitedById` | ✅ count | powers "Influencer" |
| Games (plays/wins/champion) | `User.vyapaarGamesPlayed/Wins`, `GameScore.puzzleDate`, `GameChampion` | ✅ ⏱ | daily-play streaks derivable |
| Reports filed | `ContentReport` by reporter | ✅ count ⏱ | powers "NNAWCA Police" |
| Business owned/reviewed | `Business`, `BusinessReview` | ✅ | |
| Gallery uploads | `GalleryImage.uploadedById` | ✅ count | |
| Blood donor | `Profile.bloodDonor`, `BloodRequest` | ✅ | |
| Social account linked | — | ❌ | no social-link feature found → drop "Social Linked" |
| "Meme"/"Best Of"/"Hall of Fame" | — | ❌ / 🔒 | no meme tag or hall-of-fame feature → manual or defer |
| Bug reports, committee roles, competition trophies | — | 🔒 | admin-assigned (`setBadge`, `GameChampion`, trophies) |
| Post time-of-day (Early Riser/Night Owl) | `Post.createdAt` | ⚠️ | **no per-user timezone stored** → only measurable in one fixed TZ (IST); flag as approximate |

---

## D. Badge System Proposal

### D.1 Categories (adopting + tightening the reference set)

| Category | Icon | Theme | Award mode |
|---|---|---|---|
| 🏁 Getting Started | flag | onboarding one-shots | auto |
| ✍️ Contributor | pen | posting volume (windowed) | auto |
| 💬 Commentator | chat | comment karma received | auto |
| ❤️ Engagement | heart | upvotes/awards received | auto |
| 🤝 Supporter | hands | giving back — membership/donations | auto |
| 🌱 Growth | sprout | connections, referrals, reach | auto |
| 🔥 Consistency | flame | login/activity streaks | auto (cron) |
| 🏆 Milestones | trophy | tenure + lifetime karma | auto |
| ⭐ Special | star | bespoke measurable (eggs, saves, reports) | auto |
| 🎯 Hidden | ??? | surprise/discovery | auto, `isHidden` |
| 🎖 Recognition | medal | committee / trophies / bug-hunter | **manual** (`source="manual"`) |

### D.2 Rarity ladder (map the reference's 5 tiers)

`common` · `uncommon` · `rare` · `epic` (= "Very Rare") · `legendary` (= "God Level"). Rename for a
cleaner internal vocabulary; keep the reference's visual intent. Rarity drives color + score weight.

---

## E. Badge Definition Structure

Store in the **existing** `Badge` row. Put stable identity in real columns, put the rule in
`autoCriteria` JSON so new badges need **no migration**:

```jsonc
// Badge.autoCriteria — the rule DSL the engine reads
{
  "metric": "comment_upvotes_received", // enum of measurable metrics (see §C)
  "op": ">=",
  "target": 10,
  "window": "all_time",     // all_time | rolling_365d | rolling_30d | calendar_year
  "unique": null,           // e.g. "counterparty" for unique-user counting (anti-gaming)
  "minAccountAgeDays": 7,   // gate (anti-gaming)
  "triggers": ["comment_reaction"] // which mutation events should re-evaluate this badge
}
```

Proposed added columns (small migration): `category VarChar`, `rarity VarChar`, `displayPriority Int`,
`isHidden Boolean`, `repeatable Boolean` (default false), `activeFrom/activeTo DateTime?` (for
seasonal), `progressTarget Int?`. `UserBadge` gains `progress Int?` for in-progress display.

Series (levelled badges: 10→500 posts) = **separate `Badge` rows sharing a `series` key** + an
`order`. Keeps evaluation flat; UI groups by `series`.

---

## F. Initial Badge Catalogue (~40, all measurable unless marked 🎖 manual)

Rarity: C=common, U=uncommon, R=rare, E=epic, L=legendary. Progress shown as `have/target`.

**🏁 Getting Started** (one-shots)
| Badge | Metric | Req | Rarity |
|---|---|---|---|
| New Sailor | account created | 1 | C |
| Identity Confirmed | email+phone verified | both | C |
| All Set | `profileCompletion` = 100 | 100 | C |
| First Word | comments written | 1 | C |
| First Upvote Given | reactions given | 1 | C |
| First Follow | following count | 1 | C |
| Icebreaker | first post published | 1 | C |

**✍️ Contributor** (rolling 365d posts — series)
| Starter 10 · Rising 25 · Active 50 · Dedicated 100 · Power 250 · Elite 500 | posts (365d, exclude reposts) | C→L |

**💬 Commentator** (comment upvotes received — series, mirrors reference names optional)
| 1 · 10 · 25 · 50 · 100 comment-upvotes | `Comment.likeCount` summed | C→L |

**❤️ Engagement**
| Badge | Metric | Req | Rarity |
|---|---|---|---|
| Well Received | post upvotes received (lifetime) | 100 | U |
| Crowd Favourite | single post upvotes | 50 | R |
| Decorated | awards received | 10 | R |

**🤝 Supporter**
| Paid Member | active membership in 365d | 1 | C |
| Benefactor / Patron / Philanthropist / Legendary Donor | donations sum 365d ≥ ₹100/₹1k/₹5k/₹10k | U→L |
| Open Wallet | ≥10 separate contributions | 10 | R |

**🌱 Growth**
| Connector | followers | 50 | U |
| Networker | followers | 250 | R |
| The Explorer | connections outside own batch/house | 20 | R |
| Influencer | verified referrals (`invitedById`) | 20 | E |
| The Legend | total profile views received | 1095 | L _(running total, not windowed — see §C)_ |

**🔥 Consistency** (cron-computed streaks)
| 5-Day · 10-Day · 5-Week · 10-Week · 5-Month · 10-Month active streak | distinct active days | C→L |

**🏆 Milestones**
| One Year In / Veteran / Founding Era | tenure ≥ 1/3/5 yrs (`createdAt`) | U→E |
| Karma: Poster/Poller/Group Leader/Mentor | lifetime karma ≥ 50/100/250/500 | C→E _(reuse `thresholdFor`)_ |

**⭐ Special**
| Librarian | saved posts | 20 | C |
| Voter | poll votes in 365d | 1 | C |
| The Welcoming | eggs thrown at distinct new users | 10 | C |
| Chickened | eggs received | 20 | U |
| NNAWCA Police | reports filed (that were actioned) | 10 | U |
| Gardener | started a thread reaching 50+ comments | 1 | R |
| Poll Master | polls created | 10 | U |
| Event Regular | events attended (`checkedInAt`) | 5 | U |
| Host | events hosted | 1 | U |

**🎯 Hidden** (`isHidden`, show as "???")
| Wallflower | first post ≥180d after signup | R |
| Secret Admirer | 100 upvotes given, 0 comments | R |
| Night Owl / Early Riser | posted in a night/morning IST window | C _(TZ-approx)_ |

**🎖 Recognition — manual `source="manual"`** (already works via `setBadge`)
| Executive/Sports/Cultural/Developer Committee · Bug Hunter · Hall of Famer · competition Trophies |

**Dropped from the reference (not measurable):** Social Linked (no social-link feature); Meme Lord
(no meme tag); Visionary Sponsor as auto (→ manual). Early/Night flagged TZ-approximate.

---

## G. Badge Scoring Model

Rarity-weighted **Achievement Score** (not raw badge count — count rewards spam-tier badges equally):

```
common 1 · uncommon 3 · rare 7 · epic 15 · legendary 30
```

Store a denormalized `achievementScore` (and `badgeCount`) per user — updated in the same idempotent
grant path — so leaderboards and the profile read one integer, not a live aggregate. Recompute-safe:
score = Σ rarity-weight over `UserBadge`.

Leaderboards: **Lifetime score** (default) · **This month** (badges unlocked in-month) · **By
category** · **Rarest-first** (tiebreak by count of your highest-rarity badges). Always show the
viewer's own rank (windowed `RANK() OVER` query). Ties broken by earliest unlock of the top badge.

The reference's per-milestone podium ("Fastest 500 Connections") is a **speed leaderboard** — order by
`awardedAt` for a single badge. Nice-to-have, not MVP.

---

## H. Anti-Gaming Strategy

Reuse the abuse patterns the karma system already ships — don't reinvent:

| Vector | Defence (existing primitive) |
|---|---|
| Spam posting for volume badges | count only `status=visible`, `deletedAt IS NULL`; delete reverses (existing `POST_REMOVAL_ACTIONS`) |
| Fake engagement / vote rings | count **unique counterparties** (`autoCriteria.unique="counterparty"`); `KarmaPairDay` already caps pair interactions; `Reaction @@unique` blocks double-votes |
| Self-interaction | exclude `userId == counterpartyId` |
| Delete/recreate to re-trigger | `UserBadge` PK `(userId,badgeId)` = permanent; grants are **once-per-badge**, never re-fire |
| New-account farming | `minAccountAgeDays` gate in criteria |
| Comment spam for "First Comment"→ladders | rely on **received upvotes**, not raw comment count, for the Commentator ladder |
| Streak gaming (login-only) | define "active day" as a **meaningful action** day (post/comment/react), not bare login |
| Referral farming | count only **verified** referrals (`REFERRAL_VERIFIED`), not signups |
| Report farming ("Police") | count only reports that were **actioned** (`ContentReportStatus.actioned`) |
| Award/egg self-dealing | unique-user + exclude self; eggs already have `EggThrow` ledger |

Rule of thumb encoded per badge: **raw count** only for harmless one-shots; **unique users / windows /
quality thresholds / account-age** for anything with a leaderboard or social value.

---

## I. Badge Unlock Engine — recommend **Hybrid (Option C)**

- **Option A (compute on profile view):** simplest, always accurate, but no real-time unlock, no
  notification moment, recomputes on every view, can't drive a leaderboard cheaply. ❌ alone.
- **Option B (event-driven only):** real-time + notifications, cheap reads, but **can't do time-based
  badges** (streaks/tenure have no triggering event) and misses behaviours that don't emit events
  (poll vote, follow, save award no karma). ❌ alone.
- **Option C — Hybrid ✅:**
  1. **Event path:** at each relevant mutation site (or inside `awardKarma`), `enqueueOutbox({ type:
     "evaluate_badges", payload:{ userId, triggers:[...] }, dedupeKey: "badges:"+userId })` **passing
     the txn client** so the intent commits atomically with the write. The existing `dedupeKey`
     coalescing means a burst of a user's actions collapses into one evaluation. The
     `drainOutbox`/`pg_cron`-every-15s path gives near-real-time unlocks.
  2. **Handler:** `evaluate_badges` loads the user's not-yet-earned badges whose `triggers` intersect,
     evaluates each `autoCriteria` (with a per-metric query map), and for any that pass does an
     **insert-or-ignore `UserBadge`** (unique-PK = idempotent, at-least-once safe), bumps
     `achievementScore`, and fires `sendNotification({ kind:"achievement_unlocked", ... })`. Also
     writes `UserBadge.progress` for near-miss badges so the profile can show progress bars.
  3. **Cron path:** a daily `/api/cron/badges` (Vercel schedule + `isAuthorizedCron`) evaluates
     **time-based** badges (streaks, tenure, rolling-365d donation/post windows, "Legend" view total)
     for active users. Mirror `outbox-drain-cron.sql` if sub-daily is ever needed.

This reuses the platform's proven idempotency + async fabric wholesale. New badges = a row +
`autoCriteria`; the engine needs code only when a **new metric** is introduced.

---

## J. Technical Architecture

**Database** (minimal): extend `Badge` (+category/rarity/flags/window fields or fold into
`autoCriteria`), extend `UserBadge` (+`progress`), add denormalized `User.achievementScore` +
`badgeCount` (or a small `UserAchievementStats` row). **No new event table** — reuse `KarmaTransaction`
/ `ActivityEvent` / `OutboxEvent`.

**Backend:**
- `src/modules/badges/` — `catalog.ts` (metric→query map + rarity weights), `evaluate.ts` (pure
  criteria matcher, unit-tested DB-free), `award.ts` (insert-or-ignore + score bump + notify),
  `metrics.ts` (the ~30 measurable queries from §C).
- Outbox handler `evaluate_badges` in `src/modules/outbox/handlers.ts`.
- Cron route `src/app/api/cron/badges/route.ts`.
- Enqueue calls at mutation sites in `feed/posts.ts`, `connections/service.ts`, etc.
- Seed script: insert catalogue rows into `Badge`.

**Frontend components:** `BadgeCard`, `BadgeGrid`, `BadgeProgress`, `BadgeTooltip` (new, built on
`profile-kit` `Card`/`R_EL` + a `RARITY_TONE` map adapted from `TROPHY_TONE_CLASS`),
`AchievementModal` (unlock celebration reusing confetti keyframes), finish `AchievementsPanel` grid,
`Leaderboard` + `Podium` (reuse `AlumniProfileCard` `footer`/`actions`), `AchievementStats` header.

**Idempotency contract:** grant = insert-or-ignore on `UserBadge` PK; notification once per grant;
score = pure recompute. Everything survives at-least-once outbox redelivery.

---

## K. Implementation Plan (phased)

- **Phase 0 — Schema + seed:** extend `Badge`/`UserBadge`, add score fields, seed ~20 one-shot +
  volume badges. Hand user the raw SQL (per project rule: user runs migrations manually).
- **Phase 1 — Engine (event path):** `src/modules/badges/*`, `evaluate_badges` outbox handler,
  enqueue at post/comment/reaction/follow sites, `achievement_unlocked` notification. Unit tests on
  the pure matcher. **This is the MVP core.**
- **Phase 2 — Render:** finish `AchievementsPanel` grid + `/[username]/achievements` page (mirror
  karma page), `BadgeCard`/`Grid`/`Tooltip`, locked/`???` states, progress bars.
- **Phase 3 — Cron badges:** streaks, tenure, rolling windows via `/api/cron/badges`.
- **Phase 4 — Leaderboard + podium**, monthly/category boards, own-rank.
- **Phase 5 — Admin `/admin/badges` CRUD** (catalogue create/edit/retire using `admin-ui` kit) +
  unlock celebration modal + share action.

---

## L. Risks / Unknowns

- **Profile-view windowing:** `ProfileView` keeps only a running `count` + `lastViewedAt`, no per-view
  history → "1095 views in 365 days" can only be a lifetime total, not windowed. Decide: relax the
  badge to lifetime, or start logging per-view events.
- **No per-user timezone** → Early Riser / Night Owl can only use a fixed (IST) window. Flag as
  approximate or drop.
- **Comment author not indexed** → per-user comment-written counts scan; prefer received-upvote
  metrics, or add an index.
- **Backfill:** existing users have history. Phase 1 handles new events only; a one-time backfill job
  (reuse the cron handler over all users) is needed so day-one users don't start empty. Budget for it.
- **Streak definition** is a product call (login vs meaningful action; grace days?).
- **`Payment` table has no writer** — use `Membership`/`Contribution`/`Donation` for money badges.
- **Reversal rows** must be excluded from any `KarmaTransaction` aggregation.
- **Reference badge art** (`assets/images/achievements/**`) is not in this repo — icons need to be
  produced/imported and uploaded (R2/Supabase) or rendered as icon+tint.

---

## Reference-file analysis (design only — none of the code transfers)

The three files are a **Bootstrap 5 "Socia" theme** (`data-bs-*`, `assets/css/style.css` custom
classes we don't have). Value = **IA + catalogue + interaction ideas**, classified:

| Element | File | Verdict | Why |
|---|---|---|---|
| Badge catalogue + rarities + descriptions | my-acheivements | **REUSE (as data)** | The best artifact — a thought-through catalogue. Port into `Badge` seed (dropping unmeasurable ones). |
| Category-sectioned badge grid | my-acheivements | **REBUILD** | Good IA; rebuild in Tailwind/React as `BadgeGrid`. |
| Badge detail modal (`data-*` → JS) | my-acheivements | **REBUILD** | Concept good (icon/desc/rarity/"unlock rank"); rebuild as `AchievementModal`. |
| "Your Unlock Rank" (ordinal of who earned it first) | my-acheivements | **NEW (nice)** | Social-proof mechanic; derivable from `awardedAt` ordering. Phase 4+. |
| Podium (1-2-3) + ranking table + premium lock | badge-rankings | **REBUILD** | Rebuild podium with `AlumniProfileCard`; premium-lock ties to `benefitTier`. |
| Per-milestone speed leaderboard | badge-rankings | **NEW** | "Fastest to X" = order a single badge by `awardedAt`. Post-MVP. |
| Profile `ach_card` (Badges / Collectables / Trophies) | view-profile | **ADAPT → already exists** | This is literally `AchievementsPanel` + `TrophyCase`; just finish the badge grid. |
| Featured badges + "+6" overflow | view-profile | **REUSE** | `AchievementsPanel` already computes `shown`/`overflow` — wire it. |
| Contribution heatmap (GitHub-style weeks) | view-profile | **NEW (optional)** | Nice activity viz; not a badge. Defer. |
| Confetti on trophy click | view-profile | **REUSE** | App already has confetti keyframes; reuse for unlocks. |
| Egg-throwing / "Rotten Eggs" collectable | view-profile | **REUSE** | Backed by real `EggThrow` + `eggBalance`; already surfaced. |

---

## External inspiration (principles only — clearly separated from findings above)

- **Stack Overflow / GitHub:** tiered badges (bronze/silver/gold) with **public rarity %**; hidden
  "fun" badges for discovery. → adopt rarity + a "% of members who have this" line.
- **Duolingo / Strava:** streaks with **grace/freeze** and gentle recovery beat brittle streaks. →
  consider a 1-day grace before a Consistency streak breaks.
- **Reddit trophies / Discord:** small, tasteful profile display; achievements are **social proof**,
  not currency. → keep the sidebar compact (featured few + link), avoid a badge wall.
- **All of them:** progress toward the *next* badge is the strongest motivator. → always show
  `have/target` progress on locked/in-progress badges (the `UserBadge.progress` field).
- **Anti-pattern to avoid:** casino-y constant popups. → one tasteful unlock modal, batched
  notifications, unmuteable but not spammy.

---

# Recommended Direction

**Build the engine, not the furniture — most furniture already exists.**

1. **Reuse the existing `Badge`/`UserBadge` models and the `AchievementsPanel` stub.** Do not create a
   parallel achievements system. Extend the two models with `category`/`rarity`/flags and a
   denormalized `achievementScore`.
2. **Make `autoCriteria` real.** It's the intended-but-unused rule slot. A small JSON DSL
   (`metric`/`op`/`target`/`window`/`unique`/`minAccountAgeDays`/`triggers`) lets you add most future
   badges with **zero code** — just a `Badge` row.
3. **Drive unlocks through the transactional outbox** (`evaluate_badges` type, `dedupeKey` per user,
   idempotent insert-or-ignore handler) for real-time behaviour badges, and a **daily cron** for
   streak/tenure/windowed badges. This reuses the platform's proven async + idempotency fabric.
4. **Score by rarity, not count** (1/3/7/15/30); store it denormalized so the profile and leaderboards
   read one integer.
5. **Bake anti-gaming into the criteria from day one** — unique counterparties, account-age gates,
   received-value (not raw-count) metrics, actioned-reports-only — using patterns karma already has
   (`KarmaPairDay`, `oncePerEntity`, unique constraints).
6. **Seed ~25 grounded badges** from the reference catalogue, dropping the ~5 unmeasurable ones; keep
   committee/trophy/bug-hunter on the existing **manual** `setBadge` path.

**MVP (ship first):** Phase 0 (schema + seed one-shot & post/comment/upvote/follow badges) + Phase 1
(event-path engine via outbox + `achievement_unlocked` notification) + Phase 2 (render the profile
grid + a basic `/[username]/achievements` page). That alone delivers a real, honest achievement system
that unlocks in near-real-time.

**Defer:** streaks/cron (Phase 3), leaderboard/podium (Phase 4), admin catalogue CRUD + unlock
celebration modal + share (Phase 5). And plan a **one-time backfill** so existing members don't start
at zero.
