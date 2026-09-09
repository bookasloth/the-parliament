# NNAWCA Badge & Achievement System — Build Plan

_Date: 2026-09-09 · Companion to `2026-09-09-badge-achievement-system-research.md` · Status: plan, no code written yet_

## Locked decisions

1. **Art lives in-repo** at `public/achievements/badges/**` (copied from the reference theme). `Badge.iconUrl` stores repo-relative paths like `/achievements/badges/giver/patron.png`. No R2/upload step.
2. **Seed every art-backed badge** (~48). Auto-award the measurable ones; the rest go on the manual admin-grant path — no art wasted.
3. **Unmeasurable-with-art:** award by the honest approximation where one exists (Night Owl / Early Riser = fixed **IST** window; The Legend = **lifetime** view total, not 365-day), otherwise **manual** (Social Linked, Meme Lord, Visionary Sponsor, Bug Hunter, Hall of Famer, committee).
4. **Backfill at launch:** one-time job grants existing members what they've already earned, with **notifications suppressed** for backfilled grants.

> Per project rule (`feedback-no-db-access`): every migration is handed to the user as **raw SQL to run manually** on Supabase. This plan never runs `prisma migrate`/`db push`/`execute_sql`.

---

## 1. Asset import

Copy the live art (skip `badges/old/**` legacy set and the stray `upvotes/1 (1).png`) into:

```
public/achievements/
  badges/{onboarding,giver,streak,upvotes,contributor,special,committee}/*.png
  egg.png  tithonia.png  podium.png  leaderboard.png
  celebrations/confetti.png
  trophies/*.png            # already covered by TrophyCase/GameChampion — leave as-is if present
```

`AchievementsPanel` already references `/achievements/badge.svg` as `BADGE_FALLBACK` — keep a fallback SVG for missing art.

---

## 2. Schema changes (hand user this SQL)

Extend the **existing** `badges` / `user_badges` tables; do not create parallel models. First update `prisma/schema.prisma`, then give the user the equivalent SQL.

**`Badge` (`badges`) — add columns:**
```sql
ALTER TABLE badges
  ADD COLUMN category         varchar(30),
  ADD COLUMN rarity           varchar(20)  NOT NULL DEFAULT 'common',
  ADD COLUMN display_priority int          NOT NULL DEFAULT 0,
  ADD COLUMN is_hidden        boolean      NOT NULL DEFAULT false,
  ADD COLUMN award_mode       varchar(10)  NOT NULL DEFAULT 'auto',  -- 'auto' | 'manual'
  ADD COLUMN series_key       varchar(40),                          -- groups levelled badges
  ADD COLUMN series_order     int,
  ADD COLUMN progress_target  int,                                  -- for progress bars
  ADD COLUMN active_from       timestamptz,
  ADD COLUMN active_to         timestamptz;
-- autoCriteria (auto_criteria jsonb) already exists — becomes the rule DSL, finally read.
```

**`UserBadge` (`user_badges`) — add progress:**
```sql
ALTER TABLE user_badges ADD COLUMN progress int;  -- null for one-shots; have-count for in-progress
-- PK (user_id, badge_id) already exists → the permanent idempotency guard for grants.
```

**Denormalized score on `users`:**
```sql
ALTER TABLE users
  ADD COLUMN achievement_score int NOT NULL DEFAULT 0,
  ADD COLUMN badge_count       int NOT NULL DEFAULT 0;
```

Rarity weights (code constant, not DB): `common 1 · uncommon 3 · rare 7 · epic 15 · legendary 30`.

---

## 3. Criteria DSL (`Badge.autoCriteria` JSON)

The engine reads this; a new badge with an existing metric needs **only a row**, no code.

```jsonc
{
  "metric": "comment_upvotes_received",   // key into the metric-query map (§5)
  "op": ">=", "target": 10,
  "window": "all_time",                   // all_time | rolling_365d | calendar_year | ist_time_window
  "unique": "counterparty",               // optional: count distinct users, not raw rows (anti-gaming)
  "minAccountAgeDays": 0,                  // optional gate
  "triggers": ["comment_reaction"],       // mutation events that re-evaluate this badge; [] = cron-only
  "params": {}                            // metric-specific (e.g. ist hour range for night_owl)
}
```

---

## 4. Full seed catalogue (mapped to real art)

Rarity: C/U/R/E/L. Mode: **A**=auto, **A~**=auto-approx, **M**=manual. Series badges share `series_key`.

### 🏁 Getting Started — `badges/onboarding/`
| Art | Badge | metric / rule | Req | R | Mode |
|---|---|---|---|---|---|
| bouquet.png | New Sailor | `account_created` | 1 | C | A |
| all.png | Profile Complete | `profile_completion` | 100 | C | A |
| thumbs-up.png | First Upvote | `reactions_given` | 1 | C | A |
| 1-comment.png | First Comment | `comments_written` | 1 | C | A |
| refer.png | First Connection | `following_count` | 1 | C | A |
| social-linked.png | Social Linked | — (no feature) | — | U | **M** |

