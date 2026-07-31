import * as Sentry from "@sentry/nextjs"

// Browser runtime. DSN comes from env — if NEXT_PUBLIC_SENTRY_DSN is unset the SDK
// initialises to a no-op, so shipping this before the DSN is configured is safe.
// Errors + tracing only for now: Session Replay is deferred because it needs the
// enforced CSP to allow `worker-src blob:` and a wider connect-src — add it with
// the matching CSP change, not silently.
Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
})

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart
