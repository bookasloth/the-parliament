import "dotenv/config"
import bcrypt from "bcryptjs"
import { PrismaClient } from "../src/generated/prisma/client"
import pg from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

// Provisions (or updates) a standalone admin/staff user — NOT an alumni member.
// The admin console gate (computeIsAdmin) grants access via isSuperAdmin=true
// and/or the ADMIN_EMAILS allowlist.
//
// Run:  ADMIN_EMAIL=admin@nnawca.com ADMIN_PASSWORD='your-password' npx tsx scripts/create-admin.ts
// (Password is read from the environment at runtime; never commit it.)

const email = (process.env.ADMIN_EMAIL || "admin@nnawca.com").toLowerCase()
const password = process.env.ADMIN_PASSWORD
const legalName = process.env.ADMIN_NAME || "Administrator"

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) })

async function main() {
  if (!password || password.length < 8) {
    throw new Error("Set ADMIN_PASSWORD (min 8 chars) in the environment before running.")
  }
  const passwordHash = await bcrypt.hash(password, 12)

  const user = await prisma.user.upsert({
    where: { email },
    // emailVerifiedAt is required for credentials sign-in (authorize() blocks
    // unverified emails) — set it on both paths so a provisioned admin can log in.
    update: { passwordHash, isSuperAdmin: true, status: "active", emailVerifiedAt: new Date() },
    create: {
      email,
      passwordHash,
      legalName,
      displayName: legalName,
      username: "admin",
      memberType: "staff",
      isSuperAdmin: true,
      onboardingCompleted: true,
      emailVerifiedAt: new Date(),
      status: "active",
    },
    select: { id: true, email: true, isSuperAdmin: true },
  })

  console.log(`Admin ready: ${user.email} (id ${user.id}, superAdmin ${user.isSuperAdmin})`)
  console.log("Log in at /auth/admin")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect(); await pool.end() })
