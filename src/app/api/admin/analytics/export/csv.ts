// Pure CSV builders — kept out of route.ts so unit tests can import them
// without pulling the route's prisma/next-auth chain.

// Quote a CSV cell only when it contains a comma, quote, or newline (RFC 4180).
export function csvCell(value: unknown): string {
  const s = value == null ? "" : String(value)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export function toCsv(header: string[], rows: unknown[][]): string {
  return [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\n")
}
