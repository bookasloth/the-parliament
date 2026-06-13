import { PgBoss } from "pg-boss"

let cachedBoss: PgBoss | null = null
let startPromise: Promise<PgBoss> | null = null

export async function getBoss(): Promise<PgBoss> {
  if (cachedBoss) return cachedBoss
  if (startPromise) return startPromise

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) throw new Error("DATABASE_URL missing for pg-boss")

  startPromise = (async () => {
    const boss = new PgBoss({ connectionString, schema: "pgboss" })
    await boss.start()
    cachedBoss = boss
    return boss
  })()
  return startPromise
}

export const QUEUE = {
  MEMBERSHIP_EXPIRE: "membership:expire",
  MEMBERSHIP_REMINDER: "membership:reminder",
  COMMITTEE_EXPIRY_WARNING: "membership:committee-expiry-warning",
  COMMITTEE_INVITE_EXPIRY: "membership:invite-expiry",
  RAZORPAY_RECONCILE: "membership:reconcile-razorpay",
  INVOICE_GENERATE: "membership:invoice-generate",
  WELCOME_EMAIL: "membership:welcome",
  CERTIFICATE_YEARLY: "membership:certificate-yearly",
  UPSELL_NUDGE: "membership:upsell-nudge",
  EMAIL_SEND: "email:send",
  EMAIL_DIGEST_BUILD: "email:digest:build",
  EMAIL_BOUNCE_POLL: "email:bounce-poll",
} as const

export function userLockKey(userId: string): string {
  return `membership:user:${userId}`
}
