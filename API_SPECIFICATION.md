# ARS API Specification

**Base URL:** `/api/v1/reputation`
**Auth:** JWT Bearer token (required for all endpoints unless noted)
**Content-Type:** `application/json`

---

## Endpoints Summary

| # | Method | Path | Auth | Description |
|---|--------|------|------|-------------|
| 1 | GET | `/api/v1/reputation/score` | JWT | Current user's score + level |
| 2 | GET | `/api/v1/reputation/score/:userId` | JWT | Any user's public score |
| 3 | GET | `/api/v1/reputation/history` | JWT | Paginated transaction history |
| 4 | GET | `/api/v1/reputation/level` | JWT | Current level + progress to next |
| 5 | POST | `/api/v1/reputation/event` | Service | Internal event ingestion |
| 6 | GET | `/api/v1/reputation/rules` | Admin | List all configurable rules |
| 7 | PUT | `/api/v1/reputation/rules/:key` | Admin | Update rule value |
| 8 | POST | `/api/v1/reputation/adjustments` | Admin | Manual score adjustment |
| 9 | GET | `/api/v1/reputation/audit` | Admin | Full audit trail |
| 10 | GET | `/api/v1/reputation/leaderboard` | Public | Top N users by score |
| 11 | GET | `/api/v1/reputation/permissions/:level` | JWT | Capabilities for a level |

---

## 1. GET /api/v1/reputation/score

Get the authenticated user's current reputation score and level.

**Response 200:**
```json
{
  "userId": "uuid",
  "totalScore": 450,
  "level": {
    "id": "uuid",
    "name": "Community Member",
    "level": 2,
    "minScore": 200
  },
  "nextLevel": {
    "name": "Trusted Contributor",
    "level": 3,
    "requiredScore": 500,
    "scoreRemaining": 50,
    "progressPercent": 90
  },
  "lifetimeEarned": 780,
  "lifetimeLost": 330,
  "rank": 42
}
```

**Response 401:**
```json
{
  "error": "Unauthorized",
  "message": "Authentication required"
}
```

---

## 2. GET /api/v1/reputation/score/:userId

Get a specific user's public reputation score.

**Response 200:**
```json
{
  "userId": "uuid",
  "totalScore": 1800,
  "level": {
    "name": "Community Leader",
    "level": 4
  },
  "topPercentage": 12
}
```

**Response 404:**
```json
{
  "error": "Not Found",
  "message": "User not found"
}
```

---

## 3. GET /api/v1/reputation/history

Get paginated transaction history for the authenticated user.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `page` | int | 1 | Page number |
| `limit` | int | 20 | Items per page (max 100) |
| `type` | string | — | Filter by transaction_type (earn, penalty, adjustment) |
| `from` | ISO8601 | — | Start date filter |
| `to` | ISO8601 | — | End date filter |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "delta": 10,
      "scoreBefore": 490,
      "scoreAfter": 500,
      "type": "earn",
      "ruleKey": "event.attended",
      "reason": "Attended Alumni Meetup 2025",
      "reference": {
        "entityType": "event",
        "entityId": "uuid"
      },
      "createdAt": "2025-06-01T14:30:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "totalItems": 142,
    "totalPages": 8
  },
  "summary": {
    "totalEarned": 780,
    "totalLost": 330,
    "netScore": 450
  }
}
```

---

## 4. GET /api/v1/reputation/level

Get the authenticated user's current level and progress to next level.

**Response 200:**
```json
{
  "current": {
    "level": 2,
    "name": "Community Member",
    "minScore": 200,
    "permissions": {
      "canCreatePost": true,
      "maxPostsPerDay": 3,
      "canCreateEvent": false,
      "canCreateTournament": false,
      "maxConnectionRequests": 15,
      "maxDirectMessages": 20
    }
  },
  "next": {
    "level": 3,
    "name": "Trusted Contributor",
    "requiredScore": 500,
    "scoreRemaining": 50
  },
  "progress": {
    "scoreRemaining": 50,
    "percentComplete": 90,
    "estimatedDaysToNext": 5
  },
  "requirements": {
    "met": [
      "Profile Complete",
      "Email Verified",
      "Alumni Verified"
    ],
    "unmet": []
  }
}
```

---

## 5. POST /api/v1/reputation/event

Internal endpoint for service-to-service event ingestion. Not exposed to clients.

**Auth:** Internal service token (X-Service-Auth header)

**Request Body:**
```json
{
  "userId": "uuid",
  "ruleKey": "event.attended",
  "entityType": "event",
  "entityId": "uuid",
  "metadata": {
    "eventName": "Alumni Meetup 2025",
    "eventDate": "2025-06-01",
    "department": "Computer Science"
  }
}
```

**Response 200:**
```json
{
  "success": true,
  "eventId": "uuid",
  "transactionId": "uuid",
  "delta": 10,
  "scoreAfter": 500,
  "levelChanged": true,
  "newLevel": "Trusted Contributor"
}
```

**Response 429 (rate limited):**
```json
{
  "error": "Rate Limited",
  "message": "Daily limit reached for rule: event.attended",
  "retryAfter": "2025-06-02T00:00:00Z"
}
```

---

## 6. GET /api/v1/reputation/rules

Admin endpoint. List all configurable reputation rules.

**Auth:** Admin role required

**Response 200:**
```json
{
  "data": [
    {
      "key": "event.attended",
      "displayName": "Event Attendance",
      "description": "Attend a community event",
      "type": "earn",
      "defaultValue": 10,
      "currentValue": 10,
      "isActive": true,
      "cooldownHours": null,
      "maxDaily": null,
      "updatedAt": "2025-01-01T00:00:00Z"
    }
  ],
  "meta": {
    "totalEarnRules": 23,
    "totalPenaltyRules": 13,
    "activeRules": 36
  }
}
```

---

## 7. PUT /api/v1/reputation/rules/:key

Admin endpoint. Update a rule's current value or status.

**Auth:** Admin role required

**Request Body:**
```json
{
  "currentValue": 15,
  "isActive": true,
  "maxDaily": 5,
  "cooldownHours": 12
}
```

**Response 200:**
```json
{
  "key": "comment.meaningful",
  "previousValue": 2,
  "currentValue": 15,
  "previousMaxDaily": 10,
  "currentMaxDaily": 5,
  "updatedAt": "2025-06-12T10:00:00Z"
}
```

---

## 8. POST /api/v1/reputation/adjustments

Admin endpoint. Apply manual reputation adjustment to a user.

**Auth:** Admin role required. Deltas > ±100 require approval. Deltas > ±500 require 2FA.

**Request Body:**
```json
{
  "userId": "uuid",
  "delta": 100,
  "reason": "Exceptional community contribution — organized alumni hackathon",
  "requiresApproval": false
}
```

**Response 200:**
```json
{
  "success": true,
  "adjustmentId": "uuid",
  "transactionId": "uuid",
  "scoreBefore": 450,
  "scoreAfter": 550,
  "newLevel": "Trusted Contributor",
  "status": "approved"
}
```

**Response 202 (pending approval):**
```json
{
  "success": true,
  "adjustmentId": "uuid",
  "status": "pending",
  "message": "Adjustment requires approval from a second admin"
}
```

---

## 9. GET /api/v1/reputation/audit

Admin endpoint. Full audit trail with filtering.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `userId` | UUID | — | Filter by target user |
| `adminId` | UUID | — | Filter by admin who acted |
| `type` | string | — | Transaction type filter |
| `from` | ISO8601 | — | Start date |
| `to` | ISO8601 | — | End date |
| `page` | int | 1 | Page number |
| `limit` | int | 50 | Items per page (max 200) |
| `sort` | string | `-createdAt` | Sort field with direction |

**Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "userId": "uuid",
      "adminId": "uuid",
      "adminName": "Jane Doe",
      "delta": -50,
      "type": "admin_penalty",
      "ruleKey": "messaging.abuse",
      "reason": "Sent 500+ unsolicited DMs",
      "scoreBefore": 600,
      "scoreAfter": 550,
      "createdAt": "2025-06-11T09:15:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "totalItems": 1200,
    "totalPages": 24
  }
}
```

