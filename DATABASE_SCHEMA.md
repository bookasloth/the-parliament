# ARS Database Schema

## Technology: PostgreSQL

All tables use UUID primary keys, `TIMESTAMPTZ` for timestamps, and JSONB for flexible configurations.

---

## Table: `reputation_levels`

Defines the 6 reputation levels (0–5) and their associated permissions.

```sql
CREATE TABLE reputation_levels (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) NOT NULL,
    level       INT NOT NULL UNIQUE CHECK (level >= 0 AND level <= 5),
    min_score   INT NOT NULL DEFAULT 0,
    permissions JSONB NOT NULL DEFAULT '{}',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_levels_level ON reputation_levels(level);
```

### Permissions JSONB Structure

```json
{
  "can_view_public": true,
  "can_browse_profiles": true,
  "can_register": true,
  "can_react": false,
  "can_comment": false,
  "can_create_post": false,
  "can_create_event": false,
  "can_create_tournament": false,
  "can_create_group": false,
  "can_mass_message": false,
  "can_moderate": false,
  "can_verify_members": false,
  "can_announce_institute_wide": false,
  "can_send_connection_request": 0,
  "can_send_direct_message": 0,
  "can_send_group_invite": 0,
  "can_send_event_invite": 0,
  "post_visibility_tier": 0,
  "post_boost_factor": 1.0
}
```

---

## Table: `reputation_scores`

One row per user. Stores current score and lifetime aggregates.

```sql
CREATE TABLE reputation_scores (
    user_id          UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    level_id         UUID NOT NULL REFERENCES reputation_levels(id),
    total_score      INT NOT NULL DEFAULT 0 CHECK (total_score >= 0),
    lifetime_earned  INT NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
    lifetime_lost    INT NOT NULL DEFAULT 0 CHECK (lifetime_lost >= 0),
    version          BIGINT NOT NULL DEFAULT 0,  -- optimistic-lock counter; bumped on every processTransaction (AUDIT_REPORT D21)
    computed_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_scores_total_score ON reputation_scores(total_score DESC);
CREATE INDEX idx_reputation_scores_level_id ON reputation_scores(level_id);
```

**Note:** `total_score` is a computed/denormalized field derived from `reputation_transactions`. It must only be updated through the `processTransaction` service method, never directly.

---

## Table: `reputation_transactions`

Immutable, append-only ledger of all reputation changes. This is the source of truth.

```sql
CREATE TABLE reputation_transactions (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta                 INT NOT NULL,                 -- effective delta; see "Score Clamping" below
    score_before          INT NOT NULL,
    score_after           INT NOT NULL,
    transaction_type      VARCHAR(50) NOT NULL CHECK (transaction_type IN ('earn', 'penalty', 'adjustment', 'admin_bonus', 'admin_penalty', 'reversal')),
    rule_key              VARCHAR(100) REFERENCES reputation_rules(key),  -- nullable: system types ('adjustment','reversal') carry no rule
    admin_id              UUID REFERENCES users(id),    -- the admin who caused this entry (adjustments/penalties); NULL for system-earned
    adjustment_id         UUID REFERENCES reputation_adjustments(id),     -- links an 'adjustment' tx to its authority row
    reversed_transaction_id UUID REFERENCES reputation_transactions(id),  -- for 'reversal' rows, the tx being reversed
    reason                TEXT,
    reference_entity_type VARCHAR(50),
    reference_entity_id   UUID,
    metadata              JSONB DEFAULT '{}',
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_transactions_user_id ON reputation_transactions(user_id);
CREATE INDEX idx_reputation_transactions_created_at ON reputation_transactions(created_at DESC);
CREATE INDEX idx_reputation_transactions_rule_key ON reputation_transactions(rule_key);
CREATE INDEX idx_reputation_transactions_type ON reputation_transactions(transaction_type);

-- Required for audit reconstruction
CREATE INDEX idx_reputation_transactions_lookup
    ON reputation_transactions(user_id, created_at DESC);
```

