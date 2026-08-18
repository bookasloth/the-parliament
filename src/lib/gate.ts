import { prisma } from "@/lib/prisma"
import { ForbiddenError, requireUser } from "@/modules/auth/session"
import { getBalance } from "@/modules/karma/ledger"
import { computeIsAdmin } from "@/modules/auth/admin"
import { can, type Permission } from "@/modules/admin/permissions"

export interface GateOptions {
  verified?: boolean
  karmaMin?: number
  roles?: string[]
}

export interface GatedUser {
  id: string
  email: string
  isVerified: boolean
  isSuperAdmin: boolean
  karmaBalance: number
  roles: string[]
}

export async function gateUser(opts: GateOptions = {}): Promise<GatedUser> {
  const session = await requireUser()

  const [user, roleRows, karma] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true, email: true, isVerified: true, isSuperAdmin: true, status: true },
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

  const roles = roleRows.map((r) => r.role as string)
  if (opts.roles && !opts.roles.some((r) => roles.includes(r))) {
    throw new ForbiddenError("Missing required role")
  }

  return {
    id: user.id,
    email: user.email,
    isVerified: user.isVerified,
    isSuperAdmin: user.isSuperAdmin,
    karmaBalance: karma?.balance ?? 0,
    roles,
  }
}

export const requireVerified = () => gateUser({ verified: true })

// Single admin definition shared with middleware + pages + server actions:
// computeIsAdmin (isSuperAdmin flag OR ADMIN_EMAILS allowlist OR an admin role).
// Previously this checked roles only, so a bootstrap admin (isSuperAdmin, no
// role row) or an allowlisted email was wrongly 403'd on /api/admin routes.
export async function requireAdmin(): Promise<GatedUser> {
  const gated = await gateUser()
  if (!computeIsAdmin({ email: gated.email, roles: gated.roles, isSuperAdmin: gated.isSuperAdmin })) {
    throw new ForbiddenError("Admin access required")
  }
  return gated
}

/**
 * Fine-grained admin gate: the logged-in user must hold `perm` in the RBAC
 * matrix. Lets lower back-office roles (moderator/support/analyst) act on the
 * specific surfaces they're granted, without the strict full-admin check.
 * Throws ForbiddenError otherwise.
 */
export async function requirePermission(perm: Permission): Promise<GatedUser> {
  const gated = await gateUser()
  if (!can({ email: gated.email, roles: gated.roles, isSuperAdmin: gated.isSuperAdmin }, perm)) {
    throw new ForbiddenError("Insufficient permissions")
  }
  return gated
}