**Response 200 (CSV export with `Accept: text/csv`):**
```csv
id,userId,adminId,delta,type,reason,createdAt
uuid,uuid,uuid,-50,admin_penalty,Messaging abuse,2025-06-11T09:15:00Z
```

---

## 10. GET /api/v1/reputation/leaderboard

Public endpoint. Top N users by reputation score.

**Query Parameters:**
| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `limit` | int | 20 | Number of users (max 100) |
| `offset` | int | 0 | Pagination offset |
| `level` | int | — | Filter by specific level |
| `department` | string | — | Filter by department |
| `batch` | int | — | Filter by batch year |

**Response 200:**
```json
{
  "data": [
    {
      "rank": 1,
      "userId": "uuid",
      "displayName": "Jane Doe",
      "photoUrl": "https://...",
      "totalScore": 8500,
      "level": {
        "name": "Alumni Ambassador",
        "level": 5
      },
      "department": "Computer Science",
      "batch": 2015,
      "badgeCount": 12
    }
  ],
  "pagination": {
    "total": 2500,
    "offset": 0,
    "limit": 20
  },
  "currentUser": {
    "rank": 42,
    "totalScore": 450
  }
}
```

---

## 11. GET /api/v1/reputation/permissions/:level

Get the capabilities and limits for a given level.

**Auth:** JWT required

**Response 200:**
```json
{
  "level": 3,
  "name": "Trusted Contributor",
  "permissions": {
    "canCreatePost": true,
    "maxPostsPerDay": 10,
    "postVisibilityTier": 3,
    "postBoostFactor": 1.5,
    "canCreateEvent": true,
    "maxEventsPerMonth": 5,
    "canCreateTournament": true,
    "maxTournamentsPerMonth": 3,
    "canCreateGroup": true,
    "maxGroupsOwned": 5,
    "canModerate": false,
    "canFlagContent": true,
    "canVerifyMembers": false,
    "messaging": {
      "maxConnectionRequestsPerDay": 50,
      "maxDirectMessagesPerDay": 100,
      "maxGroupInvitesPerDay": 10,
      "maxEventInvitesPerDay": 20,
      "canBulkMessage": false
    },
    "featuredEligible": false,
    "announcementEligible": false
  }
}
```

**Response 404:**
```json
{
  "error": "Not Found",
  "message": "Level 6 does not exist"
}
```

---

## Error Responses

### 400 Bad Request
```json
{
  "error": "Bad Request",
  "message": "Invalid delta value: delta must not be 0"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Insufficient reputation level. Required: Level 3 (Trusted Contributor)"
}
```

### 429 Too Many Requests (Rate Limit)
```json
{
  "error": "Rate Limited",
  "message": "Daily limit reached for rule 'comment.meaningful' (max 10/day)",
  "ruleKey": "comment.meaningful",
  "maxDaily": 10,
  "currentDaily": 10,
  "resetsAt": "2025-06-13T00:00:00Z"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred",
  "traceId": "uuid"
}
```