### ✍️ Contributor — `badges/contributor/` — series `posts`, `rolling_365d`, exclude reposts + deleted
| yearly-starter 10 · rising 20 · active 50 · dedicated 100 · power 200 · elite 500 | `posts_created` | C→L | A |

### 💬 Commentator — `badges/upvotes/` — series `comment_upvotes`, `all_time`
| bishop 1 · morrison 10 · razdan 20 · sapru 50 · bhogale 75 · shastri 100 | `comment_upvotes_received` | C→L | A |

### 🤝 Supporter — `badges/giver/`
| paid-member.png | Paid Member | `active_membership` (365d) | 1 | C | A |
| benefactor 100 · patron 1000 · philanthropist 5000 · legendary-donor 10000 | `donations_sum` ₹ `rolling_365d` | U→L | A |
| visionary-sponsor.png | Visionary Sponsor | — | — | L | **M** |

### 🔥 Consistency — `badges/streak/` — series `streak`, cron-only (`triggers: []`)
**Active-day = a day the user earned karma** (an IST day with a positive `KarmaDailyCounter` / non-reversal `KarmaTransaction`). Streak = consecutive such days. No grace day (default; revisit if too brittle).
| 5-day · 10-day · 5-week(35d) · 10-week(70d) · 5-month(150d) · 10-month(300d) | `karma_active_streak_days` | C→L | A (cron) |

### ⭐ Special — `badges/special/`
| librarian.png | Librarian | `saved_posts` | 20 | C | A |
| voter.png | Voter | `poll_votes` (365d) | 1 | C | A |
| bargainer.png | Bargainer | `karma_redemptions` | 1 | C | A |
| the-welcoming.png | The Welcoming | `eggs_thrown_unique` (new users) | 10 | C | A |
| chickened.png | Chickened | `eggs_received` | 20 | U | A |
| nnawca-police.png | NNAWCA Police | `reports_actioned` | 10 | U | A |
| wallflower.png | Wallflower | `first_post_delay_days` | ≥180 | U | A |
| secret-admirer.png | Secret Admirer | `upvotes_given` ≥100 AND `comments_written`=0 | — | R | A |
| gardener.png | Gardener | `owned_post_max_comments` | ≥50 | R | A |
| the-explorer.png | The Explorer | `connections_outside_batch_house` | 20 | R | A |
| the-open-wallet.png | Open Wallet | `contributions_count` | 10 | R | A |
| influencer.png | Influencer | `referrals_verified` | 20 | E | A |
| early-riser.png | Early Riser | `posted_in_ist_window` **05:00–07:59 IST** | 1 | C | **A~** |
| night-owl.png | Night Owl | `posted_in_ist_window` **01:00–03:59 IST** | 1 | C | **A~** |
| the-legend.png | The Legend | `profile_views_total` (lifetime) | 1095 | L | **A~** |
| meme-lord.png | Meme Lord | — | — | U | **M** |
| bug-hunter.png | Bug Hunter | — | — | R | **M** |
| hall-of-famer.png | Hall of Famer | — | — | E | **M** |

### 🏆 Milestones — `badges/milestone/` — **art to be supplied by user** (placeholder `.png` paths below)
| Placeholder art | Badge | metric / rule | Req | R | Mode |
|---|---|---|---|---|---|
| milestone/one-year.png | One Year In | `tenure_years` | 1 | U | A (cron) |
| milestone/veteran.png | Veteran | `tenure_years` | 3 | R | A (cron) |
| milestone/founding-era.png | Founding Era | `tenure_years` | 5 | E | A (cron) |
| milestone/karma-poster.png | Poster | `lifetime_karma` (reuse `thresholdFor`) | 50 | C | A |
| milestone/karma-poller.png | Poller | `lifetime_karma` | 100 | U | A |
| milestone/karma-group-leader.png | Group Leader | `lifetime_karma` | 250 | R | A |
| milestone/karma-mentor.png | Mentor | `lifetime_karma` | 500 | E | A |

> Until the user supplies these 7 PNGs, they render with `BADGE_FALLBACK`. Drop `public/achievements/badges/milestone/*.png` in and the seed picks them up — no code change.

### 🎖 Recognition — `badges/committee/` — all **manual** invite-only
| executive · sports · cultural · developer | `admin_grant` | — | L/E | **M** |

**Counts:** ~38 auto (3 approximate) + ~10 manual. Manual badges reuse the **existing** `setBadge` admin path unchanged.

---

## 5. Backend module — `src/modules/badges/`

