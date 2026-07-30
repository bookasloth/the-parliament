# Feed Comments — Social Upgrade Plan

Goal: LinkedIn/Facebook-level comment **capability**, but The Parliament's **own
identity** — upvote/downvote (not emoji reactions), karma-wired, transparent.

Base branch: `feat/feed-revamp` (has 1-level threaded replies + reply box).
New branch: `feat/comments-social`.

---

## Capabilities we're adding

| # | Feature | We add |
|---|---|---|
| 1 | Per-comment reaction | **Upvote + Downvote** (same as posts). No emoji, no awards. |
| 2 | Action row | **Upvote · Downvote · Reply** under each bubble |
| 3 | Threaded replies | already exists — polish (collapse/expand) |
| 4 | "Author" badge on OP replies | derive `authorId === post.authorId` |
| 5 | @mention link in reply | prefill `@name`, reuse FeedCard mention renderer |
| 6 | Sort | **Top / Newest** toggle (client sort, v1) |
| 7 | "View more comments" | collapse long reply chains ("View N replies") |
| 8 | Emoji composer | native emoji. No GIF/Giphy. |
| 9 | **@mention autocomplete** | ranked suggestion list (see below) |

## @mention autocomplete — ranking (feature 9)

When the user types `@…` in a comment/reply box, pop a list (≥4 rows) ranked:

1. **People this user tags most** → proxied by **who they follow** (`Follow` graph).
   `// ponytail:` no @-mention history is stored today, so follow-graph is the honest
   proxy — swap to a real tag-frequency tally once mentions are tracked on write.
2. **Popular on the platform** → highest **follower count** (`_count.followers`).
3. **Alphabetical** → remaining name matches, A–Z.

Dedup by id, exclude self, cap 8, always show ≥4 (empty query fills from tier 2).
Backed by `searchMentionTargets(viewerId, query)` server action.

## Still different from LinkedIn/FB (identity kept)

1. **Our verb** — Upvote/Downvote (same as posts), no corporate Clap/Insightful.
2. **Membership + verification on every comment** — tier avatar ring, member asterisk,
   verified ShieldCheck (same tokens as `FeedCard`). LinkedIn shows a flat gray badge.
3. **"Author" badge** in brand-blue chip, not LinkedIn gray.
4. **Transparent sort** — "Top / Newest", no black-box "Most relevant".
5. **Karma-wired** — comment upvotes/downvotes award karma (actor + publisher) like posts.
6. **Transparent, tiered @mention** — follow-graph → popular → alphabetical, not an opaque
   relevance blob.

---

## Implementation phases

### P1 — Backend (reuse, no new model, no migration)
- `src/modules/feed/comments.ts` (new):
  - `toggleCommentReaction({userId, commentId, type})` — mirror `toggleReaction`,
    `entityType="comment"`, updates `Comment.likeCount` (and a downvote counter — reuse
    `likeCount` net, or add nothing and store net; see note), awards karma.
  - `searchMentionTargets(viewerId, query, limit=8)` — 3-tier ranked user search.
- `query.ts`: extend `commentSelect` with `likeCount` + viewer's comment reaction
  (`likedByMe`/`type`); thread `viewerId` through `listPostComments`.
- Karma: reuse `awardKarma` with existing `post_like_*` action types, `entityType="comment"`.

> Downvote note: `Comment` has only `likeCount`. Store **net score** in `likeCount`
> (upvote +1 / downvote −1) — one column, matches how the row already denormalizes.
> `// ponytail:` split into up/down columns only if we later need both counts shown.

### P2 — Server actions (`actions.ts`)
- `reactToComment(commentId, type: "upvote" | "downvote")` → `toggleCommentReaction`.
- `searchMentionsAction(query)` → `searchMentionTargets`.
- `revalidatePath` the post detail route.

### P3 — Component (`comments-section.tsx`)
- `CommentActions` row: **▲ score ▼ · Reply**, optimistic toggle (mirror post reaction bar).
- "Author" chip when `comment.authorId === postAuthorId` (new `postAuthorId` prop).
- Reply prefills `@displayName `; `@mentions` render as links (reuse FeedCard `renderRichText`).
- **Mention autocomplete**: detect `@token` at caret → call `searchMentionsAction`
  (debounced) → dropdown → click inserts `@username `.
- Collapse replies > 2 behind "View N replies".
- Sort dropdown **Top / Newest** (in-memory).
- Composer: native emoji button. No GIF.
- Membership ring + asterisk on avatars (tier added to `CommentView.author`).

### P4 — Verify
- Dev server + post detail: comment, reply, upvote/downvote, @mention pick, sort. Screenshot.
- Confirm karma rows + net score persist on reload.

---

## Deliberate cuts (ponytail)
- **@mention "most tagged"** proxied by follow-graph — no tag history exists yet. Upgrade
  to real tally when mentions are tracked on write.
- **Sort + mention search client-triggered**, fine ≤100 loaded comments. Server sort +
  pagination when a thread exceeds the load cap.
- **1 level of nesting** — matches schema; LinkedIn/FB are effectively 1-level too.
- **Net score in one column** — split up/down columns only if both counts must show.
