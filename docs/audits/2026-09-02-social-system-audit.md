# Deep System Audit — The Parliament (NNAWCA)
## "What should we have built, but didn't?"

**Date:** 2026-09-02 · **Branch:** `master` @ `364ff26` · **Method:** static read-only audit of the full tree — 791 TS/TSX files, ~342k LOC, 94 Prisma models, 111 pages, 30 feature modules, 122 unit + 19 integration test files, 30 migrations, git history. No production profiling; runtime claims are marked as inference.

---

## 0. Executive summary

The Parliament is **not** an early prototype. The feed ranker is real (hot-score, keyset cursors, seen-exclusion, caught-up recycle, author affinity). The karma ledger is genuinely well-engineered — transactional, row-locked, Sybil-weighted, with pure testable guard math. Payments are signature-verified and webhook-deduped. Admin RBAC is a real permission matrix. Profile privacy has a dedicated, unit-tested policy module. That is a lot more than most projects at this stage have.

The problem is not quality of individual systems. **The problem is that the systems don't know about each other.**

Three systemic failures run through every finding below:

1. **There are two identity authorities and the safe one is dead code.** `requireUser()` — used in 87 files — never reads `User.status`. `gateUser()` — which does — is imported by exactly one file (`lib/gate.ts` itself), and only admin surfaces route through it. Consequence: **suspending or banning a member does not stop them posting, commenting, DMing, following, or reacting.** Everything the moderation console does to a person is cosmetic.

2. **Visibility is re-implemented four times and answers differently each time.** `getFeed` enforces blocks + `followers` scope. `loadProfile` enforces `Profile.visibility`. `getPostById` enforces nothing. `searchDirectory` enforces nothing. A "Private" profile is hidden at `/username` and fully listed in `/community`. A "Followers only" post is hidden in the feed and world-readable at `/feed/<id>`.

3. **Social actions were built; the systems that make actions mean something were not.** A share notifies nobody. An award notifies nobody. A comment reaction notifies nobody. A moderator can resolve a report on a comment but cannot remove the comment. Karma earned by a post survives that post's removal. Media survives the post that owned it, forever.

The second-order observation: **35 of the last 40 commits are Vyapaar**, a multiplayer Monopoly game. That work is polished and well-tested. Meanwhile the platform has no search backend, no way to block someone outside a DM, no way to un-hide moderated content, and no enforcement of the suspension button that already exists in the admin UI. This is a product-allocation finding, not an engineering one.

**Counts:** 10 P0, 20 P1, 10 P2.

---

## 1. Confidence key

Every finding is tagged:

- **[Confirmed]** — directly demonstrated by code read in this audit; file:line cited.
- **[Likely]** — strongly implied by the implementation, but the failing path was not executed.
- **[Potential]** — a risk that needs runtime/production validation before acting.

---

# PART I — SYSTEM RECONSTRUCTION

## 2. The social graph as actually implemented

| Relationship | Model | Directional | Approval | Reversible | Notification | Enforced where |
|---|---|---|---|---|---|---|
| Follow | `Follow(followerId, followingId)` | yes | **none** | yes (`unfollowUser`) | `new_follower` + email | feed scoping, `canMessage` |
| "Connection" | *derived* — mutual-or-either follow | — | — | — | — | `loadProfile` only (`connections` visibility) |
| Block | `UserBlock(blockerId, blockedId)` | one-way row, applied symmetrically | n/a | **no UI** | none | feed + DM **only** |
| Group member | `GroupMember(groupId, userId, role, status)` | — | `join` is open | `leave` | none | group page gating |
| Mute / restrict / close friends | — | — | — | — | — | **do not exist** |
| Friend request / pending | — | — | — | — | — | **does not exist** |

**[Confirmed]** There is no "connection" entity. `load-profile.tsx:134-145` computes it inline as *either direction of follow*, and nothing else in the codebase uses that definition. `AlumniProfileCard` shows `mutualCount`, and `connections/service.ts:76` hardcodes `mutualCount: 0` for every row — the UI has always displayed "0 mutual" to every user.

**[Confirmed]** Blocking is reachable only from inside an open DM thread (`messages/[conversationId]/ConversationView.tsx:428` → `blockUserAction` → `messaging/service.ts:416`). There is no block control on a profile, a post, or a comment; no unblock function exists anywhere in the codebase; and settings has no blocked-users list. A block is currently a **permanent, DB-only-reversible** action a user can take by accident.

### What a block actually does today

| Surface | Blocked? | Evidence |
|---|---|---|
| Main feed | ✅ | `feed/query.ts:109-135` |
| DM send / start | ✅ | `messaging/service.ts:22-46` |
| Post detail page | ❌ | `feed/query.ts:306` `getPostById` — no block param |
| Their profile page | ❌ | `profile/privacy.ts` has no block axis |
| Directory / `/community` | ❌ | `directory/service.ts:44-52` |
| Reacting / commenting on your posts | ❌ | `feed/posts.ts:500,725` check `deletedAt` only |
| Notifications from them | ❌ | `notifications/service.ts` — no block check |
| Following you | ❌ | `connections/service.ts:139` — no block check |
| @mentioning you | ❌ | `feed/mentions.ts:36` — filters `status: active` only |
| Profile-view log (weekly email) | ❌ | `load-profile.tsx` logs view after privacy gate, not block |

**Net:** a blocked user can read everything you post via direct URL, react to it, comment on it, mention you, follow you, appear in your directory, and generate notifications on your bell. The only thing they cannot do is DM you and see you in their own feed.

---

## 3. Identity & profile lifecycle

**[Confirmed]** Registration → `api/auth/signup` → email code → `emailVerifiedAt` set → `status: active`. Username auto-generated. Onboarding wizard `profile → jnv → interests → membership → complete`, gated per-page.

**[Confirmed]** `lib/auth.ts:56-73` — the credentials `authorize()` callback checks `passwordHash`, `bcrypt.compare`, and `emailVerifiedAt`. **It never checks `user.status`.** A `suspended`, `banned`, or `inactive` (self-closed) account can obtain a fresh session at any time.

**[Confirmed]** The JWT carries `username`, `onboardingStep`, `onboardingCompleted`, `membershipStatus`, `roles`, `isAdmin`. It does **not** carry `status`. `invalidateSession(userId)` (`redis.ts:44`) only clears a 5-minute Redis cache of the user row — it cannot revoke an issued JWT, and `session.maxAge` is 30 days.

**[Confirmed]** Profile changes propagate correctly to posts/comments/feed because every read joins `author` live (`postSelect()` in `feed/query.ts:415`). There is no denormalized author name/photo anywhere — so **no stale-profile problem**. This is a genuine strength and should be preserved. The one exception is `Notification.title`, which bakes the actor's display name into a string at send time (`feed/posts.ts:581`) — renaming yourself leaves old notifications showing the old name, and there is no `actorId` to re-resolve from.

**[Confirmed]** Account close (`profile/edit/actions.ts:278-292`):
```ts
data: { deletedAt: new Date(), status: "inactive" }
```
…plus one audit row and `updateTag("directory")`. Nothing else. Posts stay visible, comments stay, follows stay, conversations stay open, notifications keep pointing at them, media stays in R2, the JWT stays valid, and they can sign back in immediately (no status check in `authorize`). There is no grace period, no reactivation flow, no data export, and no hard delete — the `members:hard_delete` permission exists in the matrix (`admin/permissions.ts:28`) and is implemented nowhere.

**[Confirmed]** `UserSession` (refresh-token hash, user agent, IP, `revokedAt`, rotation chain) is a fully modelled table that **nothing writes to** — the app uses JWT strategy. So: no active-device list, no "sign out everywhere", no login-location alerts, no session forensics after an account compromise.

---

## 4. Post lifecycle — actual state machine

```
create ──► draft ──► publish ──► visible ──► [edit]* ──► deleted (soft)
                          │
                          └──► hidden | removed   (moderator, one-way)
```

**Exists:** text / image / link (with SSRF-guarded OG fetch) / quote / question / poll, drafts with autosave, soft delete, moderator hide/remove, per-post analytics page, pin, hashtags, mentions, awards, saves, "not interested".

**Missing:** scheduled posts, restore/un-hide, edit history, archive, repost-with-comment surfaced as its own feed object, per-post comment controls, per-post audience change after publish.

| Transition | Behaviour | Problem |
|---|---|---|
| Publish | `createPost` transaction seeds `rankingScore`, then mentions + hashtags fire outside the transaction | **[Likely]** a crash between the two leaves a post with no mention pings and no hashtag rows; no reconciliation job |
| Edit | `editPost` (`posts.ts:454-481`) updates body/media, re-syncs hashtags | **[Confirmed]** does **not** re-run `notifyMentions` → adding `@someone` in an edit never notifies them. Not audited (create and delete are). No edit history. No time limit. Distribution/ranking unchanged. |
| Delete | soft: `deletedAt` + `status: deleted` | **[Confirmed]** comments are not soft-deleted, `SavedPost`/`PostImpression`/`PostHashtag`/`Notification` rows survive, R2 media is never removed, karma earned stays. Feed and detail filter on `deletedAt` so it disappears from view — but the row graph is orphaned. |
| Moderate | `resolveCluster` sets `status: hidden \| removed` | **[Confirmed]** **only for `entityType === "post"`** (`moderation/service.ts:266`). No inverse transition exists anywhere. |
| Restore | — | does not exist |

---

## 5. Feed audit

### What exists (and is good)

`modules/feed/query.ts` is the most mature part of the codebase:

- Keyset cursors on **both** orders — `(createdAt, id)` for recency, `(rankingScore, id)` for ranked — with the explicit comment that this prevents dup/skip when scores mutate mid-scroll. This is the correct fix for the classic infinite-scroll duplication bug and it is properly done.
- Pinned posts float on page 1 only and are excluded from cursor pages, specifically to stop a low-scored pinned post re-injecting itself on every page.
- Seen-exclusion via `PostImpression` (window 1000) so the feed doesn't repeat.
- A "caught up" path that recycles recent posts with a per-visit shuffle seed so the feed is never blank.
- In-page affinity boost for followed authors.
- Hot-score ranking with quality, engagement, and report-penalty terms.

That is a real feed, not `ORDER BY created_at DESC`.

