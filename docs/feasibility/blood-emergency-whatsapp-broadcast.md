# Feasibility Report — Blood Group Emergency WhatsApp Broadcast

**Date:** 2026-08-10
**Scope:** Read-only audit. No code written or modified.
**Question:** Can we build a Blood Group Emergency WhatsApp Broadcast on the current NNAWCA / The Parliament stack?

---

## TL;DR verdict

**CAN BUILD WITH MINOR ADDITIONS — for the in-app + web-push + email version.**
**REQUIRES SIGNIFICANT NEW INFRASTRUCTURE — for the WhatsApp channel specifically.**

The *matching + broadcast + response + fulfilment* workflow is ~80% already present (blood-group data, auto-assigned blood groups, a working member-broadcast email primitive, a notification fan-out with in-app/push/email, an admin console, and request/approval state-machine templates). **What does not exist at all is any WhatsApp Business Platform integration** — no provider, no dependency, no templates, no webhook, no phone verification. WhatsApp is the single largest and only "significant new infrastructure" piece.

Recommended: **ship the MVP on the existing notification channels first**, add WhatsApp as a second phase once a BSP (Business Solution Provider) account + verified templates are in place.

---

## 1. What already exists

### Blood-group data — ✅ EXISTS
- `Profile.bloodGroup` — `String? @db.VarChar(5)` — `prisma/schema.prisma:377`
- `Profile.bloodDonor` — `Boolean @default(false)` — `prisma/schema.prisma:378`
- Editable in the profile UI: `src/app/(main)/profile/edit/edit-client.tsx:383-391` (8-value picker `A+…O-`, plus a "blood donor" toggle labelled *"Helps alumni find donors in emergencies."*).
- Written via server action `saveAccount` — `src/app/(main)/profile/edit/actions.ts:82-92`.
- **Blood groups are already materialised as Groups:** `autoAssignGroups()` joins every user to a `Group{ type:"blood", refDepartment: bloodGroup }` on each profile save — `src/modules/groups/service.ts:328-361` (line 341). This is a **ready-made recipient set** — an "O+" user is already a member of the "O+" group.

### User / profile / contact info — ✅ EXISTS (partial)
- `User.mobileE164` — `String? @db.VarChar(20)` — `schema.prisma:107`. Single E.164 phone column.
- `User.mobileVerifiedAt` — `Timestamptz?` — `schema.prisma:108` — **column exists but is DEAD**; never written by any app code (only by seed scripts). Phone is effectively **unverified**.
- `Profile.city` — `String? @db.VarChar(120)`, **indexed** (`@@index([city])` `schema.prisma:402`). Free-text.
- `Profile.homeTown`, `Profile.correspondenceAddress` — free-text; `schema.prisma:375-376`.
- Identity: `legalName`, `displayName`, `email`; `status` (UserStatus enum), `isVerified`, `verificationStatus`.

### WhatsApp numbers & consent / opt-in — ⚠️ FLAG ONLY, NO CHANNEL
- `Profile.whatsappOptIn` — `Boolean @default(false)` — `schema.prisma:389`. Set in `saveContact` — `actions.ts:124-125`. **This is the only WhatsApp signal in the system, and it is just a boolean.** No WhatsApp-specific consent audit trail, no timestamp, no source.
- `Profile.contactAlwaysShare` — `Boolean @default(false)` — `schema.prisma:394` — gates whether email is shown (`src/modules/profile/service.ts:63`).
- `EmailPreference` (per-category booleans) — `schema.prisma:1880-1895` — **email channel only**, no SMS/WhatsApp preference.
- `EmailSuppression` / `EmailUnsubscribeToken` — `schema.prisma:1897-1915`.

### WhatsApp Business API integration — ❌ DOES NOT EXIST
- No `twilio`, no `whatsapp-web.js`, no Meta Cloud API SDK in `package.json`. Dependencies are: `nodemailer`, `pg-boss`, `razorpay`, `web-push` only.
- No WhatsApp send code, no webhook route, no `WA_*`/`META_*`/`TWILIO_*` env vars documented in `CLAUDE.md`.
- (The `twilio-developer-kit` entries visible in the environment are Anthropic **skill documentation plugins**, not an integration in this repo.)

