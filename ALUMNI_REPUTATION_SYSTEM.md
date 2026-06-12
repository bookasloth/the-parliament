# Karma System

> **Supersedes** the earlier heavy 6-level "Alumni Reputation System (ARS)." Per `DECISIONS.md`, the platform launches with this **simple, behavioral Karma model**. The append-only **karma ledger** is retained so a richer model can be layered later without a rewrite. Moderation penalties (hide/warn/suspend/ban) are handled by the **moderation system**, not by karma.

## Philosophy

- **Trust before reach.** New users can read, post, and comment, but higher-leverage abilities unlock with demonstrated, recent contribution.
- **Reward contribution, starve spam.** Genuine engagement earns karma for both the actor and the content owner; farming, collusion, and automation earn nothing.
- **Recent activity is what counts.** Feature access is driven by the **last 30 days** of karma, so standing reflects current participation, not a one-time burst years ago.
- **Every change is auditable.** No karma moves without a ledger entry.

---

## 1. Karma Measures (single pool, three views)

Per `DECISIONS.md`, karma is a **single pool** you both **earn and spend** — there is no separate "points" currency. To keep spending from stripping abilities, the one pool is read three ways:

| View | Definition | Floor | Used for |
|------|-----------|-------|----------|
| **Karma Balance** | Running sum of **all** ledger entries, **including redemptions** (spending). This is the single karma number the user sees and spends. | **Never below 0** (clamped). | The spendable balance — redeem for perks/badges/discounts (§14). |
| **Earned Karma (30d)** | Sum of ledger entries in the **rolling last 30 days**, **excluding redemption entries**. | `max(0, sum)`. | **Feature unlocks** (§2). Decays with inactivity. **Not reduced by spending** (decision K1). |
| **Lifetime Earned** | Cumulative sum of all **positive earn** entries ever (excludes redemptions and penalties). Never decreases. | ≥ 0. | **House & individual leaderboards** (§15), milestone badges. |

> **K1 (LOCKED):** spending karma reduces **Balance** but **not** Earned-30d — redeeming perks never revokes a feature unlock.
>
> The 30-day window **is** the decay mechanism for unlocks — no separate decay job needed.

---

## 2. Feature Unlocks

Thresholds are checked against **Earned Karma (30d)**.

| Earned Karma (30d) | Unlocks |
|--------------------|---------|
| — (verified) | **Read** all content |
| — (verified) | **Comment** on posts/comments |
| — (verified) | **Create posts** |
| **100** | **Create polls** |
| **250** | **Create a group** |
| **500** | **Mentor badge** (offer mentorship) |

> **Reconciliation note:** the original PRD gated Comment at 25 and Post at 50. Per `DECISIONS.md`, **verification is the trust gate for posting and commenting**, so those two are open to all verified members; karma gates only the higher-risk abilities (polls, groups, mentorship). Verification badges (Verified Alumni, Teacher, Mentor, Trustee, Admin) are separate from karma.
>
> **Hysteresis (locked — Q4):** unlocks ride on a decaying 30-day number, so a grace band prevents flapping. **Unlock at the threshold, keep unlocked down to 80% of it, revoke below 80%, grace period 0 days.** Assets already created are **never auto-deleted**.
>
> | Ability | Unlock at | Keep until | Revoke below |
> |---------|----------:|-----------:|-------------:|
> | Polls | 100 | 80 | 80 |
> | Create Group | 250 | 200 | 200 |
> | Mentor Badge | 500 | 400 | 400 |

---

## 3. Karma Earning Rules (core actions)

Each qualifying action credits **both** the actor and the content's publisher. Values are in karma points (fractional allowed).

| Action | Actor Δ | Publisher Δ |
|--------|--------:|------------:|
| **Like** a post or comment | **+1** | **+1** |
| **Comment** on a post or comment | **+1.5** | **+2** |
| **Share** a post outside the network | **+2** | **+3** |
| **Downvote** a post | **0** | **−2** |
| **Downvote** a comment | **0** | **−1** |

> **Downvotes never change the voter's karma (positive or negative).** Moderation-style actions must not be a karma-farming mechanic in either direction. The voter gets **0**; only the publisher is affected.
>
> **Downvote eligibility (Q1, resolved):** a user may downvote only if **account age ≥ 7 days AND Earned Karma (30d) ≥ 25**. Below either bar the downvote button is unavailable. This blocks fresh throwaway accounts from carpet-bombing reputations. *(A weight-scaling alternative — full weight at 100+, half below — was considered and dropped in favor of this simpler hard gate.)*

