import * as Sentry from "@sentry/nextjs"

// Node.js server runtime. No-ops when SENTRY_DSN is unset.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Local-variable capture is handy in dev but adds per-error overhead and can
  // leak sensitive values into prod error payloads — keep it out of production.
  includeLocalVariables: process.env.NODE_ENV !== "production",
})
