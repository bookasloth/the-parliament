import { describe, it, expect } from "vitest"
import nextConfig, { buildCsp } from "../next.config"

describe("CSP policy", () => {
  const prod = buildCsp(false)
  const dev = buildCsp(true)

  it("prod policy never allows unsafe-eval", () => {
    expect(prod).not.toContain("unsafe-eval")
  })

  it("dev policy allows unsafe-eval (React dev debugging)", () => {
    expect(dev).toContain("'unsafe-eval'")
  })

  it("allows Supabase Realtime over wss (else messaging breaks when enforced)", () => {
    expect(prod).toContain("wss://*.supabase.co")
  })

  it("allows Sentry ingest (else the enforced CSP silently blocks client reporting)", () => {
    expect(prod).toContain("https://*.sentry.io")
  })

  it("keeps report-uri so violations are logged even while enforcing", () => {
    expect(prod).toContain("report-uri /api/csp-report")
  })

  it("allows the Razorpay checkout script", () => {
    expect(prod).toMatch(/script-src[^;]*https:\/\/checkout\.razorpay\.com/)
  })

  it("locks down object/base/frame-ancestors", () => {
    expect(prod).toContain("object-src 'none'")
    expect(prod).toContain("base-uri 'self'")
    expect(prod).toContain("frame-ancestors 'self'")
  })

  it("ships CSP as an ENFORCED header, not report-only", async () => {
    const rules = await nextConfig.headers!()
    const keys = rules.flatMap((r) => r.headers.map((h) => h.key))
    expect(keys).toContain("Content-Security-Policy")
    expect(keys).not.toContain("Content-Security-Policy-Report-Only")
  })
})
