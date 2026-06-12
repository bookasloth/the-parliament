# Audit Change Log — 2026-06-12

Every change below is a **correctness fix that makes the existing design internally consistent and implementable**. No new product features were invented. Each entry cites the finding ID from `AUDIT_REPORT.md`.

## New files
- **`AUDIT_REPORT.md`** — full audit, gap analysis, architecture validation, self-review.
- **`CHANGELOG_AUDIT.md`** — this file.

## `DATABASE_SCHEMA.md`
| Finding | Change |
|---------|--------|
| D4 | Added `admin_id` (nullable FK → users) to `reputation_transactions` so the documented `GET /audit` admin attribution is implementable. Added partial index on it. |
| D2, D7 | Made `rule_key` nullable on transactions (system `adjustment`/`reversal` rows carry no rule); removed `CHECK (delta != 0)`; documented **effective-delta** semantics so `score_before + delta = score_after` always holds even under 0-clamping. Added `REVOKE UPDATE/DELETE` append-only hardening note. |
| D6 | Added `adjustment_id` and `reversed_transaction_id` to transactions; added `transaction_id` to `reputation_adjustments` (links authority ↔ ledger). |
| D5 | Added `delta`, `transaction_id`, `reversed_at` to `reputation_penalties` so `POST /penalties/:id/reverse` can restore the correct amount. |
| D8 | Added `dedup_key` + unique index and a `(user_id, rule_key, entity_type, entity_id)` unique index to `reputation_events` for idempotency / per-entity award-once; made `rule_key` NOT NULL there. |
| D12 | Added `two_factor_verified` flag and `no_self_approval` CHECK to `reputation_adjustments`. |
| D21 | Added `version` column to `reputation_scores` for optimistic locking. |
| D10 | Added new `reputation_nominations` table (Level 5 nomination requirement). |
| D1, D3 | Seeded the gaming/streak rules referenced by `INTEGRATION_SPEC.md` but previously missing (`tournament.runner_up`, `tournament.fair_play.5/.20`, `sportsmanship`, `tournament.unsportsmanlike`, `tournament.no_show`, `tournament.rule_violation`). |
| D14 | Added explicit prerequisite note: the `users` table is undefined and must exist before migration 004. |
| — | Updated migration list (10→12), documented the transactions↔adjustments circular-FK resolution via ALTER, and updated the ERD summary. |

## `ALUMNI_REPUTATION_SYSTEM.md`
| Finding | Change |
|---------|--------|
| D1, D3 | Added the 5 earn + 3 penalty gaming rules to the canonical earning/penalty rule tables so the product spec matches the seed and integration contracts. |

## `SERVICE_ARCHITECTURE.md`
| Finding | Change |
|---------|--------|
| D9 | Changed `ReputationLevelResolver.resolve(score)` → `resolve(userId, score)` with a note that non-score gates must be evaluated. |
| D21, D7 | Documented `SELECT ... FOR UPDATE` locking, `version` bump, and effective-delta/clamp behavior in `processTransaction`. |

## `API_SPECIFICATION.md`
| Finding | Change |
|---------|--------|
| D1, D3 | Updated `/rules` meta counts: 23 earn + 13 penalty = 36 active (was 18/10/28). |

## `ROADMAP.md`
| Finding | Change |
|---------|--------|
| D1 | Task 1.1: 10→12 migration files; Task 1.3: 18+10 → 23+13 rules; M1 DoD updated to "12 migrations". |

## Follow-up pass — Core platform foundation (per user decision "design the core platform first")
- **`CORE_PLATFORM_SCHEMA.md`** *(new)* — defines `users`, sessions/credentials/MFA, `profiles` (department/batch/location → resolves D14 leaderboard + L2 completeness), `alumni_verifications` (defines `verified_at`), `user_roles` (admin RBAC vs reputation level), social graph, posts/comments/reactions/reports (→ resolves D15 feed inputs), messaging, and reference entities. ARS migrations now run after these.
- **`SECURITY.md`** *(new)* — authentication, session, authorization, input validation/XSS/CSRF/SQLi, edge rate limiting, spam/bot/abuse prevention, PII/GDPR-vs-immutable-ledger reconciliation, audit immutability mechanism (→ resolves D16, D17, and the erasure conflict).

## Not changed (deliberately) — require decisions, see AUDIT_REPORT §8
- No code scaffolded (no stack chosen).
- Core platform schema (users/auth/profile/posts/feed/messaging) not authored — out of ARS scope and needs product design.
- Security architecture (D16), appeals model (D11), feed-input definitions (D15) flagged as gaps, not speculatively designed.
