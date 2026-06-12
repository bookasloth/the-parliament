# Feature Modules Schema — Events, Business, Membership, Rewards

**Status:** Day-1 modules (DECISIONS.md: "everything on day 1"). Extends `CORE_PLATFORM_SCHEMA.md`; implements the JNV Nagpur feature checklist. Same conventions (UUID PKs, `TIMESTAMPTZ`, JSONB, `school_id`-scoped). Karma effects route through the Karma System (`ALUMNI_REPUTATION_SYSTEM.md` §13–§15).

---

## 1. Events Module

> Supersedes the minimal `events` / `event_attendance` stub in `CORE_PLATFORM_SCHEMA.md` §8.

```sql
CREATE TABLE events (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id        UUID NOT NULL REFERENCES schools(id),
    host_id          UUID NOT NULL REFERENCES users(id),
    group_id         UUID REFERENCES groups(id) ON DELETE CASCADE,   -- NULL = platform-wide event; set = hosted by a group (§7)
    title            VARCHAR(200) NOT NULL,
    description      TEXT,
    starts_at        TIMESTAMPTZ NOT NULL,
    ends_at          TIMESTAMPTZ,
    mode             VARCHAR(20) NOT NULL CHECK (mode IN ('online','in_person','hybrid')),
    venue            VARCHAR(240),                 -- for in-person/hybrid
    online_url       TEXT,                         -- Zoom/GMeet link for online/hybrid
    host_house_id    UUID REFERENCES houses(id),   -- set when the event is house-specific
    is_house_specific BOOLEAN NOT NULL DEFAULT FALSE,
    is_featured      BOOLEAN NOT NULL DEFAULT FALSE,
    visibility       VARCHAR(20) NOT NULL DEFAULT 'school'
                       CHECK (visibility IN ('school','house','batch','public')),
    status           VARCHAR(20) NOT NULL DEFAULT 'published'
                       CHECK (status IN ('draft','published','cancelled','completed')),
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_events_school_time ON events(school_id, starts_at DESC);
CREATE INDEX idx_events_house ON events(host_house_id) WHERE host_house_id IS NOT NULL;

CREATE TABLE event_rsvps (
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status     VARCHAR(12) NOT NULL DEFAULT 'going' CHECK (status IN ('going','maybe','declined')),
    rsvp_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE event_attendance (
    event_id      UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role          VARCHAR(20) NOT NULL DEFAULT 'attendee' CHECK (role IN ('attendee','speaker','organizer')),
    checked_in_at TIMESTAMPTZ,                     -- presence => +10 karma (event_attended), once per event
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE event_feedback (
    event_id   UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating     SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment    TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, user_id)               -- one feedback per attendee => +2 karma once
);
```

- **House attendance leaderboard** ("which house has the most attendees") = `COUNT(event_attendance) GROUP BY house` via the attendee's `profiles.house_id` — a query/view, not a table.
- **Karma:** check-in → `event_attended` (+10, once/event); completed host → `event_hosted` (+30); feedback → `event_feedback` (+2). All per `ALUMNI_REPUTATION_SYSTEM.md` §13.
- **Filters** (house/batch/location) use `events.host_house_id`, attendee batch, and `venue`/`city`.

---

## 2. Business Directory ("My Business")