### What is missing

| Concept | Status | Note |
|---|---|---|
| Seen / unseen | ✅ | `PostImpression` |
| Duplicate suppression | ✅ | keyset cursors |
| Author diversity | ⚠️ partial | affinity sort is *within page* only, and it groups followed authors **together** rather than spreading them |
| Topic diversity | ❌ | `categoryId` never influences ranking |
| Engagement velocity | ❌ | `hotScore` uses absolute counts + age, not rate-of-change |
| Negative signals | ⚠️ | `hidePost` ("not interested") is stored and excluded, but never feeds ranking — hiding 20 posts by one author does not down-rank that author |
| Content fatigue | ❌ | no per-author cap per page or session |
| Recommended / suggested content | ❌ | no non-followed discovery beyond "everything in school" |
| Sponsored | ⚠️ | `config/feed-ads.ts` — static house ads |
| "Why am I seeing this?" | ❌ | no per-row provenance; the system genuinely cannot answer the question |

### Feed correctness bugs

**[Confirmed] F-1 — group posts are not scoped out of the global feed.** `getFeed` only filters `groupId` when the caller passes it (`query.ts:64`: `if (filters.groupId !== undefined)`), and `feed/page.tsx:44` does not pass it. Today this is inert because `groups/service.ts:268` records *"Group posting isn't wired to a composer, so post.groupId is always null"* — but the moment group posting ships, every private-group post lands in the public feed. This is a live landmine, not a latent one.

**[Confirmed] F-2 — profile timelines skip block filtering entirely.** The per-viewer scoping block is guarded by `if (filters.viewerId && !filters.authorId)` (`query.ts:106`). Any single-author query — the profile timeline — therefore applies **no block filter, no hidden-post filter, and no `followers`-visibility filter**. A blocked user's profile shows you their followers-only posts.

**[Confirmed] F-3 — `visibilityScope: "groups"` is silently public.** The composer offers "My Groups — Members of the groups you're in" (`PostComposer.tsx:84`), `compose/actions.ts:51` maps it to `visibilityScope: "groups"`, and `query.ts:145-148` enforces only `{ visibilityScope: { not: "followers" } }`, with the comment *"'groups' scope treated as public here"*. **The UI makes a privacy promise the backend does not keep.**

**[Confirmed] F-4 — `getPostById` enforces nothing.** `query.ts:306`:
```ts
where: { id, deletedAt: null, status: "visible" }
```
No viewer, no block, no `visibilityScope`. Callers include `feed/[postId]/page.tsx` (which uses `optionalUser`, i.e. **logged-out visitors**) and `opengraph-image.tsx`. A "Followers only" post is fully readable, and its OG card renderable, by anyone with the URL.

### Feed failure modes not handled

| Scenario | Current behaviour |
|---|---|
| Post deleted while on screen | client keeps rendering it; interactions throw `ForbiddenError`; no reconciliation on refresh-in-place |
| Author blocks viewer mid-session | already-rendered posts stay; no invalidation signal |
| Privacy changed after render | same |
| Post moderated while visible | same |
| New content inserted between pages | **handled** — keyset cursor |
| Repeated refresh | **handled** — seen-exclusion + shuffle seed |
| Feed empty (new user) | **handled** — caught-up recycle, but see §12 cold start |
| Duplicate API request | no idempotency key on any feed server action |

---

## 6. Engagement audit

| Action | Idempotent | Undo | Transactional | Notifies | Ranks | Analytics | Server permission check |
|---|---|---|---|---|---|---|---|
| Reaction | ✅ unique key | ✅ | counters via DB trigger | ✅ (in-app only) | ✅ | ❌ | `deletedAt` only |
| Comment | ❌ | soft-delete | trigger | ✅ + email | ✅ | ❌ | `deletedAt` only |
| Reply | ❌ | soft-delete | trigger | ✅ in-app | ✅ | ❌ | `deletedAt` only |
| **Share** | ❌ **no dedupe** | ❌ **no unshare** | trigger | ❌ **nobody** | ✅ | ❌ | `deletedAt` only |
| Save | ✅ | ✅ | — | n/a | ❌ | ❌ | `deletedAt` only |
| **Award** | ❌ | ❌ | karma spend + row not in one tx | ❌ **nobody** | ❌ | ❌ | self-award blocked only |
| Poll vote | ✅ unique | switch only | ✅ | ❌ | ❌ | ❌ | expiry only |
| Follow | ✅ | ✅ | — | ✅ + email | n/a | ❌ | **none** |
| Comment reaction | ✅ | ✅ | — | ❌ **nobody** | ❌ | ❌ | — |
| Profile visit | ✅ upsert | — | — | ❌ (weekly digest) | — | ❌ | after privacy gate, **not** after block |

**[Confirmed] E-1 — `sharePost` has no dedupe and no rate limit** (`posts.ts:611`). The same user can share the same post unlimited times; every share increments `shareCount` via trigger and calls `recomputeRankingScore`. One user can push any post to the top of the ranked feed in a loop. There is also no `unshare`.

**[Confirmed] E-2 — karma is never reversed.** `toggleReaction` deletes the reaction row (`posts.ts:527`) and calls `recomputeAuthorRanking` — but issues **no compensating karma transaction**. Same for `deleteComment`, `deletePost`, and moderator removal. **Reputation earned by content that was removed for abuse persists permanently.** The daily/pair caps bound the exploit (5 likes per pair per IST day) but do not close it, and the "removed spam post keeps its karma" case is unbounded.

**[Confirmed] E-3 — every engagement path is permission-blind.** `toggleReaction`, `createComment`, `sharePost`, `givePostAward`, `votePoll` all load the post with `select: { id, authorId, deletedAt }` and check only `deletedAt`. No block check, no `visibilityScope` check, no group-membership check. Combined with F-4, a blocked non-follower can reach a followers-only post by URL and comment on it, and the author gets a notification.

**[Confirmed] E-4 — zero rate limits on social actions.** `enforceRateLimit` is called on auth, uploads, DM send/start, blood requests, gallery, password change, reports, and verification. It is called on **none** of: create post, comment, react, share, follow, poll vote, hide, RSVP, group join, or `/api/community`. Mass-follow, comment-flood, and reaction-spam are unthrottled at the application layer.

**[Confirmed] E-5 — the limiter is a fixed window** (`rate-limit.ts:19`: `Math.floor(now / windowMs) * windowMs`), so it permits a 2× burst across a boundary, and it fails **open** on any Redis error. The fail-open is deliberate and documented (a Redis outage would otherwise block all logins) — flagged as an accepted trade-off, not a defect, but it means the limiter is unavailable exactly when you're under attack-induced load.

---

## 7. Comments

**Exists:** create, reply, soft-delete, image attachment (bucket-origin-validated), up/down reaction, `@mention`, reply-to-reply flattened to one visual level with "replying to @x" resolution (`organizeCommentThread`), optimistic UI.

**Missing / broken:**

- **[Confirmed]** No comment **edit**. (`editPost` exists; there is no `editComment`.)
- **[Confirmed]** No comment **sorting or ranking** — `listPostComments` is `orderBy: createdAt asc`, hard-capped at 100 top-level, and fetches **all** replies for the post unbounded (`query.ts:378`). `likeCount` is stored and never used for ordering.
- **[Confirmed]** No pagination — 100 top-level comments is the ceiling, and comment 101 is unreachable forever.
- **[Confirmed]** A moderator **cannot remove a comment.** `resolveCluster` applies content consequences only for posts.
- **[Confirmed]** Deleted comment with live replies: the parent is soft-deleted and disappears from the query, so `organizeCommentThread` orphans its replies to the top-level ancestor. There is no "[deleted]" tombstone — the conversation loses its anchor.
- **[Confirmed]** No block filtering in `listPostComments` — a blocked user's comments are fully visible on every post.

---

## 8. Notification matrix

### Implemented

| Actor action | Recipient | In-app | Email | Push | Deep link |
|---|---|---|---|---|---|
| Reacts to post | author | ✅ | ❌ by design | ✅ | `/feed/:id` |
| Reaction milestone | author | ✅ | ✅ | ✅ | `/feed/:id` |
| Comments on post | author | ✅ | ✅ | ✅ | `/feed/:id` |
| Replies to comment | parent commenter | ✅ | ❌ | ✅ | `/feed/:id` (**not the comment**) |
| Mentions | mentioned | ✅ | ✅ | ✅ | `/feed/:id` |
| Follows | followed | ✅ | ✅ | ✅ | `/notifications` |
| Verification approved/rejected | subject | ✅ | ✅ | ✅ | — |
| Endorsement req/received | subject | ✅ | partial | ✅ | — |
| Event in batch / invite wave | member | ✅ | ✅ | ✅ | — |
| Membership admin action | subject | ✅ | ✅ | ✅ | — |
| Moderation warning | author | ✅ | ✅ | ✅ | — |
| DM | recipient | row written, **excluded from bell** | ❌ | ✅ | `/messages/:id` |
| Egg thrown / volunteer, game nudge | subject | ✅ | ❌ | ✅ | — |

### Missing — every one of these is a built feature whose engagement is invisible

| Missing notification | Feature that exists | Evidence |
|---|---|---|
| **Someone shared your post** | `sharePost` | `posts.ts:611` — no `sendNotification` |
| **Someone gave your post an award** | `givePostAward` | `posts.ts:668` — none |
| **Someone reacted to your comment** | `toggleCommentReaction` | `feed/comments.ts` — none |
| **Someone reviewed your business** | `BusinessReview` | `business/service.ts` — no notify at all |
| **Someone RSVP'd to your event** | `rsvpEvent` | `events/service.ts` — emails the *attendee*, never the host |
| **Someone joined your group** | `joinGroup` | `groups/service.ts` — none |
| **New group request** | `GroupRequest` | `groups/actions.ts:36-49` — **raw `sendEmail` loop**, bypassing `sendNotification` entirely: no bell row, no push, no coalescing, no preference check, no unsubscribe honouring |
| Connection accepted / follow-back | — | concept doesn't exist |
| Someone voted on your poll | `votePoll` | none |
| Your post was removed by a moderator | `resolveCluster` | only `warned` notifies; `hidden`/`removed` are silent — **the author is never told their post was taken down** |

### Notification system defects

