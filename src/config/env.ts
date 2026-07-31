export const env = {
  databaseUrl: process.env.DATABASE_URL!,
  authSecret: process.env.AUTH_SECRET!,
  authUrl: process.env.AUTH_URL ?? "http://localhost:3000",
  adminEmails: (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean),
  googleClientId: process.env.AUTH_GOOGLE_ID ?? "",
  googleClientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
  razorpayKeyId: process.env.RAZORPAY_KEY_ID ?? "",
  razorpayKeySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
  // Verifies incoming Razorpay webhooks (razorpay.ts). Fail-closed if unset.
  razorpayWebhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
  smtpHost: process.env.SMTP_HOST ?? "",
  smtpPort: Number(process.env.SMTP_PORT ?? "587"),
  smtpUser: process.env.SMTP_USER ?? "",
  smtpPass: process.env.SMTP_PASS ?? "",
  smtpFrom: process.env.SMTP_FROM ?? "noreply@jnvnagpur.in",
  r2Endpoint: process.env.R2_ENDPOINT ?? "",
  r2AccessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
  r2SecretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
  r2Bucket: process.env.R2_BUCKET ?? "",
} as const;

// Vars the app genuinely cannot run correctly without. In production a missing
// one is a hard boot failure (clear error early instead of a confusing runtime
// crash later); elsewhere it's a warning so local/CI flows aren't blocked.
// Wired from src/instrumentation.ts (runs once at server startup).
const REQUIRED_ENV = ["AUTH_SECRET", "DATABASE_URL"] as const;

export function assertRequiredEnv(): void {
  const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
  if (missing.length === 0) return;
  const msg = `Missing required env vars: ${missing.join(", ")}`;
  if (process.env.NODE_ENV === "production") throw new Error(msg);
  console.warn(`[env] ${msg}`);
}
