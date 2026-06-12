# The Parliament — Core Platform Schema

**Status:** Foundational design. This document defines the platform tables that the **Alumni Reputation System (ARS)** assumes but never defines (`AUDIT_REPORT.md` D14/D15). ARS migrations (`DATABASE_SCHEMA.md`) depend on `users` existing first.

**Conventions (match ARS):** PostgreSQL, UUID PKs (`gen_random_uuid()`), `TIMESTAMPTZ` timestamps, JSONB for flexible config. Soft-delete via `deleted_at` where erasure must be reversible; see `SECURITY.md` for the GDPR hard-delete exception.

**Migration ordering:** these tables are created by migrations `c001`–`c0xx`, which run **before** the ARS `001` migration. The ARS `011_alter_users_add_reputation.sql` then augments `users`.

---

## 0. School & Org Structure (multi-school-ready)

Per `DECISIONS.md`: single school now, but `school_id`-ready. Houses and Divisions are school-scoped reference data.

```sql
CREATE TABLE schools (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(200) NOT NULL,
    slug        VARCHAR(80) NOT NULL UNIQUE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Houses: single-value per user, school-scoped, each with a display colour (JNV Nagpur house system).
CREATE TABLE houses (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name        VARCHAR(80) NOT NULL,
    color_name  VARCHAR(30) NOT NULL,     -- e.g. 'Blue'
    color_hex   CHAR(7) NOT NULL,         -- e.g. '#1E63D0' for the house colour tag on profiles
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_houses_school_name ON houses(school_id, name);

-- Seed (JNV Nagpur, 6 houses):
--   Aravali  — Blue   | Nilgiri — Green  | Shiwali — Red
--   Udaigiri — Yellow | Indira  — Orange | Laxmi   — Pink

-- Divisions: MULTI-value per user, with one protected default per school.
-- (DECISIONS.md: everyone defaults to "Nagpur", which cannot be removed; users may ADD others e.g. "Jind".)
CREATE TABLE divisions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    name        VARCHAR(80) NOT NULL,
    is_default  BOOLEAN NOT NULL DEFAULT FALSE,   -- exactly one per school = the auto-assigned, undeletable default
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_divisions_school_name ON divisions(school_id, name);
CREATE UNIQUE INDEX uq_divisions_one_default ON divisions(school_id) WHERE is_default;  -- at most one default

-- Batches: a JNV cohort is a 7-year range chosen at signup (e.g. 2006–2013). Canonical reference so
-- everyone in the same cohort maps to the identical batch + batch group (B1).
CREATE TABLE batches (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id   UUID NOT NULL REFERENCES schools(id) ON DELETE CASCADE,
    start_year  INT NOT NULL,                     -- entry year (class 6)
    end_year    INT NOT NULL,                     -- passing year (class 12) = start_year + 7
    label       VARCHAR(20) NOT NULL,             -- "2006-2013"
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (end_year = start_year + 7)
);
CREATE UNIQUE INDEX uq_batches_school_start ON batches(school_id, start_year);
-- Seed: admin generates the range of valid batches; signup picks from this list.
```

---

## 1. Identity & Authentication

### Table: `users`

The canonical account. *(The shelved ARS once ALTERed reputation columns here; those are replaced by the karma model in §11. Verification fields live in `alumni_verifications` + the columns below.)*

```sql
CREATE TABLE users (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id          UUID NOT NULL REFERENCES schools(id),
    email              CITEXT NOT NULL,                 -- case-insensitive; requires `CREATE EXTENSION citext`
    email_verified_at  TIMESTAMPTZ,
    mobile_e164        VARCHAR(20),                     -- E.164 format, nullable (SMS OTP deferred per DECISIONS.md)
    mobile_verified_at TIMESTAMPTZ,
    password_hash      TEXT,                            -- Argon2id (via Auth.js); NULL for SSO-only accounts
    legal_name         VARCHAR(160) NOT NULL,           -- real name (enforced), matched against verification
    display_name       VARCHAR(120) NOT NULL,
    member_type        VARCHAR(20) NOT NULL
                         CHECK (member_type IN ('alumni', 'student', 'teacher')),
    date_of_birth      DATE,                            -- required for students (age-tier); optional for adults
    current_class      INT CHECK (current_class BETWEEN 1 AND 12),  -- students only; drives age-tier (see §12)
    is_verified        BOOLEAN NOT NULL DEFAULT FALSE,  -- becomes true on verification approval
    verified_at        TIMESTAMPTZ,                     -- verification approval time = account-age clock
    status             VARCHAR(20) NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'active', 'suspended', 'deactivated', 'deleted')),
    last_login_at      TIMESTAMPTZ,
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at         TIMESTAMPTZ                       -- soft delete
);

CREATE UNIQUE INDEX uq_users_email_active ON users(email) WHERE deleted_at IS NULL;
CREATE UNIQUE INDEX uq_users_mobile_active ON users(mobile_e164) WHERE mobile_e164 IS NOT NULL AND deleted_at IS NULL;
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_school ON users(school_id);
CREATE INDEX idx_users_member_type ON users(member_type);
```