### Message templates — ✅ EMAIL, ❌ WhatsApp
- Two email template systems, both converging on one guarded `deliver()`:
  - **JS templates** (live default): `src/lib/email.ts` — `EmailTemplates` type map `:11-42`, `renderEmail` `:597`, **`sendEmail(template, to, data, userId?)` `:649`**.
  - **DB templates**: `EmailTemplate` table, seeded from `src/modules/email/templates.ts:30-164`; sent via `queueEmail` `:309`.
- Shared HTML shell: `src/lib/email-layout.ts` (`emailShell`, `button`, `details`, …).
- **No WhatsApp template store** (WhatsApp requires Meta-approved templates — see §4).

### Notification / queue / background-job infra — ✅ STRONG (with caveats)
- **`sendNotification()` — `src/modules/notifications/service.ts:60`** — the one entry point; in a single per-user call it does: in-app row (`Notification` model `schema.prisma:916-933`), Redis unread bump, Supabase realtime nudge, **web push** (`sendPush`), and deferred **email**. Channel routing via `EMAIL_FOR_KIND` `:34-46`.
  - ⚠️ 6-hour **coalescing** window (`COALESCE_WINDOW_MS` `:17`) collapses same-kind+entity+unread rows and *suppresses email/push* — fine across distinct donors, but re-broadcasting the same request `entityId` to the same user within 6h is muted.
- **Web push** — `src/lib/web-push.ts`: `sendPush(userId, payload)` `:31`; model `PushSubscription` `schema.prisma:2118-2128`. **No-ops silently if VAPID env unset.** Single-user; a blast = loop.
- **Queues:** `pg-boss` is **installed but DEAD** — `src/lib/jobs.ts` + `registerMembershipJobs` are never invoked (Vercel has no long-lived worker; confirmed by in-code comments at `membership/route.ts:7-8`). **Do not build on pg-boss.**
- **Real scheduler = Vercel Cron** — `vercel.json`, 4 daily jobs guarded by `isAuthorizedCron` (`src/lib/cron-auth.ts`). Sub-daily precision is done via GitHub Actions hitting the endpoint (`.github/workflows/cron-event-invites.yml`).
- **Only persistent retry primitive = the email outbox** — `EmailMessage.status` (`queued→sent/failed`), drained by `drainEmailOutbox(200)` `src/modules/email/service.ts:243`. Everything else runs synchronously in the request/cron invocation.
- **Existing broadcast precedents (copy these):**
  - `src/modules/events/invites.ts:96-117` — `findMany({ take: 5000 })` → plain `for` loop of `sendNotification` per recipient, each `.catch`-isolated. **This is the exact shape a blood broadcast copies.**
  - `src/app/api/admin/activation-blast/route.ts:37-50` — bulk email loop with a 250ms SMTP throttle + sent/failed tally; route has `maxDuration:60`.
- Rate-limit helper: `src/lib/rate-limit.ts` (`enforceRateLimit`, Redis fixed-window).

### Admin functionality — ✅ EXISTS
- Console at `src/app/admin/*`, dark shell (`admin-shell.tsx`), shared primitives (`admin-ui.tsx`).
- ⚠️ **`src/app/admin/layout.tsx:14-18` currently does NOT call `requireAdmin` (TEMP bypass)** — page render is ungated; individual server *actions* still call `requireAdmin`. Must be fixed before any donor PII lands in admin.
- REAL (Prisma-wired) pages: verification, moderation, membership, groups, events, karma, committees, contributions, users, ama, audit-logs. STUBS (`ComingSoon`): analytics, jobs, businesses, games, messaging, notifications, rewards.
- Auth helpers: `requireUser` / `optionalUser` / `requireAdmin` — `src/modules/auth/session.ts:18-38`.

