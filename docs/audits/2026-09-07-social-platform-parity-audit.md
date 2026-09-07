# Social Platform Parity Audit — The Parliament (NNAWCA)

**Question:** How close is the current codebase to a complete, scalable social media platform comparable to the **core social layer** of Facebook and LinkedIn?

**Date:** 2026-09-07 · **Branch:** `master` @ `2557d9d` · **Scope:** social primitives only (identity, graph, content, feed, engagement, comments, sharing, notifications, search, messaging, privacy, media, real-time, moderation, data/API/scale). **Explicitly excluded** per brief: ads, monetization, payments, membership, karma economy, games (Vyapaar), business directory, admin/business tooling except where a social feature depends on it.

**Method:** static read of the current tree — full `prisma/schema.prisma` (94 models, 2624 lines) read directly, plus 8 parallel subsystem investigations tracing UI → action/route → service → DB → events → jobs, each citing `file:line`. Findings are reconciled against the prior deep audit `docs/audits/2026-09-02-social-system-audit.md` (branch `364ff26`), which is **partially stale**: the "P1 batch" (PRs #421–#428) fixed roughly six of its ten P0s. This audit reflects **current** code.

**Evidence discipline:** every major claim is tagged **Verified** (code read, `file:line` cited), **Inferred** (strong implication, path not executed), or **Unknown** (insufficient evidence). Confidence High/Med/Low. See the Assumptions block at the end for what could not be verified from source (production env vars, whether index migrations are live, real traffic volumes).

---

## Executive Summary

The Parliament is **a genuinely built, production-grade social platform for a single-school community (low thousands of users)** — not a prototype, and materially stronger than the 5-day-old prior audit implies. The feed has a real write-time ranking engine with keyset pagination and never-repeat seen-tracking; messaging is realtime-primary with typing/presence/receipts/reactions/replies; search now has a real privacy-filtered backend; moderation now actually removes content and enforces suspensions; post counters are DB-trigger maintained and drift-proof.

It is **not** a Facebook/LinkedIn-scale platform, and it has **four live privacy/safety leaks** that a credible social network cannot ship with. The gap to FB/LinkedIn is now **less about missing features and more about (a) a handful of correctness leaks and (b) scale architecture** (synchronous fan-out with no queue, unbounded impression/notification growth, reaction write-amplification, no feed cache, single-school single-Postgres).

| Metric | Score | Basis |
|---|---|---|
| **Overall Social Platform Readiness** | **≈ 61 / 100** | Unweighted mean of 18 subsystem scores × 20 (see Scorecard) |
| **Functional parity** (core primitives vs FB/LinkedIn) | **≈ 65 %** | Most primitives present and real; reposts/search-relevance/connections/media behind |
| **Architectural readiness** (right shape to evolve without rewrite) | **≈ 55 %** | Feed/counters/messaging/search shapes are sound; no event bus/queue, public media buckets, four leaks |
| **Scalability readiness** (toward millions) | **≈ 35 %** | Comfortable to ~10–50k; real walls before 1M |

**Biggest strengths (verified):**
1. **Feed ranking is production-grade** — stored Reddit-hot score, SQL `ORDER BY` on an indexed column, keyset cursors on both orders, bounded seen-exclusion. Not `ORDER BY created_at`. (`feed/query.ts`, `feed/ranking.ts`)
2. **1:1 messaging is near-Messenger parity** — Supabase Realtime broadcast + typing + presence + read receipts + reactions + replies + image attach + idempotent send + LiveKit calls. (`modules/messaging`, `messages/[conversationId]/ConversationView.tsx`)
3. **Counters are trigger-maintained** — `upvote/downvote/comment/share` recomputed atomically with the source write; drift-proof. (`migrations/…post_counter_triggers`)
4. **The moderation loop now closes** — report → cluster → `applyModerationConsequence` mutates posts, comments, messages, businesses, and profiles; suspensions are enforced and auto-expire. (`moderation/service.ts`, `cron/moderation`)

**Biggest weaknesses (verified):**
1. **Followers-only posts leak on profile timelines** — `getFeed` skips all per-viewer scoping when `authorId` is set (`query.ts:107`), so a "followers-only" post renders on the author's profile to non-followers and to **logged-out** visitors on a public profile.
2. **Suspended/banned users' existing content is never hidden** — banning stops the *actor* but no read path filters by author status; the abuser's footprint persists (`admin/users.ts:94`, no author-status filter anywhere).
3. **Private media is served from public storage buckets** — DM images, comment images, and images on followers/groups-scoped posts sit at unauthenticated public URLs (`supabase-storage.ts:84`, `r2.ts:110`).
4. **No repost-as-object, ILIKE-only search relevance, no group DMs, no connection (accept/reject) model** — the functional deltas vs FB/LinkedIn.

**Biggest hidden risks (verified):**
1. **Reaction write-amplification** — every up/down-vote *and* un-vote runs `recomputeAuthorRanking` = 1 aggregate + up to **100 synchronous `post.update`s** inside the request (`feed/posts.ts:139-166,585,681`). This is the first thing to melt under load.
2. **Synchronous fan-out with no queue** — notifications/mentions/invites are inline loops, capped at 5000, and the realtime notification broadcast **fires per-like** → a viral post DoSes the *author's own* session (`notifications/service.ts:140`; `events/invites.ts:104`).
3. **Unbounded growth with no retention** — `PostImpression` (1 row per viewer×post) and `Notification` grow forever, no TTL/prune. (`schema.prisma:837`, `notifications/service.ts`)

### The two final answers

**If launched today as a pure social network, what would users immediately notice is missing/broken vs FB/LinkedIn?**
- **Privacy that doesn't hold:** a "followers-only" post is readable by anyone via your profile or its URL-adjacent surfaces; a blocked person can still DM you in an old thread; a banned account's posts stay up. Users *will* notice their private posts aren't private.
- **No real reshare:** you can "share" a post but it doesn't appear as a repost in anyone's feed with attribution — the core FB/LinkedIn distribution loop is absent.
- **Search that doesn't rank or autocomplete:** typing a name works, but there's no type-ahead, no recent searches, no relevance ordering, and the "suggested searches" are fake.
- **No group chat:** only 1:1 DMs.
- **No connections model:** it's follow-only; "0 mutual" is now real but there's no request/accept, so LinkedIn-style networking is absent by design.
- **Media that's slow and leaky:** full-resolution originals served (no thumbnails/resize), private images at public URLs.
- **Notifications that spam, not aggregate:** "Bob reacted" overwrites "Alice reacted" rather than "Alice and 4 others"; no "+N others."

**What are the minimum changes to make this a credible, scalable social platform without rewriting the system?** (all additive to the existing Next + Prisma + Postgres + Supabase Realtime stack)
1. **One `canView(viewer, entity)` clause** applied to the profile timeline, saved-posts, and `/mention` feed (kills leak #1). ~1 shared function, small diff.
2. **Author-status filter** in the shared post/comment read clause (kills leak #2).
3. **Signed/authorized media access** for private buckets, or per-viewer signed URLs (kills leak #3).
4. **Block recheck in `sendMessage`** (kills leak #4). One guard.
5. **Repost-as-object** — make a share a first-class feed row with attribution.
6. **A transactional outbox + a worker** (or Supabase pg_cron drain) to move reaction-ranking recompute, notification fan-out, and mention loops off the request path — removes the #1 and #2 scale risks and unblocks large fan-out.
7. **Impression TTL/prune + a page-1 feed cache** — removes the two unbounded-growth walls.
8. **Postgres FTS (`tsvector` + `ts_rank`) + autocomplete** behind the existing `/search` — upgrade in place, no new infra.
9. **Notification aggregation ("+N others") + broadcast coalescing** — one query + one guard.

None of these require replacing a working subsystem. The core architecture is the right shape; the work is closing leaks and offloading synchronous fan-out.

---

## 1. Current Architecture

**Stack (verified):** Next.js 16 App Router (`src/`), TypeScript strict, Prisma 7 (`prisma-client` generator → `src/generated/prisma`) over PostgreSQL (Supabase; pgBouncer transaction pooler at runtime, direct URL for migrations), Auth.js JWT (Credentials provider only — the CLAUDE.md "Google OAuth" claim is stale), Tailwind, deployed on Vercel serverless. Redis (Upstash) for session cache + rate limiting. Cloudflare R2 + Supabase Storage for media. Supabase Realtime for live delivery. LiveKit for calls.

**Route protection:** no active `src/middleware.ts` gate for authz (a cookie-presence redirect backstop may exist); enforcement is per-page/route via `requireUser`/`optionalUser`/`requireAdmin` (`modules/auth/session.ts`). API routes self-gate.

**Where each social subsystem lives (verified):**

| Subsystem | Primary code | Storage |
|---|---|---|
| Identity/auth | `lib/auth.ts`, `modules/auth/session.ts`, `lib/account-status.ts` | `User`, `UserCredential`, `UserSession` (unused), `MfaFactor` (unused), `UserRole` |
| Profiles | `app/(main)/[username]/load-profile.tsx`, `modules/profile/{privacy,edit}` | `Profile`, `Experience`, `Education`, `ProfileView` |
| Social graph | `modules/connections/{service,blocks,invites}.ts`, `modules/onboarding/suggestions.ts` | `Follow`, `UserBlock` (no `Connection` model) |
| Content | `modules/feed/{posts,mentions,hashtags,pin}.ts`, `app/(main)/compose` | `Post`, `PostMention`, `Hashtag`/`PostHashtag`, `Poll*`, `PostAward`, `SavedPost` |
| Feed/ranking | `modules/feed/{query,ranking,cursor,trending,impressions}.ts` | `Post.rankingScore` (+indexes), `PostImpression`, `HiddenPost` |
| Engagement | `modules/feed/{posts,comments}.ts` | `Reaction` (polymorphic), `Comment`, `PostShare`, trigger-maintained counters |
| Notifications | `modules/notifications/service.ts`, `lib/web-push.ts`, `lib/supabase-realtime.ts` | `Notification`, `NotificationPreference`, `PushSubscription` |
| Search | `modules/search/service.ts`, `modules/directory/service.ts`, `app/(main)/search` | ILIKE + trigram GIN indexes |
| Messaging | `modules/messaging/service.ts`, `messages/[conversationId]/ConversationView.tsx` | `Conversation`, `ConversationParticipant`, `Message`, `MessageReaction` |
| Privacy/authz | `modules/auth/session.ts`, `modules/profile/privacy.ts`, `modules/connections/blocks.ts` | enforced in query where-clauses |
| Media | `lib/r2.ts`, `lib/supabase-storage.ts`, `modules/media/gc.ts` | R2 (presigned) + Supabase (proxied); public buckets |
| Real-time | `lib/supabase-realtime.ts` (broadcast REST), client `supabase.channel(...)` | Supabase Realtime (client-held WS) |
| Moderation | `modules/moderation/service.ts`, `app/admin/moderation` | `ContentReport`, `ModerationAction`, `MemberSuspension` |
| Jobs | `app/api/cron/*` (Vercel Cron, 8 daily) + GitHub Actions (hourly/monthly) + Supabase pg_cron (10s) | `RateLimitCounter`, `EmailMessage` outbox |

**Architectural signature:** transactional core write, then **best-effort synchronous** side effects (notify/email/broadcast/rank), no domain-event bus, no job queue (pg-boss is installed but dead on serverless). Reads are batched (no gross N+1 in feed), but hub-entity loads are unbounded. Real-time is correctly offloaded to Supabase (no long-lived server sockets).

---

## 2. Capability Matrix (social only)

Status: **Full** = real end-to-end · **Partial** = works with a gap/leak · **UI-only** · **Backend-only/dead** · **Missing**. All Verified from code unless noted.

### A. Identity & Profiles
| Capability | Status | Evidence |
|---|---|---|
| Accounts, email verify, JWT session | Full | `lib/auth.ts`, email-code flow |
| Account status enforced (suspend/ban) | Partial | `session.ts:31`→`canSignIn`; ≤60s JWT lag; `inactive`/`deletedAt` not write-blocked (`canAct` dead) |
| Google OAuth | Missing | Credentials only; CLAUDE.md claim stale |
| 2FA / device list / session revoke | Missing | `MfaFactor`, `UserSession` modelled, unused |
| Profile: photo, cover, bio, headline | Full | `Profile`, `profile/edit/actions.ts` |
| Work experience / education / skills | Full | `Experience`, `Education`, `Profile.skills` |
| Profile visibility (public/alumni/connections/private) | Full | `profile/privacy.ts:50-70`, server-gated |
| Server-side PII redaction (DOB/blood/address/phone) | Full | `load-profile.tsx:386-397`; `mobileE164` never selected |
| Public profile URL (logged-out) | Full | `[username]/page.tsx`; default `alumni` blocks guests |
| "Who viewed your profile" | Partial | recorded + weekly email; no in-app viewer list |
| Data export / hard delete / reactivation | Missing | `members:hard_delete` permission unimplemented |

### B. Social Graph
| Capability | Status | Evidence |
|---|---|---|
| Follow / unfollow (idempotent, rate-limited) | Full | `connections/service.ts:189-233`, unique constraint |
| Connect / accept / reject (LinkedIn model) | Missing | deleted in migration `20260730130000_follow_model`; follow-only |
| Block (symmetric, edge-severing) + unblock + list | Full | `blocks.ts:39-91`, `settings/blocked-accounts.tsx` |
| Block enforcement (feed/profile/post/comment/dir/search/mention) | Full | ~11 surfaces |
| Block on DM send (existing thread) | **Partial (bypass)** | `messaging/service.ts:230` no recheck |
| Mute / restrict (per-author feed mute) | Missing | only per-post `HiddenPost` |
| Follower/following/mutual counts | Full | live COUNT; mutuals real (`service.ts:165-178`) |
| People-you-may-know (ranked) | Full | mutual·3 + batch·2 + house (`service.ts:145-154`) |
| Member invites (attribution) | Full | `invites.ts`, `User.invitedById` |

### C. Content & Engagement
| Capability | Status | Evidence |
|---|---|---|
| Text/image/multi-image/video/link+preview/quote/question/poll | Full | `posts.ts:168-315`; video ≤64MB |
| Document/PDF posts, scheduled posts | Missing | no PDF mime; no `scheduledAt` |
| Drafts + autosave | Full | `status:"draft"`, `/compose/drafts` |
| Edit / delete (author-only, soft-delete, karma clawback) | Full | `posts.ts:496-546` |
| Edit media re-validation / edit window | Partial | edit skips `validatePostMedia`; no time limit |
| Reactions (up/down/like, add/remove/switch) | Full | `posts.ts:550-683` |
| Reaction dedupe under concurrency | Partial | unique constraint blocks dup row but check-then-insert races → P2002/500 |
| Comments create/edit/delete/reply + votes + mentions | Full | `posts.ts:826-975`, `comments.ts` |
| Comment threading | Partial | arbitrary depth in DB, flattened to 1 level in UI |
| Comment reply loading | Partial (scale) | all replies fetched unbounded (`query.ts:425-431`) |
| Deleted-parent-comment handling | Partial (bug) | descendants orphaned from view, no tombstone |
| Share / repost | Partial | counter + notify + rank, but **not a feed object**; no unique constraint (over-count); no unshare |
| Quote-repost | Backend-only/dead | `PostShare.comment` stored, never rendered |
| Save / bookmark | Full | `SavedPost` |
| Mentions (@user) | Full | `mentions.ts`, notify + email |
| Mentions (@house/@batch) | Backend-only/dead | schema + feed filter exist, no writer |
| Hashtags | Partial | extracted, but `useCount` drifts (re-inc on edit, never dec) |

### D. Feed
| Capability | Status | Evidence |
|---|---|---|
| For-you (ranked) / following / trending / chrono / hashtag / mention | Full | one `getFeed` engine, flag-branched |
| Keyset cursor pagination + infinite scroll | Full | `cursor.ts`; page-1 offset only |
| Ranked ORDER BY on indexed column (not JS sort) | Full | `@@index([schoolId,rankingScore])` |
| Seen-exclusion (never-repeat, bounded 1000) | Full | `PostImpression`, `impressions.ts:10` |
| Excludes deleted/blocked/hidden on main feed | Full | `query.ts:60-142` |
| Enforces followers-scope on main feed | Full | `query.ts:147-150` |
| Profile-timeline scope/block enforcement | **Partial (leak)** | `authorId` branch bypasses gate (`query.ts:107`) |
| Feed cache | Missing | `force-dynamic`, no `cached()` |
| Author/topic diversity, velocity, negative-signal ranking | Missing | affinity float in-page only |

### E. Notifications
| Capability | Status | Evidence |
|---|---|---|
| Central helper, ~16 kinds, in-app bell + list | Full | `sendNotification`, 13 modules route through it |
| Reaction/comment/reply/mention/follow/share/award/comment-reaction | Full | call sites cited |
| Connection request/accepted | N/A | follow-only graph |
| Preferences (mute kinds, push toggle) | Full | `NotificationPreference` |
| Real-time bell (Supabase) + web push + email w/ retry | Full | env-gated; email backoff 2/8/32/128m |
| Deduplication / grouping | Partial | coalesce (latest actor only), racy, no "+N others" |
| Block suppression (central) | Partial (leak) | not in helper; comment-reaction path leaks |
| Deep-link cleanup on target delete | Partial | post + moderation only; comments/events/users dead-link |
| Pagination / retention | Missing | hard cap 50, no prune (unbounded) |
| Fan-out to many recipients | Missing (scale) | serial loop, capped 5000, no queue |

### F. Search & Discovery
| Capability | Status | Evidence |
|---|---|---|
| Unified backend (people/posts/groups/events/businesses/hashtags) | Full | `search/service.ts:171-194` |
| Privacy + block filtering in results | Full | `service.ts:79-86,187` |
| Technique | Partial | ILIKE + trigram GIN; no FTS relevance |
| Autocomplete / type-ahead | Missing | no fetch until submit |
| Recent searches | Missing | no persistence |
| Suggested searches | UI-only | hardcoded fiction (`PrivateNavbar.tsx:68`) |
| Relevance ranking | Partial | recency/karma heuristics |

### G. Messaging
| Capability | Status | Evidence |
|---|---|---|
| 1:1 DM (create/send/list/open) | Full | `messaging/service.ts` |
| Group DM | Backend-only | N-participant schema, no create/manage code |
| Edit / soft-delete (sender-only) | Full | `service.ts:377-390` |
| Read receipts / unread badges | Full | single GROUP BY, not N+1 |
| Typing indicator / presence | Full | Supabase broadcast/presence |
| Reactions / quoted replies / image attach | Full | `MessageReaction`, `replyToId` |
| Idempotent send | Full | `clientMsgId` unique + ON CONFLICT |
| Message search | Missing | client-side filter of loaded list only |
| Permission (connections-only start) | Full | `canMessage` |
| Block on send | Partial (bypass) | start-gated only |
| Delivery | Full (realtime) | Supabase broadcast + 60s poll fallback |

### H. Privacy · Media · Moderation
| Capability | Status | Evidence |
|---|---|---|
| Backend visibility enforcement (not CSS) | Partial | real, but profile-timeline + groups-scope leaks |
| Suspended/banned content suppression | Missing | no author-status read filter |
| Private media access control | **Partial (leak)** | public buckets; DM/private images at unauth URLs |
| Media upload (presigned R2 + proxied Supabase) | Full | `r2.ts`, `supabase-storage.ts` |
| Image resize / thumbnail / transcode / EXIF strip | Missing | raw originals served |
| Media GC / lifecycle | Partial | soft-deleted posts only; avatar-replace + never-attached orphans persist |
| Report post/comment/profile/business/message | Full | `fileReport`, unique per reporter+entity |
| Moderation removal (all entity types) | Full | `applyModerationConsequence` |
| Restore removed content | Unknown | not confirmed by agents |
| Suspension enforce + auto-expire | Full | `session.ts` + `cron/moderation` |
| Rate limits on social writes | Full | all writes; report *server actions* uncapped; fail-open |
| Repeat-offender/strikes, spam/bot detection | Missing | `ModerationAction` logged, never aggregated |

---

## 3. Facebook / LinkedIn Parity

Practical parity of the **core social layer** (not UI similarity, not feature-for-feature). "Ahead / Equal / Behind / Missing" is relative to what a user expects from FB/LinkedIn's baseline.

| Capability | Our Platform | Facebook | LinkedIn | Gap |
|---|---|---|---|---|
| **Profiles** | Rich (work/edu/skills/headline/cover), server-side privacy + PII redaction | Rich personal | Rich professional | **Equal** — genuinely strong; missing data-export |
| **Connections** | Follow-only (no accept/reject); `connectionsData` removed | Symmetric friends (req/accept) | Symmetric connections (req/accept) | **Behind** — no mutual-consent graph; deliberate |
| **Following** | Asymmetric follow, rate-limited, notified | Follow/Page | Follow | **Equal** |
| **Posts** | 6 formats + drafts + polls + link preview | All + more | All + articles | **Slightly behind** — no scheduling, no doc posts, no articles |
| **Feed** | Real ranked (hot-score, keyset, seen-dedup, affinity) | ML multi-signal | ML multi-signal | **Behind** (ranking depth/diversity) but **right shape** |
| **Comments** | Threads (flat UI), votes, edit, mentions, images | Nested, ranked, paginated | Nested, ranked | **Behind** — no ranking, unbounded reply load, orphan-on-delete |
| **Reactions** | up/down/like, trigger counts | 6 reactions | Like + 5 pro reactions | **Slightly behind** (fewer types); mechanics equal |
| **Reposts** | Counter + notify only, **not a feed object** | Share to feed w/ attribution | Repost + repost-with-thoughts | **Behind (material)** — no real reshare distribution |
| **Mentions** | @user full; @house/@batch dead | @user/@page | @member/@company | **Slightly behind** |
| **Hashtags** | Extracted, browsable, `useCount` drifts | Full | Full (follow hashtags) | **Behind** — no follow-hashtag, drift bug |
| **Notifications** | Central, multi-channel, prefs, push | Aggregated, real-time | Aggregated, real-time | **Behind** — coalesce-not-aggregate, per-like broadcast storm |
| **Search** | Real backend, privacy-filtered, ILIKE | Full FTS + typeahead + ranking | Full FTS + typeahead + facets | **Behind** — no relevance ranking, no autocomplete |
| **Messaging** | Realtime 1:1 (typing/presence/receipts/reactions/calls) | Messenger (groups, calls) | InMail/DM (1:1 + groups) | **Behind (one gap)** — 1:1 only, no group chat; else near-equal |
| **Privacy** | Real server-side gate + redaction, **but 3 leaks** | Mature audience controls | Mature audience controls | **Behind** — leaks make it unreliable |
| **Blocking** | Symmetric, ~11 surfaces, unblock/list | Full | Full | **Equal** except DM-send bypass |
| **Media** | Upload works; raw originals; public buckets | Full pipeline + CDN | Full pipeline + CDN | **Behind (material)** — no resize/transcode, private-leak |
| **Moderation** | Report→remove loop, suspensions enforced | Massive automated + human | Automated + human | **Behind** but **functionally present** for a small community |

**Ahead of neither** — this is an alumni network, so scope is intentionally smaller (single school, real-names). Against the *core social layer*, it is **Equal on ~5 primitives, Behind on ~10, Missing ~2** (connections, group chat). Practical parity ≈ **65%**.

---

## 4. Critical Gaps (current P0 — block "credible social network")

These are the four that a social platform cannot ship with. All Verified, High confidence.

**CP0-1 · Followers-only posts leak on profile timelines (and to logged-out visitors).**
`getFeed` applies its per-viewer visibility/block/hidden clause only `if (viewerId && !authorId)` (`feed/query.ts:107`). The profile timeline (`[username]/load-profile.tsx:206`, `[username]/actions.ts:23`) and the `/mention` feed call it *with* `authorId`, so a `visibilityScope:"followers"` post renders on the author's profile to any allowed profile viewer — including logged-out guests on a public (`alumni`→`public`) profile. The single-post page (`getPostById`, `query.ts:318-348`) is correctly scoped; only the *listing* leaks. Confirmed independently by the feed and privacy investigations.

**CP0-2 · Suspended/banned users' existing content is never hidden.**
Suspension/ban set `user.status` only (`admin/users.ts:94,100`). No read path (feed, profile, search, single-post) filters by author `status` — grep for an author-status predicate returns zero hits. A banned harasser is blocked from *acting* (via `requireUser`) but every post, comment, and profile they already created stays fully visible indefinitely.

**CP0-3 · Private media is served from public storage buckets.**
Post/DM/comment images resolve to unauthenticated public URLs (`supabase-storage.ts:84` `/object/public/…`; `r2.ts:110` `publicUrlFor`). Post *search* respects visibility scope, but the image URL itself does not — a `followers`-scoped post's image, and especially a **DM image**, is fetchable by anyone with the URL, no auth. Signed URLs exist only for sensitive docs (invoices/verification), not social media.

**CP0-4 · Block does not stop DMs in an existing conversation.**
`canMessage`/`isBlockedBetween` gate only `findOrCreateConversation` (`messaging/service.ts:41`). `sendMessage` (`:230-305`) checks participant membership only. After B blocks A, A can keep sending into the pre-existing thread — the message delivers, bumps B's unread counter, and triggers B's "you have a message" email. The blocker's UI shows a disabled composer, but the server action is directly callable. A harassment victim's primary tool is partial.

> **Fixed since the 2026-09-02 audit** (verify-confirmed, no longer P0): suspension/ban enforcement (`session.ts:31`), timed-suspension expiry (`cron/moderation`), engagement permission checks (`assertCanInteract`), moderation consequences for all entity types (`applyModerationConsequence`), directory-search privacy filtering, block coverage + unblock + list, search backend existence, rate limits on all social writes.
> **Unknown (needs a look):** whether a **restore** path for moderated content exists; whether `reportPenalty` is still a one-way ranking weapon (prior P0-10) — neither was re-verified in this pass.

---

## 5. Hidden Problems (look implemented, architecturally weak)

Verified unless noted. These are the "we forgot to build the inverse / the second-order" class.

1. **Notification realtime storm = self-DoS.** Coalescing collapses 50 likes into ~1 *row*, but `broadcastToUser` fires on **every** send (`notifications/service.ts:140`), so a post with 1M likes triggers 1M realtime broadcasts → 1M `/summary` refetches to the *author's own* browser. (Web push is coalesced; realtime is not.)
2. **Reaction write-amplification.** `recomputeAuthorRanking` on every vote/un-vote → up to 100 synchronous `post.update`s (`feed/posts.ts:139-166`). The code itself flags "move to a queued job."
3. **Coalesced notifications are racy and lossy.** No unique constraint on `(userId,type,entityType,entityId)` (`schema.prisma:1033`) → concurrent likes insert duplicate rows; the coalesce overwrites the title with the latest actor (earlier actor lost); comment-reactions key on `postId` so likes on *different* comments on one post false-merge.
4. **`actorId` written inconsistently.** Present on follow/reaction/share/award; **omitted** on reply/mention/comment-reaction — so it cannot yet back grouping or central block-suppression despite the schema comment claiming so.
5. **Share over-count.** No `@@unique(originalPostId, sharerId)` on `PostShare` + check-then-insert (`posts.ts:699`) → concurrent double-share creates two rows, trigger counts both.
6. **Hashtag `useCount` drift.** Re-increments on every edit, never decrements on tag-removal or post delete (`hashtags.ts:16-32`; `deletePost` omits it) → trending is skewed.
7. **Orphaned comment children.** Soft-deleting a parent comment drops all descendant replies from the thread view (`query.ts:413-431` + `comment-thread.ts:40`); no "[deleted]" tombstone.
8. **Deleted-target dead links.** Notification cleanup covers post-delete + moderation only; deleting a comment/event/user leaves notifications pointing at 404s.
9. **Orphaned media.** Avatar/cover replacement writes a new object and never deletes the old; never-attached presigned blobs are never GC'd (GC covers only soft-deleted posts/comments).
10. **Soft-deleted/suspended users leak into follower/following lists** and inflate `_count` (follow rows survive; list joins don't filter `deletedAt`/`status`).
11. **`/network` suggests bots** (`network/page.tsx:48` omits the `memberType notIn [bot,system]` filter that the other suggestion paths have).
12. **Report abuse surface.** UI report path (server actions) has no rate limit; only `/api/reports` route carries the 20/day cap.
13. **Best-effort real-time hides failures.** Broadcast failures are swallowed (`supabase-realtime.ts:53`); if `SUPABASE_JWT_SECRET`/service-role key are unset, the whole realtime layer silently degrades to 60s/5-min polls with no error.
14. **Reaction/karma non-atomicity.** Counts (trigger) stay correct, but karma award is a best-effort `.catch()` after the reaction commits — a failure leaves karma unawarded.

---

## 6. Scalability Risks — what breaks first, and when

Assumption: single school (`schoolId` filter is effectively global since there's one school), single Supabase Postgres via pgBouncer transaction pooling, Vercel serverless, no read replicas, no CDN config in-repo. Real production volumes unknown (marked Inferred).

**Ranked by what melts first (Verified mechanisms, Inferred thresholds):**

| Rank | Bottleneck | Mechanism | Breaks around |
|---|---|---|---|
| 1 | **Reaction write-amplification** | `recomputeAuthorRanking` = 1 aggregate + ≤100 `post.update`s per vote/un-vote, synchronous, on the shared `rankingScore` index (`posts.ts:139-166`) | **~100K users** / any viral post or prolific author under a vote burst |
| 2 | **Synchronous fan-out, no queue** | mentions loop (≤20), invites serial loop capped 5000 (`events/invites.ts:104`), all inline in a 60s-ceiling function; realtime notify broadcast per-like | **~100K** for broadcasts; batch invites already silently truncate at 5000 |
| 3 | **pgBouncer + chatty mutations** | each social write = 5–10 sequential awaited queries; transaction-pool mode kills prepared statements / interactive tx; small pool saturates | **~100K concurrent** writers |
| 4 | **`PostImpression` unbounded** | 1 row per viewer×post, no TTL/prune; reads are protected (1000-cap window) but writes + storage are not | **~1M users** (1–5B rows) |
| 5 | **`Notification` unbounded** | no retention job; per-user rows forever | ~1M |
| 6 | **Hub-entity unbounded loads** | full follows/blocks/hidden sets → large `NOT IN`/`IN` lists (`query.ts:110-133`); followers/following capped at 100 with no paging | power users / celebrity accounts at any scale |
| 7 | **No feed cache** | `force-dynamic`, every read = 6–10 live pooler round-trips; 30s per-client poll = M/30 COUNT/s | ~100K–1M (cost/latency, not correctness) |
| 8 | **Search `COUNT(*)` per query + unindexed facets** | people-scope full count every query; `houseId`/`industry` unindexed; ILIKE recall degrades on short queries | ~100K (assuming trigram migrations *are* live — Unknown) |
| 9 | **Realtime channel fan-out** | one Supabase channel per open conversation (`MessagesShell.tsx:70`) | ~100K–1M concurrent (Supabase caps, not Postgres) |

**Per-tier narrative:**
- **10K users:** Comfortable everywhere. Reads bounded, writes trivial. No action needed.
- **100K users:** First real strain — **reaction write-amp (#1)** and **pgBouncer saturation (#3)** under write bursts; the **30s feed poll** becomes a thundering herd on one uncached school (#7); search `COUNT(*)` (#8). Fan-out invites already truncate.
- **1M users:** **Impression + notification tables (#4, #5)** are the dominant liability (billions of rows, no prune); the single-`schoolId` index is one giant hot tree; no cache means every read hits the DB. Ranking recompute must have moved to a queue long before here.
- **10M users:** PULL feed still functionally correct for the bounded top-N, but per-request query fan-out × no cache makes Postgres the wall. Impressions untenable without sharding/TTL or a probabilistic seen-filter. Realtime channel model needs rework.
- **100M users:** Past this architecture entirely — requires feed materialization/sharding, async ranking, an impression store with TTL, a feed cache, multi-region. Not a tuning problem; a re-architecture. (Out of realistic scope for an alumni network, but this is the honest answer to the scale question.)

**What does NOT break (strengths):** the ranked candidate query is bounded (`take:15`, index-ordered) and does **not** degrade with total post count; the seen-exclusion is capped at 1000 regardless of lifetime impressions; counters are triggers (no read-time COUNT); the feed read path is not N+1; messaging delivery is offloaded to Supabase (Postgres isn't the delivery bottleneck).

---

## 7. Data & API Risks

**Schema (Verified from full read):**
- **Polymorphic FK-less relations** (`Reaction`, `ContentReport`, `Notification.actorId`, `ModerationAction`, push/calls) use plain UUID + app-layer joins to keep the 90-relation `User` model lean. Trade-off: no DB-level referential integrity or cascade on those edges → orphan risk on delete, and `actorId`/entity links can dangle.
- **No `Connection` model** — follow-only by design (migration `20260730130000_follow_model` dropped it).
- **No cascade contract for soft-delete** — `deletedAt` on User/Post/Comment/Message, but nothing defines what it implies for `Notification`, `SavedPost`, `PostImpression`, `Reaction`, `Follow`, R2 objects. Each consumer re-decides; most filter `deletedAt:null` and leave orphans. (Hard-delete *does* cascade via FK.)
- **Index gaps:** `Comment` has only `@@index([postId])` — no `(postId, parentId, createdAt)` for threaded reads, **no `authorId` index** (moderation/"all posts by user" = scan); `Profile.houseId` and `industry` unindexed for directory facets; no partial index `WHERE deleted_at IS NULL AND status='visible'` that every feed query wants.
- **Missing uniqueness:** `PostShare(originalPostId, sharerId)`; `Notification(userId,type,entityType,entityId)` — both cause the over-count/duplicate races above.
- **Enum-migrated** status/visibility (good — DB-level validation).

**API (Verified):**
- Social writes are **server actions** (`requireUser` + `enforceRateLimit`), reads/uploads/webhooks/cron are **route handlers**. Auth gating is consistent on UI-driven writes.
- **Validation is mixed** — zod at route boundaries and where a schema file exists; most server actions pass raw args to modules that do manual `ForbiddenError` guards. No uniform validation layer.
- **Pagination is inconsistent** — cursor (feed/comments/messages), offset (directory, feed page-1, caught-up), cap-only (notifications 50, followers 100 — older data unreachable).
- **Idempotency** where it matters (messages `clientMsgId`, payment webhooks); elsewhere relies on unique constraints + read-then-write (which race, see §5).
- **Error shape** consistent in routes (`handleError` → `{error,details}`), inconsistent in actions (`throw` vs `{ok:false}`).
- **`github-pr` webhook** writes a feed post authored as the owner, gated by a **non-constant-time** secret compare (`webhooks/github-pr/route.ts:74`) — contrast the constant-time `cron-auth.ts`.
- **Authorization/over-fetch:** sampled write paths project only public fields; no obvious data leak in API payloads (PII redaction enforced in `loadProfile`). The leaks are in *content visibility* (§4), not field-level over-fetch.

---

## 8. Recommended Architecture (target, not over-built)

The current stack is the right foundation. Do **not** rewrite. Add these, in order of leverage:

1. **One policy module: `canView(viewer, entity)` and `canAct(viewer, entity, action)`** — a single shared visibility/block/status clause, imported by feed, profile timeline, single-post, search, saved-posts, comments, and DMs. Replaces the ~4 independent implementations that disagree today. Kills CP0-1, CP0-2, CP0-4, and the groups-scope leak in one owner.
2. **A transactional outbox + a single drain worker** (Supabase pg_cron pinging a route, the pattern already used for Vyapaar timers). Write side-effect intents *inside* the post/reaction/comment transaction; drain asynchronously with retry. Moves notification fan-out, mention loops, ranking recompute, and email off the request path. Removes scale risks #1 and #2, enables large fan-out, and gives reliability (no lost side effects on function termination).
3. **Repost as a first-class object** — either a `Post.repostOfId` self-relation or promote `PostShare` to a feed-queryable row with attribution, so a reshare distributes with credit and respects the original's visibility/deletion.
4. **Impression store with TTL** (prune >90d or >N/user; or move seen-tracking to a Redis bitmap/bloom filter) + **a page-1 feed cache** (short-TTL `unstable_cache` per school, invalidated on new post). Removes risks #4 and #7.
5. **Postgres FTS** (`tsvector` GIN + `ts_rank`) behind the existing `/search`, plus a lightweight autocomplete endpoint — upgrade in place, no new infra. Keep trigram for fuzzy name match.
6. **Signed/authorized media** for private buckets — per-viewer signed URLs (or an auth-checking proxy route) for DM/followers/groups images. Keep public bucket only for truly public assets (avatars on public profiles).
7. **Notification aggregation** — a `count` + distinct-actor list per `(user,type,entity)` window ("Alice and 4 others"), a unique constraint to make coalesce atomic, and broadcast coalescing (one nudge per window, not per like).
8. **Async ranking** — move `recomputeAuthorRanking` into the outbox worker; recompute the author's posts once per drain tick, not per vote.

Deliberately **not** recommended (would be over-engineering for a single-school alumni network): Kafka/dedicated stream infra, per-user timeline materialization, Elasticsearch, microservices, read replicas — none are justified below ~1M users, and the brief is parity of the *core social layer*, not hyperscale.

---

## 9. Roadmap

**Phase 1 — Fix Foundations (privacy/safety P0s; small diffs, ship first).**
Extract `canView`/`canAct`; apply to profile timeline + saved-posts + `/mention` (CP0-1); add author-status filter to the shared post/comment clause (CP0-2); signed/authorized private-media access (CP0-3); block recheck in `sendMessage`/`editMessage`/`toggleReaction` (CP0-4); block `inactive`/`deletedAt` writes (`canAct`); rate-limit the report server actions. Confirm/ship a **restore** path and fix `reportPenalty` if still one-way.

**Phase 2 — Complete Core Social.**
Repost-as-object; group DMs; message search; comment ranking + reply pagination + `[deleted]` tombstone; notification aggregation ("+N others") + consistent `actorId` + dead-link cleanup on comment/event/user delete; hashtag `useCount` fix + `PostShare`/`Notification` unique constraints; media resize/thumbnail + EXIF strip; `/network` bot filter + soft-delete filter on follower lists.

**Phase 3 — Improve Social Graph & Feed.**
FTS relevance + autocomplete + recent searches; feed author/topic diversity + negative-signal (hide → down-rank author) + "why am I seeing this"; per-author mute/restrict; (product decision) connection request/accept model if LinkedIn-style networking is wanted; data export + account-lifecycle state machine.

**Phase 4 — Scale Infrastructure.**
Transactional outbox + drain worker (async ranking + fan-out); impression TTL/prune (or bloom filter); page-1 feed cache; index gaps (`Comment(postId,parentId,createdAt)`, `Comment(authorId)`, `Profile.houseId`, partial visible-post index); constant-time webhook compare; consistent cursor pagination on notifications/followers.

**Phase 5 — Advanced Social Experience.**
Ranking depth (velocity, ML signals), notification threading/mute-per-thread, close-friends/audience lists, richer reactions, follow-hashtag, presence/"last seen" durability, group-chat features (names/admins), read-replica + CDN if volume demands.

---

## 10. Exact Implementation Plan (per recommended change)

Format: Feature — Current — Problem — Required change — Files — DB — API — Frontend — Jobs/events — Deps — Migration — Tests — Priority — Complexity.

**IP-1 · `canView`/`canAct` policy + profile-timeline leak.**
Current: visibility re-implemented in `getFeed`, `getPostById`, `search`, `loadProfile`; profile branch (`query.ts:107`) skips it. Problem: CP0-1 (followers posts leak on profile + logged-out). Change: extract `postVisibilityWhere(viewerId)` + block + author-status into one clause; apply in the `authorId` branch, `listSavedPosts`, `/mention`. Files: `modules/feed/query.ts`, `[username]/{load-profile,actions}.tsx`, `mention/page.tsx`, new `modules/authz/can-view.ts`. DB: none. API: none. Frontend: none. Jobs: none. Deps: none. Migration: decide fate of existing `visibilityScope:"groups"` rows (rewrite to `followers`). Tests (integration): followers post — author✅ follower✅ non-follower❌ logged-out❌ blocked❌ across feed/detail/profile/OG. Priority **P0**. Complexity **M**.

**IP-2 · Author-status suppression.**
Current: suspend/ban set `user.status` only. Problem: CP0-2. Change: add `author: { status: "active", deletedAt: null }` (or a `NOT IN [suspended,banned]`) to the shared post/comment read clause (IP-1). Files: `modules/feed/query.ts`, `modules/search/service.ts`, `moderation` (on suspend, optionally cascade-hide). DB: index `posts(author_id)` already via `@@index([authorId])`. API: none. Frontend: none. Jobs: optional backfill sweep hiding banned users' content. Deps: IP-1. Migration: none. Tests: banned author's posts absent from feed/profile/search/detail. Priority **P0**. Complexity **S**.

**IP-3 · Private-media access control.**
Current: public buckets, public URLs. Problem: CP0-3. Change: for DM/followers/groups media, issue short-TTL signed URLs (R2 already has `getSignedDownload`) or an auth-checking `/api/media/[key]` proxy that runs `canView`; keep public bucket for public-profile avatars. Files: `lib/r2.ts`, `lib/supabase-storage.ts`, `modules/messaging`, `modules/feed/map-row.ts`. DB: none (store keys, resolve to signed URL at read). API: new signed-URL resolver. Frontend: images fetch via resolver. Jobs: none. Deps: IP-1 (`canView`). Migration: none (URLs resolved at read). Tests: DM image 403 for non-participant; followers-post image 403 for non-follower. Priority **P0**. Complexity **M**.

**IP-4 · DM block recheck.**
Current: `sendMessage` participant-check only. Problem: CP0-4. Change: call `isBlockedBetween` in `sendMessage`/`editMessage`/`toggleReaction`. Files: `modules/messaging/service.ts`. DB: none. API: none. Frontend: none. Deps: none. Tests: A blocks B → B's `sendMessage` in existing thread throws; no email/unread bump. Priority **P0**. Complexity **S**.

**IP-5 · Transactional outbox + drain worker.**
Current: side effects synchronous, best-effort, no retry, capped fan-out. Problem: scale #1/#2, reliability. Change: `OutboxEvent` table written inside the core tx; a pg_cron-pinged `/api/cron/outbox` drains with retry/backoff; subscribers = notify, ranking recompute, mention fan-out, email. Files: new `modules/outbox/*`, `feed/posts.ts`, `notifications/service.ts`, `vercel.json`/pg_cron. DB: **new table `outbox_events`** (+ index on `status, nextAttemptAt`). API: new cron route (CRON_SECRET). Frontend: none. Jobs: the drain. Deps: none. Migration: create table. Tests: crash between core write and side effect → drain reconciles; fan-out to >5000 recipients completes across ticks. Priority **P1**. Complexity **L**.

**IP-6 · Repost-as-object.**
Current: `PostShare` counter, not feed-queried; no unique. Problem: no real reshare; over-count. Change: add `Post.repostOfId` self-relation (a repost is a Post that renders the original inline, respecting original visibility/deletion) OR promote `PostShare` to feed-queryable with `@@unique(originalPostId,sharerId)`; notify + unshare. Files: `modules/feed/{posts,query,map-row}.ts`, `FeedCard.tsx`. DB: **migration** (new column or unique constraint). API: reshare/unshare actions. Frontend: repost render + unshare. Jobs: none. Deps: IP-1 (original visibility). Migration: add column/constraint. Tests: reshare appears in follower feeds w/ attribution; deleted/private original → repost shows tombstone/hidden; double-reshare deduped. Priority **P1**. Complexity **L**.

**IP-7 · Notification aggregation + atomic coalesce + broadcast coalescing.**
Current: coalesce overwrites latest actor, racy, per-like broadcast. Problem: spam + self-DoS + lost actors. Change: `@@unique(userId,type,entityType,entityId)` + upsert with `actorCount`/distinct-actor array; broadcast once per window. Files: `notifications/service.ts`, schema. DB: **migration** (unique + `actorCount`/`actorIds`). API: none. Frontend: "Alice and N others". Jobs: none. Deps: consistent `actorId` (fill the missing call sites). Migration: add columns + constraint. Tests: 50 likes → 1 row, count=50, one broadcast. Priority **P1**. Complexity **M**.

**IP-8 · Impression TTL + feed cache.**
Current: unbounded `PostImpression`, no cache. Problem: scale #4/#7. Change: nightly prune >90d or >N/user (`/api/cron/impressions`); short-TTL page-1 feed cache per school. Files: new cron, `modules/feed/query.ts`. DB: none (delete rows). API: cron route. Frontend: none. Jobs: prune cron. Deps: none. Migration: none. Tests: prune keeps newest N; feed correctness unchanged. Priority **P1**. Complexity **M**.

**IP-9 · Search FTS + autocomplete.**
Current: ILIKE + trigram, no relevance/typeahead, mock suggestions. Problem: parity. Change: `tsvector` GIN columns on posts/profiles/groups; `ts_rank` ordering; `/api/search/suggest` typeahead; drop hardcoded suggestions or make them real. Files: `modules/search/service.ts`, `PrivateNavbar.tsx`, schema. DB: **migration** (generated tsvector columns + GIN). API: suggest endpoint. Frontend: typeahead dropdown, recent-searches (localStorage). Jobs: none. Deps: none. Migration: add columns/indexes. Tests: relevance ordering; private/blocked excluded from suggest. Priority **P1**. Complexity **M**.

**IP-10 · Media resize/thumbnail/EXIF + orphan GC.**
Current: raw originals; avatar-replace + never-attached orphans. Problem: bandwidth + privacy + cost. Change: server-side `sharp` (or Cloudflare Images) resize/WebP + EXIF strip at attach; extend GC to avatar/cover replace + never-attached sweep. Files: upload routes, `modules/media/gc.ts`. DB: none. API: upload pipeline. Frontend: `next/image` for the 25 raw `<img>`. Jobs: extend media GC. Deps: none. Migration: none. Tests: uploaded 4K → derivatives created, EXIF gone; replaced avatar → old object deleted. Priority **P2**. Complexity **M**.

**IP-11 · Comments: reply pagination + orphan tombstone + ranking + indexes.**
Current: replies unbounded, orphan-on-delete, no ranking. Problem: scale + UX. Change: paginate replies (keyset), render `[deleted]` tombstone when a parent with live children is removed, optional `likeCount` sort; add `Comment(postId,parentId,createdAt)` + `Comment(authorId)` indexes. Files: `modules/feed/query.ts`, `comment-thread.ts`, `comments-section.tsx`, schema. DB: **migration** (indexes). API: reply cursor. Frontend: "load more replies", tombstone. Jobs: none. Deps: none. Migration: indexes. Tests: 100k-reply thread paginates; deleted parent keeps children under tombstone. Priority **P2**. Complexity **M**.

**IP-12 · Group DMs.**
Current: schema N-party, code assumes 2. Problem: parity gap. Change: group create/name/add/remove; fix `getMessages`/`listConversations` single-other assumptions; presence for N. Files: `modules/messaging/service.ts`, `messages/*`. DB: `Conversation.name`/`isGroup` (**migration**). API: group actions. Frontend: group create + member management. Jobs: none. Deps: none. Migration: add columns. Tests: 3-party send/read/receipts. Priority **P2**. Complexity **L**.

**Lower-priority (P2/P3):** hashtag `useCount` fix + `PostShare` unique (S); reaction check-then-insert → catch P2002 (S); constant-time `github-pr` secret (S); `/network` bot + soft-delete filters (S); data export + account lifecycle (L, product-gated); connection request/accept model (L, product decision Q-3); repeat-offender strike ladder (M).

---

## Subsystem Scorecard

Scale: **0** Missing · **1** Prototype · **2** Basic · **3** Production-ready · **4** Strong · **5** Social-platform-grade. Score reflects *current* code, social scope only.

| # | Subsystem | Score | One-line justification |
|---|---|---|---|
| 1 | Identity | **3** | Status now enforced + RBAC + email verify; ≤60s lag, no 2FA/Google, inactive-write hole |
| 2 | Profiles | **4** | Rich model, tested privacy policy, real server-side PII redaction; no export |
| 3 | Social graph | **3** | Follow + block + real mutuals/suggestions/invites; no connections/mute, DM-block bypass |
| 4 | Content | **4** | 6 formats + drafts + polls + mentions + trigger counts; no schedule, edit-validation gap |
| 5 | Feed | **4** | Real ranking + keyset + seen-dedup; profile leak, no cache/diversity |
| 6 | Engagement | **3** | Transactional counts + comment votes; reaction race, share over-count, karma non-atomic |
| 7 | Comments | **3** | Edit/reply/votes/mentions + keyset top-level; unbounded replies, orphan-on-delete, flat, no rank |
| 8 | Sharing/reposts | **2** | Counter + notify + rank, but not a feed object; no unique/unshare |
| 9 | Notifications | **3** | Central multi-channel + prefs + push + email-retry; coalesce-not-aggregate, storm, no retention |
| 10 | Search | **3** | Real privacy-filtered backend across 6 scopes; ILIKE not FTS, no autocomplete, mock suggestions |
| 11 | Messaging | **4** | Realtime 1:1 w/ typing/presence/receipts/reactions/idempotency; no groups/search, block-send bypass |
| 12 | Privacy | **3** | Real backend gate + redaction; but profile-timeline + groups + media leaks |
| 13 | Media | **2** | Upload + partial GC; no resize/transcode, private media on public URLs, orphans |
| 14 | Real-time | **3** | Supabase broadcast + push, serverless-correct; best-effort silent-fail, feed reload-only |
| 15 | Moderation | **3** | Report→remove loop all entities + suspension enforce/expiry; no restore(?)/strikes/abuse-detection |
| 16 | Data architecture | **3** | 94 models, triggers, keyset, 135 indexes; FK-less polymorphism, no soft-delete cascade, index/unique gaps |
| 17 | API architecture | **3** | Consistent auth + rate limits; mixed validation/pagination/error-shape, non-constant-time webhook |
| 18 | Scalability | **2** | Bounded feed read + counters; write-amp, sync fan-out, unbounded impressions, no cache/queue |

**Calculation:** sum = **55** out of max **90** (18 × 5). Normalized: 55 / 90 × 100 = **61.1 → ≈ 61 / 100**.
Unweighted mean chosen for defensibility (each subsystem equal). A core-primitives-weighted score (feed/graph/content/messaging/privacy weighted 2×) lands within ±3 points, so the headline is stable at **low-60s/100**.

---

## Assumptions & Confidence

- **Method confidence:** subsystem findings carry `file:line` from a current-code read and are **Verified/High** unless tagged otherwise. The main-thread synthesis did not independently re-open every cited line; it relies on the eight investigations' citations plus a direct full read of `prisma/schema.prisma`. Cross-checks (feed leak, DM block bypass, reaction write-amp) were independently reported by two agents each → High confidence.
- **Unknown (could not verify from source):** whether the trigram/search-index migrations and VAPID/Supabase-Realtime env vars are actually live in **production** (both are env/deploy-gated; if unset, search degrades to seq-scan and realtime/push silently no-op); whether a moderated-content **restore** path exists; whether `reportPenalty` is still a one-way ranking weapon (prior P0-10, not re-verified this pass).
- **Assumptions:** single active school (so `schoolId` is effectively global); production traffic/data volumes differ from dev (scale thresholds are **Inferred**, mechanisms are **Verified**); Cloudflare R2 / Supabase Storage provide native edge caching (no explicit CDN config in-repo — **Inferred**); the "P1 batch" PRs (#421–#428) are merged to `master` as the git log and schema indicate.
- **Not audited (out of scope):** ads, payments, membership, karma economy, games, business directory, analytics, accessibility, and admin tooling except where a social read/write depends on it.

---

## Reconciliation with the 2026-09-02 audit

| Prior P0 | Then | Now | Evidence |
|---|---|---|---|
| P0-1 Suspension/ban unenforced | Broken | **Fixed** | `session.ts:31`→`canSignIn` |
| P0-2 Suspension expiry | Broken | **Fixed** | `cron/moderation` `expireDueSuspensions` |
| P0-3 Post visibility outside feed | Broken | **Partial** | `getPostById` fixed; profile-timeline + groups still leak |
| P0-4 Engagement permission-blind | Broken | **Fixed** | `assertCanInteract` |
| P0-5 Moderation post-only | Broken | **Fixed** | `applyModerationConsequence` all entities |
| P0-6 No restore | Broken | **Unknown** | not re-verified |
| P0-7 Blocking one-way trap | Broken | **Mostly fixed** | unblock + list + ~11 surfaces; DM-send bypass remains |
| P0-8 Directory ignores privacy | Broken | **Fixed** | `directory/service.ts` + `search` filter visibility+block |
| P0-9 Account closure lifecycle | Broken | **Open** | `inactive`/`deletedAt` not write-blocked; no export/hard-delete |
| P0-10 `reportPenalty` weapon | Broken | **Unknown** | not re-verified |

Also fixed since then: search backend (P1-1), rate limits on social writes (E-4/P1-11), notification `actorId`+prefs+email-retry (P1-4/5/8), DM idempotency (P1-16), comment edit+pagination (P1-20), real mutual counts + ranked suggestions + member invites (P1-18/19), report content preview + support timeline (P1-13/14). The 2026-09-02 audit's "35 of 40 commits are Vyapaar / downstream systems don't ship" critique has been substantially answered by the P1 batch; the remaining debt is the four leaks above plus scale architecture.