> **Badges** (Verified Alumni, Teacher, Mentor, Trustee, Admin) are separate from `member_type` — see `user_roles` (§4) for admin/trustee authority and §11 for the Mentor karma unlock. `member_type` is the core "who are you" axis; badges are earned/granted overlays.

### Table: `user_credentials` (federated / SSO identities)

```sql
CREATE TABLE user_credentials (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider      VARCHAR(40) NOT NULL,        -- 'password' | 'google' | 'institute_sso' | ...
    provider_uid  VARCHAR(255) NOT NULL,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_user_credentials_provider ON user_credentials(provider, provider_uid);
```

### Table: `user_sessions` (refresh-token store)

Access tokens are short-lived JWTs (stateless); refresh tokens are server-side and revocable. See `SECURITY.md` §Session.

```sql
CREATE TABLE user_sessions (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    refresh_token_hash TEXT NOT NULL,           -- SHA-256 of the opaque refresh token; never store raw
    user_agent         TEXT,
    ip_inet            INET,
    expires_at         TIMESTAMPTZ NOT NULL,
    revoked_at         TIMESTAMPTZ,
    rotated_from       UUID REFERENCES user_sessions(id),  -- refresh-token rotation chain
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_sessions_user ON user_sessions(user_id);
CREATE UNIQUE INDEX uq_user_sessions_token ON user_sessions(refresh_token_hash);
CREATE INDEX idx_user_sessions_expiry ON user_sessions(expires_at);
```

### Table: `mfa_factors` (TOTP / SMS second factor)

Required for admin actions and ARS adjustments > ±500 (`DATABASE_SCHEMA.md` → `reputation_adjustments.two_factor_verified`).

```sql
CREATE TABLE mfa_factors (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type        VARCHAR(20) NOT NULL CHECK (type IN ('totp', 'sms', 'webauthn')),
    secret_enc  TEXT,                           -- encrypted at rest (KMS/pgcrypto)
    confirmed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_mfa_factors_user ON mfa_factors(user_id);
```

### Table: `verification_tokens` (email/mobile/password-reset OTPs)

```sql
CREATE TABLE verification_tokens (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose     VARCHAR(30) NOT NULL CHECK (purpose IN ('email_verify', 'mobile_verify', 'password_reset')),
    token_hash  TEXT NOT NULL,
    expires_at  TIMESTAMPTZ NOT NULL,
    consumed_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_verification_tokens_user ON verification_tokens(user_id, purpose);
```

---

## 2. Profile

