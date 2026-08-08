# Codebase Map — The Parliament

> Navigation index for fast lookup. Built 2026-08-08 by repo-wide scan.
> Goal: find code without re-scanning the tree. Format per line:
> `path — purpose | exports/routes | key deps`
> `src/generated/prisma/**` is auto-generated — never edit, never map.

## How to use
- Need a **route**? → §API routes or §(main) pages.
- Need **business logic**? → §Modules (the real core; pages/routes are thin wrappers over these).
- Need a **shared component**? → §Components.
- Need a **helper/config**? → §lib / §config.
- `prisma.ts` is imported by ~107 files; `school.ts` by 18; `config/membership.ts` by 25 — these are the hubs.

---

## Modules (business-logic core — hunt here first)

### auth
- `modules/auth/session.ts` — gated-page guards | `requireUser`, `optionalUser`, `requireAdmin`(legacy roles-only — prefer lib/gate), `SessionUser`, `Forbidden/UnauthorizedError` | used by nearly every page/route/action
- `modules/auth/admin.ts` — admin-email/role check | `ADMIN_ROLES`, `isAdminEmail`, `computeIsAdmin` | lib/auth, lib/gate

### karma
- `modules/karma/ledger.ts` — award/spend + anti-abuse | `awardKarma`, `spendKarma`, `awardMembershipKarma`, `getBalance`, `thresholdFor`, `computeApplied`, `classifyKind`, `giverWeight`, `istDay`, `InsufficientKarmaError` | onboarding/complete, admin/karma, membership/claim, feed/posts(dyn), lib/gate

### feed
- `modules/feed/query.ts` — feed+comments read | `getFeed`, `getPostById`, `listSavedPosts`, `listPostComments`, `FeedCursor` | feed page/actions/profile/saved/postId
- `modules/feed/posts.ts` — post/comment mutations + ranking | `createPost`, `editPost`, `deletePost`, `publishDraft`, `listDrafts`, `votePoll`, `toggleReaction`, `sharePost`, `toggleSavePost`, `givePostAward`, `createComment`, `deleteComment`, `hidePost`, `recompute*` | feed/compose actions, moderation(dyn)
- `modules/feed/comments.ts` — comment reactions + mention search | `toggleCommentReaction`, `searchMentionTargets`, `MentionTarget`
- `modules/feed/ranking.ts` — hot-score math | `hotScore`, `authorQualitySignal`, `AUTHOR_SIGNAL`, `RankingInput`
- `modules/feed/cursor.ts` — recency cursor where-clause | `recencyCursorWhere`, `FeedCursor`
- `modules/feed/impressions.ts` — seen-tracking pure helpers | `prepareImpressionBatch`, `planExclusions`, `shouldServeCaughtUp`
- `modules/feed/mentions.ts` — @handle extract + notify | `extractMentionHandles`, `notifyMentions`

### membership
- `modules/membership/service.ts` — current tier + plans + history | `getCurrent`, `listPublicPlans`, `getHistory`, `UpgradeOption`
- `modules/membership/activation.ts` — activate/expire + welcome template | `activateMembership`, `expireMembership`, `welcomeTemplateFor`
- `modules/membership/claim.ts` — claim+activate order | `claimAndActivateOrder` | membership/verify, razorpay webhook
- `modules/membership/admin.ts` — grant/extend/revoke/refund/committee | `adminGrant/Extend/Revoke/Refund`, `validateRefundAmount`, `inviteToCommittee`, `accept/declineCommitteeInvite`, `getMembershipStats`
- `modules/membership/invoice.ts` — invoice issue/url | `issueInvoiceForOrder`, `getInvoiceUrl`
- `modules/membership/receipt.ts` — receipt vars + issue | `receiptVars`, `issueReceiptAndInvoice`
- `modules/membership/payment-guard.ts` — captured-payment check | `checkCapturedPayment` | membership/verify, events/verify
- `modules/membership/jobs.ts` — maintenance runner | `runMembershipMaintenance`, `registerMembershipJobs` | cron/membership
- `modules/membership/certificate.ts` — yearly certs | `issueYearlyCertificates`

