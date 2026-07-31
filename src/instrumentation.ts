// Next.js runs register() once at server startup. Fail fast on missing critical
// secrets in production instead of surfacing a confusing runtime error later.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return

  const { assertRequiredEnv } = await import("@/config/env")
  assertRequiredEnv()

  // Start the pg-boss background workers only where a long-lived process exists
  // (a dedicated worker / VPS instance) — NOT in ephemeral serverless functions,
  // where each invocation would spin up its own boss. Set RUN_WORKERS=true on
  // that one process. This is what makes the cron jobs (membership expiry
  // reminders, etc.) and delayed event-invite waves actually fire.
  if (process.env.RUN_WORKERS === "true") {
    const { getBoss } = await import("@/lib/jobs")
    const { registerMembershipJobs } = await import("@/modules/membership/jobs")
    const { registerEventJobs } = await import("@/modules/events/jobs")
    const boss = await getBoss()
    await registerMembershipJobs(boss)
    await registerEventJobs(boss)
  }
}
