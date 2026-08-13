# The Parliament — 3-Token Economy (Karma · Eggs · Shell)

Status: **SPEC** (2026-08-13). Karma is live; Eggs + Shell are new.

Three tokens, three unrelated jobs — they do **not** convert into each other.

| | **⭐ Karma** | **🥚 Eggs** | **🐚 Shell** |
|---|---|---|---|
| Role | Reputation / merit | Social annoyance (hot-potato) | Commercial (paid perks) |
| Feel | "I earned respect" | "get it off me!" | "I paid, I save" |
| Buy with ₹? | Never | Never | Yes (Razorpay store) |
| Good to hold? | Yes — more = status | **No — most eggs loses** | Yes — spend to save |

---

## 1. ⭐ Karma — awards become a peer transfer

Karma stays exactly as built (`src/config/karma.ts`) with **one change**: post
awards now *transfer* karma instead of only burning it.

- Today: `givePostAward` calls `spendKarma` on the giver; the author gets
  **nothing** (`src/modules/feed/posts.ts:661`). Award = pure burn.
- New: giver pays the award cost (unchanged), **author receives the same amount
  → into spendable Balance + Lifetime only, NOT the 30-day earned pool.**
  - Why: earned-30d drives Poller/Mentor unlocks. If received award karma
    counted there, two friends could award each other into Mentor status =
    farm. Balance-only credit makes it farm-proof — you can gift a friend
    spendable karma, never buy them an unlock.
- Impl: add a `creditBalance`-style path in `modules/karma/ledger.ts` (credits
  balance + lifetime, skips earned-30d). `givePostAward` calls it for the author
  after `spendKarma` on the giver, in one transaction.

## 2. 🥚 Eggs — the hot-potato

**Not a reward — a liability.** You want *fewer* eggs.

- **Signup:** every user starts with **20 eggs** (one-time).
- **Throw (transfer):** A throws at B → **A −1, B +1.** You must have ≥1 egg to
  throw. Total eggs on the platform stay constant (20 × users). Throwing to **0
  = safe** (no eggs, can't be "most").
- **The bus:** at each **monthly** close, the user(s) holding the **most eggs**
  are flagged to **volunteer for 1 event**. Then **all balances reset to 20**
  for a fresh round.
- Net effect: active people offload fast; eggs pile on the passive/lurkers — so
  the punishment naturally lands on whoever engaged least. On-theme (the prize
  *is* engagement).

**Anti-grief defaults** (veto any):
- Max **10 throws/day** per user.
- No repeat-target within **1 hour** (can't spam one person).
- Throw at **any alumnus** (annoyance is the point) — but only accounts **≥7
  days old** can be targeted (Sybil guard, matches karma giver-trust rule).
- **Ties** at max eggs → **all** tied holders get flagged. No tiebreak.
- A "you got egged" notification per throw (rate-batched so it's not a flood).

**Where the punishment is enforced:** code can only *flag + notify + badge* the
top holder(s) and surface them on an admin/leaderboard view. Actually assigning
them to an event is a human/admin step — no hard enforcement is possible.

## 3. 🐚 Shell — commercial currency

- **Earn:** buy a membership → **shells = price ÷ 100** (₹999 → 10, ₹499 → 5,
  rounded). One grant per purchase.
- **Redemption:** **1 shell = ₹1** off at checkout. You may pay with up to **1/10
  of your shell balance** per purchase (drip cap). Usable toward **event
  tickets** and **membership renewal**.
- **Streak rescue:** **2 shells** to restore a broken Alfazy streak.
- **Buy with cash:** Razorpay-backed **Shell store** — **₹1/shell base + bulk
  bonus:**

  | Pay | Base | Bonus | Total | Effective ₹/shell |
  |---|---|---|---|---|
  | ₹100 | 100 | — | 100 | 1.00 |
  | ₹250 | 250 | +15 | 265 | 0.94 |
  | ₹500 | 500 | +50 | 550 | 0.91 |
  | ₹1000 | 1000 | +150 | 1150 | 0.87 |
  | ₹2000 | 2000 | +400 | 2400 | 0.83 |

  Store ₹1 = redemption ₹1, so a mild buy-to-discount arbitrage exists — but the
  10%-of-balance-per-purchase cap throttles it to an impractical drip. Bulk bonus
  is the real buy incentive. Safe to ship.

## 4. Build plan (lean — reuse karma infra)

**Schema** (`User`): `eggBalance Int @default(20)`, `shellBalance Int
@default(0)`. Two ledger tables reusing the karma-ledger shape:
- `EggEvent` (fromUserId, toUserId, createdAt) — throws; balances derived/cached
  on `User`.
- `ShellLedger` (userId, delta, reason, refId, createdAt) — grants, spends, buys.
Do **not** touch the karma ledger.

**Phases**
1. **Karma award transfer** — smallest, highest-value, no schema churn beyond the
   ledger credit path. Ship first. Tests: giver debited, author credited to
   balance-only, earned-30d untouched, self-award blocked, insufficient-karma
   blocked.
2. **Eggs core** — schema + `throwEgg` (transfer, caps, Sybil/age guard) + signup
   grant of 20 + monthly resolve job (flag top holders, reset to 20) +
   navbar/leaderboard surface. Tests: transfer math, ≥1-egg guard, daily/repeat
   caps, tie flagging, reset.
3. **Shell earn + spend** — membership grant (price/10), 10%-of-balance spend cap
   at event/renewal checkout, streak restore. Tests: grant rounding, cap math,
   insufficient balance, streak-restore debit.
4. **Shell store** — Razorpay pack purchase (reuse existing Razorpay integration)
   + `/rewards` surface (admin stub exists). Tests: paise math, webhook credit.

Migrations: schema deltas handed to you as raw SQL to run on Supabase (per your
no-DB-access rule). Monthly egg resolve = Vercel Cron or GitHub Action (per the
Hobby-cron limit — no sub-daily cron in vercel.json).

## 5. Resolved
- Shell earn = price ÷ 100; redeem 1 shell = ₹1 (≤10% balance/purchase); streak
  restore 2 shells; store ₹1/shell + bulk bonus ladder.
- Eggs stay **uncoupled from membership** — no reset advantage for payers.