---

## 4. Quality Bonuses (to the publisher, except where noted)

| Trigger | Bonus |
|---------|-------|
| A **comment** receives **3 likes** | Publisher **+2** |
| A **post** receives **5 likes** | Publisher **+3** |
| A **shared post brings 1 new signup** (referral attributed via the share link) | Publisher **+5**, Sharer **+3** |

> Each bonus fires **once** per entity per threshold (the 3-like comment bonus does not re-fire at 6 likes). Signup-referral bonus fires once per attributed new account.

---

## 5. Daily Diminishing Returns (anti-farming — limits the ACTOR only)

These caps reduce what the **actor** earns once they're clearly farming. The **publisher's** reward is unaffected (you can't lower someone else's standing by spamming likes at them).

| Condition (per actor, per rolling day) | Effect on actor |
|----------------------------------------|-----------------|
| More than **30 likes/day** | Further likes give the liker **0** (publisher still **+1**). |
| More than **20 comments/day** | Further comments give the commenter **+0.5** instead of **+1.5** (publisher still **+2**). |
| More than **10 shares/day** | Further shares give the sharer **0** (publisher still **+3**). |

---

## 6. Anti-Collusion / Targeted-Interaction Rules

These stop two (or a ring of) accounts from inflating each other.

| Condition | Effect |
|-----------|--------|
| **A likes B more than 5 times in 24h** | Further A→B likes in that window give **0 karma to the liker (A)**. The **publisher (B) still receives +1** — a genuinely popular user is never punished because someone spam-likes them. |
| **A makes 5+ comments on the same publisher's content within 30 minutes** | Karma for those comments is **reduced by 50% for both the commenter and the publisher** — stops two friends from farming publisher karma via comment volume. |
| **Two users downvote each other repeatedly** | Downvotes **still apply to the publisher** (the target still loses −2/−1), and the **voter already earns 0** (see §3). Repeated targeted downvotes are bounded by the −10 daily floor (§7) and **flagged to moderation**. |

### Publisher Daily Cap (per actor → publisher)

> **A single user can contribute at most +20 karma per day to any one other user's account.** Once A has given B +20 today (across likes, comments, shares, bonuses), further A→B interactions **still function normally** (the like/comment is recorded) but award **0 karma to B from A**. This is the key defense against a small ring farming one favored account, and complements the actor-side caps in §5. *(Cap is on positive publisher karma; downvote penalties are governed by §6 + §7.)*

---

## 7. Daily Negative Floor (protection)

The −10 floor is a **global protection layer with no exceptions**, stated as three clean rules:

1. **The −10 daily floor applies only to negative events.** Once a user's daily net reaches −10, further **negative** karma is **not applied** for the rest of that IST day.
2. **Positive karma always continues to accrue** — base rewards and bonuses alike. A user at −10 can immediately earn their way back up the same day.
3. **The +20 publisher daily cap (§6) applies to all positive karma sources** (likes, comments, shares, bonuses) — there is no bonus-specific exemption anywhere.

> No special cases: positives are governed only by the +20 publisher cap and the §5 actor caps; negatives are governed only by the −10 floor. This avoids edge cases like using bonus events to escape a negative day through fake activity (bonuses still obey the +20 cap and only fire on genuine, non-collusive engagement).

---

## 8. Actions That Give ZERO Karma (explicit — so nothing is ambiguous later)

- Viewing, scrolling, refreshing, or lurking.
- Liking your **own** content.
- Editing a comment **only to change formatting**.
- Any action triggered by **automation or scripts** (bot/automation detection → 0).
- (Implied) commenting on / sharing your **own** content for self-promotion is non-earning.

---

## 9. Ledger & Integrity