```sql
CREATE TABLE business_categories (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID REFERENCES schools(id),        -- NULL = global
    key       VARCHAR(40) NOT NULL,
    label     VARCHAR(80) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);
CREATE UNIQUE INDEX uq_business_categories_key ON business_categories(COALESCE(school_id,'00000000-0000-0000-0000-000000000000'), key);
-- Seed: food, tech, services, retail, consulting, education, healthcare, ... (admin-editable)

CREATE TABLE businesses (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id             UUID NOT NULL REFERENCES schools(id),
    owner_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id           UUID NOT NULL REFERENCES business_categories(id),
    name                  VARCHAR(200) NOT NULL,
    description           TEXT,
    logo_url              TEXT,
    banner_url            TEXT,
    website               TEXT,
    contact_email         CITEXT,
    contact_phone         VARCHAR(20),
    offers_alumni_discount BOOLEAN NOT NULL DEFAULT FALSE,   -- perk + karma incentive
    rating_avg            NUMERIC(3,2) NOT NULL DEFAULT 0,   -- denormalized from reviews
    rating_count          INT NOT NULL DEFAULT 0,
    status                VARCHAR(20) NOT NULL DEFAULT 'pending'
                            CHECK (status IN ('pending','verified','removed')),   -- admin verifies/removes
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_businesses_category ON businesses(category_id);
CREATE INDEX idx_businesses_name_trgm ON businesses USING gin (name gin_trgm_ops);

CREATE TABLE business_reviews (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rating      SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    body        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_business_review_one_per_user ON business_reviews(business_id, reviewer_id);
```

- **Listing shows** owner name + house + batch (join `users`/`profiles`).
- **Karma:** approved listing → `business_added` (+15, reversed if removed); each unique review → `business_review` (+2). The **"Alumni Supporting Alumni"** badge is auto-granted to verified listings (see §4 badges).

---

## 3. Membership & Payments (orthogonal to karma — DECISIONS.md)

Membership unlocks **premium/paid** perks; it never substitutes for karma gates.

