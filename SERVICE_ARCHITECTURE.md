# ARS Service Architecture

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        HTTP / GraphQL Layer                          │
│  ┌─────────────────────────────────────────────────────────────┐    │
│  │                  PermissionGuard Middleware                   │    │
│  │  Intercepts requests, resolves required level from route     │    │
│  │  metadata, checks user.currentLevel against requirement      │    │
│  └─────────────────────────────────────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────────┤
│                       Controller Layer                               │
│  ┌───────────────────┐ ┌──────────────┐ ┌──────────────────────┐   │
│  │ ScoreController    │ │ HistoryCtrl  │ │ AdminController      │   │
│  │ - getScore()       │ │ - getHistory│ │ - getRules()         │   │
│  │ - getPublicScore() │ │ - getLevel()│ │ - updateRule()       │   │
│  │ - getLeaderboard() │ │             │ │ - createAdjustment() │   │
│  │ - getPermissions() │ │             │ │ - getAuditLog()      │   │
│  └────────┬──────────┘ └──────┬───────┘ └──────────┬───────────┘   │
├───────────┼───────────────────┼────────────────────┼───────────────┤
│           │                   │                    │               │
│  ┌────────▼───────────────────▼────────────────────▼───────────┐   │
│  │                   ReputationService                          │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ processTransaction(userId, ruleKey, entityType,     │    │   │
│  │  │   entityId, metadata) → Transaction                 │    │   │
│  │  │  1. Looks up rule from RuleEngine                   │    │   │
│  │  │  2. Validates cooldown + daily limits               │    │   │
│  │  │  3. Reads current score                             │    │   │
│  │  │  4. Calculates score_before + delta = score_after   │    │   │
│  │  │  5. INSERT into reputation_transactions             │    │   │
│  │  │  6. UPDATE reputation_scores.total_score            │    │   │
│  │  │  7. Triggers LevelResolver                          │    │   │
│  │  │  8. Returns Transaction with score_after + new level│    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ revertTransaction(transactionId)                    │    │   │
│  │  │  1. Validates transaction exists + not already       │    │   │
│  │  │     reverted                                        │    │   │
│  │  │  2. Creates reversal transaction (delta = -delta)   │    │   │
│  │  │  3. Updates score                                   │    │   │
│  │  │  4. Triggers LevelResolver                          │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  │                                                               │   │
│  │  ┌─────────────────────────────────────────────────────┐    │   │
│  │  │ getTransactionHistory(userId, filters) → Page       │    │   │
│  │  │ getAuditTrail(filters) → Page                       │    │   │
│  │  │ getScoreBreakdown(userId) → Breakdown               │    │   │
│  │  │ recalculateAllScores() → BulkResult                 │    │   │
│  │  └─────────────────────────────────────────────────────┘    │   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                      Domain Services                                 │
│  ┌────────────────────────┐ ┌──────────────────────────────┐       │
│  │   ReputationRuleEngine  │ │   ReputationLevelResolver    │       │
│  │                         │ │                              │       │
│  │ - getValue(key) → int   │ │ - resolve(userId,score)→Lvl │       │
│  │ - isActive(key) → bool  │ │ - getNextLevel(score) →     │       │
│  │ - checkCooldown(key,    │ │   Level | null              │       │
│  │   userId) → bool        │ │ - getProgress(score) →      │       │
│  │ - checkDailyLimit(key,  │ │   { current, next, pct }    │       │
│  │   userId) → (bool, int) │ │ - evaluateRequirements(     │       │
│  │ - getAllRules() → Rule[]│ │   userId, level) → Result   │       │
│  │ - updateRule(key,       │ │ - recalculateLevel(userId)  │       │
│  │   values) → Rule        │ │   → Level                   │       │
│  └────────────────────────┘ └──────────────────────────────┘       │
├─────────────────────────────────────────────────────────────────────┤
│                    Event & Integration Layer                         │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               ReputationEventBus                              │   │
│  │  ┌──────────────┐ ┌──────────────┐ ┌────────────────────┐   │   │
│  │  │ onLevelUp    │ │ onPenalty    │ │ onThresholdCross   │   │   │
│  │  │ → Notification│ │ → Notification│ │ → Badge Check     │   │   │
│  │  │ → Badge Check│ │ → Restriction│ │ └────────────────────┘   │   │
│  │  └──────────────┘ └──────────────┘                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │               EventHandlers (Subscribers)                      │   │
│  │                                                                   │   │
│  │  Handlers listen to events emitted by other modules:             │   │
│  │  - onEventAttended(eventData) → ruleEngine → service.process()   │   │
│  │  - onTournamentWon(tournamentData) → ruleEngine → service.process│   │
│  │  - onPostCreated(postData) → (logging only, no earn)             │   │
│  │  - onContentRemoved(postData) → ruleEngine → service.process()   │   │
│  │  - onSpamDetected(spamData) → ruleEngine → service.process()     │   │
│  │  - onCheatingDetected(cheatData) → ruleEngine → service.process()│   │
│  └─────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                     Repository Layer (Data Access)                   │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────┐  │
│  │ ScoreRepo    │ │ TxRepo       │ │ RuleRepo     │ │ LevelRepo│  │
│  │ - findByUser │ │ - create     │ │ - findAll    │ │ - findBy │  │
│  │ - upsert     │ │ - findByUser │ │ - findByKey  │ │   Score  │  │
│  │ - findAllBy  │ │ - findById   │ │ - update     │ │ - findAll│  │
│  │   Level      │ │ - aggregate  │ │ - create     │ └──────────┘  │
│  └──────────────┘ └──────────────┘ └──────────────┘               │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Service Layer Interfaces (TypeScript)