- **Every** karma change writes an append-only **karma ledger** entry. Total Karma is the running sum; Earned Karma (30d) is the sum filtered to the last 30 days.
- A single user-action that affects two people (e.g. a like) writes **two ledger entries** — one per affected user — so each user's karma is a clean sum of their own rows.
- **Total Karma is clamped at 0** on read/display; the ledger itself records true deltas (so audit/reconstruction stays exact). The daily −10 floor (§7) is applied at write time.
- Caps and anti-collusion checks (§5–§7) are evaluated **before** writing, using the actor's recent ledger history (daily counts, A→B pair counts). The **applied** value and the **base** value are both stored, with a reason code, so any reduction is explainable.
- No karma is awarded for unverified or automation-flagged actors.

### Ledger entry (conceptual)

```
karma_transactions:
  id, user_id (the affected user),
  counterparty_id (the other party in the interaction, nullable),
  action_type ('like' | 'comment' | 'share' | 'downvote_post' | 'downvote_comment'
               | 'bonus_comment_3likes' | 'bonus_post_5likes' | 'bonus_referral_signup'
               | 'admin_adjustment'),
  role ('actor' | 'publisher'),
  base_value     NUMERIC(8,2),   -- nominal value before caps
  applied_value  NUMERIC(8,2),   -- value actually applied after caps/collusion/floor
  reason_code    VARCHAR,        -- e.g. 'daily_like_cap', 'daily_comment_cap', 'daily_share_cap',
                                 --       'collusion_pair_like', 'collusion_comment_burst',
                                 --       'publisher_daily_cap', 'daily_neg_floor', 'downvote_gate'
  entity_type, entity_id,        -- the post/comment/share involved
  created_at
```