### events
- `modules/events/service.ts` — list/rsvp/feedback/admin rows | `listEventsShared`, `rsvpEvent`, `cancelRsvp`, `getEventById`, feedback fns, `getAdminEventRows`, `deriveEventStatus`, `listEventAttendees`, `setCheckIn`
- `modules/events/orders.ts` — paid-event claim | `claimEventOrder`, `isRegistered`
- `modules/events/invites.ts` — invite-wave scheduler | `scheduleEventInvites`, `processDueInviteWaves`, `waveSchedule`, `statusesForTier` | cron/event-invites

### games
- `modules/games/alfazy.ts` — wordle logic | `checkGuess`, `gradeGame`, `isSolved`, `scorePlay`, `getDailyPuzzle`, `pickIndex`, `WORD_LEN`, `MAX_GUESSES`
- `modules/games/leaderboard.ts` — aggregate/rank/cache | `leaderboard`, `leaderboardCached`, `leaderboardWithMovementCached`, `aggregate`, `rankEntries`, `streakLength`, `currentStreak`, `alfazyGameId`, `ALFAZY_CACHE_TAG`
- `modules/games/periods.ts` — date/window math | `puzzleNumber`, `anchorFor`, `windowFor`, `priorAnchor`, `PERIODS`, `Period`
- `modules/games/champions.ts` — freeze/backfill trophies | `freezeAnchor`, `closeJustEnded`, `backfillChampions`, `trophiesForUser`
- `modules/games/format.ts` — labels | `formatAnchor`, `PERIOD_LABEL`, `SCOPE_LABEL`, `SCOPES`, `Scope`
- `modules/games/nudge.ts` — streak-nudge verdict | `nudgeVerdict`, `NUDGE_COOLDOWN_MS`

### messaging
- `modules/messaging/service.ts` — DM CRUD | `findOrCreateConversation`, `listConversations`, `getMessages`, `sendMessage`, `edit/deleteMessage`, `toggleReaction`, `markRead`, `totalUnread`, `canMessage`, `dmKeyFor`, `isChatHidden`
- `modules/messaging/reactions.ts` — pure reaction helpers | `nextReaction`, `applyReaction`, `groupReactions`
- `modules/messaging/types.ts` — view types | `ConversationSummary`, `MessageView`

### notifications
- `modules/notifications/service.ts` — send/list/read | `sendNotification`, `listNotifications`, `markRead/AllRead`, `unreadCount`, `deleteNotification`, `pushUrlFor`
- `modules/notifications/links.ts` — deep-link/CTA builder | `buildNotifLinks`, `resolveNotifLinks`

### profile / verification
- `modules/profile/service.ts` — read/update | `getProfileByUsername`, `updateProfile`
- `modules/profile/history.ts` — pure date/duration | `monthYearToDate`, `formatMonthYear`, `formatDuration`
- `modules/profile/view-digest.ts` — weekly view email | `sendProfileViewDigests` | cron/email
- `modules/verification/service.ts` — submit/approve/reject | `submitVerification`, `listPending`, `approve/rejectVerification`
- `modules/verification/endorsements.ts` — suggest/request/record | `suggestEndorsers`, `requestEndorsement`, `recordEndorsement`, `endorsementSummaries`, `getEndorsementByToken`
- `modules/verification/endorsements-logic.ts` — pure scoring | `endorserScore`, `summarizeEndorsementRows`

### connections / directory / business / groups
- `modules/connections/service.ts` — follow graph | `getFollowData`, `getFollowingIds`, `followUser`, `unfollowUser`
- `modules/directory/service.ts` — alumni search+facets | `searchDirectory`, `getDirectoryFacets`, `DirectoryFilters/Row`
- `modules/business/service.ts` — biz list/create | `listBusinesses`, `getBusinessBySlug`, `createBusiness`, `listBusinessCategories`
- `modules/groups/service.ts` — group list/join/page | `listGroupsShared`, `getGroupPageData`, `join/leaveGroup`, `getAdminGroupRows`, `myGroupIds`
- `modules/groups/request-schema.ts` — zod | `groupRequestSchema`