```typescript
// ================================================================
// ReputationService — Core ledger
// ================================================================

interface ReputationTransaction {
  id: string;
  userId: string;
  delta: number;
  scoreBefore: number;
  scoreAfter: number;
  transactionType: 'earn' | 'penalty' | 'adjustment' | 'admin_bonus' | 'admin_penalty' | 'reversal';
  ruleKey: string;
  reason: string | null;
  referenceEntityType: string | null;
  referenceEntityId: string | null;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

interface TransactionResult {
  transaction: ReputationTransaction;
  levelChanged: boolean;
  previousLevel: ReputationLevel | null;
  newLevel: ReputationLevel | null;
}

interface ReputationService {
  processTransaction(params: {
    userId: string;
    ruleKey: string;
    entityType?: string;
    entityId?: string;
    metadata?: Record<string, unknown>;
  }): Promise<TransactionResult>;

  revertTransaction(transactionId: string, reason: string): Promise<TransactionResult>;

  getScore(userId: string): Promise<{
    totalScore: number;
    level: ReputationLevel;
    lifetimeEarned: number;
    lifetimeLost: number;
  }>;

  getTransactionHistory(
    userId: string,
    filters?: {
      page?: number;
      limit?: number;
      type?: string;
      from?: Date;
      to?: Date;
    }
  ): Promise<PaginatedResult<ReputationTransaction>>;

  getAuditTrail(filters?: {
    userId?: string;
    adminId?: string;
    type?: string;
    from?: Date;
    to?: Date;
    page?: number;
    limit?: number;
  }): Promise<PaginatedResult<AuditEntry>>;

  getLeaderboard(filters?: {
    limit?: number;
    offset?: number;
    level?: number;
    department?: string;
    batch?: number;
  }): Promise<LeaderboardResult>;
}


// ================================================================
// ReputationRuleEngine — Rule evaluation
// ================================================================

interface ReputationRule {
  key: string;
  displayName: string;
  description: string | null;
  ruleType: 'earn' | 'penalty';
  defaultValue: number;
  currentValue: number;
  isActive: boolean;
  cooldownHours: number | null;
  maxDaily: number | null;
}

interface RuleValidationResult {
  valid: boolean;
  value: number;
  errors: string[];
  limitRemaining?: number;
}

interface ReputationRuleEngine {
  getValue(ruleKey: string): Promise<number>;
  isActive(ruleKey: string): Promise<boolean>;
  validateRule(ruleKey: string, userId: string): Promise<RuleValidationResult>;
  checkCooldown(ruleKey: string, userId: string): Promise<{ valid: boolean; remainingHours?: number }>;
  checkDailyLimit(ruleKey: string, userId: string): Promise<{ valid: boolean; used: number; max: number }>;
  getAllRules(): Promise<ReputationRule[]>;
  getRulesByType(type: 'earn' | 'penalty'): Promise<ReputationRule[]>;
  updateRule(key: string, updates: Partial<ReputationRule>): Promise<ReputationRule>;
  resetDailyCounts(): Promise<void>;
}


// ================================================================
// ReputationLevelResolver — Level evaluation
// ================================================================

interface ReputationLevel {
  id: string;
  name: string;
  level: number;
  minScore: number;
  permissions: Record<string, unknown>;
}

interface LevelProgress {
  current: ReputationLevel & { progressPercent: number };
  next: (ReputationLevel & { scoreRemaining: number }) | null;
  requirements: {
    met: string[];
    unmet: string[];
  };
}

interface ReputationLevelResolver {
  // NOTE (AUDIT_REPORT D9): level resolution cannot be done from score alone —
  // levels >= 1 carry non-score gates (verified email/mobile/alumni, profile
  // complete, account age, nomination). `resolve` therefore takes userId and
  // evaluates requirements; score-only resolution is a private helper.
  resolve(userId: string, score: number): Promise<ReputationLevel>;
  getNextLevel(score: number): Promise<ReputationLevel | null>;
  getProgress(userId: string, score: number): Promise<LevelProgress>;
  recalculateLevel(userId: string): Promise<ReputationLevel>;
  evaluateRequirements(userId: string, level: ReputationLevel): Promise<{
    pass: boolean;
    met: string[];
    unmet: string[];
  }>;
  getAllLevels(): Promise<ReputationLevel[]>;
}


// ================================================================
// PermissionGuard — Authorization middleware
// ================================================================

interface PermissionGuardOptions {
  requiredLevel: number;
  action?: string;
  check?: (user: User, level: ReputationLevel) => Promise<boolean>;
}

// Decorator / middleware pattern:
// @RequireLevel(3) or @RequireLevel({ level: 3, action: 'create_event' })
// Guards apply before controller logic executes
interface PermissionGuard {
  checkPermission(userId: string, options: PermissionGuardOptions): Promise<{
    allowed: boolean;
    currentLevel: ReputationLevel;
    requiredLevel: number;
    reason?: string;
  }>;
}


// ================================================================
// AdminService — Admin operations
// ================================================================

interface AdminAdjustmentInput {
  userId: string;
  delta: number;
  reason: string;
  adminId: string;
}

interface AdminAdjustmentResult {
  adjustmentId: string;
  transaction: ReputationTransaction;
  newLevel: ReputationLevel;
  requiresApproval: boolean;
  status: 'pending' | 'approved' | 'rejected';
}

interface AdminService {
  createAdjustment(input: AdminAdjustmentInput): Promise<AdminAdjustmentResult>;
  approveAdjustment(adjustmentId: string, approvedBy: string): Promise<AdminAdjustmentResult>;
  rejectAdjustment(adjustmentId: string, reason: string): Promise<void>;
  getPendingAdjustments(): Promise<Adjustment[]>;
  getUserReport(userId: string): Promise<{
    score: number;
    level: ReputationLevel;
    transactionCount: number;
    recentTransactions: ReputationTransaction[];
    activePenalties: Penalty[];
    adjustmentHistory: Adjustment[];
    scoreTimeline: { date: string; score: number }[];
  }>;
}


// ================================================================
// ReputationEventBus — Event publishing
// ================================================================

interface ReputationEvent {
  type: 'reputation.level_up' | 'reputation.penalty' | 'reputation.threshold_cross' | 'reputation.downgrade';
  userId: string;
  payload: Record<string, unknown>;
  timestamp: Date;
}

interface ReputationEventBus {
  publish(event: ReputationEvent): Promise<void>;
  onLevelUp(callback: (userId: string, newLevel: ReputationLevel) => void): void;
  onPenalty(callback: (userId: string, penalty: Penalty) => void): void;
  onDowngrade(callback: (userId: string, from: ReputationLevel, to: ReputationLevel) => void): void;
}
```

