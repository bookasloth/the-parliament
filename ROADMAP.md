# ARS Implementation Roadmap

## Phases Overview

```
Phase 1: Core Infrastructure     ── Milestones 1–2 (Sprints 1–4)
Phase 2: Module Integration      ── Milestones 3–4 (Sprints 5–8)
Phase 3: Admin & Future          ── Milestones 5–6 (Sprints 9–12)
```

---

## Phase 1: Core Infrastructure

### Milestone 1: Database & Service Core

**Timeline:** Sprint 1–2 (2 weeks)
**Dependencies:** PostgreSQL, Node.js/TypeScript, existing User model

#### Tasks

| # | Task | Owner | Est. | Deliverable |
|---|------|-------|------|-------------|
| 1.1 | Create 12 database migration files (incl. nominations + append-only hardening) | Backend | 2d | SQL migrations |
| 1.2 | Seed `reputation_levels` (L0–L5) | Backend | 0.5d | Seed script |
| 1.3 | Seed `reputation_rules` (23 earn + 13 penalty) | Backend | 0.5d | Seed script |
| 1.4 | Seed `reputation_thresholds` | Backend | 0.5d | Seed script |
| 1.5 | Implement `ReputationScoresRepo` | Backend | 1d | Repository |
| 1.6 | Implement `ReputationTransactionsRepo` | Backend | 1d | Repository |
| 1.7 | Implement `ReputationRulesRepo` | Backend | 0.5d | Repository |
| 1.8 | Implement `ReputationLevelsRepo` | Backend | 0.5d | Repository |
| 1.9 | Implement `ReputationRuleEngine` | Backend | 2d | Service |
| 1.10 | Implement `ReputationLevelResolver` | Backend | 1d | Service |
| 1.11 | Implement `ReputationService.processTransaction()` | Backend | 3d | Service |
| 1.12 | Implement `ReputationService.revertTransaction()` | Backend | 1d | Service |
| 1.13 | Implement `ReputationService.getScore()` + `getHistory()` | Backend | 1d | Service |
| 1.14 | Implement `PermissionGuard` middleware | Backend | 1d | Middleware |
| 1.15 | Implement `ReputationEventBus` | Backend | 1d | Event system |
| 1.16 | Write unit tests for RuleEngine | QA | 1d | Tests |
| 1.17 | Write unit tests for LevelResolver | QA | 1d | Tests |
| 1.18 | Write unit tests for Service.processTransaction | QA | 1d | Tests |

**Definition of Done:**
- All 12 migrations runnable and reversible
- Rule engine correctly evaluates cooldowns, daily limits, active state
- Level resolver correctly determines level from score and requirements
- `processTransaction` atomically writes ledger + updates score
- All unit tests passing
- PermissionsGuard correctly checks level requirements

---

### Milestone 2: API & Admin Foundation

**Timeline:** Sprint 3–4 (2 weeks)
**Dependencies:** Milestone 1

#### Tasks

| # | Task | Owner | Est. | Deliverable |
|---|------|-------|------|-------------|
| 2.1 | Implement `GET /score` endpoint | Backend | 0.5d | API |
| 2.2 | Implement `GET /score/:userId` endpoint | Backend | 0.5d | API |
| 2.3 | Implement `GET /history` endpoint with pagination + filters | Backend | 1d | API |
| 2.4 | Implement `GET /level` endpoint with progress | Backend | 0.5d | API |
| 2.5 | Implement `POST /event` internal endpoint | Backend | 1d | API |
| 2.6 | Implement `GET /rules` admin endpoint | Backend | 0.5d | API |
| 2.7 | Implement `PUT /rules/:key` admin endpoint | Backend | 1d | API |
| 2.8 | Implement `POST /adjustments` admin endpoint | Backend | 2d | API |
| 2.9 | Implement `GET /audit` admin endpoint | Backend | 1d | API |
| 2.10 | Implement `GET /leaderboard` endpoint | Backend | 1d | API |
| 2.11 | Implement `GET /permissions/:level` endpoint | Backend | 0.5d | API |
| 2.12 | Implement `AdminService` (adjustments, approvals) | Backend | 2d | Service |
| 2.13 | Add request validation + error handling | Backend | 1d | Middleware |
| 2.14 | Write integration tests for all endpoints | QA | 2d | Tests |
| 2.15 | API documentation (OpenAPI spec) | Docs | 1d | Docs |

**Definition of Done:**
- All 11 endpoints deployed and tested
- Admin endpoints properly gated by role
- Leaderboard returns correct rankings
- Audit log filterable and exportable
- Error responses follow consistent format
- All integration tests passing

---

## Phase 2: Module Integration

