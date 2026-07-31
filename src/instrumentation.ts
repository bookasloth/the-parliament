// Next.js runs register() once at server startup. Fail fast on missing critical
// secrets in production instead of surfacing a confusing runtime error later.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { assertRequiredEnv } = await import("@/config/env")
    assertRequiredEnv()
  }
}