**[Confirmed] N-1 — no `actorId` on `Notification`** (`schema.prisma:1013`). The row stores a pre-rendered `title` string and a denormalized `imageUrl`. Consequences: cannot group ("Anjali and 4 others reacted"), cannot suppress notifications from blocked users, cannot re-render after the actor renames, cannot build an actor-scoped mute. The 6-hour `COALESCE_WINDOW_MS` collapses same-kind-same-entity bursts into one row but overwrites the title with the *latest* actor's name — so "Ravi reacted to your post" silently becomes "Priya reacted to your post" and the earlier actor is lost.

**[Confirmed] N-2 — the Redis unread counter drifts and never self-heals.** `sendNotification` guards the increment (`if (input.kind !== "new_message") redis.incr`), but `markRead` (`service.ts:151`) and `deleteNotification` (`service.ts:206`) decrement with **no such guard**. `unreadCount` returns `Math.max(0, cached)` — it clamps at zero but never corrects downward drift, and it re-seeds Redis only on a cache miss. A drifted counter is permanent until the key expires (it has no TTL). This is exactly the "bell says 3, list is empty" support ticket, and it is unfixable by the user.

**[Confirmed] N-3 — dead deep links.** Notifications survive their target. Deleting a post leaves every `reaction_on_post` / `comment_on_post` / `mention` row pointing at `/feed/<id>` → `notFound()`. No cleanup on delete, no tombstone, no client-side "this content is no longer available".

**[Confirmed] N-4 — reply notifications link to the post, not the comment.** `pushUrlFor` only knows `post` and `conversation`. A reply on a 100-comment thread drops you at the top of the post.

**[Confirmed] N-5 — preferences are email-only.** `EmailPreference` has 8 category flags + quiet hours. There is **no in-app or push preference model at all** — a user cannot mute reaction notifications, cannot mute a thread, cannot turn off push per category. The settings page exposes email prefs, password, and profile privacy; nothing else.

---

## 9. Messaging

**Exists:** 1:1 DMs keyed on a sorted `dmKey`, Supabase Realtime broadcast + 60s poll fallback, presence, typing, edit, soft-delete, reactions, read receipts, per-participant "clear chat" (`clearedAt` with a correct reveal-on-newer-message rule), N+1-free unread counts via one raw SQL join, image attachments, LiveKit calls, block + report from the thread.

This is a genuinely solid Slice-1 DM product.

**Gaps:**

- **[Confirmed]** **No group messaging.** `Conversation.dmKey` is unique and `findOrCreateConversation` always creates exactly two participants.
- **[Confirmed]** **`canMessage` requires a follow in either direction** (`service.ts:37-46`). Correct anti-spam default — but there is **no message request inbox**, so a stranger has no path to reach you at all, and there is no way to allow it.
- **[Confirmed]** **No message search.** None of the five navbar search scopes covers messages either.
- **[Confirmed]** **A reported DM cannot be actioned.** `reportUser` from the thread writes `entityType: "user"` (`service.ts:425`), but `resolveEntityAuthor` handles `"profile"`, not `"user"` (`moderation/service.ts:37`). A `"user"` report therefore falls through the switch, `notifyWarnedAuthor` no-ops, and no content consequence exists for `message` either. **DM harassment reports land in a queue that can only be dismissed.**
- **[Confirmed]** Admin messaging console (`admin/messaging/page.tsx`) shows conversation metadata and counts only — participant names, message count, last activity. **No message content.** A moderator investigating a harassment report cannot read the messages.
- **[Confirmed]** **No delivery guarantee and no retry.** `sendMessage` writes the row then `broadcast()`s best-effort (`supabase-realtime.ts:79` swallows all errors). If the DB write succeeds and the client's optimistic send never reconciles, or the tab dies mid-flight, there is no client-side outbox and no dedupe key — **a double-tap on a flaky connection produces two messages**, because nothing is idempotent.
- **[Confirmed]** A `deletedAt` message still exists server-side; there is no "delete for everyone" vs "delete for me" distinction and no tombstone.
- **[Likely]** Multiple tabs: each subscribes independently and `broadcast: { self: false }`, so a message sent in tab A does not appear in tab B until the 60s poll.

---

## 10. Search & discovery — the largest single hole

**[Confirmed] S-1 — there is no search backend.** The navbar renders a search box with five scopes (`PrivateNavbar.tsx:58-64`):

```ts
{ profiles → "/community" }, { posts → "/feed" }, { groups → "/groups" },
{ events → "/events" }, { businesses → "/business" }
```

Each becomes `<a href="{scope.href}?q={query}">`. Verified by grep: **only `/community` reads `q`.** `/feed/page.tsx` accepts `{ tab, new, tag }`; `/groups`, `/events`, and `/business` read no `searchParams` at all. Four of the five advertised search scopes **silently discard the query and render the unfiltered page**. The user sees no error, no "0 results", no indication anything happened.

`SUGGESTED_SEARCHES` (`PrivateNavbar.tsx:66`) is a hardcoded array — "Alumni Reunion 2026" (tagged *Trending*), "Batch 2010 memories" — linking to `/community?q=...`, which searches only `legalName`, `displayName`, `username` and will return zero results for every one of them.

**Missing entirely:** post search, hashtag search (hashtags are indexed in `Hashtag`/`PostHashtag` and browsable at `/feed?tag=` but not searchable), group search, event search, business search, message search, autocomplete, typo tolerance, relevance ranking, search history, saved searches.

**[Confirmed] S-2 — directory search leaks private profiles.** `searchDirectory` filters `status: "active", deletedAt: null` and nothing else. It **ignores `Profile.visibility`** — a member who set "Private — Only you can see your profile" is returned in `/community` with their legal name, photo, city, profession, company, batch, house, and membership tier. It also ignores `UserBlock`. The privacy control the settings page sells does not cover the surface most people will actually browse.

**[Confirmed] S-3 — `/api/community` is an unthrottled roster export.** `requireUser()` and nothing else — no rate limit, no privacy filter, 24 rows per request, `total` returned so the caller knows exactly how many pages to walk. Any member (including a suspended one, per §12) can enumerate the entire alumni roster with real legal names, employers, and cities in a few hundred requests.

---

## 11. Growth loops

| Loop | Status |
|---|---|
| Invite a friend | **[Confirmed]** admin-only (`/api/admin/users/invite`, `activation-blast`). Members cannot invite anyone. |
| Contact / phonebook discovery | ❌ |
| Suggested people (in-app) | **[Confirmed]** `connections/service.ts:120-125` — `findMany({ status: active, id: { notIn: followed } }, take: 6)` with **no `orderBy`**. Arbitrary DB order, no mutuals, no batch/house affinity, no dismiss, no refresh, `mutualCount` hardcoded to 0. |
| Suggested people (onboarding) | ✅ real — anchor + housemate + batchmate + cross-batch (`onboarding/suggestions.ts`). Runs 5–9 sequential queries and hardcodes `ANCHOR_EMAIL = "sndatarkar@gmail.com"` as a business rule in source. |
| External share | ✅ OG images for posts and events |
| Referral / attribution | ❌ no source tracking anywhere |
| Re-engagement email | ✅ profile-view digest + daily digest + onboarding nudge |
| Waitlist / public signal | ❌ |

**"If 10 users join tomorrow, what helps them find each other?"** — the onboarding follow step (good), the directory (real), and 6 arbitrary suggestions. **"If 10,000 join?"** — the same 6 arbitrary suggestions, an ILIKE-scan directory, and no search. The discovery layer does not scale past the point where you personally know everyone.

---

## 12. Cold start

- **User #1:** empty feed → caught-up path returns nothing → blank. `getFollowSuggestions` returns the anchor + backfill, most buckets empty.
- **User #10:** onboarding follow step works. Feed shows the school's ~all posts (there is no follow-gate on the default feed). Fine.
- **User #1,000:** first real strain — directory ILIKE, no search, 6 static suggestions.
- **User #100,000:** the feed query (`schoolId` + `notIn` up to 1000 impression UUIDs + an `OR` visibility clause + `ORDER BY rankingScore`) stops using an index effectively; `PostImpression` is in the hundreds of millions with no pruning job.

**[Confirmed]** The system has an anti-cold-start mechanism (caught-up recycle + shuffle) that is better than most. It has no *supply-side* mechanism — nothing prompts posting, nothing surfaces "your batch has been quiet", and the only content source is "every post in the school".

---

## 13. Privacy matrix — as enforced

| Content | Owner | Intended audience | Actually enforced at |
|---|---|---|---|
| Post `public` | author | everyone | ✅ correct |
| Post `followers` | author | followers | feed ✅ · **profile timeline ❌** · **detail URL ❌** · **OG image ❌** · engagement ❌ |
| Post `groups` | author | group members | **nowhere — public** |
| Post anonymous | author | public, name hidden | `isAnonymous` hides name in feed; **[Potential]** verify the analytics page and admin surfaces don't re-reveal it |
| Profile `private` | user | owner only | `/username` ✅ (stub still leaks name/photo/headline/batch/house) · **`/community` ❌** |
| Profile `connections` | user | mutual/either-follow | `/username` ✅ · **`/community` ❌** |
| DOB, blood group | user | owner only | ✅ redacted server-side in `loadProfile` |
| Address | user | opt-in members | ✅ |
| DM content | participants | participants | ✅ `assertParticipant` on every read |
| Directory row | user | members | ✅ `requireUser` gate — but see S-3 |

**Indirect leak surfaces not covered by any check:** post detail URL, OG image endpoint, comment lists, `/api/community`, notification bodies (a mention notification's `title` embeds the actor's name regardless of block), profile-view logging (a blocked viewer still lands in your weekly "who viewed you" email).

---

## 14. Trust & safety

**Exists:** report post/comment/profile/business/message/game-bug (`fileReport`, unique per reporter+entity, deduped, committee-alerted), clustered report queue, `ModerationAction` append-only log, `MemberSuspension` with reason + duration, `AuditLog` (49 call sites), warn-with-copy, ban/suspend/activate, `AdminRole` RBAC matrix with 5 roles and 23 permissions.

The *shape* of a trust & safety system is here. The *enforcement* is not.

