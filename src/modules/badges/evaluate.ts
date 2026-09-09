import type { BadgeCriteria } from "@/config/badges";

/**
 * Pure badge matcher — decides unlock + progress from a measured metric value.
 * DB-free so it unit-tests in isolation (mirrors the karma pure-guard style).
 *
 * The metric's *window* (rolling_365d, ist_time_window, …) and any `unique`
 * de-duplication are applied by the metric query in `metrics.ts` before this;
 * here we only compare the resulting number to the target and gate on account age.
 */
export interface MatchResult {
  unlocked: boolean;
  /** Capped-at-target progress for the progress bar (e.g. 7 of 10). */
  progress: number;
}

export function meetsCriteria(
  c: BadgeCriteria,
  value: number,
  accountAgeDays: number,
): MatchResult {
  const progress = Math.max(0, Math.min(value, c.target));

  // Account-age gate: too new → never unlocked, but still show progress.
  if (c.minAccountAgeDays != null && accountAgeDays < c.minAccountAgeDays) {
    return { unlocked: false, progress };
  }

  let unlocked: boolean;
  switch (c.op) {
    case ">=":
      unlocked = value >= c.target;
      break;
    case ">":
      unlocked = value > c.target;
      break;
    case "==":
      unlocked = value === c.target;
      break;
    default:
      unlocked = false;
  }
  return { unlocked, progress };
}

/**
 * Current consecutive-day streak from a set of active day-numbers (days since
 * epoch). Counts the run ending at `today` OR `yesterday` (an in-progress day
 * that isn't active yet doesn't break the streak). Pure.
 */
export function currentStreak(activeDays: number[], today: number): number {
  const set = new Set(activeDays);
  let cur = set.has(today) ? today : set.has(today - 1) ? today - 1 : null;
  if (cur === null) return 0;
  let streak = 0;
  while (set.has(cur)) {
    streak++;
    cur--;
  }
  return streak;
}
