# ARS User Flows

## Flow 1: Onboarding & Level 0→1 (Visitor → Verified Alumni)

**Actors:** New User

**Trigger:** User visits platform for the first time

```
1. User lands on public homepage
   └── Accesses Level 0 permissions (view public content, browse profiles)

2. User clicks "Register"
   └── POST /api/v1/auth/register
   └── Account created at Level 0
   └── reputation_scores row created with total_score = 0, level_id = L0

3. System prompts: "Verify your email to get started"
   └── User clicks verification link in email
   └── Event: email.verified → ARS processes +10
   └── Transaction created: delta=+10, score=10
   └── User notified: "+10 reputation for email verification"

4. System prompts: "Verify your mobile number"
   └── User enters SMS code
   └── Event: mobile.verified → ARS processes +15
   └── Transaction created: delta=+15, score=25

5. System prompts: "Verify your alumni status"
   └── User uploads proof (diploma, ID card, or institute email)
   └── Admin (or Level 5 Ambassador) reviews and approves
   └── Event: alumni.verified → ARS processes +25
   └── Transaction created: delta=+25, score=50

6. Score reaches 50 → LevelResolver fires
   └── User meets threshold for Level 1
   └── Event: reputation.level_up emitted
   └── Notification: "Congratulations! You've reached Verified Alumni level"
   └── New permissions unlocked: react to content, comment, limited DMs
```

**UI States:**
```
Registration → [Email verification banner] → [Mobile verification banner] → [Alumni verification banner]
After Level 1 → Dashboard shows: "Level 1 — Verified Alumni" + progress bar to Level 2
```

---

## Flow 2: Earning Reputation (Level 1→2)

**Actors:** Level 1 Verified Alumni

**Trigger:** User actively participates

```
1. User completes profile
   └── Fills: photo, bio, department, batch year, location
   └── Event: profile.completed → ARS +10 → score: 60

2. User attends an alumni event
   └── RSVPs and checks in
   └── Event: event.attended → ARS +10 → score: 70

3. User leaves meaningful comments on posts
   └── Each comment receiving 3+ likes = "meaningful"
   └── Event: comment.meaningful → ARS +2 (max 10/day)
   └── After 5 comments: score: 80

4. User participates in a tournament
   └── Joins, plays at least one match
   └── Event: tournament.participated → ARS +5 → score: 85

5. User refers a friend who becomes verified alumni
   └── Referred friend completes alumni verification
   └── Event: referral.verified → ARS +30 → score: 115

6. User builds a 7-day activity streak
   └── Logs in and engages daily
   └── Event: streak.7day → ARS +10 → score: 125

7. (Repeated engagement over time)
   └── Multiple events, tournaments, quality comments
   └── Eventually reaches 200 → Level 2 unlocked

8. System evaluates additional requirement: profile completeness
   └── Check: required fields all filled → PASS
   └── Level 2 granted
```

**UI States:**
```
Profile: [Profile 75% complete → 100% complete, +10 badge]
Dashboard: Progress bar [60/200] → [200/200, Level Up!]
Activity feed: "You earned +2 reputation for a meaningful comment"
Notifications: "7-day streak! +10 reputation"
```

---

## Flow 3: Level Up & Privilege Unlock

**Actors:** Any user crossing a threshold

**Trigger:** Reputation score crosses `min_score` boundary

```
1. Transaction completes
   └── score_after = min_score + 1 (crosses boundary)

2. LevelResolver.recalculateLevel(userId) fires
   └── Loads all levels, finds highest where score >= min_score
   └── Evaluates additional_requirements (profile, verification, etc.)
   └── All requirements met → new level assigned
   └── Update: reputation_scores.level_id + users.current_reputation_level

3. EventBus publishes: reputation.level_up
   └── Payload: { userId, previousLevel, newLevel, unlockedPermissions[] }

4. Notifications service consumes event
   └── Push notification: "🎉 You're now a Trusted Contributor!"
   └── In-app notification with list of unlocked features
   └── Email notification (optional, user pref)

5. UI refreshes
   └── Dashboard level badge updates
   └── New UI elements appear (Create Event button, Create Tournament)
   └── Messaging limits expanded
   └── PermissionGuard checks now pass for guarded routes
```

**Level-Up Animation (UI spec):**
```
Fullscreen overlay:
  ┌────────────────────────────┐
  │                            │
  │      LEVEL UP!             │
  │                            │
  │  Level 2 → Level 3         │
  │  Trusted Contributor       │
  │                            │
  │  New unlocks:              │
  │  ✓ Create events           │
  │  ✓ Create tournaments      │
  │  ✓ Post without delay      │
  │                            │
  │      [Continue]            │
  └────────────────────────────┘
```

---

## Flow 4: Penalty & Recovery

**Actors:** User who violated policy, Moderator

**Trigger:** Content flagged / System detects abuse

### Scenario: Spam Detection

```
1. User posts repetitive promotional content
   └── Flagged by system (spam heuristic) or reported by 3+ users

2. System creates reputation_event: spam.content

3. RuleEngine validates: rule is active, no cooldown violation

4. ReputationService.processTransaction():
   └── delta = -20
   └── score_before = 250, score_after = 230
   └── Transaction created (type: penalty)
   └── Penalty record created

5. LevelResolver.recalculateLevel():
   └── 230 < Level 3 threshold (500), still Level 2
   └── Level unchanged, but closer to threshold

6. EventBus publishes: reputation.penalty
   └── Penalty notification sent to user
   └── Content hidden from feed, moderation review initiated

7. User sees notification:
   "Your content was flagged as spam. -20 reputation. If you believe this is an error, appeal here."
```

### Recovery Path

