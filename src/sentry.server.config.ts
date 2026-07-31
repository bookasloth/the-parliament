import * as Sentry from "@sentry/nextjs"

// Node.js server runtime. No-ops when SENTRY_DSN is unset.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  // Attach local variable values to server stack frames for easier debugging.
  includeLocalVariables: true,
})