---

## Dependency Graph

```
ReputationController ──────> PermissionGuard
ReputationController ──────> ReputationService
ReputationController ──────> ReputationLevelResolver
ReputationController ──────> ReputationRuleEngine

AdminController ───────────> AdminService
AdminService ──────────────> ReputationService
AdminService ──────────────> ReputationRuleEngine

ReputationService ─────────> ReputationRuleEngine  (validate + get value)
ReputationService ─────────> ReputationLevelResolver (recalculate after tx)
ReputationService ─────────> ReputationEventBus    (publish events)

EventHandlers ─────────────> ReputationService     (process transaction)
EventHandlers ─────────────> ReputationRuleEngine  (validate rules)

All services ──────────────> Repository Layer (Prisma/Kysely)
```

---

## Key Design Rules

1. **No direct score mutation.** No code path may execute `UPDATE reputation_scores SET total_score = X` outside of `ReputationService.processTransaction()`. This is enforced by code review and, if possible, database triggers.

2. **Atomic transactions + row locking.** `processTransaction` wraps ledger INSERT + score UPDATE in a single DB transaction. It MUST `SELECT ... FOR UPDATE` on the user's `reputation_scores` row (or compute `score_after` atomically via `UPDATE ... RETURNING`) before reading `score_before`, so two concurrent events for the same user cannot read the same baseline and lose an update (AUDIT_REPORT D21). The `reputation_scores.version` column is bumped each write to detect conflicts.

   **Effective-delta + clamp (AUDIT_REPORT D7):** compute `score_after = MAX(0, score_before + nominal_value)` and persist `delta = score_after - score_before`. If `delta == 0` (e.g. penalty on a user already at 0), mark the event processed and write **no** transaction row. The nominal value is retained in `metadata.nominal_delta`.