### Existing request / approval workflows — ✅ STRONG TEMPLATES
- **`GroupRequest` ⭐ — `schema.prisma:1594-1609`** — `GroupRequestStatus` = open/accepted/resolved/closed (`:2091`); **category enum already includes `emergency`** (`:2083`); free-text body. Created by members — `src/app/(main)/groups/actions.ts:13,27`. **On submit it already emails every active group member** via `notifyGroupMembers()` → `sendEmail("group_request", …)` — `actions.ts:31-56`. **Gap:** no code transitions status past `open` (write-once), no admin moderation.
- Other state-machine templates: `AlumniVerification` (pending/approved/rejected, `schema.prisma:425`; approve/reject in `src/modules/verification/service.ts:78,120`), `ContentReport` (open→resolved), `Endorsement`, `CommitteeInvite`, `EventRsvp`, `Business`.
- **"Contact reveal" is an unbuilt STUB** — `contact_reveal_request` exists only as a notification type + email template (`src/lib/email.ts:280`); **no server action ever creates one**. Actual contact sharing is the boolean `contactAlwaysShare`, not a handshake.
- **Directory search** — `src/modules/directory/service.ts:41` `searchDirectory()` filters by `batchId/houseId/city/profession/industry/division/…` but **NOT `bloodGroup`/`bloodDonor`** (both are Profile columns; `city` is indexed). Adding the facet is ~4 lines.

---

## 2. What can be reused (exact mapping)

| Blood-request need | Reuse this | File:line |
|---|---|---|
| Recipient set by blood group | Auto-assigned `Group{type:"blood"}` membership | `src/modules/groups/service.ts:341` |
| The request record + emergency category | `GroupRequest` model, `emergency` category, membership gate | `schema.prisma:1594-1609,2083`; `src/app/(main)/groups/actions.ts:13-56` |
| Broadcast to all matched members | `notifyGroupMembers()` fan-out pattern | `src/app/(main)/groups/actions.ts:31-56` |
| Multi-channel per-donor notify (in-app+push+email) | `sendNotification()` | `src/modules/notifications/service.ts:60` |
| Bounded broadcast loop (donors → notify) | events invite loop | `src/modules/events/invites.ts:96-117` |
| Bulk send with throttle + tally | activation-blast route | `src/app/api/admin/activation-blast/route.ts:37-50` |
| Filter donors by blood group + city | `searchDirectory()` (add bloodGroup facet) | `src/modules/directory/service.ts:41-71` |
| Emergency email as **transactional** (bypass 4/day cap + quiet hours) | `deliver()` category logic | `src/modules/email/service.ts:54-62,155-185` |
| Approval / resolve state machine to copy | `AlumniVerification.approve/reject` | `src/modules/verification/service.ts:78,120` |
| Admin oversight scaffolding | existing REAL admin pages | `src/app/admin/verification`, `/moderation` |
| Donor phone | `User.mobileE164` | `schema.prisma:107` |
| WhatsApp opt-in flag | `Profile.whatsappOptIn` | `schema.prisma:389` |
| Auth gates | `requireUser`/`requireAdmin` | `src/modules/auth/session.ts:18-38` |
| Retry for delayed sends | email outbox + `drainEmailOutbox` | `src/modules/email/service.ts:243` |
| Trigger throttle (prevent request spam) | `enforceRateLimit` | `src/lib/rate-limit.ts:38` |

---

## 3. What is missing