**[Confirmed] T-1 — suspension and ban do nothing.** Detailed in §0 and §17. `admin/users.ts:93` sets `status: "suspended"`. `requireUser()` — the guard on 87 files including every feed action, compose action, message action, follow action, group action, and event action — never reads it. `gateUser()`, which throws `Account ${status}`, is imported by **zero** feature modules. `lib/auth.ts authorize()` doesn't check it either, so they can even get a fresh session. **A banned user can keep posting indefinitely.**

**[Confirmed] T-2 — timed suspensions never expire.** `MemberSuspension.expiresAt` and the pure helper `isSuspensionActive` are written and unit-tested; **no code path reads them**. `vercel.json` crons are membership, email, event-invites, alfazy-champions, bot, vyapaar-rooms — no suspension sweep. A "7-day suspension" is indefinite until an admin manually lifts it (and, per T-1, has no effect anyway).

**[Confirmed] T-3 — moderation can only touch posts.** `resolveCluster`/`resolveReport` (`moderation/service.ts:266, 322`) apply the content consequence only when `entityType === "post"`. Reports on **comments, profiles, businesses, and DMs** can be marked `hidden`/`removed` — the queue clears, the audit log records a removal, the moderator believes they acted — **and the content stays up.** This is worse than not having the button.

**[Confirmed] T-4 — no restore.** Nothing anywhere sets `Post.status` back to `visible`. A mis-click on "removed" is permanent without direct DB access.

**[Confirmed] T-5 — the moderation console cannot see the content.** `admin/moderation/page.tsx` passes `{ entityType, entityId, reason, details, reporter, time }`. A moderator sees `post · 8f3a…-…c21 · "harassment"` and must hand-navigate. For comments, profiles, and messages there is no viewable surface at all.

**[Confirmed] T-6 — the author is never told their content was removed.** Only `resolution === "warned"` sends a notification. `hidden` and `removed` are silent, so from the member's side the post simply vanished — indistinguishable from the bug they'll file. No appeal path exists.

**[Confirmed] T-7 — `reportPenalty` is a one-way ranking weapon.** `fileReport` increments `Post.reportPenalty` **on every upsert, including a re-file of an existing report** (`moderation/service.ts:108` sits outside the `if (!existed)` guard), then recomputes the ranking score. It is **never decremented** — not on dismissal, not ever. One motivated user can permanently bury any post's ranking, and a dismissed false report leaves the penalty applied forever.

**[Confirmed] T-8 — no repeat-offender logic.** `ModerationAction` records every decision and nothing aggregates it. No strike count, no escalation ladder, no "this account has 6 upheld reports" surface on the user page.

**[Confirmed] T-9 — no spam/bot/abuse detection of any kind.** No signup velocity check, no duplicate-content detection, no mass-follow detection, no link-reputation check (`og-preview.ts` has an SSRF hostname blocklist, which is a different control), no new-account restrictions beyond `giverWeight` in the karma ledger.

**[Confirmed] T-10 — self-reporting is not blocked** for `fileReport` (only `reportUser` guards it), and there is no reporter-abuse tracking.

---

## 15. Media

**[Confirmed] M-1 — media is never deleted.** `deleteObject` (`r2.ts:106`) has exactly two callers, both inside `r2.ts` itself, both rejecting an oversized upload. Post delete, comment delete, avatar replace, cover replace, account close, and moderator removal **all leave the object in R2 permanently**. No GC job, no orphan reconciliation, no lifecycle policy in the repo. Storage cost grows monotonically and deleted content remains fetchable at its public URL.

**[Confirmed] M-2 — no processing pipeline.** Presigned PUT direct to R2, original bytes served. No resize, no thumbnails, no WebP/AVIF derivation, no video transcode, no poster frames, no EXIF stripping (**location metadata in uploaded photos is served to every viewer**). 25 raw `<img>` tags bypass `next/image`.

