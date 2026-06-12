# The Parliament — Repository Audit & Gap Analysis

**Audit date:** 2026-06-12
**Auditor role:** Principal Product Architect / Software Architect / DB Architect / Security / QA / DevOps
**Scope reviewed:** All 8 design documents in the repository. No source code exists.

---

## 0. Ground Truth (read this first)

This repository is **documentation-only**. It contains 8 Markdown files and **no code, no schema files, no migrations, no application scaffold, no configuration, and no tests**:

| File | Purpose |
|------|---------|
| `ALUMNI_REPUTATION_SYSTEM.md` | Product spec for the reputation system (levels, rules, penalties) |
| `DATABASE_SCHEMA.md` | PostgreSQL DDL for 10 ARS tables + `users` ALTER |
| `SERVICE_ARCHITECTURE.md` | Service/repository layering + TypeScript interfaces |
| `API_SPECIFICATION.md` | 11 public/admin REST endpoints |
| `ADMIN_MODULE.md` | Admin dashboard tabs + admin REST endpoints |
| `INTEGRATION_SPEC.md` | Event contracts between ARS and 8 other modules |
| `USER_FLOWS.md` | 8 narrative user journeys |
| `ROADMAP.md` | 6 milestones / 12 sprints |

**Consequence:** The documented platform ("alumni networking, profiles, posts, messaging, events, groups, jobs, announcements, gaming") does **not** exist. Only the **design of one cross-cutting subsystem (ARS)** is written, and even that subsystem's host platform — the `users` table it extends, the auth system, profiles, posts, messaging — is **undefined**. ARS is specified as if bolted onto a platform that has not been designed.

This audit therefore (a) validates the ARS design, (b) surfaces the platform-level voids ARS depends on, and (c) applies high-confidence corrections to the design docs. It does **not** scaffold code — see the single blocking question at the end.

---

## 1. Product Understanding

**Problem solved:** A trust/quality framework for an alumni-only social network. Reputation gates privileges so brand-new or low-trust accounts cannot spam, abuse messaging, or flood the feed before earning standing.

**Target users:** Verified school/university alumni; admins/moderators; (future) institutes.

**Current feature set (designed, not built):** A reputation ledger with 6 levels (Visitor → Ambassador), 18 earn rules + 10 penalty rules, level resolution, permission gating, an admin dashboard, and event-driven integration hooks into 8 modules.

**Planned feature set:** Badges, achievements, endorsements, mentorship/professional/community reputation, institute recognition.

**Missing product requirements (not addressed anywhere):**
- The **core platform** itself — users, auth, profiles, posts/feed, messaging, events, groups, jobs, announcements — has no spec. ARS references all of them but none exist.
- **Appeals workflow** is described narratively (Flow 4) but has no data model, endpoints, or state machine.
- **Nomination** for Level 5 (admin/ambassador) is required but has no storage or endpoint.
- **Account-age / "days since verification"** gating is required by levels 3–5 but `verified_at` semantics (which verification starts the clock?) are unspecified.
- **GDPR/data-subject** handling vs. the "soft-delete only, never hard-delete reputation records" rule is unreconciled (right-to-erasure conflict).

---

## 2. Architecture Understanding

| Layer | As designed | Verdict |
|-------|-------------|---------|
| **Frontend** | "Responsive web first, mobile later." Admin dashboard tabs described in prose. No framework, no state/routing/error strategy. | **Undefined.** Only admin UI sketched; member-facing UI absent. |
| **Backend** | Node.js/TypeScript, layered (Controller → Service → Domain → Repository), Prisma **or** Kysely (undecided), event bus. | **Coherent design**, stack not chosen. |
| **Database** | PostgreSQL, UUID PKs, `TIMESTAMPTZ`, JSONB. 10 ARS tables + `users` ALTER. | **Good bones, several correctness bugs** (Section 3). |
| **Authentication** | "JWT Bearer." Internal calls via static `X-Service-Auth` header. | **Severely underspecified.** No refresh/rotation/session/storage/MFA model. The `users` table it authenticates against is undefined. |
| **Authorization** | Reputation-level `PermissionGuard` middleware + admin RBAC (5 roles). | **Design is sound**; conflates *moderation capability* (reputation level) with *admin role* (RBAC) without stating precedence. |
| **Deployment** | None. No CI/CD, env, container, secrets, or infra docs. RabbitMQ/Redis named once, never specified. | **Absent.** |

