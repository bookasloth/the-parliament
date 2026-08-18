/**
 * Game period math — pure, DB-free, UTC-based. Shared by every game.
 *
 * Leaderboards are SUM(score) over a date window. A `period` + an `anchor`
 * (a label placing the window in history) resolve to a half-open [start, end)
 * range fed to the query. Weeks are Monday–Sunday (ISO).
 *
 * Each game numbers its puzzles from its OWN launch day, so every epoch-sensitive
 * function takes a `launch: Date` (the game's puzzle-#1 UTC midnight, from
 * `launchDate(key)` in the registry). Pure calendar math (week/month boundaries,
 * anchor labels) is game-agnostic and takes no launch.
 *
 * All dates treated as UTC calendar dates to avoid timezone drift.
 */

export type Period = "daily" | "weekly" | "monthly" | "yearly" | "all";

export const PERIODS: Period[] = ["daily", "weekly", "monthly", "yearly", "all"];

const DAY_MS = 86_400_000;
/** Far-future sentinel for the open end of the "all" window. */
const FOREVER = new Date(Date.UTC(9999, 0, 1));

/** Whole days from a game's launch to `date` (UTC, floored). Puzzle #1 = day 0. */
export function daysSinceLaunch(date: Date, launch: Date): number {
  const a = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const b = Date.UTC(launch.getUTCFullYear(), launch.getUTCMonth(), launch.getUTCDate());
  return Math.floor((a - b) / DAY_MS);
}

/** 1-based puzzle number for a date (launch day → #1). */
export function puzzleNumber(date: Date, launch: Date): number {
  return daysSinceLaunch(date, launch) + 1;
}

/** UTC midnight of the given date. */
function utcMidnight(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

/** Monday (00:00 UTC) of the ISO week containing `date`. */
export function mondayOf(date: Date): Date {
  const d = utcMidnight(date);
  const dow = (d.getUTCDay() + 6) % 7; // Mon=0 … Sun=6
  return new Date(d.getTime() - dow * DAY_MS);
}

/** ISO week-year + week number ({ year: 2026, week: 23 }). */
export function isoWeek(date: Date): { year: number; week: number } {
  const thursday = new Date(mondayOf(date).getTime() + 3 * DAY_MS);
  const year = thursday.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const firstThursday = new Date(mondayOf(jan1).getTime() + 3 * DAY_MS);
  const week = 1 + Math.round((thursday.getTime() - firstThursday.getTime()) / (7 * DAY_MS));
  return { year, week };
}

/** Monday of a given ISO year+week. Inverse of isoWeek(). */
export function mondayOfIsoWeek(year: number, week: number): Date {
  const jan4 = new Date(Date.UTC(year, 0, 4)); // Jan 4 is always in ISO week 1
  const week1Monday = mondayOf(jan4);
  return new Date(week1Monday.getTime() + (week - 1) * 7 * DAY_MS);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

/** Canonical anchor label for the period window containing `date`. Game-agnostic. */
export function anchorFor(period: Period, date: Date): string {
  const y = date.getUTCFullYear();
  switch (period) {
    case "daily":
      return `${y}-${pad2(date.getUTCMonth() + 1)}-${pad2(date.getUTCDate())}`;
    case "weekly": {
      const { year, week } = isoWeek(date);
      return `${year}-W${pad2(week)}`;
    }
    case "monthly":
      return `${y}-${pad2(date.getUTCMonth() + 1)}`;
    case "yearly":
      return String(y);
    case "all":
      return "all";
  }
}

/** A representative date inside the window named by (period, anchor). Throws on bad label. */
export function dateForAnchor(period: Period, anchor: string, launch: Date): Date {
  switch (period) {
    case "daily": {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(anchor);
      if (!m) throw new Error(`bad daily anchor: ${anchor}`);
      return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    }
    case "weekly": {
      const m = /^(\d{4})-W(\d{2})$/.exec(anchor);
      if (!m) throw new Error(`bad weekly anchor: ${anchor}`);
      return mondayOfIsoWeek(+m[1], +m[2]);
    }
    case "monthly": {
      const m = /^(\d{4})-(\d{2})$/.exec(anchor);
      if (!m) throw new Error(`bad monthly anchor: ${anchor}`);
      return new Date(Date.UTC(+m[1], +m[2] - 1, 1));
    }
    case "yearly": {
      const m = /^(\d{4})$/.exec(anchor);
      if (!m) throw new Error(`bad yearly anchor: ${anchor}`);
      return new Date(Date.UTC(+m[1], 0, 1));
    }
    case "all":
      return launch;
  }
}

export interface Window {
  start: Date; // inclusive
  end: Date; // exclusive
}

/** Half-open [start, end) window for the period containing `date`. */
export function windowForDate(period: Period, date: Date, launch: Date): Window {
  switch (period) {
    case "daily": {
      const start = utcMidnight(date);
      return { start, end: new Date(start.getTime() + DAY_MS) };
    }
    case "weekly": {
      const start = mondayOf(date);
      return { start, end: new Date(start.getTime() + 7 * DAY_MS) };
    }
    case "monthly": {
      const start = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
      const end = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
      return { start, end };
    }
    case "yearly": {
      const start = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
      const end = new Date(Date.UTC(date.getUTCFullYear() + 1, 0, 1));
      return { start, end };
    }
    case "all":
      return { start: launch, end: FOREVER };
  }
}

/** Window from a (period, anchor) label. */
export function windowFor(period: Period, anchor: string, launch: Date): Window {
  return windowForDate(period, dateForAnchor(period, anchor, launch), launch);
}

/** The anchor of the period immediately before the one named by (period, anchor). */
export function priorAnchor(period: Period, anchor: string, launch: Date): string | null {
  if (period === "all") return null;
  const { start } = windowFor(period, anchor, launch);
  const before = new Date(start.getTime() - 1); // last ms of the previous window
  if (before < launch) return null;
  return anchorFor(period, before);
}

/**
 * The just-closed anchor for each period as of `now` (used by the cron to freeze
 * champions). Returns null when nothing of that period has closed yet.
 * - daily closes yesterday; weekly closes last week; etc.
 */
export function justClosedAnchor(period: Period, now: Date, launch: Date): string | null {
  if (period === "all") return null;
  const prev = (() => {
    switch (period) {
      case "daily":
        return new Date(utcMidnight(now).getTime() - DAY_MS);
      case "weekly":
        return new Date(mondayOf(now).getTime() - DAY_MS); // Sunday of last week
      case "monthly":
        return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0)); // last day prev month
      case "yearly":
        return new Date(Date.UTC(now.getUTCFullYear(), 0, 0)); // Dec 31 prev year
    }
  })();
  if (!prev || prev < launch) return null;
  return anchorFor(period, prev);
}
