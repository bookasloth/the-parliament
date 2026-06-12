# ARS Admin Module

## Overview

The Admin Module provides administrators with complete visibility and control over the Alumni Reputation System. It integrates into the existing admin dashboard.

---

## Dashboard Tabs

### 1. Overview Tab

**Purpose:** At-a-glance health and activity metrics.

**Widgets:**
- **User Distribution Chart** — Bar chart of user count per level (0–5)
- **Daily Transactions Chart** — Area chart showing earn vs penalty volume over 7/30/90 days
- **Pending Penalties** — Count of active penalties requiring review
- **Recent Level-Ups** — Last 10 users who changed levels
- **Top Earners** — Top 5 by lifetime_earned (last 30 days)
- **Rule Activity** — Most triggered rules (top 5)

**API Endpoints:**
- `GET /api/v1/admin/reputation/overview` — aggregated stats
- `GET /api/v1/admin/reputation/daily-stats?days=30` — time series

---

### 2. Rule Configuration Tab

**Purpose:** View, edit, enable/disable all reputation rules.

**UI:**
- Searchable/filterable table with columns: Key, Display Name, Type, Current Value, Default, Active, Cooldown, Max Daily
- Inline editing of `currentValue`, `isActive`, `cooldownHours`, `maxDaily`
- "Reset to Default" button per rule
- "Edit JSON" modal for advanced configuration
- Change history log per rule

**Interactions:**
```
Click rule row → Edit panel slides open
  ├── Current Value: [number input]
  ├── Active: [toggle]
  ├── Cooldown Hours: [number input]
  ├── Max Daily: [number input]
  ├── [Save] [Cancel] [Reset to Default]
  └── Change History: [timestamp | admin | old value | new value]
```

**API Endpoints:**
- `GET /api/v1/admin/reputation/rules` — list all rules
- `PUT /api/v1/admin/reputation/rules/:key` — update rule
- `GET /api/v1/admin/reputation/rules/:key/history` — change history

---

### 3. Adjustments Tab

**Purpose:** Apply manual reputation adjustments to users.

**UI:**
- **User Search** — Search by name, email, or user ID
- **User Card** — Displays current score, level, lifetime earned/lost, recent transactions
- **Adjustment Form:**
  - Delta (positive or negative integer)
  - Reason (required, min 10 characters)
  - Preview: "Score will change from 450 → 550. Level will change from Community Member → Trusted Contributor."
- **Confirmation Dialog** for adjustments > ±100:
  - "This adjustment requires approval from another admin."
- **2FA Prompt** for adjustments > ±500

**API Endpoints:**
- `GET /api/v1/admin/reputation/adjustments/user/:userId` — user lookup
- `POST /api/v1/admin/reputation/adjustments` — create adjustment
- `GET /api/v1/admin/reputation/adjustments/pending` — pending approvals
- `POST /api/v1/admin/reputation/adjustments/:id/approve` — approve
- `POST /api/v1/admin/reputation/adjustments/:id/reject` — reject

---

### 4. Audit Log Tab

**Purpose:** Full audit trail of all reputation activity.

**UI:**
- Filterable table with columns: Timestamp, User, Admin, Delta, Type, Rule, Reason, Reference
- Filters:
  - User (autocomplete)
  - Admin (autocomplete)
  - Type (dropdown: earn, penalty, adjustment, admin_bonus, admin_penalty, reversal)
  - Date Range (date picker)
  - Rule Key (dropdown)
- Sortable columns (click header)
- **Export CSV** button — exports current filter set
- Row expansion — click to see full metadata JSON + reference links

**API Endpoints:**
- `GET /api/v1/admin/reputation/audit` — filtered audit trail
- `GET /api/v1/admin/reputation/audit/export` — CSV export

---

### 5. Penalty Management Tab

**Purpose:** View, apply, expire penalties.

**UI:**
- **Active Penalties** — list of active, not-expired penalties
  - Columns: User, Severity, Reason, Reviewer, Created, Expires, Actions
  - Actions: Expire penalty, Reverse penalty
- **Apply Penalty Form:**
  - User search
  - Severity (minor/moderate/severe/critical)
  - Reason
  - Expiration (optional, date picker)
  - Preview impact on score + level
- **Penalty History** — searchable by user, showing all past penalties

**Severity Guide:**
| Severity | Suggested Reputation Impact | Example |
|----------|---------------------------|---------|
| Minor | -10 to -20 | Spam, minor policy violation |
| Moderate | -30 to -60 | Mass messaging, repeated spam |
| Severe | -100 to -200 | Fraud, harassment |
| Critical | -250 | Platform suspension |