---

## 3. Defects & Missing Links (verified against the docs)

Each item below is grounded in a specific line of a specific document. Severity is defined in Section 4.

### 3.1 — Foreign-key violations that crash at runtime

- **D1 (Critical).** `reputation_transactions.rule_key` is `NOT NULL REFERENCES reputation_rules(key)` (`DATABASE_SCHEMA.md:90`). But `INTEGRATION_SPEC.md` requires processing events for rule keys that are **never seeded**: `tournament.runner_up`, `tournament.no_show`, `tournament.unsportsmanlike`, `tournament.rule_violation`, `tournament.fair_play.5/.20`, `sportsmanship`. Processing any of these inserts a transaction whose `rule_key` has no matching row → **FK violation, transaction fails**. The reward/penalty silently never happens.
- **D2 (Critical).** `transaction_type` allows `'adjustment'` and `'reversal'` (`DATABASE_SCHEMA.md:89`), but `rule_key` is `NOT NULL` with an FK. There is **no generic `adjustment` or `reversal` rule** seeded, so a manual adjustment or a reversal **cannot be written** without inventing a rule key. Same failure mode as D1.
- **D3 (High).** `USER_FLOWS.md` references streak keys `streak.5` / `streak.20` and `fair_play.5`; the schema seeds `streak.7day` / `streak.30day`. Key drift → handlers reference non-existent rules.

### 3.2 — The audit trail cannot be built from the schema

- **D4 (Critical).** `API_SPECIFICATION.md:333` (`GET /audit`) and `ADMIN_MODULE.md` return `adminId` / `adminName` **per transaction row**. But `reputation_transactions` has **no `admin_id` column** (`DATABASE_SCHEMA.md:83`). The documented audit endpoint is **unimplementable** as specified — admin attribution lives only in `reputation_adjustments`, which is not linked to the transaction.

### 3.3 — Penalty reverse/restore is impossible

- **D5 (Critical).** Admin endpoint `POST /penalties/:id/reverse` "reverse + restore score" (`ADMIN_MODULE.md:214`). But `reputation_penalties` stores **no `delta` and no `transaction_id`** (`DATABASE_SCHEMA.md:236`). There is no way to know *how much* to restore or *which* ledger entry the penalty corresponds to. Reverse cannot be implemented.

### 3.4 — Adjustment ↔ ledger linkage missing

- **D6 (High).** `reputation_adjustments` has no `transaction_id`, and `reputation_transactions` has no `adjustment_id`. "Admin adjustments require triples" (`SERVICE_ARCHITECTURE.md:369`) cannot be reconstructed/audited because the authority row and the ledger row are not joined.

### 3.5 — Ledger invariant contradicts the clamp rule

- **D7 (Critical / data-integrity).** Two stated rules contradict:
  - "`score_before + delta = score_after` must hold" (`DATABASE_SCHEMA.md:110`).
  - "Penalties never bring score below 0 … `MAX(0, current + delta)`" (`SERVICE_ARCHITECTURE.md:374`).
  - Counterexample: score 10, penalty −20 → clamp gives `score_after = 0`, but `10 + (−20) = −10 ≠ 0`. The invariant **breaks on every clamp**, and `CHECK (delta != 0)` (`DATABASE_SCHEMA.md:86`) **forbids recording** a penalty against a user already at 0. Pick one model: store the **effective delta** (so the invariant always holds) or drop the invariant. They cannot both be true.

### 3.6 — Idempotency is claimed but not enforceable

- **D8 (Critical / anti-abuse).** "Idempotent event handling … a second ingestion of the same event ID is a no-op" (`SERVICE_ARCHITECTURE.md:365`). But `reputation_events` has **no unique constraint** and **no external event id** (`DATABASE_SCHEMA.md:182`). Worse, the "Per event" / "Per tournament" rules (`event.attended`, `tournament.won`, etc.) have `cooldown_hours = NULL` and `max_daily = NULL`, so **nothing prevents the same event from awarding reputation repeatedly**. This is the central anti-gaming hole: attend-once should award once, but the model allows replay → unlimited score inflation. Entity-scoped dedup (unique on `user_id, rule_key, entity_type, entity_id`) is required.