Drives the "complete profile" Level-2 requirement (`ALUMNI_REPUTATION_SYSTEM.md`: photo, bio, department, batch year, location) and the leaderboard `department`/`batch` filters (`API_SPECIFICATION.md` #10).

PRD identity fields: Name (on `users.legal_name`), Batch, Passing Year, House, Division (multi, separate table), City, Profession.

```sql
CREATE TABLE profiles (
    user_id      UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    photo_url    TEXT,
    bio          TEXT,
    house_id     UUID REFERENCES houses(id),       -- single-value (school house, with colour tag)
    batch_id     UUID REFERENCES batches(id),      -- the 7-year cohort chosen at signup (passing year = batches.end_year)
    department   VARCHAR(120),                     -- checklist: profile includes department
    city         VARCHAR(120),                     -- Alumni Directory + Map
    profession   VARCHAR(160),
    company      VARCHAR(160),                     -- directory search ("software in Pune")
    industry     VARCHAR(120),
    headline     VARCHAR(200),
    social_links JSONB NOT NULL DEFAULT '{}',      -- {linkedin, instagram, twitter, website, ...}
    whatsapp_opt_in BOOLEAN NOT NULL DEFAULT FALSE,-- WhatsApp update preference (checklist)
    visibility   VARCHAR(20) NOT NULL DEFAULT 'alumni'
                   CHECK (visibility IN ('public', 'alumni', 'connections', 'private')),
    is_public_indexed BOOLEAN NOT NULL DEFAULT FALSE, -- "visible on Google" public profile toggle; FORCED false for minors
    show_on_map  BOOLEAN NOT NULL DEFAULT FALSE,   -- Alumni Map opt-in, city-level; forced FALSE for minors
    is_complete  BOOLEAN NOT NULL DEFAULT FALSE,
    updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_profiles_batch ON profiles(batch_id);
CREATE INDEX idx_profiles_city ON profiles(city);
CREATE INDEX idx_profiles_company ON profiles(company);
-- Trigram indexes power fuzzy directory search (requires `CREATE EXTENSION pg_trgm`):
CREATE INDEX idx_profiles_company_trgm ON profiles USING gin (company gin_trgm_ops);
CREATE INDEX idx_profiles_profession_trgm ON profiles USING gin (profession gin_trgm_ops);

-- Multi-value Divisions per user (default protected). One row per (user, division).
CREATE TABLE user_divisions (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    division_id UUID NOT NULL REFERENCES divisions(id),
    is_protected BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE for the auto-assigned default; cannot be deleted by the user
    added_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, division_id)
);
CREATE INDEX idx_user_divisions_division ON user_divisions(division_id);
```

> **Division rules (enforced in the Profile service):** on signup, insert one `user_divisions` row for the school's default division (e.g. Nagpur) with `is_protected = TRUE`. The user may add more divisions (rows with `is_protected = FALSE`) and remove only non-protected ones. A delete of a protected row is rejected.
>
> **Profile completeness:** `is_complete = (photo_url, bio, house_id, batch_id, city, profession all NOT NULL)`. Set by the Profile service, which emits `profile.completed` (one-time activity-karma bonus, Karma System §13).

---

## 3. Alumni Verification

Backs Flow 1 step 5 and the `user.verified.alumni` event. The reviewer is an admin or a Level-5 Ambassador.

```sql
CREATE TABLE alumni_verifications (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    method          VARCHAR(30) NOT NULL CHECK (method IN ('institute_email', 'document_review', 'admin_verification')),
    evidence_url    TEXT,                       -- uploaded diploma/ID (private bucket, signed URLs only)
    institute_email CITEXT,
    status          VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'approved', 'rejected')),
    reviewed_by     UUID REFERENCES users(id),
    reviewed_at     TIMESTAMPTZ,
    reject_reason   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_alumni_verifications_user ON alumni_verifications(user_id);
CREATE INDEX idx_alumni_verifications_status ON alumni_verifications(status);
```

> On `status → approved`, the Auth/Verification service sets `users.is_alumni_verified = true`, `users.verified_at = NOW()` (the clock for ARS account-age gates), and emits `user.verified.alumni` (+25). **`verified_at` is defined as the alumni-verification approval time** — this resolves the ambiguity flagged in the audit about which event starts the level-3/4/5 age clock.

---

## 4. Authorization — Platform Roles (distinct from reputation level)

ARS conflated *moderation capability* (earned via reputation level) with *admin role* (assigned). This table holds the **assigned admin RBAC** roles referenced in `ADMIN_MODULE.md`. Reputation level stays in ARS.

```sql
CREATE TABLE user_roles (
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(30) NOT NULL CHECK (role IN
                 ('view_only_admin', 'moderator_admin', 'full_admin', 'super_admin', 'auditor')),
    granted_by UUID REFERENCES users(id),
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, role)
);
```

> **Precedence rule (resolves audit ambiguity):** platform authorization = `MAX(reputation-level capability, assigned-role capability)` for *moderation*, but admin-only surfaces (rule config, adjustments, thresholds) require an explicit `user_roles` entry — reputation level alone never grants admin-console access.

---

## 5. Social Graph

Backs connection requests (rate-limited by ARS level) and feed distribution scope ("own network, own batch, own department").

A **connection request is the contact-exchange request** (PRD Connections): requesting to connect = offering to exchange contact. On accept, contacts are mutually revealed per each side's settings. This unifies what was a separate `contact_reveal_requests` flow (see §13).

```sql
CREATE TABLE connections (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    requester_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    addressee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status       VARCHAR(20) NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'accepted', 'declined')),
    auto_accepted BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE when addressee's connection_auto_accept was on
    contact_exchanged BOOLEAN NOT NULL DEFAULT FALSE,-- both contacts revealed to each other on accept (per settings)
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    responded_at TIMESTAMPTZ,
    CHECK (requester_id <> addressee_id)
);
-- One active edge per unordered pair.
CREATE UNIQUE INDEX uq_connections_pair
    ON connections(LEAST(requester_id, addressee_id), GREATEST(requester_id, addressee_id));
CREATE INDEX idx_connections_addressee ON connections(addressee_id, status);

-- Blocking is separate from connection status (directional, hard).
CREATE TABLE user_blocks (
    blocker_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (blocker_id, blocked_id),
    CHECK (blocker_id <> blocked_id)
);
CREATE INDEX idx_user_blocks_blocked ON user_blocks(blocked_id);
```

Per-user settings on `profiles`: add `connection_auto_accept BOOLEAN NOT NULL DEFAULT FALSE`. With it on, incoming requests are auto-accepted (`auto_accepted = TRUE`). `contact_always_share` (§13) governs whether contact is revealed on acceptance.

- **Search/connect by** Name, Batch, House, Department, City → directory search (§2 indexes).
- **Suggestions** (rule-based, DECISIONS.md): same house / same batch / same city / shared industry — a query, not a table.
- **Karma:** an accepted connection grants `connection_made` activity karma (capped — see Karma System §13) to discourage mass-adding.
- **Admin:** "most connected users" = `COUNT(connections WHERE status='accepted') GROUP BY user`; "flag fake/spam connections" = moderation review queue over high-velocity connectors.

---

## 6. Posts, Comments, Reactions, Reports (Feed inputs)

Defines the feed-ranking inputs ARS commits to but never stored (`AUDIT_REPORT.md` D15). The quality scores are **denormalized, recomputed** columns — source signals live in reactions/comments.

```sql
-- Post CATEGORY (the PRD's Career Update / Job / Achievement / ... ) — admin-editable, expandable (DECISIONS.md).
CREATE TABLE post_categories (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id  UUID REFERENCES schools(id),   -- NULL = global seed category
    key        VARCHAR(40) NOT NULL,
    label      VARCHAR(80) NOT NULL,
    is_active  BOOLEAN NOT NULL DEFAULT TRUE,
    sort_order INT NOT NULL DEFAULT 0
);
CREATE UNIQUE INDEX uq_post_categories_key ON post_categories(COALESCE(school_id, '00000000-0000-0000-0000-000000000000'), key);
-- Seed: career_update, job_opening, achievement, startup, seeking_help, mentorship, school_memory, event (extensible).

CREATE TABLE posts (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id                UUID NOT NULL REFERENCES schools(id),
    author_id                UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    group_id                 UUID REFERENCES groups(id) ON DELETE CASCADE,   -- NULL = main feed; set = posted in a group feed (§ Groups)
    category_id              UUID NOT NULL REFERENCES post_categories(id),   -- every post needs a category (PRD)
    format                   VARCHAR(20) NOT NULL DEFAULT 'text'             -- post FORMAT, distinct from category
                               CHECK (format IN ('text','image_text','poll','question','link','quote','video')),
    body                     TEXT,
    media                    JSONB DEFAULT '[]',          -- [{type, url, ...}]
    link_url                 TEXT,                        -- for 'link' format
    visibility_scope         VARCHAR(20) NOT NULL DEFAULT 'network'
                               CHECK (visibility_scope IN ('network', 'batch', 'division', 'house', 'school')),
    is_pinned                BOOLEAN NOT NULL DEFAULT FALSE,    -- admin/group-mod pinned announcement
    is_edited                BOOLEAN NOT NULL DEFAULT FALSE,
    edited_at                TIMESTAMPTZ,
    quality_score            NUMERIC(8,3) NOT NULL DEFAULT 0,   -- recomputed input to algorithmic ranking
    engagement_score         NUMERIC(8,3) NOT NULL DEFAULT 0,   -- recomputed (likes/comments/shares depth) → trending
    report_penalty           NUMERIC(8,3) NOT NULL DEFAULT 0,   -- subtracted in ranking
    ranking_score            NUMERIC(10,3) NOT NULL DEFAULT 0,  -- materialized score for default algorithmic feed
    status                   VARCHAR(20) NOT NULL DEFAULT 'visible'
                               CHECK (status IN ('visible', 'limited', 'hidden', 'removed')),
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at               TIMESTAMPTZ
);
CREATE INDEX idx_posts_author ON posts(author_id);
CREATE INDEX idx_posts_created ON posts(created_at DESC);
CREATE INDEX idx_posts_category ON posts(category_id);
CREATE INDEX idx_posts_ranking ON posts(school_id, ranking_score DESC) WHERE group_id IS NULL;  -- main algorithmic feed
CREATE INDEX idx_posts_group ON posts(group_id, created_at DESC) WHERE group_id IS NOT NULL;     -- group feeds
CREATE INDEX idx_posts_engagement ON posts(school_id, engagement_score DESC);  -- top-5 trending
CREATE INDEX idx_posts_pinned ON posts(school_id, is_pinned) WHERE is_pinned;

-- Tagging/mentions: a post can tag alumni, a house, or a batch (PRD Feeds).
CREATE TABLE post_mentions (
    post_id      UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    mention_type VARCHAR(10) NOT NULL CHECK (mention_type IN ('user','house','batch')),
    user_id      UUID REFERENCES users(id) ON DELETE CASCADE,    -- when mention_type='user'
    house_id     UUID REFERENCES houses(id),                     -- when mention_type='house'
    batch_id     UUID REFERENCES batches(id),                    -- when mention_type='batch'
    PRIMARY KEY (post_id, mention_type, COALESCE(user_id,'00000000-0000-0000-0000-000000000000'),
                 COALESCE(house_id,'00000000-0000-0000-0000-000000000000'),
                 COALESCE(batch_id,'00000000-0000-0000-0000-000000000000'))
);
CREATE INDEX idx_post_mentions_user ON post_mentions(user_id) WHERE user_id IS NOT NULL;

-- Internal re-share ("share within the platform"). Distinct from external share (§ karma referral).
CREATE TABLE post_shares (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    sharer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    comment      TEXT,                                  -- optional note on the reshare
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_post_shares_original ON post_shares(original_post_id);

-- Alumni Spotlight: admin-curated feature; falls back to auto top-engagement when none curated.
CREATE TABLE spotlights (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id    UUID NOT NULL REFERENCES schools(id),
    subject_type VARCHAR(12) NOT NULL CHECK (subject_type IN ('post','user','business')),
    subject_id   UUID NOT NULL,
    headline     VARCHAR(200),
    curated_by   UUID REFERENCES users(id),             -- NULL = auto-selected
    active_from  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    active_to    TIMESTAMPTZ,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_spotlights_active ON spotlights(school_id, active_from DESC);

CREATE TABLE comments (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id    UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    author_id  UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    parent_id  UUID REFERENCES comments(id) ON DELETE CASCADE,  -- thread depth
    body       TEXT NOT NULL,
    like_count INT NOT NULL DEFAULT 0,        -- >=3 likes => publisher +2 karma bonus (Karma System §4)
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_comments_post ON comments(post_id);

CREATE TABLE reactions (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('post', 'comment')),
    entity_id  UUID NOT NULL,
    type       VARCHAR(20) NOT NULL CHECK (type IN ('like', 'celebrate', 'insightful', 'support', 'curious')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE UNIQUE INDEX uq_reactions_one_per_user ON reactions(user_id, entity_type, entity_id);

CREATE TABLE content_reports (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entity_type VARCHAR(20) NOT NULL CHECK (entity_type IN ('post', 'comment', 'message', 'user')),
    entity_id   UUID NOT NULL,
    reason      VARCHAR(40) NOT NULL,
    details     TEXT,
    status      VARCHAR(20) NOT NULL DEFAULT 'open'
                  CHECK (status IN ('open', 'upheld', 'dismissed')),
    resolved_by UUID REFERENCES users(id),
    resolved_at TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_content_reports_entity ON content_reports(entity_type, entity_id);
CREATE UNIQUE INDEX uq_content_reports_one_per_user ON content_reports(reporter_id, entity_type, entity_id);
```

> **Feed = algorithmic by default, with Reddit-style filters** (DECISIONS.md). `ranking_score` is materialized by a pg-boss job from `quality_score + engagement_score − report_penalty + a recency decay + author karma signal`. Filters (PRD Feeds): **House · Batch · Department · My Connections**, plus category/format. **Top-5 trending** = order by `engagement_score` over a recent window (`idx_posts_engagement`). **Alumni Spotlight** = current `spotlights` row, else auto-fallback to top trending.
>
> **Post content types** "Job opening / Business promotion / Achievement / Announcement" are **post categories** (`post_categories`) — they appear in the Phase-1 feed as tagged posts. The dedicated **Jobs/Referrals module** (apply flow, ATS) is Phase 2; a "Job Opening" *post* is just feed content now.
>
> `like_count >= 3` on a comment and `>= 5` likes on a post are **karma bonus** triggers (`ALUMNI_REPUTATION_SYSTEM.md` §4), fired by the Karma service — not feed logic. Author **house badge** renders from `profiles.house_id → houses.color_hex`.

---

## 7. Messaging — **Phase 2**

Connection-gated DMs (DECISIONS.md), restricted by age-tier (§12): `minor_restricted` cannot DM at all; `minor_supervised` only within the verified network / approved mentorship channels. Transport is Socket.IO; these tables are the persistence layer. **Deferred to Phase 2** along with Jobs and Mentorship — the social graph and contact-exchange remain Phase 1.

```sql
CREATE TABLE conversations (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE conversation_participants (
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (conversation_id, user_id)
);
CREATE TABLE messages (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body            TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at      TIMESTAMPTZ
);
-- Supports the per-day DM count and min-interval checks in INTEGRATION_SPEC.md.
CREATE INDEX idx_messages_sender_time ON messages(sender_id, created_at DESC);
```

---

## 8. Reference Entities (events, groups, tournaments)

ARS uses these only as `reference_entity_type` / `entity_id` and as event emitters. Minimal definitions; full specs belong to their own modules.

```sql
CREATE TABLE events (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organizer_id UUID NOT NULL REFERENCES users(id),
    title       VARCHAR(200) NOT NULL,
    starts_at   TIMESTAMPTZ NOT NULL,
    mode        VARCHAR(20) CHECK (mode IN ('online', 'in_person', 'hybrid')),
    is_featured BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE event_attendance (
    event_id    UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role        VARCHAR(20) NOT NULL DEFAULT 'attendee' CHECK (role IN ('attendee', 'speaker', 'organizer')),
    checked_in_at TIMESTAMPTZ,
    PRIMARY KEY (event_id, user_id)
);

CREATE TABLE groups (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id  UUID NOT NULL REFERENCES users(id),
    name      VARCHAR(160) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE tournaments (
    id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    host_id   UUID NOT NULL REFERENCES users(id),
    name      VARCHAR(200) NOT NULL,
    type      VARCHAR(30),
    status    VARCHAR(20) NOT NULL DEFAULT 'open',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## 11. Karma & Ledger

Implements the frozen `ALUMNI_REPUTATION_SYSTEM.md` (Karma System). Karma is **fractional** → `NUMERIC`. Two measures per user; the ledger is the source of truth.

```sql
-- Per-user karma state (denormalized from the ledger for fast reads).
CREATE TABLE user_karma (
    user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    karma_balance    NUMERIC(10,2) NOT NULL DEFAULT 0 CHECK (karma_balance >= 0),  -- spendable; earn − redeem (single pool)
    earned_karma_30d NUMERIC(10,2) NOT NULL DEFAULT 0,                             -- rolling 30d excl. redemptions; drives unlocks
    lifetime_earned  NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),-- cumulative positive earn; leaderboards/milestones
    computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_user_karma_earned30 ON user_karma(earned_karma_30d DESC);   -- unlock checks
CREATE INDEX idx_user_karma_lifetime ON user_karma(lifetime_earned DESC);    -- individual/house leaderboards

-- Append-only karma ledger. One row PER AFFECTED USER per interaction
-- (a like writes two rows: one for the liker as 'actor', one for the publisher).
CREATE TABLE karma_transactions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,  -- the affected user
    counterparty_id UUID REFERENCES users(id),                              -- the other party (nullable)
    role            VARCHAR(12) NOT NULL CHECK (role IN ('actor', 'publisher')),
    action_type     VARCHAR(40) NOT NULL CHECK (action_type IN (
                       -- content (§3-§4)
                       'like','comment','share','downvote_post','downvote_comment',
                       'bonus_comment_3likes','bonus_post_5likes','bonus_referral_signup',
                       -- activity karma (§13)
                       'daily_login','profile_field','profile_complete','business_added',
                       'business_review','event_attended','event_hosted','event_feedback',
                       'referral_signup','donation','connection_made','group_joined',
                       'game_completed','game_won','game_participated','tournament_won',
                       -- spending (§14) and admin (§15)
                       'redemption','admin_adjustment')),
    base_value      NUMERIC(8,2) NOT NULL,        -- nominal value before caps
    applied_value   NUMERIC(8,2) NOT NULL,        -- value actually applied (after caps/collusion/floor)
    reason_code     VARCHAR(40),                  -- 'daily_like_cap','daily_comment_cap','daily_share_cap',
                                                  -- 'collusion_pair_like','collusion_comment_burst',
                                                  -- 'publisher_daily_cap','daily_neg_floor','downvote_gate'
    entity_type     VARCHAR(20),                  -- 'post' | 'comment' | 'share'
    entity_id       UUID,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX idx_karma_tx_user_time ON karma_transactions(user_id, created_at DESC);
CREATE INDEX idx_karma_tx_pair_time ON karma_transactions(counterparty_id, user_id, created_at DESC);
-- Append-only: REVOKE UPDATE, DELETE from the app role.

-- Daily counters for actor-side caps (§5) and pair caps (§6). Derivable from the ledger,
-- cached here for O(1) checks at write time. Keyed on IST calendar day (DECISIONS.md: Asia/Kolkata).
CREATE TABLE karma_daily_counters (
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_ist      DATE NOT NULL,
    likes_made   INT NOT NULL DEFAULT 0,
    comments_made INT NOT NULL DEFAULT 0,
    shares_made  INT NOT NULL DEFAULT 0,
    net_karma    NUMERIC(8,2) NOT NULL DEFAULT 0,   -- for the -10 negative floor (§7)
    PRIMARY KEY (user_id, day_ist)
);

-- Pair/day counters: enforce the +20 publisher daily cap (§6) and the A->B >5 likes/24h rule.
CREATE TABLE karma_pair_daily (
    actor_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_ist        DATE NOT NULL,
    positive_given NUMERIC(8,2) NOT NULL DEFAULT 0,  -- karma actor has contributed to target today (cap +20)
    likes_given    INT NOT NULL DEFAULT 0,           -- for the >5/24h targeted-like rule
    PRIMARY KEY (actor_id, target_id, day_ist)
);
```

> **Write path (per `ALUMNI_REPUTATION_SYSTEM.md` §9):** the Karma service computes caps from `karma_daily_counters` + `karma_pair_daily`, writes the ledger row(s) with `base_value`/`applied_value`/`reason_code`, bumps counters, and updates `user_karma` (clamping `total_karma >= 0`). `earned_karma_30d` is recomputed (sum of `applied_value` where `created_at >= now() - 30d`) by a scheduled job and on read; a pg-boss job ages out the window daily.

---

## 12. Age-Tier Safety (minors)

Derived from `users.member_type`, `current_class`, and `date_of_birth` (DECISIONS.md minor policy). No new table — a computed tier drives gating in the app/service layer.

| Tier | Who | Messaging | Map | Other |
|------|-----|-----------|-----|-------|
| `adult` | alumni, teachers, students 18+ | Connection-gated DMs allowed | Opt-in | Full per karma/verification |
| `minor_supervised` | students Classes 8–12 (under 18) | Only within verified school network + **approved mentorship channels**; no open DMs | **Excluded** | Automated safety monitoring; **cannot share contact info or external links** |
| `minor_restricted` | students Classes 6–7 (under 13) | **No direct messaging**; interact only via **moderated** groups/posts/comments | **Excluded** | Heaviest monitoring; reduced profile visibility |

```sql
-- Captured at signup; consent gate for minors.
CREATE TABLE guardian_consents (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guardian_name  VARCHAR(160) NOT NULL,
    guardian_email CITEXT,
    guardian_phone VARCHAR(20),
    consented_at TIMESTAMPTZ,
    method       VARCHAR(30),    -- 'email_link' | 'document' | 'admin_recorded'
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

> The tier is computed (not stored) so it updates automatically: a Class-7 student rolls from `minor_restricted` → `minor_supervised` → `adult` as class/DOB advances. The app enforces the table above at every messaging/map/link-share entry point. Minor accounts require a `guardian_consents` row before `status` can become `active`.

---

## 13. Contact Exchange (unified into Connections — §5)

Per the PRD, **a connection request IS the contact-exchange request** — so this is realized through the `connections` table (§5), not a separate request system. Contact is never shown by default; sending a connection request offers your contact, and on acceptance both parties' contacts are revealed to each other (mutual), subject to each side's settings and the minor rules (§12).

```sql
-- Per-user contact/connection settings (single source of truth on the profile).
ALTER TABLE profiles
    ADD COLUMN contact_always_share     BOOLEAN NOT NULL DEFAULT FALSE,  -- reveal contact automatically on any accepted connection
    ADD COLUMN connection_auto_accept   BOOLEAN NOT NULL DEFAULT FALSE;  -- auto-accept incoming connection requests
```

> Flow: A taps "Connect / Exchange contact" with B → `connections` row (`pending`). If B has `connection_auto_accept`, it becomes `accepted` (`auto_accepted = TRUE`); else B accepts/declines. On accept, `contact_exchanged` is set and each side's contact is revealed to the other **iff** that side allows it (explicit accept or `contact_always_share`). **Minors' contact info is never revealed** regardless of settings (§12). *(The earlier separate `contact_reveal_requests` table is dropped in favour of this unified model.)*

---

## 14. How this resolves audit findings

| Audit finding | Resolved by |
|---------------|-------------|
| D14 — no users/auth/profile schema | §1 `users`/sessions/credentials, §2 `profiles` |
| D14 — leaderboard/directory filters undefined | §0 `batches` + §2 `profiles.batch_id/city/company/industry/department` + trigram indexes |
| D15 — feed inputs undefined | §6 posts `quality_score`/`engagement_score`/`report_penalty`/`ranking_score`, reactions/comments |
| `verified_at` ambiguity (Section 5 of audit) | §1/§3 defines it as verification approval time |
| Admin role vs reputation level conflation | §4 `user_roles` + precedence rule |
| 2FA for big admin actions had no factor store | §1 `mfa_factors` |

### Resolves DECISIONS.md / PRD requirements

| Requirement | Resolved by |
|-------------|-------------|
| Simple Karma (fractional, two measures, ledger) | §11 `user_karma`, `karma_transactions`, daily/pair counters |
| Multi-school readiness | §0 `schools` + `school_id` on core tables |
| Identity: House (single), Division (multi, protected default) | §0 `houses`/`divisions`, §2 `profiles.house_id` + `user_divisions` |
| Identity: Batch (7-yr range), Profession, City, Department | §0 `batches`, §2 `profiles` |
| Minors / age-tier safety | §1 `member_type`/`current_class`/`date_of_birth`, §12 tiers + `guardian_consents` |
| Mutual-consent contact exchange | §5 unified into `connections` + `profiles.contact_always_share`/`connection_auto_accept` (§13) |
| Structured feed: format + category + tagging + reshare | §6 `posts.format`, `post_categories`, `post_mentions`, `post_shares`, `spotlights` |
| Networking: connections, blocking, suggestions | §5 `connections`, `user_blocks` |
| Groups / micro-communities | `MODULES_SCHEMA.md` §7 `groups`, `group_members` (+ `posts.group_id`) |

## 15. Still out of scope (needs its own spec)

Jobs/referrals module (apply flow, external ATS links), school announcements, mentorship request→accept flow tables, events RSVP/attendance detail, groups membership/roles, Razorpay donations (payments/tax/refunds), notifications delivery, the Alumni Map geocoding pipeline, and the member-facing web UI. Referenced by the vision but not yet specified — candidates for the MVP PRD (#3).