### admin / moderation / onboarding / email / engagement
- `modules/admin/users.ts` — user actions/edit/import/csv/badges/karma | `actOnUser`, `editUser`+schema, `parseUserCsv`, `importUsers`, `createInvitedUser`, `setBadge`, `adminAdjustKarma`, `getKarmaHistory`, `slugify`, `NotFound/BadActionError`
- `modules/admin/pagination.ts` — URL-param paging | `parsePage`, `pageCount`, `firstParam`, `PAGE_SIZE`
- `modules/moderation/service.ts` — reports | `fileReport`, `listOpenReports`, `resolveReport`
- `modules/onboarding/service.ts` — wizard steps | `nextStep`, `getProgress`, `saveStep`, `markComplete`
- `modules/onboarding/suggestions.ts` — follow suggestions | `getFollowSuggestions`, `SuggestedPerson`
- `modules/email/service.ts` — deliver/outbox/suppress/optout | `deliver`, `drainEmailOutbox`, `queueEmail`, `suppress`, `generate/consumeUnsubscribeToken`, `setOptOut`, `buildMailPayload`
- `modules/email/templates.ts` — seed template data | `SEED_TEMPLATES`, `EmailCategory`
- `modules/email/seed.ts` — upsert templates | `seedEmailTemplates`
- `modules/engagement/daily-digest.ts` — daily email | `sendDailyDigests` | cron/email

---

## API routes (`src/app/api/`)
Most are thin `requireUser/requireAdmin → module call → ok()` wrappers over §Modules with shared `lib/api` error handling.

### auth / onboarding
- `auth/[...nextauth]` — GET/POST Auth.js passthrough | lib/auth
- `auth/signup` — POST create user+profile+username, JNV house/batch, auto-follow, email code | prisma, bcryptjs, rate-limit, email-code, email, school, houses, avatar
- `auth/verify-code` — POST sessionless verify/resend 5-char signup code | email-code
- `auth/verify-email` — POST consume email-verify link token | email-verify
- `auth/forgot` — POST throttled reset email (enum-safe) | password-reset, email
- `auth/reset` — POST reset password from token | password-reset, bcryptjs
- `onboarding/save` — POST upsert per-step blob (20KB cap) | lib/onboarding
- `onboarding/progress` — GET progress | onboarding/service
- `onboarding/complete` — POST mark complete + profile_complete karma | onboarding/service, karma/ledger
- `onboarding/verify` — POST/PUT email code — **DUP of lib/email-code**

### profile / feed / social
- `me` — GET viewer name+avatar | prisma
- `community` — GET paged directory rows (infinite scroll) | directory/service, school
- `houses` — GET house options by batch/gender (CDN-cached) | lib/houses
- `schools` — GET school list (CDN-cached) | prisma
- `profile/photo` — POST avatar → supabase | supabase-storage, rate-limit
- `profile/cover` — POST cover → supabase | supabase-storage, rate-limit
- `profile/username-check` — GET live availability | username-check
- `comments/upload` / `messages/upload` — POST image → supabase (**same handler ×2**) | supabase-storage, rate-limit
- `messages/unread` — GET unread DM count | messaging/service
- `notifications/summary` — GET unread+recent; POST mark read | notifications/service+links
- `push/subscribe` — POST/DELETE web-push subscription | prisma
- `reports` — POST content report | moderation/service, rate-limit
- `uploads/sign` — POST signed R2 URL | lib/r2, rate-limit
- `verification/submit` — POST alumni verification | verification/service