### 3.7 — Level resolution is under-keyed

- **D9 (High).** `ReputationLevelResolver.resolve(score: number)` (`SERVICE_ARCHITECTURE.md:242`) decides a level from **score alone**, yet every level ≥1 has non-score requirements (verified email/mobile/alumni, profile complete, account age, nomination). A user with score 5000 but unverified is **not** Ambassador. `resolve` must take `userId` (or a context object), as `getProgress(userId, score)` and `evaluateRequirements(userId, level)` already do. The interface is internally inconsistent and will assign wrong levels.

### 3.8 — Nomination & appeal have no data model

- **D10 (High).** L5 requires "admin/ambassador nomination" (`ALUMNI_REPUTATION_SYSTEM.md:160`); thresholds carry only a boolean `requires_admin_nomination`. **No table/column records who nominated whom or whether a nomination exists.** Requirement is unenforceable.
- **D11 (Medium).** Appeals (Flow 4) have no table, status machine, or endpoints.

### 3.9 — Self-approval / 2FA not enforced

- **D12 (High / security).** Large adjustments need a "second admin" (`API_SPECIFICATION.md:296`) and 2FA > ±500. Nothing prevents `admin_id == approved_by` (self-approval), and **no field records that 2FA was satisfied**. The ROADMAP itself lists "admin abuse of adjustment capability" as a high-impact risk; the schema does not mitigate it.

### 3.10 — Triple-denormalized score

- **D13 (Medium).** Score is stored in three places: `reputation_transactions` (truth), `reputation_scores.total_score` (cache), `users.current_reputation_score` (read model). Drift is likely without a reconciliation/`recalculateAllScores` job contract and a documented invalidation order.

### 3.11 — Platform voids ARS depends on

- **D14 (Critical / blocking for build).** No `users`, auth, or **profile** schema anywhere. `users` is ALTERed (`DATABASE_SCHEMA.md:321`) but never CREATEd. Leaderboard filters by `department`/`batch` (`API_SPECIFICATION.md:394`) and Level 2 requires "complete profile (photo, bio, department, batch year, location)" — **none of these columns are defined**.
- **D15 (High).** Feed ranking (`INTEGRATION_SPEC.md:111`) consumes `contentQualityScore`, `engagementQualityScore`, `communityStanding`, `reportHistoryPenalty` — **none defined or stored**. The Posts/Feed module is referenced but unspecified.

### 3.12 — Security controls absent (platform-wide)

- **D16 (High).** No documented strategy for: session management, token refresh/revocation, CSRF, XSS/output-encoding, rate limiting at the edge (distinct from reputation daily caps), input validation schema, password/credential storage, account recovery, audit-log immutability enforcement (claimed "immutable" but no `REVOKE`/append-only trigger), or PII handling. For a "production-ready" social platform these are table stakes.
- **D17 (Medium).** Internal `POST /event` uses a **static shared secret** (`X-Service-Auth`) with no signing, rotation, nonce, or replay protection. Combined with D8 (no idempotency), a leaked token enables score inflation.

### 3.13 — Smaller correctness/consistency items

- **D18 (Medium).** `reputation_events.rule_key` is nullable but every meaningful event needs a rule; "manual event injection" could insert un-actionable rows.
- **D19 (Low).** "Daily" limits use UTC midnight (`API_SPECIFICATION.md`) with no per-user timezone policy.
- **D20 (Low).** `lifetime_lost` accounting under clamping (D7) is unspecified — does it record nominal or effective loss?
- **D21 (Low).** No optimistic-locking/`version` on `reputation_scores`; concurrent transactions for one user can race on read-modify-write (see Section 5).

---

## 4. Gap Analysis (classified)

