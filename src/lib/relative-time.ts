/** Compact "x min ago" style relative time. `now` injectable for tests. */
export function relativeTime(date: Date, now: Date = new Date()): string {
  const s = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} hr ago`
  const days = Math.floor(s / 86400)
  return `${days} day${days === 1 ? "" : "s"} ago`
}
