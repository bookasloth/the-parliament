# Vyapaar — Balance Report v1 (M5b)

**Date:** 2026-08-25 · **Harness:** `scripts/vyapaar-balance.ts` (`npx tsx scripts/vyapaar-balance.ts [N]`).
Deterministic (seed = game index), DB-free. 2000 games, 4 players, opening 25,000, 2 greedy + 2
thrifty bots.

## Change shipped
**`MAX_ROUNDS` 12 → 24** — hits the ~1-hour game-length target and improves economic depth.

| Metric | MAX_ROUNDS=12 | **MAX_ROUNDS=24** |
|---|---|---|
| Game length (median turns) | 48 (~28 min @35s) | **96 (~56 min @35s)** ✅ |
| Greedy win-rate (2 seats) | 10% | **31%** |
| Thrifty win-rate (2 seats) | 90% | 69% |
| Winner wealth (median) | 1.02× opening | **1.40×** |
| Ends by round cap | 100% | 99.4% |
| Someone hits 0 cash | 95% | 99.6% |
| First zone set (median round) | 7 | 9 |

Longer games let development pay off — aggressive play goes from non-viable (10%) to competitive
(31%), and winners actually grow their stack (1.02× → 1.40×). Length lands on target regardless of
bot quality (rounds don't depend on strategy).

## Open issues — NOT tuned yet (need better bots + real-pace data)
1. **Strategy still favours thrifty (69% vs 31%).** Aggressive buying/building is now viable but
   not equal. Likely partly a **bot-quality artifact** — the greedy bot develops into bankruptcy
   (see broke rate). Needs a smarter greedy that keeps a cash buffer before we tune rents/costs.
2. **Very high broke rate (99.6% of games someone hits 0).** The economy is punishing *for these
   bots*; a human keeps a reserve. Don't tune salary/rent/upgrade-cost off bot bankruptcies —
   refine the bots first.
3. **Seat/turn-order skew (s1 ~63%).** Suspicious concentration in one seat suggests a real
   first-mover effect or a degenerate deterministic-bot pattern. Investigate with varied bots.
4. **Length vs real pace.** 35s/turn is an assumption; the smoke-test's actual per-turn pace should
   replace it, then re-confirm MAX_ROUNDS. Humans act faster than 35s → real games run shorter, so
   24 may need to go higher for a hard 1-hour floor.

## Recommended next passes
- Refine bot policies (buffer-aware greedy, a balanced 3rd strategy) → trust the strategy/seat
  numbers → then tune the **economy** (rents, salary, upgrade cost, GST) toward: neither strategy
  >60%, each seat 20–30%, broke rate well under 50%.
- Feed **real playtest pace** into the length target and re-confirm `MAX_ROUNDS`.
- Re-run the harness after each tune; keep this report's table updated.

## Not in scope
Economy re-tuning (pending the above), leaderboard, bots-as-opponents (M6 reuses these policies).