| ID | Title | Sev | Business | Security | Technical | Recommended fix | Order |
|----|-------|-----|----------|----------|-----------|-----------------|-------|
| D14 | No users/auth/profile schema | **Critical** | Platform can't exist | Authn undefined | ARS has no host | Define core platform schema before ARS build | 1 |
| D8 | No idempotency / entity dedup | **Critical** | Trust collapses (score gaming) | Replay inflation | Unique index + event_id | Add dedup constraint + idempotency key | 2 |
| D7 | Ledger invariant vs clamp | **Critical** | Corrupt scores/audit | — | Contradictory rules | Adopt effective-delta model | 2 |
| D1/D2 | Missing rule keys (FK) | **Critical** | Rewards silently fail | — | Runtime FK crash | Seed missing rules / relax FK for system types | 2 |
| D4 | Audit lacks admin_id | **Critical** | Admin accountability gap | Untraceable actions | Endpoint unbuildable | Add `admin_id` to transactions | 2 |
| D5 | Penalty has no delta/link | **Critical** | Can't reverse penalties | — | Endpoint unbuildable | Add `delta`+`transaction_id` | 2 |
| D9 | resolve(score) under-keyed | High | Wrong level grants | Privilege misassignment | Interface inconsistent | resolve(userId, score) | 3 |
| D12 | Self-approval / 2FA unmodeled | High | Admin abuse | Privilege escalation | No constraint | DB constraint + 2FA flag | 3 |
| D6 | Adjustment↔ledger unlinked | High | Audit incomplete | — | Join impossible | Add `transaction_id` | 3 |
| D10 | Nomination unmodeled | High | L5 ungoverned | — | Requirement unenforceable | Add nominations table | 3 |
| D16 | Platform security controls absent | High | Launch-blocking | Multiple | Many | Write SECURITY.md, define controls | 3 |
| D15 | Feed inputs undefined | High | Feed can't rank | — | Forward dep | Define after Posts module | 4 |
| D3/D18 | Key drift / nullable rule_key | High/Med | Handler bugs | — | Inconsistency | Normalize keys | 3 |
| D13/D21 | Denorm drift / race | Med | Wrong displays | — | Concurrency | Reconcile job + row version | 4 |
| D11 | Appeals unmodeled | Med | Process gap | — | — | Model appeals | 4 |
| D17 | Static service token | Med | — | Replay | Weak authn | Signed/rotated tokens | 4 |
| D19/D20 | TZ / lifetime accounting | Low | Minor | — | — | Define policy | 5 |

**Critical (blocks launch):** D14, D8, D7, D1, D2, D4, D5.
**High (major post-launch issues):** D9, D12, D6, D10, D16, D15, D3.
**Medium (fix before scale):** D11, D13, D17, D18, D21.
**Low (can wait):** D19, D20.

---

## 5. Architecture Validation (challenging the design)

**Product.** The user journey (Flow 1) gates *everything* behind triple verification (email+mobile+alumni) to even reach Level 1 (score 50, can comment). That is a steep onboarding wall for a social product — expect high drop-off. **Recommendation:** allow read + limited reaction at Level 0/0.5 and make mobile verification optional-but-incentivized; A/B the wall. The reputation→privilege mapping is otherwise coherent.

**Database.** Normalization is good. Issues: (a) the clamp/invariant contradiction (D7); (b) missing dedup/idempotency (D8); (c) audit/penalty/adjustment linkage (D4/D5/D6); (d) `total_score DESC` index supports the leaderboard but department/batch filters will need composite indexes on the (undefined) profile columns; (e) no partitioning plan for `reputation_transactions`, which is the highest-growth table (every action writes a row) — at 10k+ users this needs time-based partitioning, called out in M6 load testing but not designed.

**Backend.** Layering is clean and testable. **Race condition (D21):** `processTransaction` does read score → compute → insert → update. Two concurrent events for one user can both read the same `score_before`, producing a lost update and a broken ledger chain. **Fix:** `SELECT … FOR UPDATE` on the score row (or derive `score_after` atomically in SQL `UPDATE … RETURNING`), all inside the documented DB transaction. The spec says "atomic" but does not specify locking. Graceful-degradation-to-Level-0 (`INTEGRATION_SPEC.md:400`) is the correct fail-closed choice.