3. **Idempotent event handling.** Each `reputation_events` row has a `processed` flag. Events are idempotent — a second ingestion of the same event ID is a no-op.

4. **Read models are eventually consistent.** Cache invalidation happens on every level change. The `users.current_reputation_score` and `users.current_reputation_level` are read-model fields updated asynchronously after write.

5. **Admin adjustments require triples.** For every admin adjustment:
   - `reputation_adjustments` record (the authority)
   - `reputation_transactions` record (the ledger entry)
   - `reputation_scores` update (the state)

6. **Penalties never bring score below 0.** `SELECT MAX(0, current_value + delta)` prevents negative scores (which would corrupt level resolution).

7. **Level downgrade protection.** A user is not immediately downgraded upon receiving a single penalty. The system recalculates level on every transaction but checks a 24-hour grace period for penalties before downgrading, preventing abuse via mass-reporting.

---

## Caching Strategy

| Cache | TTL | Invalidated On |
|-------|-----|----------------|
| User score + level | 5 min | Score change |
| User permission set | 30 min | Level change, admin rule update |
| Rule values | 60 min | Rule update |
| Level definitions | 60 min | Level/Threshold update |
| Leaderboard | 5 min | Score change |
| Daily limit counts | Real-time (Redis) | New transaction |

---

## Error Handling

```
Service errors are typed and propagate to the controller:

- ReputationError (base)
  ├── RuleNotFoundError         → 404
  ├── RuleInactiveError         → 400
  ├── CooldownActiveError       → 429
  ├── DailyLimitExceededError   → 429
  ├── InsufficientLevelError    → 403
  ├── DuplicateEventError       → 409
  ├── AdjustmentRequiresApproval → 202
  ├── InvalidDeltaError         → 400
  └── TransactionNotFoundError  → 404
```