- **`catalog.ts`** — rarity weights, category metadata, the metric registry.
- **`metrics.ts`** — one function per `metric` returning a user's current value (queries from research §C). Denormalized counters where they exist (`Post.upvoteCount`, `Comment.likeCount`, `UserKarma.lifetimeEarned`, `ProfileView.count`); `KarmaTransaction`/`ActivityEvent` distinct-day for streaks (**exclude reversal rows**). Unique-counterparty variants for anti-gaming.
- **`evaluate.ts`** — **pure, DB-free** matcher: `(criteria, metricValue, accountAgeDays) => { unlocked, progress }`. Unit-tested (mirrors karma's pure-guard style).
- **`award.ts`** — `grantBadge({ userId, badgeKey, notify })`: insert-or-ignore on `user_badges` PK (idempotent, at-least-once safe) → bump `achievement_score` + `badge_count` → `sendNotification(achievement_unlocked)` unless `notify:false` (backfill).
- **`evaluate-user.ts`** — load user's not-yet-earned auto badges whose `triggers` intersect the fired trigger (or all, for cron) → run matcher → grant passers, update `progress` on near-misses.

## 6. Wiring

- **Outbox** (`src/modules/outbox/`): add handler `evaluate_badges` in `handlers.ts` (idempotent). Enqueue from mutation sites (`feed/posts.ts`, `feed/comments.ts`, `connections/service.ts`, egg/referral/redemption paths) via `enqueueOutbox({ type:"evaluate_badges", payload:{ userId, triggers:[...] }, dedupeKey:"badges:"+userId }, tx)` **inside the producer transaction**. `dedupeKey` coalesces bursts; `pg_cron` drains ~15s → near-real-time.
- **Cron**: `src/app/api/cron/badges/route.ts` guarded by `isAuthorizedCron`, daily schedule in `vercel.json`. Evaluates cron-only badges (streaks, tenure, rolling windows, Legend) for recently-active users.
- **Notification**: add `achievement_unlocked` to `NotificationKind` union (`notifications/service.ts:21`) + a `links.ts` entry (→ `/[username]/achievements`); badge `iconUrl` as `imageUrl`. No migration (`type` is free VarChar).

## 7. Frontend

- **`RARITY_TONE`** map (adapt `TROPHY_TONE_CLASS` / `statusBadgeClass`): common grey · uncommon emerald · rare sky · epic violet · legendary amber/gold — sourced, not a new color copy.
- **New components** (`components/shared/badges/`): `BadgeCard`, `BadgeGrid`, `BadgeProgress`, `BadgeTooltip`, `AchievementModal` (unlock celebration — reuse `alfazy-confetti-fall` keyframes), `AchievementStats` header.
- **Finish `AchievementsPanel`**: render `shown` grid + "+N" overflow → `/[username]/achievements`.
- **New page** `src/app/(main)/[username]/achievements/page.tsx` mirroring the karma page (`max-w-[1400px]` outer): header stats, filter tabs (All/Unlocked/Locked/In-progress/Category), grid; locked → greyed, hidden → "???". Owner-gated via `isOwner`.
- **Leaderboard (Phase 4)** `src/app/(main)/leaderboard/page.tsx`: reuse `AlumniProfileCard` with rank in `footer`; podium art available.

## 8. Backfill (launch)

Reuse the cron handler over **all** users with `notify:false`. Run once post-deploy (a guarded one-shot route or a manual invocation). Idempotent (insert-or-ignore), so re-runnable.

## 9. Tests (per project standing rule)

- `evaluate.ts` matcher: unlocked/not, progress, each `op`, `window`, `unique`, account-age gate, boundary values.
- `metrics.ts`: integration (`*.itest.ts`, throwaway `_test` DB) — reversal-row exclusion, unique-counterparty dedup, deleted-post exclusion, self-interaction exclusion.
- `award.ts`: idempotent double-grant → one row, score bumped once; backfill suppresses notification.
- Anti-gaming: delete-recreate doesn't re-fire; farming caps hold.

## 10. Phases & checkpoints

| Phase | Ships | Gate |
|---|---|---|
| 0 | Art import, schema SQL (user runs), seed script for all ~48 badges | badges visible in DB |
| 1 | `badges` module + `evaluate_badges` outbox handler + enqueue at core sites + `achievement_unlocked` notif | new activity unlocks live; matcher unit-tested |
| 2 | Finish `AchievementsPanel` grid + `/[username]/achievements` page + Badge* components | badges render, locked/hidden/progress states |
| 3 | Cron badges (streaks/tenure/windows/Legend) | daily grants |
| 4 | Leaderboard + podium (lifetime/monthly/category, own-rank) | — |
| 5 | `/admin/badges` catalogue CRUD (admin-ui kit) + unlock modal + share | admin manages catalogue |
| — | **Backfill** run once after Phase 1–2 live | existing members populated, no notif spam |

**MVP = Phases 0–2 + backfill.** Defer 3–5.

## Resolved (2026-09-09)
- **Milestone art:** user supplies 7 PNGs → `public/achievements/badges/milestone/{one-year,veteran,founding-era,karma-poster,karma-poller,karma-group-leader,karma-mentor}.png`. Fallback SVG until then.
- **Streak active-day = a day the user earned karma** (positive IST-day in `KarmaDailyCounter`, reversals excluded). No grace day.
- **IST windows:** Early Riser 05:00–07:59 IST · Night Owl 01:00–03:59 IST.