> **Schema impact (feeds #2):** karma is **fractional** → store as `NUMERIC(8,2)`, not `INT`. Each user needs `total_karma` (clamped ≥ 0) plus a computed/cached `earned_karma_30d`. Daily counters and A→B pair counters are derivable from the ledger (or cached in a small counters table for speed).

---

## 10. Worked Examples

1. **Genuine engagement.** Asha likes Ravi's post (Asha +1, Ravi +1), comments on it (Asha +1.5, Ravi +2). Ravi's post hits 5 likes → Ravi +3 bonus. Net: Asha +2.5, Ravi +6.
2. **Like farming.** Vikram likes 40 posts today. Likes 1–30 give him +1 each; likes 31–40 give him **0** (but each publisher still gets +1).
3. **Two-account collusion.** Account A likes Account B's content 8 times in an hour. Likes 1–5: normal (+1 each, both). Likes 6–8: **0 to both**.
4. **Pile-on.** A coordinated group downvotes Meera's posts; her daily net hits −10. Further downvotes still **show**, but no additional negative karma is applied to her that day.
5. **Referral.** Sana shares a post externally (Sana +2, publisher +3); it brings one new signup → publisher **+5**, Sana **+3**.

---

## 13. Activity Karma (non-content earning, with anti-farming caps)

Beyond the content actions in §3, these platform activities earn karma. All values are **admin-configurable**; defaults below. Every one has a cap so it can't be farmed.

| Activity | Default | Cap / dedup |
|----------|--------:|-------------|
| Daily login | **+1** | Once per IST day; no streak stacking at MVP. |
| Profile field completed | **+2** | One-time **per field**, first time only (photo, bio, house, batch, passing year, city, profession). |
| Profile 100% complete | **+10** | One-time, lifetime. |
| Add a business listing | **+15** | One-time per **approved** listing (admin-verified); reversed if listing removed. |
| Business receives a review | **+2** | Per unique reviewer; max 10/business/day. |
| RSVP + **attend** an event | **+10** | Once per event (dedup on event_id); requires check-in. |
| **Host** an event (completed) | **+30** | Once per event. |
| Event feedback submitted | **+2** | Once per attended event. |
| Referral → verified signup | **+25** | Once per attributed new verified account (distinct from the §4 share-referral bonus). |
| Donation made | **+5 per ₹500**, max **+50/donation** | Per completed Razorpay payment; reversed on refund. |
| Accepted connection | **+1** | Per new accepted connection; **max 10/day** to discourage mass-adding. Not awarded for auto-accepted spam. |
| Join an interest group | **+1** | One-time per group; permanent (auto) groups give 0. |
| Single-player game level | **admin-configured** | Per `games.config.karma_per_level`, with **retry limit** + **per-game daily karma cap**. |
| Multiplayer win / participation | **admin-configured** | Winner reward vs consolation; capped per game/day. |
| Tournament placement | **admin-configured** | Per `tournaments.prize_karma` / final rank. |

> ⚠️ Games are the **most farmable** karma source. All game karma is admin-configured and **hard-capped per game per IST day**; retry limits prevent replay grinding. Treat game-karma values conservatively relative to content karma.

> These credit the actor only (no publisher side). They flow into Balance, Earned-30d, and Lifetime Earned like any earn, and obey the −10 floor / +20 publisher cap rules only where a counterparty exists (most activity karma has none). Automation/script-triggered activity earns 0 (§8).

---

## 14. Redemption (spending karma)

Karma Balance (§1) is spendable on a configurable reward catalogue.

- **Reward catalogue** (admin-managed): perks, badges, discounts, alumni-business offers, event access, etc. Each item has a karma `cost`, optional stock, and eligibility.
- **Redeeming** writes a ledger entry of type `redemption` with a **negative** `applied_value`, reducing **Balance** (clamped ≥ 0). It does **not** touch Earned-30d (unlocks) or Lifetime Earned (leaderboards) — see K1.
- A redemption produces a **fulfilment record** (voucher code / badge grant / discount token) tracked to delivered/expired.
- Insufficient balance → rejected before any ledger write.

---

## 15. House Leaderboards & Admin Karma

- **Leaderboards** rank by **Lifetime Earned** (so spending never drops you):
  - **Individual** — top earners overall and **per house** (e.g. "Red House Top 5").
  - **House totals** — sum of members' Lifetime Earned per house, for house-pride competition.
  - Optional **30-day** leaderboard view for "most active recently."
- **Admin manual karma** (from the checklist): an admin may **grant or revoke** karma via an `admin_adjustment` ledger entry (positive or negative), always with a reason, fully audited. This is the **only** admin path that changes karma.
- **Moderation stays separate (Q3):** hide/remove/suspend/ban/restrict never auto-change karma. If an admin judges that abuse warrants a karma penalty, they do it **explicitly** via `admin_adjustment` — it is a deliberate, logged act, not a side effect of moderation.

---

## 11. Resolved Interpretations (locked)

- **I1 — Targeted likes:** A→B likes beyond 5 in 24h give **0 to the liker A only**; publisher B still **+1**. (Popular users are never punished for others' spam-liking.)
- **I2 — Repeated comments:** **5+ comments by the same user on the same publisher within 30 minutes** → karma **−50% for both** commenter and publisher.
- **I3 — Downvotes:** voter always **0**; publisher loses **−2 (post) / −1 (comment)**; repeated targeted downvotes bounded by the −10 floor and flagged to moderation.
- **I4 — Comment daily cap:** beyond 20 comments/day the commenter drops **+1.5 → +0.5**; publisher stays **+2**.
- **I5 — Time basis:** **Asia/Kolkata (IST)** everywhere. Daily windows are IST calendar days; only the §6 like/comment collusion windows use explicit rolling durations (24h / 30 min).
- **I6 — Unlock revocation:** unlocks revocable as Earned-30d decays — **keep to 80% of threshold, revoke below 80%, 0-day grace**; **assets already created are never auto-deleted** (see §2 table).
- **I7 — Negative floor:** the −10 cap applies **only to negative events**; positive karma (base + bonus) always accrues (see §7).
- **Publisher Daily Cap:** max **+20 karma/day from any one user to any one other user**, across **all positive sources including bonuses** (see §6).
- **Q1 — Downvote gate:** requires **account age ≥ 7 days AND Earned-30d ≥ 25** (see §3).
- **Q2 — Bonuses:** count toward the **+20** publisher cap like any other positive karma; the **−10 floor is negative-only**, so no bonus exemption is needed (see §7).
- **Q3 — Moderation:** **never modifies karma.** Moderation tools are: hide content, remove content, suspend account, ban account, restrict features. Reputation and moderation stay fully separate. *(The `admin_adjustment` ledger type is reserved for genuine data corrections only, not moderation.)*
- **Q4 — Hysteresis:** unlock at threshold, keep to 80%, revoke below 80%, **0-day grace** (see §2 table).

---

## 12. Status

All interpretation points (I1–I7) and design questions (Q1–Q4) are **resolved and locked** (§11). This spec is frozen for MVP. Schema implications (NUMERIC karma, ledger table, daily/pair counters) carry into `CORE_PLATFORM_SCHEMA.md`.