**Frontend.** Not assessable — undefined. The only commitment ("responsive web, then mobile, API-first") is satisfied by the REST design, which is mobile-friendly. **Recommendation:** lock a versioned API contract (OpenAPI) now so the future mobile client reuses it — this is the single most important thing for the stated "no major rewrite for mobile" goal.

**Security.** See D12, D16, D17. The reputation system is itself an anti-abuse control, but it has gaps (D8 replay). Authn/session/CSRF/XSS are undefined. The "immutable audit log" is a policy, not a mechanism — needs append-only enforcement (revoke UPDATE/DELETE, or trigger).

**QA / failure scenarios.**
- *Race:* concurrent transactions (D21) → lost update.
- *Replay:* same event ingested twice (D8) → double award.
- *Clamp:* penalty at score 0 (D7) → invariant/`delta!=0` violation, possible 500.
- *Downgrade abuse:* coordinated mass-reporting to force a penalty/downgrade — partially mitigated by the 24h grace period (`SERVICE_ARCHITECTURE.md:376`), but the grace logic is unspecified (what recalculates after 24h? a cron? what if more penalties arrive?).
- *Threshold edit:* lowering a level's `min_score` mass-promotes users instantly with no requirement re-check (D9) → privilege leak.
- *Orphan:* deleting a `reputation_rule` referenced by historical transactions — FK `ON DELETE` is unspecified (default `NO ACTION` blocks deletion; "soft-delete only" implies rules should be deactivated, not deleted — make that explicit).

---

## 6. Phase 7 — Self-Review (breaking my own corrections)

- *As QA:* the corrections in Section 7 add columns and constraints but do not change the (nonexistent) runtime — they keep the **design** internally consistent and implementable. Verified each added column is referenced by at least one endpoint/flow.
- *As Security auditor:* added self-approval `CHECK` and a `two_factor_verified` flag close D12 at the schema layer; runtime enforcement still required.
- *As Staff engineer:* the effective-delta model (D7) makes the ledger reconstructable by simple summation — the property the whole audit story depends on. Entity-dedup (D8) is the minimum viable anti-gaming control.
- *As Product architect:* I did **not** invent appeals/nomination *features* — I flagged them as gaps and (for nomination, which an existing requirement already mandates) recommended the minimal table. No speculative scope added.

---

## 7. Changes Applied in This Pass

I applied only **high-confidence corrections that make the existing design internally consistent and implementable.** No new product features. Every change is logged in `CHANGELOG_AUDIT.md`. Summary:

- `DATABASE_SCHEMA.md`: added `admin_id` to `reputation_transactions` (D4); added `delta`, `transaction_id` to `reputation_penalties` (D5); added `transaction_id` to `reputation_adjustments` (D6); added self-approval `CHECK` + `two_factor_verified` to `reputation_adjustments` (D12); added entity-dedup unique index + clarified per-entity semantics on `reputation_events` (D8); documented effective-delta model and relaxed the contradictory invariant (D7); seeded missing system rules and gaming rules (D1/D2/D3); added a `version` column to `reputation_scores` for optimistic locking (D21); added a `reputation_nominations` table (D10).
- `ALUMNI_REPUTATION_SYSTEM.md`: added the previously-missing gaming/streak rules to the canonical rule tables and normalized key names (D1/D3).
- `SERVICE_ARCHITECTURE.md`: corrected `resolve(score)` → `resolve(userId, score)` and documented `FOR UPDATE` locking + effective-delta in `processTransaction` (D9/D21/D7).

---

## 8. Remaining Risks (not fixed in this pass — require decisions)

1. **The platform does not exist.** ARS is a subsystem of an undesigned product. Until the core (`users`/auth/profile/posts/messaging/events) is specified, ARS cannot be built or integration-tested.
2. **No tech stack is chosen or initialized** (Prisma vs Kysely, framework, event bus). This blocks any code.
3. **Security architecture (D16)** must be written before launch.
4. **Feed/Posts inputs (D15)** depend on a module that doesn't exist.
5. **Onboarding-wall conversion risk** is a product bet that needs validation.