- **Database:** a `BloodRequest` record with a *response/donor-offer* sub-record (GroupRequest has no per-donor "I can help" child). WhatsApp opt-in *audit* fields (timestamp/source) if used for compliance. Optional `mobileVerifiedAt` actually being written.
- **APIs:** create-blood-request action; donor-response endpoint ("I can help"); admin/requester response view; mark-fulfilled transition. WhatsApp **inbound webhook** (button replies + delivery/read receipts).
- **UI:** request-create form (blood group, city, urgency, patient/contact, units); donor-facing "I can help" action (in-app + a webhook-handled WhatsApp button); requester/admin response dashboard; admin blood-requests page (none exists).
- **WhatsApp functionality:** *everything* — provider account, SDK, outbound send, Meta-approved templates, CTA buttons, inbound webhook, delivery/read tracking. (See §4.)
- **Queue/retry:** no live queue. For large blasts either (a) run synchronously per-invocation with `maxDuration` headroom, or (b) enqueue as `transactional EmailMessage`/a new outbox and drain via cron. pg-boss is not an option on Vercel.
- **Consent/opt-in:** `whatsappOptIn` boolean exists but carries no consent metadata; WhatsApp policy expects auditable opt-in. No per-channel emergency-broadcast consent.
- **Location matching:** `city` is free-text only — no state/country/pin, **no coordinates, no geocoding**, `showOnMap` has no backing lat/lng. Radius/"near me" matching is not possible without new data. City-string exact/contains match is the ceiling today.
- **Admin controls:** no blood/donor admin page; `GroupRequest` has no moderation; **admin layout auth gate is temporarily disabled** (`admin/layout.tsx:14`).
- **Third-party requirements:** a WhatsApp **BSP / Meta Cloud API** account, a verified WhatsApp Business number, message-template approval, and a public webhook URL with signature verification.

---

## 4. WhatsApp feasibility (current setup)

**Current WhatsApp capability = ZERO. There is no integration to extend.** Against each requirement:

| Requirement | Possible today? | Why / what's required |
|---|---|---|
| Send outbound emergency notifications to opted-in users | ❌ | No provider, SDK, or send code. Requires a BSP/Meta Cloud API account + verified sender number + server-side send integration. |
| Use approved templates | ❌ | WhatsApp requires **pre-approved message templates** for business-initiated messages outside the 24h window. None exist; template creation + Meta approval (hours–days) needed. Emergency/utility templates must fit an approved category. |
| Include CTA / action buttons | ❌ (but supported by platform) | Quick-reply / CTA buttons are a Cloud API template feature — available *once integrated*. Needs template design + button payload handling. |
| Receive donor's response / action | ❌ | Requires an **inbound webhook** route (public URL, `x-hub-signature-256` verification) to receive button-reply payloads. No webhook exists. |
| Track sent / delivered / read status | ❌ | Delivered/read come as **webhook status callbacks**; must be stored (new table/fields). Nothing captures them today. |
| Handle large broadcasts | ⚠️ | Platform allows it but enforces **per-number messaging tier limits** (1k/10k/100k/day, quality-gated) and rate limits. Our runtime has **no live queue** and Vercel `maxDuration:60`, so a large blast needs a chunked/outbox+cron design regardless. |
| Respect WhatsApp Business Platform policies | ⚠️ | Requires auditable opt-in, approved templates, category compliance, and opt-out handling. Our `whatsappOptIn` boolean is insufficient as a consent record; unsolicited broadcasts risk number bans (quality rating → blocked). |

**Conclusion:** WhatsApp is a **greenfield integration**, gated on an external BSP/Meta account and template approval. It is the only "significant new infrastructure" in the whole feature.

---

## 5. Recommended MVP architecture

Ship the flow on **existing channels first**; WhatsApp is Phase 2.

```
Requester creates BloodRequest (group + city + urgency + contact)
   → enforceRateLimit (anti-spam)                       [src/lib/rate-limit.ts]
   → Find eligible donors:
        Group{type:"blood", refDepartment: bloodGroup}   [groups/service.ts:341]
        ∩ Profile.bloodDonor = true
        ∩ Profile.city ~ requester.city (string match)   [directory/service.ts, +bloodGroup facet]
        ∩ opt-in (bloodDonor / whatsappOptIn / EmailPreference)
   → Broadcast: for each donor → sendNotification(...)    [notifications/service.ts:60]
        (in-app + web push + TRANSACTIONAL email)         [events/invites.ts:96-117 pattern]
   → Donor taps "I can help" (in-app action)             → create BloodResponse row
   → Requester + admin see responses                     [new page, verification-page pattern]
   → Requester/admin marks BloodRequest fulfilled        [approve/reject pattern: verification/service.ts:78]
```

