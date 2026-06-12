# ARS Integration Specification

## Overview

ARS is a foundational platform service. It does not exist in isolation — it integrates with every major module. This document defines the contracts and patterns for each integration.

---

## Integration Architecture

```
                    ┌──────────────────┐
                    │                  │
                    │   Event Bus      │
                    │  (RabbitMQ /     │
                    │   Redis PubSub)  │
                    │                  │
                    └──┬──┬──┬──┬──┬──┘
                       │  │  │  │  │
    ┌──────────────────┘  │  │  │  └──────────────────┐
    │              ┌──────┘  │  └──────┐              │
    ▼              ▼         ▼         ▼              ▼
┌───────┐    ┌────────┐ ┌────────┐ ┌────────┐    ┌───────┐
│ Auth  │    │ Events │ │ Gaming │ │ Posts  │    │ Msg   │
│ Module│    │ Module │ │ Module │ │ Module │    │ Module│
└───────┘    └────────┘ └────────┘ └────────┘    └───────┘
    │              │         │         │              │
    │              │         │         │              │
    │              │         │         │              │
    ▼              ▼         ▼         ▼              ▼
    ┌────────────────────────────────────────────────────┐
    │                   ARS Event Handlers                │
    │  ┌─────────────────────────────────────────────┐   │
    │  │  onEventAttended()                          │   │
    │  │  onTournamentWon()                          │   │
    │  │  onContentRemoved()                         │   │
    │  │  onSpamDetected()                           │   │
    │  │  onUserVerified()                           │   │
    │  │  ...                                        │   │
    │  └─────────────────────────────────────────────┘   │
    └────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  ReputationService │
                    └──────────────────┘
```

---

## Integration: Auth / User Profile

| Aspect | Detail |
|--------|--------|
| **Source Module** | Auth Module |
| **Integration Type** | Event-driven |
| **Direction** | Auth → ARS (events), ARS → Auth (read level) |

### Events Emitted by Auth

| Event | Trigger | ARS Action |
|-------|---------|------------|
| `user.registered` | New account created | Create `reputation_scores` row at Level 0 |
| `user.verified.email` | Email verified | Process `email.verified` rule (+10) |
| `user.verified.mobile` | Mobile verified | Process `mobile.verified` rule (+15) |
| `user.verified.alumni` | Alumni identity approved | Process `alumni.verified` rule (+25) |

### Event Contract

```typescript
// user.verified.alumni
{
  eventType: "user.verified.alumni",
  userId: "uuid",
  timestamp: "2025-06-12T10:00:00Z",
  payload: {
    verificationMethod: "institute_email" | "document_review" | "admin_verification",
    verifiedBy: "uuid" // admin or ambassador ID
  }
}
```

### Auth → ARS Read Integration

- Auth middleware reads `user.current_reputation_level` to determine route access
- Registration flow checks for existing reputation record

---

## Integration: Posts / Feed

| Aspect | Detail |
|--------|--------|
| **Source Module** | Posts Module, Feed Module |
| **Integration Type** | Permission gating (posts) + Algorithmic ranking (feed) |
| **Direction** | Bidirectional |

### Permission Gating

| Action | Required Level | Enforcement Point |
|--------|---------------|-------------------|
| Create post | 2+ | PermissionGuard middleware |
| Create poll | 2+ | PermissionGuard middleware |
| Post visibility | 3+ = immediate | Post distribution service |
| Max posts/day | Configurable per level | Post creation guard |

### Feed Ranking

Feed ranking uses ARS score as a weighted input:

```typescript
function calculateFeedScore(post: Post, user: User): number {
  return (
    post.author.reputationScore * 0.4 +
    post.contentQualityScore * 0.3 +
    post.engagementQualityScore * 0.2 +
    post.author.communityStanding * 0.1 -
    post.author.reportHistoryPenalty * 0.2
  );
}

interface ContentQualityScore {
  hasMedia: boolean;           // images/video
  length: number;              // character count
  hasPoll: boolean;
  hasQuestion: boolean;
  positiveReactionRatio: number; // (likes + celebrates) / total reactions
}

interface EngagementQualityScore {
  commentDepth: number;        // average thread depth
  meaningfulReactions: number; // reactions beyond simple "like"
  shareCount: number;
  avgTimeOnPost: number;       // seconds
}
```

### Events Emitted by Posts

