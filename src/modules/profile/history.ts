// Pure helpers for work/education history — date building + display formatting.
// Kept DB-free so they're unit-testable.

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Build a UTC date pinned to the 1st of the month. month is 1-12 (defaults to Jan). */
export function monthYearToDate(year: number | null | undefined, month?: number | null): Date | null {
  if (!year || !Number.isFinite(year)) return null
  const m = month && month >= 1 && month <= 12 ? month - 1 : 0
  return new Date(Date.UTC(year, m, 1))
}

/** "Jun 2022"; null → "Present". */
export function formatMonthYear(d: Date | null | undefined): string {
  if (!d) return "Present"
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
}

/**
 * Human duration between two month-dates, LinkedIn-style: "4 yrs 3 mos",
 * "1 yr", "5 mos". end null → now. Inclusive of the start month.
 */
export function formatDuration(start: Date | null | undefined, end: Date | null | undefined, now: Date = new Date()): string {
  if (!start) return ""
  const e = end ?? now
  let months = (e.getUTCFullYear() - start.getUTCFullYear()) * 12 + (e.getUTCMonth() - start.getUTCMonth()) + 1
  if (months < 1) months = 1
  const yrs = Math.floor(months / 12)
  const mos = months % 12
  const parts: string[] = []
  if (yrs > 0) parts.push(`${yrs} yr${yrs > 1 ? "s" : ""}`)
  if (mos > 0) parts.push(`${mos} mo${mos > 1 ? "s" : ""}`)
  return parts.join(" ")
}