**Phase 2 (WhatsApp):** add a BSP send adapter behind the same broadcast loop (a `sendWhatsApp()` sibling to `sendNotification`), a template, an inbound webhook that maps a button-reply to a `BloodResponse`, and a status table for delivered/read.

Rationale: reuses the proven fan-out (`events/invites.ts`), the multi-channel notifier, the admin approval pattern, and blood groups as the recipient set — **no new queue, no new channel needed for MVP**.

---

## 6. Data model (minimum additions)

Do **not** redesign existing models. Add:

```
model BloodRequest {
  id           String   @id @default(uuid()) @db.Uuid
  requesterId  String   @db.Uuid            // User.id
  bloodGroup   String   @db.VarChar(5)      // matches Profile.bloodGroup
  city         String   @db.VarChar(120)    // matches Profile.city (indexed)
  unitsNeeded  Int?
  urgency      String   @db.VarChar(20)     // 'critical' | 'urgent' | 'routine'
  hospital     String?  @db.VarChar(200)
  contactPhone String?  @db.VarChar(20)     // E.164
  note         String?                       // free text
  status       String   @default("open") @db.VarChar(20) // open|fulfilled|closed|expired
  fulfilledAt  DateTime? @db.Timestamptz
  createdAt    DateTime @default(now()) @db.Timestamptz
  @@index([bloodGroup, city, status])
  @@map("blood_requests")
}

model BloodResponse {
  id         String   @id @default(uuid()) @db.Uuid
  requestId  String   @db.Uuid
  donorId    String   @db.Uuid              // User.id
  status     String   @default("offered") @db.VarChar(20) // offered|confirmed|declined
  channel    String   @db.VarChar(15)       // 'in_app' | 'whatsapp' | 'push'
  createdAt  DateTime @default(now()) @db.Timestamptz
  @@unique([requestId, donorId])
  @@map("blood_responses")
}
```

**Optional (Phase 2 / compliance):**
- `Profile.whatsappOptInAt DateTime?` + `whatsappOptInSource` — auditable consent.
- `BloodBroadcastDelivery { requestId, donorId, channel, status, providerMsgId }` — only if you need WhatsApp delivered/read tracking.
- Add one `NotificationKind` (`blood_emergency`) at `notifications/service.ts:19` + an `EmailTemplates` entry + `EMAIL_CATEGORY` mapping (transactional).

Migration note (per project memory): **hand the user raw SQL to run manually on Supabase** — do not run migrate/push against the prod DB.

---

## 7. Risk assessment

- **Technical:** No live queue; Vercel `maxDuration:60`. Large synchronous blasts can time out → must chunk or use an outbox+cron. 6h notification coalescing can mute re-broadcasts to the same user (`COALESCE_WINDOW_MS`).
- **WhatsApp policy:** Unsolicited/mis-categorised broadcasts degrade the number's quality rating → throttling or ban. Templates must be pre-approved and correctly categorised (utility vs marketing). Messaging tier caps limit daily volume. Opt-in must be auditable — the current boolean is weak evidence.
- **Privacy:** Blood group + phone + hospital is **sensitive health-adjacent PII**. Broadcasting a requester's contact or a donor's number to a group is a disclosure risk. The `contact_reveal` consent handshake was never built; today only `contactAlwaysShare` exists. **Admin console auth gate is currently disabled** (`admin/layout.tsx:14`) — must fix before PII lands there. Minors: `GuardianConsent` exists — donor eligibility should exclude minors.
- **Spam / abuse:** Anyone could trigger mass broadcasts. Needs `enforceRateLimit` on creation + optional admin approval before fan-out for non-trusted users.
- **Scalability:** Donor sets are small per city/blood group today, so MVP is fine; WhatsApp tiering and the no-queue constraint bite only at scale.
- **Reliability:** Web push no-ops silently if VAPID env unset (`web-push.ts:32`); phone numbers are unverified and loosely validated (`normalizePhone`, `actions.ts:102-110`) → deliverability gaps.

---

## 8. Effort estimate