| Event | Trigger | ARS Action |
|-------|---------|------------|
| `post.created` | Post published | Logged only (no reputation gain) |
| `post.removed` | Post removed by moderator | Process `content.removed` penalty (-30) |
| `post.reported` | Post reported by users | Logged; escalation if threshold exceeded |
| `post.quality_contribution` | Post flagged as quality | Process `content.positive_contribution` bonus (+10) |

---

## Integration: Messaging

| Aspect | Detail |
|--------|--------|
| **Source Module** | Messaging Module |
| **Integration Type** | Permission gating (rate limits) |
| **Direction** | Read-only from ARS |

### Rate Limit Configuration

Rate limits are stored in `reputation_levels.permissions` JSONB:

```json
{
  "messaging": {
    "max_connection_requests_per_day": 50,
    "max_direct_messages_per_day": 100,
    "max_group_invites_per_day": 10,
    "max_event_invites_per_day": 20,
    "can_bulk_message": false,
    "min_interval_seconds": 30
  }
}
```

### Enforcement

```typescript
// In MessagingService.sendDirectMessage():
async function sendDirectMessage(senderId: string, recipientId: string, content: string) {
  const level = await reputationService.getLevel(senderId);
  const permissions = level.permissions.messaging;

  const todayCount = await getDailyDMCount(senderId);
  if (todayCount >= permissions.max_direct_messages_per_day) {
    throw new DailyLimitError("Daily DM limit reached");
  }

  // Check minimum interval between messages
  const lastMessage = await getLastMessageTime(senderId);
  if (Date.now() - lastMessage < permissions.min_interval_seconds * 1000) {
    throw new RateLimitError("Please wait before sending another message");
  }

  // Proceed with sending
}
```

### Events Emitted by Messaging

| Event | Trigger | ARS Action |
|-------|---------|------------|
| `message.abuse.detected` | Bulk messaging threshold exceeded | Process `messaging.abuse` penalty (-50) |
| `message.reported` | Message reported as spam | Logged; triggers investigation |

---

## Integration: Events

| Aspect | Detail |
|--------|--------|
| **Source Module** | Events Module |
| **Integration Type** | Permission gating + Event-driven rewards |
| **Direction** | Bidirectional |

### Permission Gating

| Action | Required Level |
|--------|---------------|
| Create event | 3+ |
| Host event | 3+ |
| Feature event | 4+ |
| Create institute-wide event | 5+ |
| RSVP to event | 1+ |
| Check in to event | 1+ |

### Events Emitted by Events Module

| Event | Trigger | ARS Action |
|-------|---------|------------|
| `event.attended` | User checked in to event | Process `event.attended` (+10) |
| `event.speaker.confirmed` | User marked as speaker | Process `event.speaker` (+50) |
| `event.created` | Event published | Logged (no direct reputation) |
| `event.reported` | Event reported | Logged; escalation |

### Event Contract

```typescript
// event.attended
{
  eventType: "event.attended",
  userId: "uuid",
  timestamp: "2025-06-12T10:00:00Z",
  payload: {
    eventId: "uuid",
    eventName: "Alumni Meetup 2025",
    eventDate: "2025-06-12",
    eventType: "online" | "in_person" | "hybrid",
    attendanceDuration: 120 // minutes
  }
}
```

---

## Integration: Gaming / Tournaments

| Aspect | Detail |
|--------|--------|
| **Source Module** | Gaming Module |
| **Integration Type** | Permission gating + Event-driven rewards + Penalties |
| **Direction** | Bidirectional |

### Permission Gating

| Action | Required Level |
|--------|---------------|
| Create tournament | 3+ |
| Participate in tournament | 1+ |
| Host tournament | 3+ |

### Events Emitted by Gaming Module

| Event | Trigger | ARS Action |
|-------|---------|------------|
| `tournament.participated` | User completes 1+ match | Process `tournament.participated` (+5) |
| `tournament.won` | User wins tournament | Process `tournament.won` (+20) |
| `tournament.runner_up` | User finishes 2nd | Process `tournament.runner_up` (+10) |
| `tournament.hosted` | Tournament completed by host | Process `tournament.hosted` (+30) |
| `tournament.cheating.detected` | Cheating verified by admin | Process `cheating.detected` (-150) |
| `tournament.unsportsmanlike` | Multiple conduct reports upheld | Process `unsportsmanlike` (-50) |
| `tournament.no_show` | Registered but didn't attend | Process `tournament.no_show` (-15) |
| `tournament.fair_play.5` | 5 tournaments without incident | Process fair play streak (+10) |
| `tournament.fair_play.20` | 20 tournaments without incident | Process fair play streak (+50) |