CREATE INDEX idx_reputation_transactions_admin_id ON reputation_transactions(admin_id) WHERE admin_id IS NOT NULL;

### Constraints & Score Clamping (corrected — see AUDIT_REPORT D2, D7)
- **`delta` is the EFFECTIVE delta**, not the nominal rule value. The invariant `score_before + delta = score_after` ALWAYS holds and is the basis for audit reconstruction (a user's score is the running sum of `delta`).
- **Clamping at 0:** scores never go below 0. When a penalty's nominal value would push the score negative, the service computes `score_after = MAX(0, score_before + nominal_value)` and writes `delta = score_after - score_before` (the clamped, effective delta). The nominal rule value is preserved in `metadata.nominal_delta` for reporting.
- **No-op guard moved to the service layer:** if `score_after == score_before` (effective delta 0 — e.g. a penalty applied to a user already at 0), the service records the event as processed with **no transaction row** rather than violating an FK/CHECK. The old `CHECK (delta != 0)` is removed because clamped/no-op cases are legitimate and must not raise a DB error.
- `rule_key` is nullable: `'adjustment'` and `'reversal'` transactions carry no rule. `'admin_bonus'`/`'admin_penalty'` use the seeded `admin.bonus`/`admin.penalty` rules.
- Rows are never updated or deleted (append-only). Enforced at the DB layer by `REVOKE UPDATE, DELETE ON reputation_transactions` from the application role; corrections are made by appending a `reversal`.

---

## Table: `reputation_rules`

Configurable earning and penalty rules. All values are admin-tunable.

```sql
CREATE TABLE reputation_rules (
    key            VARCHAR(100) PRIMARY KEY,
    display_name   VARCHAR(200) NOT NULL,
    description    TEXT,
    rule_type      VARCHAR(20) NOT NULL CHECK (rule_type IN ('earn', 'penalty')),
    default_value  INT NOT NULL,
    current_value  INT NOT NULL,
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    cooldown_hours INT DEFAULT 0,
    max_daily      INT DEFAULT 0,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_rules_type ON reputation_rules(rule_type);
```

### Seeded Rules

```sql
-- Earning Rules
INSERT INTO reputation_rules (key, display_name, rule_type, default_value, current_value, cooldown_hours, max_daily) VALUES
('profile.completed', 'Profile Completion', 'earn', 10, 10, NULL, NULL),
('alumni.verified', 'Alumni Verification', 'earn', 25, 25, NULL, NULL),
('email.verified', 'Email Verification', 'earn', 10, 10, NULL, NULL),
('mobile.verified', 'Mobile Verification', 'earn', 15, 15, NULL, NULL),
('event.attended', 'Event Attendance', 'earn', 10, 10, NULL, NULL),
('event.speaker', 'Event Speaker', 'earn', 50, 50, NULL, NULL),
('tournament.participated', 'Tournament Participation', 'earn', 5, 5, NULL, NULL),
('tournament.won', 'Tournament Winner', 'earn', 20, 20, NULL, NULL),
('tournament.hosted', 'Tournament Hosting', 'earn', 30, 30, NULL, NULL),
('referral.verified', 'Verified Alumni Referral', 'earn', 30, 30, NULL, NULL),
('comment.meaningful', 'Meaningful Comment', 'earn', 2, 2, 1, 10),
('content.positive_contribution', 'Positive Community Contribution', 'earn', 10, 10, 24, 3),
('moderation.assist', 'Moderation Assistance', 'earn', 15, 15, 1, 5),
('mentorship.accepted', 'Mentorship Connection', 'earn', 25, 25, 168, 1),
('streak.7day', '7-Day Activity Streak', 'earn', 10, 10, 168, 1),
('streak.30day', '30-Day Activity Streak', 'earn', 50, 50, 720, 1),
('badge.earned', 'Badge Earned', 'earn', 20, 20, NULL, NULL),
('tournament.runner_up', 'Tournament Runner-Up', 'earn', 10, 10, NULL, NULL),
('tournament.fair_play.5', 'Fair Play Streak (5)', 'earn', 10, 10, NULL, NULL),
('tournament.fair_play.20', 'Fair Play Streak (20)', 'earn', 50, 50, NULL, NULL),
('sportsmanship', 'Sportsmanship Recognition', 'earn', 25, 25, NULL, NULL),
('admin.bonus', 'Administrator Bonus', 'earn', 50, 50, NULL, NULL);

-- Penalty Rules
INSERT INTO reputation_rules (key, display_name, rule_type, default_value, current_value, is_active) VALUES
('spam.content', 'Spam Content', 'penalty', -20, -20, true),
('content.removed', 'Content Removed', 'penalty', -30, -30, true),
('reports.repeated', 'Repeated Reports', 'penalty', -10, -10, true),
('messaging.abuse', 'Mass Messaging Abuse', 'penalty', -50, -50, true),
('fraudulent.activity', 'Fraudulent Activity', 'penalty', -100, -100, true),
('cheating.detected', 'Cheating Detected', 'penalty', -150, -150, true),
('suspension', 'Suspension', 'penalty', -250, -250, true),
('impersonation', 'Impersonation', 'penalty', -200, -200, true),
('harassment', 'Harassment', 'penalty', -150, -150, true),
('tournament.unsportsmanlike', 'Unsportsmanlike Conduct', 'penalty', -50, -50, true),
('tournament.no_show', 'Tournament No-Show', 'penalty', -15, -15, true),
('tournament.rule_violation', 'Tournament Rule Violation', 'penalty', -75, -75, true),
('admin.penalty', 'Administrator Penalty', 'penalty', -50, -50, true);
```

---

## Table: `reputation_events`

Raw event ingestion log. Each event may or may not result in a transaction.

```sql
CREATE TABLE reputation_events (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dedup_key    VARCHAR(200) NOT NULL,   -- producer-supplied idempotency key (e.g. "event.attended:<eventId>:<userId>")
    user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    rule_key     VARCHAR(100) NOT NULL REFERENCES reputation_rules(key),
    entity_type  VARCHAR(50) NOT NULL,
    entity_id    UUID NOT NULL,
    metadata     JSONB DEFAULT '{}',
    processed    BOOLEAN NOT NULL DEFAULT FALSE,
    error        TEXT,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Idempotency / anti-replay (AUDIT_REPORT D8): a given producer event is ingested at most once.
CREATE UNIQUE INDEX uq_reputation_events_dedup ON reputation_events(dedup_key);

-- "Per event" / "Per tournament" rules award at most once per (user, rule, entity).
-- Earn rules whose cooldown/daily caps are NULL rely on this to prevent re-award.
CREATE UNIQUE INDEX uq_reputation_events_entity
    ON reputation_events(user_id, rule_key, entity_type, entity_id);

CREATE INDEX idx_reputation_events_user_id ON reputation_events(user_id);
CREATE INDEX idx_reputation_events_processed ON reputation_events(processed);
CREATE INDEX idx_reputation_events_created_at ON reputation_events(created_at DESC);
```

---

## Table: `reputation_thresholds`

Configurable level-up boundaries, linked to `reputation_levels`.

```sql
CREATE TABLE reputation_thresholds (
    level_id                     UUID PRIMARY KEY REFERENCES reputation_levels(id) ON DELETE CASCADE,
    required_score               INT NOT NULL DEFAULT 0,
    additional_requirements      JSONB DEFAULT '{}',
    required_days_since_verification INT DEFAULT 0,
    created_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

### Additional Requirements JSONB Structure

```json
{
  "requires_profile_complete": true,
  "requires_verified_email": true,
  "requires_verified_mobile": true,
  "requires_verified_alumni": true,
  "requires_admin_nomination": false,
  "requires_ambassador_nomination": false
}
```

---

## Table: `reputation_penalties`

Tracks active and historical penalties applied to users.

```sql
CREATE TABLE reputation_penalties (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id        UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta          INT NOT NULL,   -- the effective reputation impact applied (AUDIT_REPORT D5); needed to restore on reverse
    transaction_id UUID NOT NULL REFERENCES reputation_transactions(id),  -- the ledger entry this penalty produced
    severity       VARCHAR(20) NOT NULL CHECK (severity IN ('minor', 'moderate', 'severe', 'critical')),
    reason         TEXT NOT NULL,
    reviewer_id    UUID REFERENCES users(id),
    is_active      BOOLEAN NOT NULL DEFAULT TRUE,
    reversed_at    TIMESTAMPTZ,    -- set when a reverse restores the score (with a 'reversal' transaction)
    expires_at     TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_penalties_user_id ON reputation_penalties(user_id);
CREATE INDEX idx_reputation_penalties_active ON reputation_penalties(is_active);
CREATE INDEX idx_reputation_penalties_expires_at ON reputation_penalties(expires_at);
```

---

## Table: `reputation_adjustments`

Tracks all manual admin adjustments for audit purposes.

```sql
CREATE TABLE reputation_adjustments (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    delta              INT NOT NULL CHECK (delta != 0),
    reason             TEXT NOT NULL,
    admin_id           UUID NOT NULL REFERENCES users(id),
    approved_by        UUID REFERENCES users(id),
    transaction_id     UUID REFERENCES reputation_transactions(id),  -- set once applied (AUDIT_REPORT D6); NULL while pending
    two_factor_verified BOOLEAN NOT NULL DEFAULT FALSE,              -- required true before applying |delta| > 500 (AUDIT_REPORT D12)
    status             VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at        TIMESTAMPTZ,
    -- An admin may not approve their own adjustment (AUDIT_REPORT D12).
    CONSTRAINT no_self_approval CHECK (approved_by IS NULL OR approved_by <> admin_id)
);

CREATE INDEX idx_reputation_adjustments_user_id ON reputation_adjustments(user_id);
CREATE INDEX idx_reputation_adjustments_admin_id ON reputation_adjustments(admin_id);
CREATE INDEX idx_reputation_adjustments_status ON reputation_adjustments(status);
```

---

## Table: `reputation_nominations`

Records nominations required by gated levels (e.g. Level 5 — Alumni Ambassador). Without this, the `requires_admin_nomination` / `requires_ambassador_nomination` threshold flags are unenforceable (AUDIT_REPORT D10).

```sql
CREATE TABLE reputation_nominations (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,   -- the nominee
    nominated_by  UUID NOT NULL REFERENCES users(id),                     -- admin or existing ambassador
    target_level  INT NOT NULL REFERENCES reputation_levels(level),
    status        VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'revoked')),
    reason        TEXT,
    decided_by    UUID REFERENCES users(id),
    decided_at    TIMESTAMPTZ,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_nominations_user ON reputation_nominations(user_id);
CREATE UNIQUE INDEX uq_reputation_nominations_active
    ON reputation_nominations(user_id, target_level)
    WHERE status IN ('pending', 'approved');
```

`evaluateRequirements(userId, level)` consults this table when a threshold sets `requires_admin_nomination` or `requires_ambassador_nomination`.

---

## Table: `reputation_badges`

Future-ready badge definitions. Supports the extensibility pillar.

```sql
CREATE TABLE reputation_badges (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name           VARCHAR(100) NOT NULL,
    description    TEXT,
    icon_url       TEXT,
    required_level INT REFERENCES reputation_levels(level),
    criteria       JSONB DEFAULT '{}',
    is_hidden      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_reputation_badges_required_level ON reputation_badges(required_level);
```

---

## Table: `user_badges`

Junction table connecting users to awarded badges.

```sql
CREATE TABLE user_badges (
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_id    UUID NOT NULL REFERENCES reputation_badges(id) ON DELETE CASCADE,
    awarded_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (user_id, badge_id)
);

CREATE INDEX idx_user_badges_user_id ON user_badges(user_id);
```

---

## User Model Extension

Add the following fields to the existing `users` table:

```sql
ALTER TABLE users
    ADD COLUMN current_reputation_score INT NOT NULL DEFAULT 0,
    ADD COLUMN current_reputation_level INT NOT NULL DEFAULT 0,
    ADD COLUMN reputation_level_id UUID REFERENCES reputation_levels(id),
    ADD COLUMN verified_at TIMESTAMPTZ,
    ADD COLUMN verification_status VARCHAR(50) DEFAULT 'pending',
    ADD COLUMN is_alumni_verified BOOLEAN NOT NULL DEFAULT FALSE;
```

---

## Migration Strategy

All migrations should be run in sequence:

> **Prerequisite (AUDIT_REPORT D14):** these migrations assume a `users` table already exists. It is **not** defined in this repository. The core platform schema (users, auth, profile with `department`/`batch`/`location`) must be created before migration `004`.

1. `001_create_reputation_rules.sql` — Create `reputation_rules` table + seed data (incl. gaming/streak rules)
2. `002_create_reputation_levels.sql` — Create `reputation_levels` table + seed data
3. `003_create_reputation_thresholds.sql` — Create `reputation_thresholds` table + seed data
4. `004_create_reputation_scores.sql` — Create `reputation_scores` table (incl. `version`)
5. `005_create_reputation_transactions.sql` — Create `reputation_transactions` (defer `adjustment_id` FK; see note)
6. `006_create_reputation_events.sql` — Create `reputation_events` table + dedup indexes
7. `007_create_reputation_penalties.sql` — Create `reputation_penalties` (FK → transactions)
8. `008_create_reputation_adjustments.sql` — Create `reputation_adjustments` (FK → transactions); then `ALTER reputation_transactions ADD CONSTRAINT fk_adjustment FOREIGN KEY (adjustment_id) REFERENCES reputation_adjustments(id)` to resolve the circular reference
9. `009_create_reputation_nominations.sql` — Create `reputation_nominations` table
10. `010_create_reputation_badges.sql` — Create `reputation_badges` and `user_badges` tables
11. `011_alter_users_add_reputation.sql` — Add reputation fields to `users` table
12. `012_hardening.sql` — `REVOKE UPDATE, DELETE ON reputation_transactions FROM app_role` (append-only audit, AUDIT_REPORT D7)

> **Circular FK note:** `reputation_transactions.adjustment_id` → `reputation_adjustments` and `reputation_adjustments.transaction_id` → `reputation_transactions` form a cycle. Create both tables first, then add the second FK via `ALTER TABLE`. Both columns are nullable, so rows can be inserted and back-filled within one DB transaction.

---

## Entity Relationship Summary

```
users (1) ─────< (1) reputation_scores
users (1) ─────< (N) reputation_transactions
users (1) ─────< (N) reputation_events
users (1) ─────< (N) reputation_penalties
users (1) ─────< (N) reputation_adjustments
users (1) ─────< (N) user_badges >──── (1) reputation_badges
users (1) ─────< (N) reputation_nominations
reputation_levels (1) ────< (N) reputation_scores
reputation_levels (1) ────< (1) reputation_thresholds
reputation_rules (1) ─────< (N) reputation_transactions
reputation_transactions (1) ─< (0..1) reputation_penalties   (penalty → its ledger entry)
reputation_transactions (1) ─< (0..1) reputation_adjustments (adjustment ↔ ledger entry)
reputation_transactions (1) ─< (0..N) reputation_transactions (reversal → original)
```