| Change | Category |
|---|---|
| Blood group / donor fields | **Already available** |
| Blood groups as recipient sets (`type:"blood"` groups) | **Already available** |
| Multi-channel notify (`sendNotification`) | **Already available** |
| Broadcast loop pattern (`events/invites.ts`) | **Already available** |
| Email deliver + transactional bypass | **Already available** |
| Admin console + approval-pattern | **Already available** |
| Rate-limit helper | **Already available** |
| `bloodGroup`/`bloodDonor` facet in `searchDirectory` | **Small change** (~4 lines) |
| New `NotificationKind` + email template | **Small change** |
| `BloodRequest` + `BloodResponse` models + migration SQL | **Small change** |
| Request-create form + donor "I can help" action | **Medium change** |
| Requester/admin response dashboard + fulfil transition | **Medium change** |
| Re-enable admin auth gate | **Small change** (fix a TEMP bypass) |
| Chunked/outbox broadcast for large sets | **Medium change** |
| **WhatsApp: BSP account + SDK + outbound send** | **Large / new infrastructure** |
| **WhatsApp: approved templates + CTA buttons** | **Large / new infrastructure** (external approval) |
| **WhatsApp: inbound webhook + status tracking** | **Large / new infrastructure** |
| Auditable WhatsApp consent fields | **Small–Medium change** |
| Geolocation / radius matching | **Large / new infrastructure** (no coords today) |

---

## 9. Final verdict

- **In-app + web-push + email blood-emergency broadcast: CAN BUILD WITH MINOR ADDITIONS.** The recipient set (blood groups), the fan-out primitive (`sendNotification` + the events invite loop), the request-record template (`GroupRequest` emergency category), the admin/approval patterns, and the data fields are all present. Net new: two small models, a form, a donor-response action, a dashboard, a directory facet, and re-enabling the admin gate.
- **WhatsApp channel specifically: REQUIRES SIGNIFICANT NEW INFRASTRUCTURE.** There is zero WhatsApp integration — no provider, dependency, templates, webhook, or status tracking — and it depends on an external BSP/Meta account plus template approval and policy-compliant auditable consent.

**Why:** the workflow logic already exists in adjacent features; only the *transport* (WhatsApp) is greenfield and externally gated. Building the MVP on existing channels de-risks the workflow immediately and lets WhatsApp be added behind the same broadcast loop once the BSP account and approved templates land.

---

## Implementation plan (phased — no code yet)

**Phase 0 — Prep / fixes (Small)**
- Re-enable `requireAdmin` in `src/app/admin/layout.tsx:14`.
- Add `bloodGroup` + `bloodDonor` filters to `searchDirectory` (`directory/service.ts:62-67`).
- Add `blood_emergency` `NotificationKind` + a transactional email template.

**Phase 1 — Core workflow on existing channels (Small→Medium)**
- Add `BloodRequest` + `BloodResponse` models; hand user the migration SQL for Supabase.
- Create-request server action (with `enforceRateLimit`); donor matching query (blood group ∩ `bloodDonor` ∩ city ∩ opt-in).
- Broadcast via the `events/invites.ts` loop calling `sendNotification` (in-app + push + transactional email).
- Donor "I can help" action → `BloodResponse`; requester/admin response view (verification-page pattern); mark-fulfilled transition.

**Phase 2 — Scale & admin (Medium)**
- Chunked/outbox broadcast for larger donor sets (avoid `maxDuration:60`).
- Admin blood-requests page (list, moderate, close, audit).
- Optional pre-fan-out admin approval for untrusted requesters.

**Phase 3 — WhatsApp channel (Large / external-gated)**
- Provision BSP / Meta Cloud API account + verified business number.
- Design + submit templates (utility category, CTA buttons) for approval.
- `sendWhatsApp()` adapter behind the existing broadcast loop; auditable consent fields.
- Inbound webhook (signature-verified) mapping button replies → `BloodResponse`; store delivered/read status.
- Respect messaging-tier caps + quality rating; opt-out handling.

**Phase 4 — Enhancements (optional, Large)**
- Geocoding for radius/"near me" matching (needs new coordinate data — none today).
- Phone verification (activate the dead `mobileVerifiedAt`).