**API Endpoints:**
- `GET /api/v1/admin/reputation/penalties` — list penalties
- `GET /api/v1/admin/reputation/penalties/active` — active only
- `POST /api/v1/admin/reputation/penalties` — apply penalty
- `POST /api/v1/admin/reputation/penalties/:id/expire` — expire
- `POST /api/v1/admin/reputation/penalties/:id/reverse` — reverse + restore score

---

### 6. Level Thresholds Tab

**Purpose:** Configure level requirements and score boundaries.

**UI:**
- Table of levels 0–5
- Inline editable fields:
  - `name` — Level display name
  - `min_score` — Minimum score required
  - `required_days_since_verification` — Account age requirement
  - `additional_requirements` — JSON editor for custom requirements
- **Impact Preview:** When changing a threshold, show:
  "Changing Level 3 min_score from 500 → 600 will move 42 users down to Level 2."
- Confirmation required for threshold changes

**API Endpoints:**
- `GET /api/v1/admin/reputation/levels` — list levels
- `PUT /api/v1/admin/reputation/levels/:level` — update level
- `GET /api/v1/admin/reputation/levels/:level/impact?new_score=X` — preview impact

---

### 7. Event Log Tab

**Purpose:** Raw reputation event ingestion log for debugging.

**UI:**
- Table of `reputation_events` with columns: Timestamp, User, Rule Key, Entity Type, Entity ID, Processed, Error
- Filters:
  - Processed/Unprocessed
  - Rule Key
  - User
  - Date Range
- **Reprocess** button for failed events (sets `processed = false` for re-ingestion)
- **Manual Event Injection** form:
  - User, Rule Key, Entity Type, Entity ID, Metadata (JSON)
  - Triggers real-time processing

**API Endpoints:**
- `GET /api/v1/admin/reputation/events` — list events
- `POST /api/v1/admin/reputation/events/:id/reprocess` — reprocess
- `POST /api/v1/admin/reputation/events/inject` — inject event

---

## Admin Roles & Permissions

| Role | Overview | Rules | Adjustments | Audit | Penalties | Thresholds | Events |
|------|----------|-------|-------------|-------|-----------|------------|--------|
| **View-Only Admin** | Read | Read | — | Read | Read | Read | Read |
| **Moderator Admin** | Read | — | — | Read | Manage | — | Read |
| **Full Admin** | Read | Manage | Manage (up to ±500) | Read | Manage | — | Read |
| **Super Admin** | Read | Manage | Manage (unlimited) | Read | Manage | Manage | Manage |
| **Auditor** | — | — | — | Read (all) | — | — | — |

---

## Admin API Endpoints

| Method | Path | Description | Role Required |
|--------|------|-------------|---------------|
| GET | `/api/v1/admin/reputation/overview` | Dashboard overview stats | view-only+ |
| GET | `/api/v1/admin/reputation/daily-stats` | Time series data | view-only+ |
| GET | `/api/v1/admin/reputation/rules` | List all rules | view-only+ |
| PUT | `/api/v1/admin/reputation/rules/:key` | Update rule | full+ |
| GET | `/api/v1/admin/reputation/rules/:key/history` | Rule change history | view-only+ |
| GET | `/api/v1/admin/reputation/adjustments/user/:userId` | User lookup | full+ |
| POST | `/api/v1/admin/reputation/adjustments` | Create adjustment | full+ |
| GET | `/api/v1/admin/reputation/adjustments/pending` | Pending approvals | full+ |
| POST | `/api/v1/admin/reputation/adjustments/:id/approve` | Approve adjustment | super+ |
| POST | `/api/v1/admin/reputation/adjustments/:id/reject` | Reject adjustment | super+ |
| GET | `/api/v1/admin/reputation/audit` | Audit trail | view-only+ |
| GET | `/api/v1/admin/reputation/audit/export` | CSV export | auditor+ |
| GET | `/api/v1/admin/reputation/penalties` | List penalties | moderator+ |
| GET | `/api/v1/admin/reputation/penalties/active` | Active penalties | moderator+ |
| POST | `/api/v1/admin/reputation/penalties` | Apply penalty | moderator+ |
| POST | `/api/v1/admin/reputation/penalties/:id/expire` | Expire penalty | moderator+ |
| POST | `/api/v1/admin/reputation/penalties/:id/reverse` | Reverse penalty | full+ |
| GET | `/api/v1/admin/reputation/levels` | List levels | view-only+ |
| PUT | `/api/v1/admin/reputation/levels/:level` | Update level | super+ |
| GET | `/api/v1/admin/reputation/levels/:level/impact` | Impact preview | super+ |
| GET | `/api/v1/admin/reputation/events` | List events | view-only+ |
| POST | `/api/v1/admin/reputation/events/:id/reprocess` | Reprocess event | super+ |
| POST | `/api/v1/admin/reputation/events/inject` | Inject event | super+ |