### Milestone 3: Events, Messaging, Feed Integration

**Timeline:** Sprint 5–6 (2 weeks)
**Dependencies:** Milestone 2, Event/Messaging/Feed modules

#### Tasks

| # | Task | Owner | Est. | Deliverable |
|---|------|-------|------|-------------|
| 3.1 | Implement `onEventAttended` handler | Backend | 1d | Handler |
| 3.2 | Implement `onEventSpeaker` handler | Backend | 0.5d | Handler |
| 3.3 | Wire Events Module → ARS event bus | Backend | 1d | Integration |
| 3.4 | Implement messaging rate-limit guard using ARS level | Backend | 1d | Guard |
| 3.5 | Wire daily DM limit enforcement | Backend | 1d | Integration |
| 3.6 | Wire daily connection request limit | Backend | 0.5d | Integration |
| 3.7 | Implement feed ranking algorithm with ARS weight | Backend | 2d | Algorithm |
| 3.8 | Implement post visibility tier system | Backend | 1d | Service |
| 3.9 | Implement content quality score calculation | Backend | 1d | Service |
| 3.10 | Implement engagement quality score calculation | Backend | 1d | Service |
| 3.11 | Write integration tests for event ↔ ARS | QA | 1d | Tests |
| 3.12 | Write integration tests for messaging limits | QA | 1d | Tests |
| 3.13 | Write integration tests for feed ranking | QA | 1d | Tests |

**Definition of Done:**
- Event attendance automatically awards reputation
- Event speaker role automatically awards reputation
- Messaging limits enforced per level (DMs, connection requests, invites)
- Feed ranking includes ARS score as weighted input
- Post visibility correctly constrained per level
- All integration tests passing

---

### Milestone 4: Gaming, Moderation, Notifications

**Timeline:** Sprint 7–8 (2 weeks)
**Dependencies:** Milestone 3, Gaming/Moderation/Notification modules

#### Tasks

| # | Task | Owner | Est. | Deliverable |
|---|------|-------|------|-------------|
| 4.1 | Implement `onTournamentParticipated` handler | Backend | 0.5d | Handler |
| 4.2 | Implement `onTournamentWon` handler | Backend | 0.5d | Handler |
| 4.3 | Implement `onTournamentHosted` handler | Backend | 0.5d | Handler |
| 4.4 | Implement `onCheatingDetected` handler | Backend | 0.5d | Handler |
| 4.5 | Implement fair play streak handler | Backend | 1d | Handler |
| 4.6 | Wire Gaming Module → ARS event bus | Backend | 1d | Integration |
| 4.7 | Implement moderation permission guard (L4+) | Backend | 1d | Guard |
| 4.8 | Wire moderation flagging system to ARS | Backend | 1d | Integration |
| 4.9 | Implement "correct flag" bonus handler | Backend | 1d | Integration |
| 4.10 | Implement level-up notification handler | Backend | 0.5d | Handler |
| 4.11 | Implement penalty notification handler | Backend | 0.5d | Handler |
| 4.12 | Implement downgrade notification handler | Backend | 0.5d | Handler |
| 4.13 | Wire ARS events → Notifications module | Backend | 1d | Integration |
| 4.14 | Write integration tests for gaming ↔ ARS | QA | 1d | Tests |
| 4.15 | Write integration tests for moderation | QA | 1d | Tests |
| 4.16 | Write end-to-end test: full user journey | QA | 2d | Tests |

**Definition of Done:**
- Gaming tournaments award reputation on participation/win/host
- Gaming cheating detection triggers reputation penalty
- Fair play streaks correctly tracked
- Moderation permissions enforced per level
- Correct flags earn reputation bonus
- Level-up, penalty, and downgrade notifications delivered
- E2E test covering Level 0 → Level 5 path

---

## Phase 3: Admin & Future

### Milestone 5: Admin Dashboard Complete

**Timeline:** Sprint 9–10 (2 weeks)
**Dependencies:** Milestone 4, Admin frontend

#### Tasks

| # | Task | Owner | Est. | Deliverable |
|---|------|-------|------|-------------|
| 5.1 | Build Overview tab (charts, stats) | Frontend | 2d | UI |
| 5.2 | Build Rule Config tab (table + inline editing) | Frontend | 2d | UI |
| 5.3 | Build Adjustments tab (search, form, preview) | Frontend | 2d | UI |
| 5.4 | Build approval workflow for large adjustments | Frontend | 1d | UI |
| 5.5 | Build Audit Log tab (filters, table, export) | Frontend | 2d | UI |
| 5.6 | Build Penalty Management tab | Frontend | 2d | UI |
| 5.7 | Build Level Thresholds tab with impact preview | Frontend | 1.5d | UI |
| 5.8 | Build Event Log tab with reprocess button | Frontend | 1d | UI |
| 5.9 | Implement CSV export for audit log | Backend | 0.5d | API |
| 5.10 | Implement impact preview endpoint | Backend | 0.5d | API |
| 5.11 | Add role-based access control to admin frontend | Frontend | 1d | Auth |
| 5.12 | QA: Admin dashboard end-to-end | QA | 2d | Testing |

