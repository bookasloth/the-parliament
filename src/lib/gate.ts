import { prisma } from "@/lib/prisma"
import { ForbiddenError, requireUser } from "@/modules/auth/session"
import { getBalance } from "@/modules/karma/ledger"

export interface GateOptions {
  verified?: boolean
  karmaMin?: number
  roles?: string[]
}

export interface GatedUser {
  id: string
  email: string
  isVerified: boolean
  karmaBalance: number
  roles: string[]
}

export async function gateUser(opts: GateOptions = {}): Promise<GatedUser> {
  const session = await requireUser()

  const [user, roleRows, karma] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, isVerified: true, status: true },
    }),
    prisma.userRole.findMany({
      where: { userId: session.id },
      select: { role: true },
    }),
    opts.karmaMin !== undefined ? getBalance(session.id) : Promise.resolve(null),
  ])

  if (!user) throw new ForbiddenError("User not found")
  if (user.status !== "active") throw new ForbiddenError(`Account ${user.status}`)

  if (opts.verified && !user.isVerified) {
    throw new ForbiddenError("Verification required")
  }

  if (opts.karmaMin !== undefined && karma && karma.balance < opts.karmaMin) {
    throw new ForbiddenError(`Requires ${opts.karmaMin} karma`)
  }

  const roles = roleRows.map((r) => r.role)
  if (opts.roles && !opts.roles.some((r) => roles.includes(r))) {
    throw new ForbiddenError("Missing required role")
  }

  return {
    id: user.id,
    email: user.email,
    isVerified: user.isVerified,
    karmaBalance: karma?.balance ?? 0,
    roles,
  }
}

export const requireVerified = () => gateUser({ verified: true })
export const requireAdmin = () =>
  gateUser({ roles: ["admin", "founder", "super_admin"] })
