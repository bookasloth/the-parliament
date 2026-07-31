import * as Sentry from "@sentry/nextjs"

// Next.js runs register() once at server startup. Fail fast on missing critical
// secrets in production, then load the Sentry config for the active runtime.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertRequiredEnv } = await import("@/config/env")
    assertRequiredEnv()
    await import("./sentry.server.config")
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config")
  }
}

// Captures unhandled server-side request errors (App Router, route handlers,
// server actions). Requires @sentry/nextjs >= 8.28.0.
export const onRequestError = Sentry.captureRequestError