### Event Contract

```typescript
// tournament.won
{
  eventType: "tournament.won",
  userId: "uuid",
  timestamp: "2025-06-12T10:00:00Z",
  payload: {
    tournamentId: "uuid",
    tournamentName: "Chess Championship 2025",
    tournamentType: "chess" | "trivia" | "coding" | "sports",
    placement: 1,
    totalParticipants: 32
  }
}

// tournament.cheating.detected
{
  eventType: "tournament.cheating.detected",
  userId: "uuid",
  timestamp: "2025-06-12T10:00:00Z",
  payload: {
    tournamentId: "uuid",
    evidence: "Automated play detected",
    severity: "severe",
    reviewerId: "uuid"
  }
}
```

---

## Integration: Moderation

| Aspect | Detail |
|--------|--------|
| **Source Module** | Moderation Module |
| **Integration Type** | Permission gating + Event-driven |
| **Direction** | Bidirectional |

### Permission Gating

| Action | Required Level |
|--------|---------------|
| Report content (flag) | 0+ |
| Submit moderation feedback | 2+ |
| Review reports | 4+ |
| Moderate content | 4+ |
| Verify members | 5+ |
| Full moderation | 5+ |
| Appeal decisions | Any |

### Events Emitted by Moderation Module

| Event | Trigger | ARS Action |
|-------|---------|------------|
| `moderation.flag.correct` | Flagged content removed | Process `moderation.assist` (+15) |
| `moderation.flag.incorrect` | Flagged content kept | No action (possible penalty for abuse) |
| `member.verified` | Ambassador verifies member | Logged |

---

## Integration: Notifications

| Aspect | Detail |
|--------|--------|
| **Source Module** | Notifications Module |
| **Integration Type** | Outbound events from ARS → Notifications |
| **Direction** | ARS → Notifications |

### Events Consumed by Notifications

| ARS Event | Notification Content | Delivery |
|-----------|---------------------|----------|
| `reputation.level_up` | "You've reached Level {name}! New permissions: {list}" | In-app + push + email |
| `reputation.penalty` | "Your reputation was reduced by {delta}. Reason: {reason}" | In-app + push + email |
| `reputation.downgrade` | "Your level has changed from {old} to {new}" | In-app + push + email |
| `reputation.adjustment` | "An administrator adjusted your reputation: {delta}. Reason: {reason}" | In-app + email |

---

## Integration Summary Matrix

| Module | Gated Actions | Events Emitted → ARS | Events Consumed ← ARS |
|--------|---------------|---------------------|----------------------|
| **Auth** | Registration | `user.registered`, `user.verified.*` | Level data for profile |
| **Posts** | Create, Poll | `post.created`, `post.removed`, `post.reported` | — |
| **Feed** | — | — | Score + level for ranking |
| **Messaging** | DM limit, Invite limit | `message.abuse.detected`, `message.reported` | Level for rate limits |
| **Events** | Create, Host, Feature | `event.attended`, `event.speaker.confirmed` | Level for eligibility |
| **Gaming** | Create tournament | `tournament.*` | Level for eligibility |
| **Moderation** | Flag, Moderate, Verify | `moderation.flag.*`, `member.verified` | Level for permissions |
| **Notifications** | — | — | Level-up, penalty, adjustment events |

---

## Cross-Cutting: PermissionGuard Middleware

All modules that gate actions on reputation level use a shared middleware/decorator:

```typescript
// Usage examples:
@RequireLevel(3)                                     // Minimum Level 3
@RequireLevel({ level: 4, action: 'moderate' })      // Level 4 with specific action
@RequireLevel({ level: 2, limit: 'max_posts_per_day' }) // Level 2 with rate limit lookup

async function checkPermission(userId: string, requiredLevel: number): Promise<boolean> {
  const score = await reputationScoresRepo.findByUser(userId);
  const level = await levelResolver.resolve(userId, score.totalScore); // userId needed for non-score gates (AUDIT_REPORT D9)
  return level.level >= requiredLevel;
}
```

### Graceful Degradation

When ARS service is unavailable:
- Default to minimum level (0) — most restrictive permission set
- Log the failure
- Return an error indicating the service is temporarily unavailable
- Do not allow unauthorized access by failing open