```
1. User refrains from further violations for 30 days
   └── Active penalties expire
   └── User can earn reputation again through positive contributions

2. User appeals the penalty
   └── Admin reviews the appeal
   └── If approved: penalty reversed, score restored
   └── If rejected: penalty remains, user advised on next steps

3. User rebuilds through legitimate engagement
   └── Attends events, participates constructively
   └── Re-earns lost reputation over time
```

---

## Flow 5: Admin Adjustment

**Actors:** Admin, optionally Approving Admin

**Trigger:** Admin identifies need for manual adjustment

### Standard Adjustment (< ±100)

```
1. Admin navigates to Adjustments tab
   └── Searches user by name or email
   └── Views user card: score 450, Level 2

2. Admin fills adjustment form:
   └── Delta: +100
   └── Reason: "Organized alumni hackathon — 50+ attendees"

3. System preview:
   "Score will change from 450 → 550"
   "Level will change: Community Member → Trusted Contributor"

4. Admin confirms → POST /api/v1/admin/reputation/adjustments
   └── Adjustment created (status: approved)
   └── Transaction created (type: admin_bonus)
   └── Score updated: 550
   └── Level recalculated: Level 3

5. User notified:
   "An administrator awarded you +100 reputation for organizing the alumni hackathon!"
```

### Large Adjustment Requiring Approval (> ±100)

```
1. Admin fills adjustment form:
   └── Delta: -200
   └── Reason: "Repeated violation of community guidelines"

2. System preview + warning:
   "This adjustment requires approval from a second administrator."
   "Score will change from 1500 → 1300"
   "Level will change: Community Leader → Trusted Contributor"

3. Admin confirms → POST /api/v1/admin/reputation/adjustments
   └── Adjustment created (status: pending)
   └── No transaction created yet

4. Second admin reviews pending adjustments
   └── Views details: user, delta, reason, admin
   └── Can approve or reject

5. If approved:
   └── Transaction created, score updated, level recalculated
   └── Both admins notified

6. If rejected:
   └── Adjustment marked as rejected
   └── Original admin notified with reason
```

---

## Flow 6: Feed Visibility Progression

**Actors:** User with evolving reputation

**Trigger:** User creates content at different levels

### Level 0–1: Limited Distribution

```
1. User creates a post
   └── Post is created but NOT broadcast to entire institute feed

2. Distribution scope:
   └── 1st-degree connections see post in their feed
   └── Users in same batch (e.g., batch 2018) see post
   └── Users in same department see post
   └── NOT visible to institute-wide feed

3. Feed algorithm:
   └── FeedScore = (ARS_Score × 0.4) + (ContentQuality × 0.3) + ...
   └── Low ARS → low base score → less distribution
```

### Level 2: Expanded Distribution

```
1. User creates a post
   └── Same as Level 1 visibility
   └── PLUS: Post may appear in institute-wide feed
   └── But visibility is deprioritized compared to Level 3+

2. User's existing content gets re-ranked as score increases
```

### Level 3+: Immediate Full Distribution

```
1. User creates a post
   └── No limited-distribution phase
   └── Post immediately eligible for institute-wide feed
   └── Post receives boost factor (1.5× for Level 3)

2. Feed algorithm applies boost:
   └── FeedScore = base score × 1.5
   └── Higher ranking → more impressions
```

### Level 4–5: Algorithmic Preference

```
1. User creates a post
   └── Full distribution
   └── Boost factor: 2.0×
   └── Featured content slot eligibility
   └── Algorithmic preference in feed ranking

2. Featured content:
   └── Posts from Level 4–5 users appear in "Featured" section
   └── Pinned to top of community feeds for 24 hours
   └── Tagged with "From a Community Leader" badge
```

---

## Flow 7: Integration — Event Creation & Attendance

**Actors:** Level 3+ user creating event, any user attending

**Trigger:** Event is created / attended

### Event Creation

```
1. User clicks "Create Event"
   └── PermissionGuard checks: currentLevel >= 3
   └── If Level 2: button disabled with tooltip "Requires Trusted Contributor level"
   └── If Level 3+: button enabled, event creation form opens

2. User fills event details and submits
   └── Event created
   └── For Level 4+: system prompts "Feature this event?" → featured placement

3. (Optional) Level 5 user creates institute-wide event
   └── Additional permission: can_announce_institute_wide
   └── Event broadcast to all verified alumni
```

### Event Attendance

```
1. User RSVPs and checks in at event
   └── Event module emits: event.attended
   └── ARS consumes: processes +10 reputation

2. User is speaker at event
   └── Organizer marks user as speaker
   └── Event module emits: event.speaker.confirmed
   └── ARS processes +50 reputation
```

---

## Flow 8: Integration — Gaming / Tournament

**Actors:** Player, Tournament Creator

**Trigger:** Tournament lifecycle

### Tournament Creation

```
1. User clicks "Create Tournament"
   └── PermissionGuard checks: currentLevel >= 3
   └── Level < 3: "Requires Trusted Contributor"
   └── Level 3+: creation form enabled

2. User sets tournament parameters and launches
   └── Tournament created
   └── Host reputation tracked for tournament.hosted event
```

### Tournament Participation

```
1. User joins and plays at least one match
   └── Gaming module emits: tournament.participated
   └── ARS processes +5

2. User wins tournament
   └── Gaming module emits: tournament.won
   └── ARS processes +20

3. User shows fair play across 5 tournaments
   └── No reports → fair play streak bonus
   └── ARS processes +10 (streak.5)
```

### Cheating Detection

```
1. System or moderator detects cheating
   └── Gaming module emits: cheating.detected
   └── ARS processes -150
   └── Penalty record created (severity: severe)
   └── User level may drop
   └── Notification: "Cheating detected in tournament. -150 reputation"
```