**[Confirmed] M-3 — orphan-on-failure.** The client presigns, PUTs, then calls `createPostAction`. If the post creation fails after a successful PUT, the object is orphaned with no record. `validatePostMedia` does verify ownership and size server-side (good — the presigned PUT can't enforce size), but there is no reverse sweep.

**[Confirmed] M-4 — no retry/resume.** No multipart, no resumable upload, no client retry. A dropped connection at 90% on a phone means starting over.

---

## 16. Performance & scale

**Strengths:** denormalized post counters maintained by DB triggers, `Promise.all` batching, `take` on most list queries, request-scoped `cache(auth)`, one raw-SQL join replacing the DM unread N+1, 135 indexes, keyset pagination on the feed.

**[Confirmed] P-1 — nothing is cached.** 81 files declare `force-dynamic`; 9 use `unstable_cache`/`revalidate`. Every feed render is a fresh SSR with 6–10 pooler round-trips.

**[Confirmed] P-2 — directory search is a guaranteed sequential scan.** Three `contains` (`ILIKE '%q%'`) predicates on `users` + a full `count()` on every page, with `skip`-based offset paging. No trigram index, no `tsvector`, no `pg_trgm` extension in any migration. At 50k users this is a multi-hundred-ms table scan per keystroke of the infinite-scroll loader, unthrottled.

**[Confirmed] P-3 — the feed's exclusion set is unbounded in practice.** `getFeed` builds `where.id = { notIn: [...hidden, ...seen] }` with up to `SEEN_EXCLUSION_WINDOW = 1000` UUIDs. A 1000-element `NOT IN` on every feed page defeats the `(schoolId, rankingScore)` index and forces a large filter. Compounded by the `where.OR` visibility clause.

**[Confirmed] P-4 — `PostImpression` grows without bound.** One row per (viewer, post) forever, no TTL, no pruning cron. 10k active users × 2k posts seen = 20M rows, and it is on the hot path of every feed request.

**[Confirmed] P-5 — index gaps on hot paths:**
- `Comment` has only `@@index([postId])`. `listPostComments` filters `(postId, deletedAt, parentId)` and orders by `createdAt`; there is no composite. There is **no index on `Comment.authorId`** — "all posts by this user" for moderation or account deletion is a full scan.
- `ContentReport` has no index on `status`; `listOpenReports` is `where status=open order by createdAt` → scan + sort.
- `Post` has no partial index on `(deletedAt IS NULL AND status='visible')`, which every feed query needs.
- `Message` indexes omit `deletedAt`.

**[Confirmed] P-6 — 61 `findMany` calls with a `take`; the rest are unbounded.** Notably `getFollowingIds` (every followed id, used to hydrate follow buttons on every page) and `getFollowData`'s `allFollowingIds`, which then becomes an `id: { notIn: [...] }` array. A user following 5,000 people generates a 5,000-element `NOT IN`.

**[Likely] P-7 — `listReportClusters` groups in JS over up to 200 rows** (documented as intentional). Fine now; becomes wrong when the open queue exceeds 200 because the `take` truncates before grouping.

---

## 17. Analytics

**[Confirmed] A-1 — there is no product analytics.** No PostHog, no GA, no Mixpanel, no Segment, no Amplitude in `package.json` or `src/`. Sentry is wired for errors only.

**[Confirmed] A-2 — `ActivityEvent` is a designed-and-abandoned event stream.** The model has `userId, eventType, entityType, entityId, metadata, ipInet, createdAt` with two indexes. The only writer in the entire codebase is `modules/games/analytics.ts:29`. Signup, login, post, comment, reaction, follow, message, RSVP, upgrade, and churn write **nothing**.

**Questions the business cannot currently answer:**

| Question | Answerable? |
|---|---|
| Where did users come from? | ❌ no source/referrer capture |
| Which invitations converted? | ❌ no invite attribution |
| Did they complete onboarding? | ⚠️ `onboardingCompleted` boolean — no step drop-off |
| Did they follow anyone / post / engage in week 1? | ❌ requires ad-hoc SQL, no activation definition |
| DAU / WAU / MAU | ❌ `lastLoginAt` is the only signal; no session events |
| D1 / D7 / D30 retention, by cohort | ❌ |
| Why did they leave? | ❌ (`closeAccount` does capture a free-text reason — the one churn signal that exists) |
| Which content/creators drive engagement? | ⚠️ `/feed/[postId]/analytics` per-post only; no aggregate |
| Follow acceptance rate, interaction density, content supply/demand | ❌ |

The admin dashboard computes live `COUNT(*)`s against `users`/`posts`/`comments` on every render — a snapshot, not a time series, and increasingly expensive.

---

## 18. Admin & supportability

Run this platform with 1M users. Can an admin:

| Task | Can they? |
|---|---|
| Search / list / filter users | ✅ |
| View and edit a member | ✅ |
| Verify / unverify | ✅ |
| Suspend / ban | ✅ button — ❌ **no effect** (T-1) |
| Investigate a report | ⚠️ sees metadata, **not the content** (T-5) |
| Remove a reported comment / profile / business / DM | ❌ (T-3) |
| Restore removed content | ❌ (T-4) |
| See a member's strike history | ❌ (T-8) |
| Impersonate to reproduce a bug | ❌ permission defined, unimplemented |
| Hard-delete for a legal request | ❌ permission defined, unimplemented |
| Export a member's data | ❌ |
| Read a reported conversation | ❌ (§9) |
| Resend a failed email | ❌ outbox is read-only, failures are terminal (§19) |
| Recompute a drifted unread counter | ❌ (N-2) |
| See system health | ⚠️ `/api/health` is `SELECT 1`; no queue depth, no error rate, no cron-success surface |
| Read the audit log | ✅ `/admin/audit-logs` |

**"My post disappeared" — can support answer it?** Partially. `AuditLog` records `post.create` and `post.delete` with actor. `ModerationAction` records moderator decisions. But: `editPost` is **not** audited, privacy changes are **not** audited, and there is no unified per-entity timeline — support must query three tables by hand. For "my notification never arrived", "my message vanished", "my connection disappeared", or "why can't I log in", there is no timeline at all.

---

## 19. Reliability

**[Confirmed] R-1 — no outbox for cross-system side effects.** Every write path is: DB transaction (correct) → then fire-and-forget notification / email / realtime / karma, each individually `try`/`catch`-swallowed. `createPost` commits, then mentions, then hashtags. If the process dies between them, the post exists with no mention pings and no hashtag rows, and **nothing ever reconciles it**. `after()` is used to defer email past the response — which on Vercel means the work runs in the same invocation's tail and is lost if that invocation is terminated.

**[Confirmed] R-2 — the email outbox has no retry.** `drainEmailOutbox` (`email/service.ts:243`) sets `status: "failed"` on the first exception, with no `attempts` column, no backoff, no requeue, and no admin retry action. **A transient SMTP blip permanently drops that email**, including password resets and payment receipts. It also runs once daily (02:30), so quiet-hours-deferred mail can sit up to 24 hours.

**[Confirmed] R-3 — payment webhooks are idempotent and correct** (`webhook-dedup.ts` records after success, deliberately preferring re-processing over silent drops; `claimAndActivateOrder` adds a per-order claim for the concurrent case). This is the best-engineered reliability path in the repo. **[Potential]** per project memory the live Razorpay webhook is not yet configured in production, so browser-close-after-payment cases do not auto-activate.

**[Confirmed] R-4 — no dead-letter handling anywhere.** No queue (pg-boss is a dependency but `jobs.ts` cannot run on Vercel; scheduled work is Vercel Cron + GitHub Actions). A failed cron run is simply skipped until the next day; there is no failure alert and no catch-up.

**[Confirmed] R-5 — `givePostAward` is not transactional.** `spendKarma` → `awardKarma` → `postAward.create` are three separate calls. A failure after the spend debits the giver and grants nothing.

---

## 20. Real-time consistency

| Surface | Mechanism | Divergence risk |
|---|---|---|
| DM messages / typing / read / presence | Supabase Realtime + 60s poll | low — poll reconciles |
| Notification bell | Realtime nudge + poll | **counter drift is permanent** (N-2) |
| Feed | none | a post deleted/edited/moderated while on screen stays rendered indefinitely |
| Reactions / comment counts | optimistic UI, no live sync | two viewers see different counts until reload — acceptable, but undeclared |
| Follow state | `follow-store` app-wide optimistic context | stale across tabs |
| Vyapaar match | Realtime | (out of scope) |

**[Confirmed]** The intentional/unintentional line is undocumented. The feed's "no live invalidation" is a reasonable product choice; the notification counter's permanent drift is a bug. Nothing in the repo distinguishes them.

---

## 21. Mobile, responsive, accessibility

**[Confirmed]** Real mobile consideration exists: `MobileTabBar`, master-detail messaging that collapses correctly, `h-[calc(100dvh-3.5rem)]` for the fixed navbar, responsive width tiers documented in `CLAUDE.md`.

**[Confirmed] Accessibility gaps** (static counts across `src/app` + `src/components`):

- **42 `<div onClick>`** handlers — non-focusable, non-keyboard-operable controls.
- **6** `role="dialog"`/`aria-modal` occurrences against a much larger number of modals/dropdowns; **3** focus-trap references total. Most overlays do not trap focus, do not restore focus on close, and are not announced.
- **13** `onKeyDown` handlers across the whole app — Escape-to-close and arrow-key navigation are largely absent.
- **25** raw `<img>` (no `next/image`), 86 `alt=` occurrences — coverage is not verifiable statically but the ratio suggests decorative and content images are not consistently distinguished.
- **1** `error.tsx` for **111** pages (plus one `global-error`). `/admin/*`, `(auth)`, `(onboarding)`, and `(marketing)` have **no error boundary** — an exception in an admin page replaces the entire shell with the global error screen.
- 23 `loading.tsx` for 111 pages.

---

## 22. Documentation vs reality

**[Confirmed]** The repo root contains ~4,000 lines of Markdown describing a **different, archived system** (the ARS reputation design that `CLAUDE.md` says was superseded by Karma):

| File | Says | Reality |
|---|---|---|
| `AUDIT_REPORT.md` | *"This repository is documentation-only… no code, no schema, no migrations"* | 342k LOC |
| `ROADMAP.md` | 12 sprints building `reputation_levels` L0–L5, `ReputationRuleEngine` | none of it exists; Karma replaced it |
| `DATABASE_SCHEMA.md` | 10 ARS tables | not in `schema.prisma` |
| `API_SPECIFICATION.md` | `/api/v1/reputation/*` | no such routes |
| `SERVICE_ARCHITECTURE.md`, `INTEGRATION_SPEC.md`, `USER_FLOWS.md`, `ADMIN_MODULE.md`, `CHANGELOG_AUDIT.md`, `CORE_PLATFORM_SCHEMA.md`, `MODULES_SCHEMA.md`, `SECURITY.md` | ARS design | superseded |
| `README.md` | `create-next-app` boilerplate | — |
| `CLAUDE.md` | *"Auth.js with **Google OAuth + Credentials** providers"* | `lib/auth.ts` has **only** Credentials |
| `CLAUDE.md` | *"no `src/middleware.ts` in the active tree"* | `src/middleware.ts` exists and is active |
| `CLAUDE.md` | Prisma 7.8.0 / Next 16.2.9 | 7.9.1 / 16.2.12 |

`docs/CODEBASE_MAP.md` is excellent and current. `DECISIONS.md` and `MEMBERSHIP_PLAN.md` are live. Everything else at root is a trap.

**"What would a new engineer misunderstand tomorrow?"** — that reputation is ARS (it's Karma); that Google sign-in works (it doesn't); that there's no middleware (there is); that suspension works (it doesn't); that the search box searches (it doesn't); that groups have discussions (they don't); that a moderator can remove a comment (they can't).

**Business rules with no documented home:** the `followers`/`groups`/`anonymous` audience semantics, which notifications fire and which are deliberately suppressed, the block contract, the soft-delete cascade contract (there isn't one), the `requireUser` vs `gateUser` distinction, and `ANCHOR_EMAIL` in `onboarding/suggestions.ts`.

---

## 23. Recent-PR pattern: features built in isolation

Reviewing the last 40 commits — 35 of which are Vyapaar — against "what should this have touched":

| Shipped feature | Touched | Should also have touched |
|---|---|---|
| Post awards | karma, `PostAward` | notification to author, analytics event, moderation (award on removed content), refund on delete |
| Share | `PostShare`, ranking trigger | notification, dedupe, rate limit, unshare, karma reversal |
| Comment reactions | `Reaction`, `likeCount` | notification, comment ranking (`likeCount` is written and never read) |
| Groups | model, join/leave, requests | posts (the entire point), notifications, moderation, search |
| Blood requests | model, notify, rate limit | ✅ actually well-integrated |
| Report clustering + `ModerationAction` | queue, log, RBAC | content consequences for non-post entities, restore, strike aggregation, content preview |
| `MemberSuspension` | model, admin UI, audit, tests | **enforcement**, expiry cron |
| Admin RBAC | matrix, `can()`, `requirePermission` | implementations for `members:impersonate` and `members:hard_delete` |
| Vyapaar (35 commits) | engine, rooms, bots, wallet, replay, tests | — self-contained; the cost is opportunity, not integration |

**The pattern:** the *primary* write is always correct and usually tested. The *downstream* systems — notify, measure, moderate, reverse, document — are consistently the part that doesn't ship.

---

## 24. "We assumed users would…"

Explicit, each traced to a real gap:

1. **…never be suspended and still try to post.** → T-1.
2. **…understand that "My Groups" is not enforced.** → F-3.
3. **…not share a URL to a followers-only post.** → F-4.
4. **…not double-tap send on a bad connection.** → §9, no message idempotency.
5. **…not re-file a report to bury a rival.** → T-7.
6. **…want to unblock someone eventually.** → no unblock exists.
7. **…not click "search" expecting search.** → S-1.
8. **…not notice that "0 mutual connections" is always zero.** → `mutualCount: 0`.
9. **…not need to know their post was removed.** → T-6.
10. **…not come back after 6 months** — `PostImpression` has excluded everything they've seen; the caught-up shuffle saves this, but the seen table just grows.
11. **…delete their account and mean it** — no export, no hard delete, no cascade.
12. **…not open two tabs** — follow store, notification counter, and DM state all diverge.
13. **…not upload a 4K photo from a phone** — no resize, no retry, no resume.
14. **…not care that their photo's GPS EXIF is public.** → M-2.
15. **…set privacy once and trust it** → the directory ignores it (S-2).
16. **…report a DM and expect something to happen.** → §9.

---

## 25. Systemic patterns (the highest-value section)

**SP-1 — Two competing identity authorities, and the correct one is dead.**
`requireUser()` (87 files) reads only the JWT. `gateUser()` (1 file) reads the DB and enforces `status`, verification, karma, and roles. Every member-facing surface uses the first. This single architectural split is the root cause of T-1, T-2, and the ability of a closed/banned account to keep operating. It is one guard change away from being fixed — and one guard change away from having been right all along.

**SP-2 — Visibility is a policy with four implementations and no owner.**
`getFeed`, `loadProfile`/`resolveProfilePrivacy`, `getPostById`, and `searchDirectory` each decide "can this viewer see this" independently. Two of the four decide nothing. There is no `canView(viewer, entity)` function. Every new surface will re-litigate the question and get a fifth answer.

**SP-3 — State changes are not events, so nothing downstream is reliable.**
`ActivityEvent` exists and is used by one module. Consequently: notifications are hand-called at each site (and forgotten at nine sites), analytics doesn't exist, audit is partial (49 hand-placed `audit()` calls; `editPost` missing), and there is no reconciliation or replay for any failed side effect. One domain-event bus with subscribers for notify / analytics / audit / search-index would collapse a third of this report's findings into one fix.

**SP-4 — Actions were built without their inverses.**
Share has no unshare. Award has no refund. Block has no unblock. Remove has no restore. Karma has no reversal. Hide has no un-hide. Suspend has no expiry. Delete has no undo. In each case the forward path is tested and the reverse path does not exist. This is a design habit, not a series of accidents.

**SP-5 — Soft delete everywhere, cascade contract nowhere.**
`deletedAt` is on User, Post, Comment, Message. Nothing defines what a soft delete implies for `Notification`, `SavedPost`, `PostImpression`, `Reaction`, `PostHashtag`, `Follow`, `Conversation`, R2 objects, or karma. Every consumer re-decides, and most simply filter `deletedAt: null` at read time and leave the orphans.

**SP-6 — The write path is transactional; everything around it is best-effort.**
`$transaction` is used correctly in `createPost`, `awardKarma`, `votePoll`, `suspendUser`. Then the notification, email, realtime broadcast, hashtag sync, and ranking recompute all run outside it, each swallowing its own errors. The database is consistent; the *product* is not.

**SP-7 — The features that exist outrun the operations that support them.**
30 feature modules; one moderation consequence type; zero product analytics; one error boundary; no impersonation; no data export; no retry anywhere. The build rate has outpaced the run rate, and the gap is now the dominant risk.

---

# PART II — SOCIAL-SYSTEM GAP MATRIX

| System | What exists | What we missed | Risk | Priority |
|---|---|---|---|---|
| **Identity** | Credentials auth, email verify, JWT, RBAC matrix, rate-limited login, timing-safe compare | `status` unenforced on 87 files; no session revocation; `UserSession` unused; no device list; no 2FA (`MfaFactor` unused) | Banned users operate freely; no post-compromise remediation | **P0** |
| **Profiles** | Rich model, tested privacy policy, server-side redaction, completeness score | Directory ignores visibility; no data export; no hard delete; no reactivation; close = flag flip | Privacy promise broken; legal exposure | **P0** |
| **Social graph** | Follow + block models, follow notifications | Block has one entry point, no unblock, no list, enforced on 2 of 10 surfaces; no mute/restrict; no mutuals; no connection concept | Harassment is unstoppable by the victim | **P0** |
| **Posts** | 6 formats, drafts, polls, mentions, hashtags, awards, saves, soft delete | `groups` scope unenforced; detail URL unscoped; edit not audited/not re-notified; no restore; no scheduling | Privacy leak; moderation dead-end | **P0** |
| **Feed** | Ranked + recency, keyset cursors, seen-exclusion, caught-up, affinity, ads | No topic/author diversity, no velocity, negative signal unused, no provenance, group posts unscoped | Quality ceiling; latent leak | **P1** |
| **Comments** | Threads, flattening, reactions, images, mentions | No edit, no pagination past 100, no ranking, no moderation, no tombstone, no block filter | Unmoderatable at scale | **P0** |
| **Reactions** | Idempotent, trigger-maintained, karma-wired | No reversal on undo/delete/removal; no comment-reaction notification | Reputation integrity | **P1** |
| **Sharing** | `PostShare`, ranking credit | No dedupe, no rate limit, no notification, no unshare, no repost-as-object | Ranking gaming | **P1** |
| **Search** | A search box | **No backend for 4 of 5 scopes; no post/group/event/business/hashtag/message search; fake suggestions** | Product is undiscoverable | **P1** |
| **Discovery** | Onboarding suggestions, directory, hashtag browse | Unordered 6-row suggestions, `mutualCount: 0`, no member invites, no re-ranking | Growth ceiling | **P1** |
| **Notifications** | 16 kinds, coalescing, push, email, realtime, deep links | 9 missing kinds; no `actorId`; permanent counter drift; dead links; email-only prefs; group requests bypass the system | Engagement loss + support load | **P1** |
| **Messaging** | Solid 1:1 DMs, realtime, presence, block/report | No groups, no requests inbox, no search, no idempotency, reports unactionable, admin can't read | Harassment dead-end | **P1** |
| **Media** | Presigned R2, server-side validation, ownership check, size cap | Never deleted, no processing/thumbnails/transcode, no EXIF strip, no retry, orphans | Unbounded cost + privacy | **P1** |
| **Privacy** | Tested policy module, server-side redaction | Not applied to directory, post detail, OG, comments, notifications | Leak | **P0** |
| **Trust & safety** | Reports, clusters, `ModerationAction`, suspensions, RBAC, warn | Suspension unenforced; expiry unprocessed; non-post entities unactionable; no restore; no strikes; no abuse detection; `reportPenalty` weaponizable | **Cannot moderate** | **P0** |
| **Moderation ops** | Clustered queue, assignment, audit | No content preview, no restore, no removal notice, no appeal | Blind + irreversible | **P0** |
| **Analytics** | Sentry, admin counts, per-post analytics | No product analytics; `ActivityEvent` unused; no funnel/retention/attribution | Flying blind | **P2** |
| **Admin** | 20+ pages, real RBAC, audit log, CMS | Impersonate + hard-delete unimplemented; no email retry; no counter repair; no health beyond `SELECT 1` | Every incident needs an engineer | **P1** |
| **Support** | `AuditLog`, `ModerationAction` | No unified entity timeline; edits/privacy changes unaudited; no notification/message/connection forensics | Unanswerable tickets | **P1** |
| **Performance** | Triggers, batching, keyset, 135 indexes, request-cached auth | 81 `force-dynamic`; ILIKE directory scan; 1000-element `NOT IN`; index gaps; unbounded `findMany` | Degrades ~10–50k users | **P2** |
| **Scalability** | Denormalized counters | `PostImpression` unbounded; offset paging; no read replicas/CDN strategy | Cost + latency wall | **P2** |
| **Reliability** | Webhook dedup, karma tx, push self-heal | No outbox, no email retry, no DLQ, no reconciliation, `after()` on serverless | Silent data/mail loss | **P1** |
| **Accessibility** | Some `aria-label`, semantic forms | 42 `div onClick`, ~6 dialog roles, 3 focus traps, 1 error boundary | Excludes users; legal | **P2** |
| **Documentation** | Excellent `CODEBASE_MAP.md`, live `DECISIONS.md` | ~4,000 lines of root MD describing an archived system; `CLAUDE.md` drift | Onboarding trap | **P2** |

---

# PART III — WHAT WE SHOULD HAVE DONE EARLIER

### We should have designed this earlier
- **One `canView(viewer, entity)` policy** and one `canAct(viewer, entity, action)` policy, called by every read and every write. Four surfaces now disagree.
- **A block contract**: what a block means across feed, profile, search, comments, notifications, follow, mentions, and profile-views — decided once, before shipping the block button in one corner of the DM UI.
- **A domain-event bus.** `ActivityEvent` was modelled for this and then bypassed. Notifications, analytics, audit, and search indexing are all downstream of the same events.
- **The account lifecycle** as an explicit state machine, including what happens to content, graph, media, and sessions at every transition.
- **The moderation consequence model** — generic over entity type from day one, with an inverse for every action.

### We should have separated these concepts earlier
- **Follow vs connection.** Everything downstream (mutuals, "connections only" privacy, messaging permission, suggestions) needs the distinction and it was never made.
- **Notification vs email.** They are fused in `sendNotification`; group requests escaped by calling `sendEmail` directly, which is exactly what a fused API invites.
- **Post audience vs post identity.** "Anonymous" is an audience option in the composer and an identity flag in the model. That confusion is why `groups` slipped through unenforced.
- **Deletion vs deactivation vs suspension vs ban.** All four collapse onto `status` + `deletedAt` with no distinct behaviour.

### We should have centralized these rules earlier
- Account status checking (one guard, not two with the safe one unused).
- Visibility scoping (four implementations).
- Notification emission (16 hand-wired call sites, nine misses, one bypass).
- Soft-delete cascade (no contract at all).
- Rate limiting on writes (seven places have it; the entire social surface doesn't).

### We should have automated these things earlier
- Suspension expiry sweep.
- `PostImpression` pruning.
- R2 orphan GC.
- Email retry with backoff.
- Notification-counter reconciliation.
- Karma reversal on content removal.
- Stale-notification cleanup on entity delete.

### We should have tested these scenarios earlier
The 122 unit + 19 integration tests are genuinely good, but they test **units, not integrations**. Untested and broken:
- Suspended user attempts to post → should 403 (**currently succeeds**).
- Blocked user reacts to blocker's post → should 403 (**currently succeeds**).
- Logged-out visitor opens a followers-only post URL → should 404 (**currently renders**).
- Private profile appears in directory search → should not (**currently does**).
- Moderator removes a comment → comment hidden (**currently no-op**).
- Post deleted → its notifications don't 404.
- Unreact → karma returns to prior balance.
- Email send fails → retried.

### We should have monitored these systems earlier
- Notification delivery success (in-app / push / email) and counter drift.
- Email outbox failure rate — currently silent.
- Cron success/failure per job.
- Feed query latency p95 and exclusion-set size.
- Moderation queue age and time-to-resolution.
- R2 object count vs referenced object count.
- Signup → activation funnel.

### We should have documented these decisions earlier
- Which notifications are deliberately suppressed vs simply missing (reactions have no email *by design*; shares have no notification *by accident* — nothing records which is which).
- Why `requireUser` and `gateUser` both exist.
- The real-time consistency contract (feed is eventually consistent by choice; the bell counter is broken by accident).
- That "My Groups" audience is not enforced.
- That the search box does not search.

### We should have asked these product questions earlier
See §27.

### Hidden technical debt we are carrying
`requireUser`/`gateUser` split · four visibility implementations · unused `ActivityEvent`, `UserSession`, `MfaFactor`, `Spotlight` models · unimplemented `members:impersonate`/`members:hard_delete` permissions · 81 `force-dynamic` pages · unbounded `PostImpression` · no cascade contract · `after()` on serverless · 4,000 lines of contradictory docs · dual `ReportableEntity` `"user"`/`"profile"` naming.

### Hidden product debt
Groups with no content · a search box that doesn't search · "0 mutual connections" everywhere · a "My Groups" audience that's public · block with no unblock · suspension with no effect · removal with no notice or appeal · `{{PLACEHOLDER}}` values still in marketing pages.

### Hidden growth debt
No member-initiated invites · unordered suggestions · no attribution · no activation definition · no retention measurement · no supply-side nudges — the platform cannot tell whether it is growing or why.

### Hidden trust & safety debt
Every moderation lever except "remove a post" is decorative. Suspension, ban, comment removal, profile removal, business removal, and DM action all present a working UI over a no-op. Moderators will act, believe they acted, and the content will stay up. **This is the single most dangerous class of finding in this audit**, because it produces false confidence rather than a visible failure.

---

# PART IV — RECOVERY PLAN

## P0 — Fix immediately

### P0-1 · Suspension, ban, and account closure are unenforced
**Problem** `requireUser()` (87 files) never reads `User.status`; `gateUser()` (which does) is used by no feature module; `authorize()` doesn't check it either.
**Evidence** `modules/auth/session.ts:19-25`; `lib/gate.ts:24-38`; `lib/auth.ts:56-73`; `modules/admin/users.ts:93,186`.
**Why it matters** Every trust & safety lever the admin console offers is a no-op. A banned harasser keeps posting, commenting, and DMing.
**System area** Auth / session / all gated surfaces.
**Fix** Make `requireUser()` the enforcing guard: add `status` to the JWT (refreshed on the existing 60s TTL) and throw on non-`active`; additionally reject non-`active` in `authorize()` so a suspended user cannot mint a new session. Keep `gateUser()` for verification/karma/role gates and have it call through.
**Dependencies** None.
**Migration/backfill** None. Requires a session-token version bump or accepting up to 60s of propagation delay.
**Tests** Suspended/banned/inactive user → 403 on create post, comment, react, follow, DM send, group join, event RSVP. Suspended user → sign-in rejected. Active user → unaffected. Add to `tests/integration/`.

### P0-2 · Timed suspensions never expire
**Problem** `MemberSuspension.expiresAt` and `isSuspensionActive` are written and tested; nothing reads them.
**Evidence** `modules/admin/users.ts:156-198`; `vercel.json` crons.
**Why it matters** Every "7-day suspension" is permanent. Manual reversal only.
**Fix** Add `/api/cron/moderation` (daily) that lifts expired suspensions → `status: "active"`, sets `liftedAt`, logs a `ModerationAction`, invalidates the session cache, and notifies the member.
**Dependencies** P0-1 (otherwise there is nothing to expire).
**Tests** Expired row → reactivated + notified; indefinite row → untouched; already-lifted → untouched.

### P0-3 · Post visibility is unenforced outside the feed
**Problem** `getPostById` filters only `deletedAt`/`status`; the profile timeline skips all viewer scoping; the OG image route is unscoped; `visibilityScope: "groups"` is treated as public everywhere.
**Evidence** `feed/query.ts:306` · `feed/query.ts:106` (`&& !filters.authorId`) · `feed/query.ts:145-148` · `feed/[postId]/opengraph-image.tsx` · `compose/actions.ts:51`.
**Why it matters** A "Followers only" or "My Groups" post is world-readable by URL, including logged-out. The composer makes a promise the backend breaks.
**Fix** Extract `postVisibilityWhere(viewerId)` from `getFeed` into one shared clause; apply it in `getPostById`, the OG route, the profile timeline, and `listSavedPosts`. Then either **(a)** implement `groups` scope properly (requires group posting — see P1-6) or **(b)** remove the "My Groups" option from the composer until it works. Ship (b) today.
**Dependencies** none for (b).
**Migration/backfill** Decide what happens to existing `visibilityScope: "groups"` rows — recommend a one-line SQL rewrite to `followers` (the closest honest scope) with a note to the affected authors.
**Tests** Followers-only post: author ✅, follower ✅, non-follower ❌, logged-out ❌, blocked ❌ — across feed, detail, profile timeline, and OG.

### P0-4 · Engagement actions have no permission checks
**Problem** `toggleReaction`, `createComment`, `sharePost`, `givePostAward`, `votePoll` check `post.deletedAt` and nothing else.
**Evidence** `feed/posts.ts:500, 611, 668, 724`; `posts.ts:420`.
**Why it matters** Combined with P0-3, a blocked non-follower can comment on a private post and the author gets a notification about it.
**Fix** A single `assertCanInteract(viewerId, postId)` — resolves the post once, checks `deletedAt`, block (both directions), and visibility scope — called at the top of each action.
**Dependencies** P0-3 (shared visibility clause).
**Tests** Each action × {blocked, non-follower on followers-post, deleted post, own post} .

### P0-5 · Moderation cannot act on comments, profiles, businesses, or DMs
**Problem** `resolveCluster`/`resolveReport` apply a content consequence only for `entityType === "post"`. The report closes and the content stays up.
**Evidence** `moderation/service.ts:266-268, 322-330`.
**Why it matters** Every non-post report is un-actionable while appearing actioned. This is worse than an error.
**Fix** A `applyModerationConsequence(entityType, entityId, resolution)` dispatcher: comment → `deletedAt` + recount + rank recompute; profile → `Profile.visibility = private` or user status; business → `BusinessStatus`; message → `Message.deletedAt` + realtime broadcast. Until each is implemented, the UI must **disable** hide/remove for that entity type rather than silently no-op.
**Dependencies** none.
**Migration/backfill** Re-open non-post reports resolved as `hidden`/`removed` — they were never actually enforced. One SQL query over `content_reports`.
**Tests** One per entity type: resolve `removed` → content is actually gone from every read path.

### P0-6 · No restore path for moderated content
**Problem** Nothing sets `Post.status` back to `visible`.
**Evidence** grep for `"visible"` under `src/app/admin/moderation/` and `src/modules/moderation/` returns nothing.
**Why it matters** A mis-click is permanent without DB access; no appeal is possible.
**Fix** `restoreContent(entityType, entityId, moderatorId, reason)` + a button in the moderation console, logged as a `ModerationAction`, gated on `content:moderate`. Also add the removal notice to the author (T-6) with a link to appeal.
**Tests** hide → restore → visible in feed, detail, profile; audit + moderation-action rows written.

### P0-7 · Blocking is a one-way trap with almost no coverage
**Problem** One entry point (inside a DM), no unblock, no list, enforced on 2 of 10 surfaces.
**Evidence** `messaging/service.ts:416` (only writer); no `unblock` anywhere; `profile/privacy.ts` has no block axis; `directory/service.ts:44`; `notifications/service.ts`.
**Why it matters** A harassment victim's only tool is partial and irreversible.
**Fix** (a) `unblockUser` + a blocked-list section in `/settings`. (b) Block controls on profile, post, and comment. (c) A shared `blockedIdsFor(viewerId)` helper applied in `resolveProfilePrivacy`, `searchDirectory`, `listPostComments`, `followUser`, `notifyMentions`, `sendNotification`, and profile-view logging.
**Dependencies** overlaps P0-4.
**Migration/backfill** None.
**Tests** After A blocks B: B cannot see A's profile, A is absent from B's directory, B's comments hidden from A, B cannot follow A, B's mention of A does not notify, B's profile view is not logged.

### P0-8 · Directory search ignores profile privacy
**Problem** `searchDirectory` filters `status` and `deletedAt` only.
**Evidence** `directory/service.ts:44-52`.
**Why it matters** "Private — only you can see your profile" is false. The settings copy is a misstatement of behaviour.
**Fix** Add `profile: { visibility: { in: allowedForViewer } }` (public/alumni always; `connections` only when a follow edge exists; `private` never) plus the block exclusion from P0-7. `connections` requires either a follow-edge subquery or accepting exclusion from the list.
**Migration/backfill** None. **[Potential]** Existing `private` users may have assumed they were already hidden — worth a notice.
**Tests** private → absent for everyone but self; connections → present only for connected viewers; blocked → absent.

### P0-9 · Account closure has no lifecycle
**Problem** `closeAccount` sets two fields. Session stays valid, sign-in still works, content stays live, media stays, no export, no undo, no hard delete.
**Evidence** `profile/edit/actions.ts:278-292`; `lib/auth.ts:56-73`; `admin/permissions.ts:28`.
**Fix** Define the state machine and implement it: (1) reject sign-in for non-`active` (part of P0-1); (2) sign out all sessions; (3) a 30-day grace window with a reactivation path; (4) at expiry, run the cascade — anonymise or remove content per the policy you choose (§27), delete R2 objects, drop follows, close conversations, purge notifications; (5) implement `members:hard_delete` for legal requests; (6) ship a data export.
**Dependencies** P0-1; a product decision on content disposition (§27 Q-11).
**Migration/backfill** Audit existing `deletedAt`-set users and apply the chosen policy.
**Tests** Close → cannot sign in; content per policy; reactivate within grace → restored; after grace → cascade ran and is idempotent.

### P0-10 · `reportPenalty` is a one-way ranking weapon
**Problem** Incremented on every `fileReport` upsert including re-files; never decremented on dismissal.
**Evidence** `moderation/service.ts:105-113` — the increment sits outside the `if (!existed)` guard.
**Why it matters** One user can permanently bury any post; every false report leaves a permanent ranking penalty.
**Fix** Move the increment inside `if (!existed)`; decrement (or recompute from the open-report count) when a report is dismissed; cap the penalty; and weight it by reporter standing.
**Migration/backfill** Recompute `reportPenalty` for all posts from the current `content_reports` table, then re-run `recomputeRankingScore`. One SQL + one script.
**Tests** Re-file → penalty unchanged; dismissal → penalty released; ranking recomputed.

---

## P1 — Fix next

| # | Problem | Evidence | Fix |
|---|---|---|---|
| **P1-1** | Search doesn't exist for 4 of 5 advertised scopes; suggested searches are fiction | `PrivateNavbar.tsx:58-64, 66`; `/feed`,`/groups`,`/events`,`/business` read no `q` | Ship `/search` backed by Postgres FTS (`tsvector` + `pg_trgm`) across posts, people, groups, events, businesses, hashtags — privacy- and block-filtered. Until then, **remove the scopes that don't work** and the fake suggestions rather than shipping a dead control |
| **P1-2** | `/api/community` is an unthrottled full-roster export | `api/community/route.ts` | Rate-limit per user, cap `total` disclosure, apply P0-8's privacy filter, log high-volume enumeration |
| **P1-3** | 9 missing notification kinds; group requests bypass the notification system | `posts.ts:611,668`; `groups/actions.ts:36-49`; `business/service.ts`; `events/service.ts` | Add share / award / comment-reaction / business-review / event-RSVP-to-host / group-join / content-removed. Route group requests through `sendNotification` |
| **P1-4** | `Notification` has no `actorId`; counter drifts permanently; links die with their target | `schema.prisma:1013`; `notifications/service.ts:151,206,159` | Add `actorId` (+ migration, backfill nullable); guard the decrements; add a nightly reconcile from the DB count; delete/tombstone notifications whose entity is gone |
| **P1-5** | No in-app or push notification preferences | `settings/` has email prefs only | `NotificationPreference` model + per-kind, per-channel toggles, honoured in `sendNotification` |
| **P1-6** | Groups have no content | `groups/service.ts:268` | Wire the composer to `groupId`, gate the group feed on membership, enforce `visibilityScope: "groups"` (closes P0-3b) |
| **P1-7** | Media is never deleted; no processing | `r2.ts:106` has 2 internal callers | Delete on post/comment delete, avatar/cover replace, and account cascade; nightly orphan GC comparing R2 keys to referenced keys; add resize + WebP + EXIF strip at upload |
| **P1-8** | Email failures are terminal — no retry | `email/service.ts:296-300` | Add `attempts`/`nextAttemptAt`, exponential backoff, an admin retry action, and a failure-rate alert |
| **P1-9** | Karma is never reversed | `posts.ts:527`; `deletePost`; `resolveCluster` | Compensating `karmaTransaction` on unreact, comment delete, post delete, and moderator removal |
| **P1-10** | Share has no dedupe, no rate limit, no notification, no unshare | `posts.ts:611` | Unique `(originalPostId, sharerId)` (or an explicit repost model), rate limit, notify, unshare |
| **P1-11** | Zero rate limits on social writes | grep of `enforceRateLimit` | Add to create post, comment, react, follow, share, poll vote, RSVP, group join, `/api/community` |
| **P1-12** | Reported DMs and profiles are unactionable (`"user"` vs `"profile"` mismatch) | `messaging/service.ts:425` vs `moderation/service.ts:37` | Normalise the entity vocabulary; add message + profile consequences (part of P0-5) |
| **P1-13** | Moderation console can't see the reported content | `admin/moderation/page.tsx:22-31` | Render an inline preview per entity type in the queue |
| **P1-14** | No unified support timeline; edits and privacy changes unaudited | `posts.ts:454` has no `audit()` | Audit every state change; build `/admin/users/[id]/timeline` merging `AuditLog` + `ModerationAction` + `MembershipEvent` + notifications |
| **P1-15** | `members:impersonate` and `members:hard_delete` are unimplemented permissions | `admin/permissions.ts:26,28` | Implement (impersonation with a loud banner, full audit, and a short TTL) or remove from the matrix |
| **P1-16** | No message idempotency; a double-tap sends twice | `messaging/service.ts` | Client-generated `clientMsgId`, unique per conversation |
| **P1-17** | No cross-system reconciliation for fire-and-forget side effects | `createPost` → mentions → hashtags, all outside the tx | Transactional outbox: write intents inside the tx, drain in a cron with retry |
| **P1-18** | Follow suggestions are arbitrary and `mutualCount` is always 0 | `connections/service.ts:120-125, 76` | Rank by mutuals + batch/house + recency; compute real mutual counts; add dismiss |
| **P1-19** | No member-initiated invites | admin-only invite routes | Member invite with attribution, quota, and a referral join flow |
| **P1-20** | Comments: no edit, no pagination past 100, no ranking, no block filter, no tombstone | `feed/query.ts:355-378` | Add all five; index `(postId, parentId, createdAt)` and `authorId` |

---

## P2 — Improve

1. **Product analytics.** Emit domain events to `ActivityEvent` (or a real analytics sink) for signup, login, onboarding step, post, comment, reaction, follow, message, RSVP, upgrade, churn. Define activation. Build a retention cohort view.
2. **Caching.** Reduce the 81 `force-dynamic` pages; cache the school-scoped feed page 1, directory facets, and marketing pages.
3. **Directory search performance.** `pg_trgm` GIN indexes; drop the per-page `count()` in favour of a cheap has-more probe.
4. **Feed query cost.** Cap the exclusion set well below 1000, or move seen-tracking to a Redis bitmap/bloom filter; add a partial index on `(schoolId, rankingScore) WHERE deleted_at IS NULL AND status='visible'`.
5. **`PostImpression` retention.** Nightly prune beyond N per user or older than 90 days.
6. **Index gaps.** `Comment(postId, parentId, createdAt)`, `Comment(authorId)`, `ContentReport(status, createdAt)`, `Message` including `deletedAt`.
7. **Error boundaries.** `error.tsx` per route group at minimum; today 111 pages share one.
8. **Accessibility.** Convert the 42 `<div onClick>` to buttons; add focus trap + restore + `aria-modal` to every overlay; Escape-to-close; audit `alt` coverage.
9. **Documentation.** Move `AUDIT_REPORT.md`, `ROADMAP.md`, `DATABASE_SCHEMA.md`, `API_SPECIFICATION.md`, `SERVICE_ARCHITECTURE.md`, `INTEGRATION_SPEC.md`, `USER_FLOWS.md`, `ADMIN_MODULE.md`, `CHANGELOG_AUDIT.md`, `ALUMNI_REPUTATION_SYSTEM.md` to `docs/archive/` with a header banner. Fix `CLAUDE.md` (Google OAuth, middleware, versions). Replace the boilerplate README.
10. **Feed ranking depth.** Author/topic diversity caps, engagement velocity, negative-signal feedback from `hidePost`, and a "Why am I seeing this?" affordance — which also forces the system to record provenance.

---

# PART V — QUESTIONS FOR PRODUCT

These materially change architecture. I have not guessed at any of them.

### Product strategy
**Q-1** Vyapaar has consumed 35 of the last 40 commits. Is the game the product, a retention hook, or a side project? The answer determines whether the P1 list above or the game roadmap gets the next quarter.
**Q-2** Is this a **directory** (find alumni, occasional posts) or a **feed product** (daily engagement)? Investment in ranking, notifications, and moderation only pays off for the second.

### Social graph
**Q-3** Do you want asymmetric **follow**, or symmetric **connections** with accept/reject (LinkedIn model)? The UI says "connections", the code implements follow, and `mutualCount` is stubbed. Everything downstream — privacy, messaging, suggestions, mutuals — depends on this.
**Q-4** Should **mute** and **restrict** exist alongside block? In a real alumni network where people cannot avoid each other, block is often too heavy.
**Q-5** Should blocking be **symmetric and total** (neither sees the other anywhere) or **one-way** (you stop seeing them; they can still see you)? This decides how much of P0-7 is needed.

### Privacy
**Q-6** Should a **`private` profile be absent from the directory entirely**, or listed as a name-only stub? Absent is what the settings copy promises.
**Q-7** Does "Followers only" mean followers **at post time** or **currently**? If someone unfollows, do they lose access to old posts? (The current code has no answer either way.)
**Q-8** Should logged-out visitors see **any** posts? Today `/feed/[postId]` is public for everyone. Is a public web presence a growth asset or a privacy problem for an alumni network?

### Feed
**Q-9** Should the default feed be **everything in the school** (today) or **followed people + discovery**? At 500 members "everything" works. At 5,000 it becomes noise, and the follow graph currently has no job.
**Q-10** Should "not interested" **down-rank the author**, or only hide that one post?

### Moderation & lifecycle
**Q-11** On account deletion, should content be **removed**, **anonymised** ("Former member"), or **retained**? This is the single biggest unanswered design question — it determines the whole cascade, and it interacts with the "real legal names enforced" rule in `DECISIONS.md`.
**Q-12** Should a member be **notified when their content is removed**, and should there be an **appeal**? Currently: no and no.
**Q-13** What is the **strike ladder**? (e.g. 1st = warn, 3rd = 7-day suspension, 5th = ban.) `ModerationAction` already records everything needed.
**Q-14** Who moderates? The committee is notified on new reports — is moderation a volunteer committee function or an owner function? That decides how much tooling P1-13/P1-14 justify.

### Notifications
**Q-15** Which of the nine missing notifications do you actually want? Shipping all of them will make the bell noisy for a 500-member network.
**Q-16** Should DMs count toward the bell? They are deliberately excluded today, which is defensible but undocumented.

### Messaging
**Q-17** Should **group DMs** exist? It's the most-requested feature in alumni networks and the current `dmKey` unique constraint blocks it.
**Q-18** Should strangers be able to send a **message request**? Today follow-in-either-direction is required with no request path.

### Growth
**Q-19** Should **members invite members**? Today only admins can. This is the largest untapped growth loop.
**Q-20** Should the school's roster be **pre-seeded** (imported unclaimed profiles people claim) rather than solved by organic signup? For a single-school alumni network this usually beats every discovery feature.

### Monetization
**Q-21** Should any of the P1 features be **tier-gated** (advanced search for Premium, group creation for Associate)? Membership tiers exist; almost nothing is gated by them today.

### Analytics
**Q-22** What is the **one activation metric**? "Completed onboarding + followed ≥3 + posted once in 14 days"? Without a definition, nothing in P2-1 can be built.

---

## Appendix — evidence index

| Finding | Primary evidence |
|---|---|
| Status unenforced | `modules/auth/session.ts:19` · `lib/gate.ts:37` · `lib/auth.ts:56` |
| Suspension expiry | `modules/admin/users.ts:156` · `vercel.json` |
| `getPostById` unscoped | `modules/feed/query.ts:306` |
| Profile timeline unscoped | `modules/feed/query.ts:106` |
| `groups` scope public | `modules/feed/query.ts:145` · `compose/actions.ts:51` · `PostComposer.tsx:84` |
| Engagement unchecked | `modules/feed/posts.ts:500,611,668,724` |
| Moderation post-only | `modules/moderation/service.ts:266,322` |
| `reportPenalty` | `modules/moderation/service.ts:105` |
| Block coverage | `modules/messaging/service.ts:416` · `modules/profile/privacy.ts` · `modules/directory/service.ts:44` |
| Directory privacy | `modules/directory/service.ts:44-52` |
| Search absent | `components/shared/PrivateNavbar.tsx:58-66` |
| Notification gaps | `modules/notifications/service.ts` · `groups/actions.ts:36` |
| Counter drift | `modules/notifications/service.ts:151,159,206` |
| Media never deleted | `lib/r2.ts:106` |
| Email no retry | `modules/email/service.ts:296` |
| Karma no reversal | `modules/feed/posts.ts:527` |
| Groups have no posts | `modules/groups/service.ts:268` |
| `ActivityEvent` unused | `modules/games/analytics.ts:29` (sole writer) |
| `UserSession` unused | `schema.prisma:243` |
| Unimplemented permissions | `modules/admin/permissions.ts:26,28` |
| Docs drift | `AUDIT_REPORT.md:10` · `ROADMAP.md` · `CLAUDE.md` |