```sql
CREATE TABLE membership_plans (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    name        VARCHAR(80) NOT NULL,
    tier        VARCHAR(20) NOT NULL CHECK (tier IN ('student','associate','premium','life')),
    price_inr   INT NOT NULL,                      -- whole RUPEES (project-wide). Convert to paise (×100) only when calling Razorpay.
    duration_days INT,                             -- NULL = lifetime
    features    JSONB NOT NULL DEFAULT '{}',       -- {exclusive_events, free_promotions, premium_features, ...}
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE memberships (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    plan_id         UUID NOT NULL REFERENCES membership_plans(id),
    status          VARCHAR(20) NOT NULL DEFAULT 'active'
                      CHECK (status IN ('active','expired','cancelled','pending')),
    started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ,                   -- NULL = lifetime
    auto_pay        BOOLEAN NOT NULL DEFAULT FALSE,
    razorpay_subscription_id VARCHAR(64),          -- UPI autopay / recurring
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_memberships_user ON memberships(user_id, status);
CREATE INDEX idx_memberships_expiry ON memberships(expires_at) WHERE status = 'active';
-- Current tier shown on profile = latest active membership; expiry reminder job reads idx_memberships_expiry.

-- Unified payments ledger (memberships AND donations) via Razorpay.
CREATE TABLE payments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id),
    purpose            VARCHAR(20) NOT NULL CHECK (purpose IN ('membership','donation')),
    amount_inr         INT NOT NULL,                       -- whole RUPEES (×100 for Razorpay)
    membership_id      UUID REFERENCES memberships(id),    -- when purpose='membership'
    razorpay_order_id  VARCHAR(64),
    razorpay_payment_id VARCHAR(64),
    status             VARCHAR(20) NOT NULL DEFAULT 'created'
                         CHECK (status IN ('created','paid','failed','refunded')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    paid_at            TIMESTAMPTZ
);
CREATE INDEX idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX idx_payments_status ON payments(status);

-- Donations / Giving Back (impact tracking)
CREATE TABLE donations (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id  UUID NOT NULL REFERENCES payments(id),
    user_id     UUID NOT NULL REFERENCES users(id),
    cause       VARCHAR(120),                      -- scholarship / books / school project / general
    is_anonymous BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

- **Revenue reports** = views/aggregations over `payments` (paid) joined to `memberships.plan_id` and the member's `house`/`batch` — no separate table.
- **Karma:** completed donation → `donation` karma (§13), reversed on refund. Membership purchase does **not** grant karma (orthogonality).
- **Expiry notifications:** a pg-boss job scans `idx_memberships_expiry` and emails members before `expires_at`.

> **Compliance:** Razorpay needs KYC. The org is a registered **Society without 80G certification**, so donations are **not tax-deductible** and issue a **standard payment receipt only — no 80G receipt**. (If the Society obtains 80G later, add receipt generation then.) Refunds must reverse the associated karma (`donation` entry).

---

## 4. Karma Store (redeem digital products) & Badges

Implements `ALUMNI_REPUTATION_SYSTEM.md` §14 (spending). The store is a marketplace of redeemable **digital products**; redeeming deducts from **Karma Balance** (single pool) and delivers the item.

```sql
CREATE TABLE reward_items (                       -- the Karma Store catalogue
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id     UUID NOT NULL REFERENCES schools(id),
    title         VARCHAR(160) NOT NULL,
    description   TEXT,
    image_url     TEXT,
    category      VARCHAR(40) NOT NULL CHECK (category IN
                    ('ebook','course_access','event_vip','certificate','wallpaper','discount_code','perk','badge','other')),
    karma_cost    NUMERIC(8,2) NOT NULL CHECK (karma_cost > 0),
    quantity      INT,                            -- NULL = unlimited; decremented on redeem
    delivery_type VARCHAR(20) NOT NULL CHECK (delivery_type IN ('download','email','code','auto_grant')),
    asset_url     TEXT,                           -- file/link delivered (download/email); private, signed
    code_pool     JSONB,                          -- for 'code' (partner discount codes), one consumed per redeem
    eligibility   JSONB NOT NULL DEFAULT '{}',    -- {min_membership_tier, house_only, ...}
    is_featured   BOOLEAN NOT NULL DEFAULT FALSE, -- "new or limited-time" highlight
    featured_until TIMESTAMPTZ,
    popularity    INT NOT NULL DEFAULT 0,         -- redeem count, for "popularity" sort
    is_active     BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_reward_items_store ON reward_items(school_id, is_active, category);
-- Store filters (PRD): by karma_cost, category, latest (created_at), popularity.

CREATE TABLE karma_redemptions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_item_id      UUID NOT NULL REFERENCES reward_items(id),
    karma_spent         NUMERIC(8,2) NOT NULL CHECK (karma_spent > 0),
    karma_transaction_id UUID NOT NULL REFERENCES karma_transactions(id),  -- the negative 'redemption' ledger row
    status              VARCHAR(20) NOT NULL DEFAULT 'fulfilled'
                          CHECK (status IN ('pending','fulfilled','expired','cancelled')),
    delivery_channel    VARCHAR(20),              -- 'download' | 'email' | 'code'
    delivered_url       TEXT,                     -- signed download link
    delivered_code      VARCHAR(80),              -- consumed discount/voucher code
    delivered_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_karma_redemptions_user ON karma_redemptions(user_id, created_at DESC);  -- redemption history on profile

-- Badges / milestones (profile + "Alumni Supporting Alumni", Mentor, etc.)
CREATE TABLE badges (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID REFERENCES schools(id),
    key         VARCHAR(40) NOT NULL,
    label       VARCHAR(80) NOT NULL,
    description TEXT,
    icon_url    TEXT,
    auto_criteria JSONB                             -- nullable; e.g. {business_verified:true}, {karma_unlock:'mentor'}
);
CREATE UNIQUE INDEX uq_badges_key ON badges(COALESCE(school_id,'00000000-0000-0000-0000-000000000000'), key);

CREATE TABLE user_badges (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id   UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    source     VARCHAR(20) NOT NULL DEFAULT 'auto' CHECK (source IN ('auto','redeemed','admin')),
    awarded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);
```

- **Redemption flow:** verify `karma_balance >= karma_cost` → write negative `redemption` ledger entry → decrement balance → create `karma_redemptions` + fulfilment (voucher/badge). Atomic; rejected if insufficient.
- **Badge "Alumni Supporting Alumni"** auto-granted when a business reaches `status='verified'`. **Mentor badge** granted when Earned-30d ≥ 500 (karma unlock).

---

## 5. Groups (Houses / Batch / Department / Interest)

Micro-communities. Posts, polls, and events can belong to a group (`posts.group_id`, `events.group_id`).

```sql
CREATE TABLE groups (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id      UUID NOT NULL REFERENCES schools(id),
    type           VARCHAR(20) NOT NULL CHECK (type IN ('batch','house','department','interest')),
    name           VARCHAR(160) NOT NULL,
    description    TEXT,
    banner_url     TEXT,
    visibility     VARCHAR(10) NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
    is_permanent   BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE = auto-membership default group; members cannot leave
    -- Auto-membership keys (one is set for permanent batch/house/department groups):
    ref_batch_id     UUID REFERENCES batches(id),    -- batch group key (the 7-year cohort, e.g. "2006-2013")
    ref_house_id     UUID REFERENCES houses(id),     -- house group key
    ref_department   VARCHAR(120),                   -- department group key
    created_by     UUID REFERENCES users(id),        -- NULL for system-created permanent groups
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_groups_school_type ON groups(school_id, type);
CREATE UNIQUE INDEX uq_groups_batch  ON groups(school_id, ref_batch_id) WHERE type='batch';
CREATE UNIQUE INDEX uq_groups_house  ON groups(school_id, ref_house_id)     WHERE type='house';
CREATE UNIQUE INDEX uq_groups_dept   ON groups(school_id, ref_department)   WHERE type='department';

CREATE TABLE group_members (
    group_id   UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(12) NOT NULL DEFAULT 'member' CHECK (role IN ('member','moderator','admin')),
    status     VARCHAR(12) NOT NULL DEFAULT 'active' CHECK (status IN ('active','pending','removed')),
    joined_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (group_id, user_id)
);
CREATE INDEX idx_group_members_user ON group_members(user_id, status);
CREATE INDEX idx_group_members_pending ON group_members(group_id, status) WHERE status='pending';
```

- **Auto-membership:** on profile completion, the user is added (`is_permanent` groups) to their **batch group** (`ref_batch_id = profiles.batch_id`), **house group** (`ref_house_id = profiles.house_id`), and **department group** (`ref_department = profiles.department`). These cannot be left. The batch is the **7-year cohort the user chose at signup** (e.g. "2006-2013"), canonical via the `batches` table (B1).
- **Public groups:** join/leave freely. **Private groups:** `group_members.status='pending'` until a group admin/moderator approves.
- **Per-group roles** (`moderator`/`admin`): approve/remove members, post announcements (`posts.is_pinned` within the group), pin content.
- **Group page:** member list (`group_members`), description + banner. **Group feed** = `posts WHERE group_id = ?`; **polls** = `posts.format='poll'` in the group; **events** = `events.group_id = ?`.
- **My groups / suggested groups:** `group_members` for mine; suggestions = permanent groups for my batch/house/dept I'm not in + popular interest groups (query).
- **Group activity notifications:** email (Phase-1 channel). **Group-level chat = Phase 2** (with Messaging).
- **Karma:** joining/creating groups can grant capped activity karma; creating a group requires the **250 karma** unlock (Karma System §2).

---

## 6. Gamification — Single & Multiplayer Games

Engagement games that award karma. **Karma integrity warning:** games are the most farmable karma source, so every award is **admin-configurable** with **retry limits + daily caps**, and routes through the same anti-farm framework (`ALUMNI_REPUTATION_SYSTEM.md` §13). Game karma is capped per game per IST day.

**Phase-1 games (all single-player, no Socket.IO needed) — G1:**
| Game | Genre | Notes |
|------|-------|-------|
| **Wordle** | word | Daily word guess; one karma-eligible play/day. |
| **Bulls & Cows** | logic | Number/word deduction; retry-limited. |
| **Guess the Phrase** | word | Reveal-the-phrase puzzle; admin-authored phrase bank. |
| **Tic Tac Toe vs NNAWCA AI** | board | Single-player vs a server-side AI (`config.ai_opponent = true`); difficulty in config. |

> Real-time multiplayer (duels/typer races) and tournaments remain Phase 2 (need Socket.IO). The four above ship in Phase 1.

```sql
CREATE TABLE games (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    key         VARCHAR(40) NOT NULL,
    title       VARCHAR(120) NOT NULL,
    genre       VARCHAR(20) NOT NULL CHECK (genre IN ('word','logic','trivia','board','quiz','memory','puzzle','typing')),
    mode        VARCHAR(12) NOT NULL CHECK (mode IN ('single','multi')),
    config      JSONB NOT NULL DEFAULT '{}',      -- admin: rules, retry_limit, karma_per_level, daily_karma_cap, time_limit, ai_opponent
    is_active   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Single-player plays (also feeds per-game leaderboard).
CREATE TABLE game_scores (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id       UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score         INT NOT NULL DEFAULT 0,
    level_reached INT,
    karma_awarded NUMERIC(8,2) NOT NULL DEFAULT 0,   -- after retry/daily caps
    played_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_game_scores_leaderboard ON game_scores(game_id, score DESC);
CREATE INDEX idx_game_scores_user ON game_scores(user_id, played_at DESC);

-- Multiplayer matches (real-time or turn-based).
CREATE TABLE game_matches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id     UUID NOT NULL REFERENCES games(id) ON DELETE CASCADE,
    match_kind  VARCHAR(12) NOT NULL CHECK (match_kind IN ('real_time','turn_based')),
    tournament_id UUID REFERENCES tournaments(id),    -- set when part of a tournament
    status      VARCHAR(12) NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','completed','abandoned')),
    started_at  TIMESTAMPTZ,
    ended_at    TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE match_participants (
    match_id      UUID NOT NULL REFERENCES game_matches(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    score         INT NOT NULL DEFAULT 0,
    result        VARCHAR(12) CHECK (result IN ('win','loss','draw','participated')),
    karma_awarded NUMERIC(8,2) NOT NULL DEFAULT 0,    -- winner reward or consolation
    PRIMARY KEY (match_id, user_id)
);

-- Challenge a friend or a random alumnus.
CREATE TABLE game_challenges (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    game_id      UUID NOT NULL REFERENCES games(id),
    challenger_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opponent_id  UUID REFERENCES users(id),           -- NULL = match me with a random alumnus
    status       VARCHAR(12) NOT NULL DEFAULT 'open'
                   CHECK (status IN ('open','accepted','declined','expired','matched')),
    match_id     UUID REFERENCES game_matches(id),
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Admin-launched seasonal tournaments with prizes/badges.
CREATE TABLE tournaments (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id),
    game_id     UUID REFERENCES games(id),
    name        VARCHAR(160) NOT NULL,
    season      VARCHAR(40),
    starts_at   TIMESTAMPTZ NOT NULL,
    ends_at     TIMESTAMPTZ NOT NULL,
    prize_badge_id UUID REFERENCES badges(id),
    prize_karma NUMERIC(8,2),
    status      VARCHAR(12) NOT NULL DEFAULT 'upcoming'
                  CHECK (status IN ('upcoming','active','completed','cancelled')),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournament_entries (
    tournament_id UUID NOT NULL REFERENCES tournaments(id) ON DELETE CASCADE,
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    final_rank    INT,
    karma_awarded NUMERIC(8,2) NOT NULL DEFAULT 0,
    joined_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tournament_id, user_id)
);
```

- **Migration ordering:** create `games` → `tournaments` → `game_matches` (FK `tournament_id`) → `match_participants`/`game_challenges`/`tournament_entries`. (DDL above is grouped by topic, not creation order.)
- **Leaderboards:** per-game (`idx_game_scores_leaderboard`), and house/overall via join to `profiles.house_id`. Real-time leaderboard updates use Socket.IO (or polling).
- **Karma:** single-player level completion → `game_completed`; multiplayer → `game_won` (winner) / `game_participated` (consolation); tournament placing → `tournament_won`. All capped & admin-configurable per `games.config`.
- **Phasing:** single-player games are buildable in Phase 1; **real-time multiplayer + tournaments depend on Socket.IO → Phase 2** (with Messaging). Confirm whether single-player ships in Phase 1 or with the rest in Phase 2.

---

## 7. Analytics / Action Log (General System Requirement)

"Store user actions for analytics and future karma adjustment." A lightweight append-only event log, separate from the karma ledger.

```sql
CREATE TABLE activity_events (
    id          BIGSERIAL PRIMARY KEY,            -- bigint PK (high-volume); not UUID
    user_id     UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type  VARCHAR(60) NOT NULL,             -- 'post.create','game.play','store.redeem','login', ...
    entity_type VARCHAR(30),
    entity_id   UUID,
    metadata    JSONB DEFAULT '{}',
    ip_inet     INET,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_activity_events_user_time ON activity_events(user_id, created_at DESC);
CREATE INDEX idx_activity_events_type_time ON activity_events(event_type, created_at DESC);
```

> Partition `activity_events` by month if volume grows. This is the analytics/behaviour log; the **karma ledger** (`karma_transactions`) remains the financial-grade source of truth for karma.

---

## 8. Admin coverage (checklist)

Existing `user_roles` (CORE §4) + these modules give admins: verify/deactivate users; **moderate posts/comments (hide/remove), pin announcements** (`posts.is_pinned`), curate **Alumni Spotlight**; create/edit/delete events + house-tag; verify/remove businesses; **view most-connected users + flag fake/spam connections**; manage groups + per-group moderators; define membership plans + view subscribers/revenue/house-batch stats (views over `payments`/`memberships`); **manage Karma Store products (add/edit/delete, set karma cost, upload files/links, feature limited-time) + view who redeemed what/when**; **configure games (rules/retry/point awards) + launch seasonal tournaments**; manual karma grant/revoke (`admin_adjustment`). All privileged actions are audit-logged (SECURITY.md §7).

> **General System Requirements (PRD) — coverage:** RBAC → `user_roles` (CORE §4); secure APIs JWT/OAuth2 → Auth.js (SECURITY.md §1); karma in a dedicated ledger → `karma_transactions` (CORE §11); real-time games/leaderboards → Socket.IO or polling (Phase 2 for real-time); store user actions for analytics → `activity_events` (§7); responsive mobile+desktop → single Next.js app (DECISIONS.md). All already decided — this module set introduces no new infra.

## 9. Phasing & open items

**Phase 1 (launch):** Login/Verify · Profiles (houses/divisions/batches) · Alumni Directory · **Connections** (contact-exchange + blocking + suggestions) · **Feed** (posts/comments/reactions/reshare/tagging/trending/spotlight/pinning) + **Karma** (activity karma, house leaderboards) · **Karma Store** (digital products) · **Groups** (batch/house/dept/interest) · **Single-player Games** (Wordle, Bulls & Cows, Guess the Phrase, Tic Tac Toe vs AI) · **Events** · **Business Directory** · **Membership/Payments/Donations** · **Rewards/Badges** · **Analytics log** · Alumni Map.
**Phase 2 (needs Socket.IO real-time):** **Jobs/Referrals · Mentorship · Messaging** (connection-gated DMs + minor-DM rules) · **Group chat** · **Real-time multiplayer games + tournaments**.

**Resolved:**
- **K1** — spending reduces Balance, **not** unlock eligibility (locked).
- **G1** — Phase-1 games = Wordle, Bulls & Cows, Guess the Phrase, Tic Tac Toe vs NNAWCA AI (all single-player).
- **B1** — batch = canonical **7-year cohort** chosen at signup, via the `batches` table (CORE §0).
- Yellow house = **Udaigiri**; prices in **whole rupees**; **no 80G** (Society without 80G cert → standard receipts).

**No open schema questions remain.** The design is decision-complete across Phase 1 + Phase 2 scope.