**Definition of Done:**
- All 7 admin tabs functional
- Adjustments follow approval workflow correctly (pending → approve/reject)
- Audit log filters work correctly and CSV export succeeds
- Penalty management can create, expire, reverse penalties
- Level threshold changes show impact preview
- Event log can reprocess failed events

---

### Milestone 6: Badges, Achievements, Extensibility

**Timeline:** Sprint 11–12 (2 weeks)
**Dependencies:** Milestone 5

#### Tasks

| # | Task | Owner | Est. | Deliverable |
|---|------|-------|------|-------------|
| 6.1 | Implement badge criteria engine | Backend | 3d | Service |
| 6.2 | Create initial badge set (10 badges) | Backend | 1d | Seed data |
| 6.3 | Implement automatic badge awarding | Backend | 2d | Service |
| 6.4 | Build badge display on user profiles | Frontend | 1.5d | UI |
| 6.5 | Build badge management in admin | Frontend | 1d | UI |
| 6.6 | Implement achievement tracking | Backend | 2d | Service |
| 6.7 | Foundation: endorsement reputation model | Backend | 2d | Service |
| 6.8 | Foundation: mentorship reputation tracking | Backend | 1d | Service |
| 6.9 | Foundation: professional reputation hooks | Backend | 1d | Service |
| 6.10 | Foundation: institute recognition hooks | Backend | 1d | Service |
| 6.11 | Performance optimization (caching, query tuning) | Backend | 2d | Perf |
| 6.12 | Load testing with 10k simulated users | QA | 2d | Perf |
| 6.13 | Documentation: badge implementation guide | Docs | 1d | Docs |

**Definition of Done:**
- Badges auto-awarded based on criteria
- Profile displays earned badges
- Admin can create new badge definitions
- Achievement tracking framework in place
- Endorsement, mentorship, professional reputation foundations ready
- P95 API response < 200ms under 10k user load
- Badge implementation documented for administrators

---

## Timeline Summary

```
Sprint 1-2  (Week 1-2)   │ M1: Database + Service Core      ████████░░░░░░░░░░░░░░░░
Sprint 3-4  (Week 3-4)   │ M2: API + Admin Foundation       ░░░░░░░░████████░░░░░░░░
Sprint 5-6  (Week 5-6)   │ M3: Events, Messaging, Feed      ░░░░░░░░░░░░░░████████░░
Sprint 7-8  (Week 7-8)   │ M4: Gaming, Mod, Notifications   ░░░░░░░░░░░░░░░░░░░░████
Sprint 9-10 (Week 9-10)  │ M5: Admin Dashboard Complete     ████████░░░░░░░░░░░░░░░░
Sprint 11-12 (Week 11-12)│ M6: Badges, Achievements, Future  ░░░░░░░░████████░░░░░░░░
                          │                                   │         │         │
                          │  Phase 1        Phase 2        Phase 3
                          │  (Core)         (Integration)  (Admin+Future)
```

Total estimated effort: **12 weeks / 3 months** with a dedicated team of 2–3 backend, 1 frontend, 1 QA.

---

## Dependencies & Risks

### Internal Dependencies
| Task | Depends On |
|------|-----------|
| M3 (Event integrations) | Events module >= v1.0 |
| M3 (Messaging integration) | Messaging module >= v1.0 |
| M3 (Feed integration) | Feed module >= v1.0 |
| M4 (Gaming integration) | Gaming module >= v1.0 |
| M4 (Moderation integration) | Moderation module >= v1.0 |
| M4 (Notifications) | Notifications module >= v1.0 |
| M5 (Admin dashboard) | Admin frontend framework |

### Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Module teams aren't ready to integrate | Medium | High | Phase 2 starts only after module owners confirm API contracts |
| Performance issues at scale | Low | Medium | Caching strategy from day one; load testing in M6 |
| Gaming cheating detection false positives | Medium | Medium | Appeal workflow; manual review before -150 penalty |
| Admin abuse of adjustment capability | Low | High | 2FA for large adjustments; audit log is immutable |
| Users gaming the reputation system | Medium | Medium | Cooldown + daily limits; fraud detection of -100 |
| Scope creep on badges/achievements | Medium | Low | Foundation only in M6; badge creation is admin task |