### membership / events / payments
- `membership/me|history|plans` — GET (plans CDN-cached) | membership/service
- `membership/checkout` — POST server-priced Razorpay order | config/membership, razorpay, audit
- `membership/verify` — POST verify sig+capture, claim+activate | razorpay, membership/claim, payment-guard
- `membership/committee/accept` — POST accept/decline invite | membership/admin
- `membership/invoice/[id]` — GET redirect to signed invoice URL | membership/invoice
- `events/[id]/checkout` — POST event Razorpay order | razorpay, events/orders
- `events/[id]/verify` — POST verify+claim registration (**same flow as membership/verify**) | razorpay, events/orders, payment-guard
- `razorpay/webhook` — POST signed webhook; payment/subscription/refund, idempotent | membership/{activation,claim,receipt}, webhook-dedup

### misc / cron / admin
- `email/unsubscribe` — GET/POST consume token, set opt-out (POST just calls GET) | email/service
- `csp-report` — POST log CSP violations (console only) — speculative
- `health` — GET DB liveness (SELECT 1) | prisma
- `cron/membership` — GET daily maintenance | cron-auth, membership/jobs
- `cron/event-invites` — GET due invite waves (hourly GH Action) | cron-auth, events/invites
- `cron/email` — GET drain outbox + profile-view + digests | cron-auth, email/service, profile/view-digest, engagement/daily-digest
- `cron/alfazy-champions` — GET freeze closed leaderboard periods | cron-auth, games/champions
- `admin/verification` — GET pending; POST approve/reject | verification/service, lib/gate
- `admin/membership` — GET stats; POST grant/extend/revoke/refund/invite | membership/admin, lib/gate
- `admin/activation-blast` — POST bulk set-password emails (date-gated) | password-reset, email, lib/gate
- `admin/users/[id]` PATCH; `[id]/action` POST; `[id]/karma` GET+POST; `[id]/badges` POST | admin/users, lib/gate
- `admin/users/bulk` POST (≤500); `invite` POST (**uses session.requireAdmin dup**); `import` POST CSV (≤500); `export` GET CSV | admin/users
- `admin/emails/templates` GET+PUT; `suppressions` GET+DELETE; `outbox` GET | prisma, lib/gate, audit

---

## (main) pages (`src/app/(main)/`)
Shell: `layout.tsx` mounts PrivateNavbar + MobileTabBar + PushRegistrar + FollowStoreProvider, loads viewer via `optionalUser`+`loadViewer`. `dashboard/page.tsx` just redirects to /feed.

