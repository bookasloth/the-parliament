import * as Sentry from "@sentry/nextjs"

// Edge runtime (proxy.ts / edge routes). No-ops when SENTRY_DSN is unset.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
})
