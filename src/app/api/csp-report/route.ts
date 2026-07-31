import { NextResponse } from "next/server"

// Collector for Content-Security-Policy-Report-Only violations. The header is
// report-only (see next.config.ts), so nothing is blocked — these reports tell
// us what a future ENFORCED script-src CSP would break, so it can be tuned
// (nonces, real origins) before flipping it on. Always 204; never throws.
export async function POST(req: Request) {
  try {
    const raw = await req.text()
    // CSP reports are small; ignore anything oversized (flood/abuse guard).
    if (raw.length <= 8_192) {
      let report: unknown = raw
      try {
        report = JSON.parse(raw)
      } catch {
        // keep the raw string
      }
      // Log only the useful fields to avoid noise; violations surface in server logs.
      const body = report as { "csp-report"?: Record<string, unknown> }
      const v = body?.["csp-report"] ?? report
      console.warn("[csp-report]", JSON.stringify(v))
    }
  } catch {
    // never let a malformed report error out
  }
  return new NextResponse(null, { status: 204 })
}