- **[username]/** — `load-profile.tsx` is the fetch core (`loadProfile`, `VALID_TABS`); `profile-view.tsx` the client UI; `profile-timeline.tsx` infinite scroll; `actions.ts` keyset paging.
- **business/** — `page.tsx` grid (unstable_cache); `[slug]` detail (ISR 120s); `new/` Premium-gated form+action.
- **community/** — `page.tsx` (3 cached fetches) → `community-client.tsx` (search/filter, infinite scroll via /api/community).
- **connections/** — `page.tsx`→client tabs; `actions.ts` follow/unfollow.
- **compose/** — `page.tsx` PostComposer; `actions.ts` create/publishDraft/deleteDraft; `drafts/`.
- **events/** — `page.tsx` SSR list; `events-client.tsx` grid+modal; `actions.ts` create/rsvp/interest/checkIn/feedback; `create-schema.ts` zod+paise; `[slug]/` detail+register(Razorpay)+attendance+feedback.
- **feed/** — `page.tsx` SSR first page + ads; `feed-content.tsx` client infinite scroll/impressions; `actions.ts` ~20 server actions; `map-row.ts` DB→FeedPost; `[postId]/` detail+edit+analytics+comments(useOptimistic)+mention-input.
- **games/** — `alfazy/` hub/play(Wordle)/results/leaderboard/champions; logic in modules/games.
- **groups/** — `page.tsx` SSR list; `groups-client.tsx` tabs+join; `actions.ts`; `[slug]/` detail+gated members.
- **membership/** + **upgrade/[type]/** — client plans→checkout (Razorpay); pricing from config/membership.
- **messages/** — `layout.tsx` requireUser+listConversations; `MessagesShell` master-detail (60s poll + Realtime); `[conversationId]/ConversationView` (Realtime send/edit/react/typing/presence).
- **network/** — `page.tsx` builds from DB + static `network-data.ts`; `network-client.tsx` discovery; `chapters/[slug]`; `components/*` cards. (AlumniCard here ≈ dup of shared/AlumniProfileCard.)
- **notifications/** `page`+`actions`+client; **saved/** feed wrapper; **settings/** account+email prefs+password (`prefs.ts` pure helpers); **profile/edit/** big client editor (`actions.ts` per-section saves).

## (auth) / (onboarding) / endorse
- `(auth)/auth/` — `layout` form+NetworkPanel; `ui.tsx` shared primitives; signin/forgot/reset/verify + signup(wraps homepage SignupCard).
- `(onboarding)/onboarding/[step]/` — server gate + wizard; `actions.ts` checkUsername/saveProfile/saveWork/follow/publishIntro/finish.
- `endorse/[token]/` — server gate by token; `actions.ts` recordEndorsement.

## (marketing) pages
`layout.tsx` = StickyNav+Footer. Mostly static content via `marketing/primitives.tsx`: about, committee, changelog, join(FaqAccordion), contact(nodemailer server action), donate/gallery/governance/moa/newsroom/sponsorship/wall-of-honour/rules, help/privacy/terms(LegalDoc). Many carry `{{PLACEHOLDER}}` values awaiting real content.

---

## Components (`src/components/`)

### shared/ (cross-feature — reuse these)
- `PrivateNavbar.tsx` — gated top nav (search/premium/notifications/profile menu)
- `PostComposer.tsx` — full post composer (types/bg/poll/media/audience) | /compose, feed edit
- `ComposeTrigger.tsx` — "Start a post…" entry → /compose
- `FeedCard.tsx` + `feed-card/{blocks,reaction-bar,types,use-dropdown}.ts(x)` — canonical post card; `FeedPost` type in types.ts; `VerifiedBadge` (tier seal) in blocks
- `AlumniProfileCard.tsx` — canonical alumni card (house colours) | 8 sites
- `VerifiedTick.tsx` — verified seal (dup path w/ VerifiedBadge)
- `ProfileSidebar.tsx` (server) → `ProfileSidebarView.tsx` (client rail) + `SidebarFooter.tsx`
- `FollowButton.tsx` + `follow-store.tsx` — button + app-wide optimistic follow context
- `MediaGallery.tsx`, `EmojiPicker.tsx`, `AvatarUploader.tsx`, `AchievementsPanel.tsx`, `TrophyCase.tsx`, `UpgradePrompt.tsx`, `MobileTabBar.tsx`, `PushRegistrar.tsx`, `ChatDecorations.tsx`, `skeletons.tsx`, `feed-skeletons.tsx`

### homepage/
- `Homepage.tsx`(renders only HeroSection), `HeroSection.tsx`, `NetworkPanel.tsx`, `NetworkArt.tsx`, `SignupCard.tsx`, `StickyNav.tsx`, `Footer.tsx`

### marketing/
- `primitives.tsx` (shared tokens, 16 importers), `CommitteeTabs.tsx`, `FaqAccordion.tsx`, `GalleryGrid.tsx`, `LegalDoc.tsx`, `LegalSidebar.tsx`, `MemberCard.tsx`

### onboarding/
- `OnboardingWizard.tsx` (shell), `StepIndicator.tsx`, `StepProfile/StepWork/StepFollow/StepPlan/StepIntro.tsx`, `OnboardingPreview.tsx`

### games/
- `Confetti.tsx`, `CountUp.tsx`, `GamesRail.tsx`, `LeaderboardTabs.tsx`, `NudgePanel.tsx`, `Podium.tsx`, `ShareResult.tsx`, `Skeletons.tsx`

---

## lib / config / types

### lib/ (key hubs bolded by importer count)
- **`prisma.ts`** (~107) — PrismaClient singleton (PrismaPg adapter)
- **`school.ts`** (18) — cached single-school id resolver | `getDefaultSchoolId`
- `api.ts` (35) — `ok`, `badRequest`, `handleError` | all route handlers
- `audit.ts` (20) — `audit`, `AuditEntry`
- `auth.ts` (5) — Auth.js config (Google+Credentials, JWT)
- `gate.ts` (13) — access gate | `gateUser`, `requireVerified`, `requireAdmin` (canonical — prefer over session.requireAdmin)
- `email.ts` (16) — template registry + `sendEmail`; `email-code.ts`, `email-layout.ts`, `email-verify.ts` support it
- `rate-limit.ts` (14) — `checkRateLimit`, `enforceRateLimit`, `RateLimitedError`
- `razorpay.ts` (6) — SDK + `verifyPaymentSignature`, `verifyWebhookSignature`
- `r2.ts` (5) — R2 signed uploads + `validatePostMedia`; `supabase-storage.ts` (6) avatars/covers/msg images; `supabase-browser.ts`/`supabase-realtime.ts` realtime
- `onboarding.ts` (13) — wizard step config; `homepage-data.ts` (17) landing content; `committee.ts` roster
- `houses.ts` (3), `membership-cycle.ts` (5), `password-reset.ts` (4), `username-check.ts` (3), `avatar.ts` (8), `viewer.ts` (3), `cron-auth.ts` (4), `webhook-dedup.ts`, `web-push.ts`, `jobs.ts`(pg-boss), `utils.ts`(`cn`), `relative-time.ts`, `profile-strength.ts`, `text-preview.ts`, `errors.ts`, `fonts.ts`, `session-refresh.ts`

### config/
- `karma.ts` (source of truth: thresholds/values/caps), `membership.ts` (25 — PLANS/BENEFITS/computePricing/lookupPromo), `houses.ts` (HOUSE_CATALOG), `chat-themes.ts` (18 festive themes), `membership-colors.ts`, `sidebar-nav.ts`, `post-awards.ts`, `feed-ads.ts`, `alfazy-trophies.ts`, `alfazy-words.ts` (scripts only, not dead)
- **Mostly-dead:** `env.ts` (only `adminEmails` read; libs read `process.env` directly)

### types / root
- `types/next-auth.d.ts` — augments Session/JWT (username, onboarding*, membershipStatus, isAdmin)
- `instrumentation.ts` + `sentry.*.config.ts` — Sentry-Next wiring (standard, keep)

## prisma/schema.prisma — 94 models, groups
1. **Identity/JNV**: School, House, Division, Batch, User, UserCredential/Session, Mfa, Interest, OnboardingProgress, Profile, Experience, Education, GuardianConsent
2. **Social+verification**: Follow, ProfileView, UserBlock, AlumniVerification, Endorsement, UserRole
3. **Feed**: PostCategory, Post, Mention/Share/Spotlight, Comment, Reaction, ContentReport, Saved/Hidden/Impression, PostAward, Poll(+Option/Vote), Hashtag(+PostHashtag)
4. **Messaging+notifications**: Conversation, Participant, Message, MessageReaction, Notification, PushSubscription
5. **Karma/membership/payments**: KarmaThreshold/UserKarma/Transaction/DailyCounter/PairDay, Membership(+Order/Invoice/Refund/Event), CommitteeInvite, Poll/VoteEligibility, Payment, Donation, Rewards/Badges
6. **Events/business/groups/games/infra**: Event(+Wave/Rsvp/Attendance/Feedback/Order), Business(+Category/Review), Group(+Member/Request), Game/Alfazy/Tournament, RateLimitCounter, ProcessedWebhookEvent, AuditLog, Email*(Template/Message/Preference/Suppression/UnsubToken), ActivityEvent
