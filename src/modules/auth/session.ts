import { auth } from "@/lib/auth"

export type SessionUser = {
  id: string
  email: string
  name?: string | null
  username?: string
  onboardingStep?: string
  onboardingCompleted?: boolean
  membershipStatus?: string
  isAdmin?: boolean
  roles?: string[]
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new UnauthorizedError()
  }
  return session.user as SessionUser
}

export async function optionalUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  return session.user as SessionUser
}

/** Server guard for admin route handlers / server components. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.id) throw new UnauthorizedError()
  if (!session.user.isAdmin) throw new ForbiddenError("Admin access required")
  return session.user as SessionUser
}

export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized")
    this.name = "UnauthorizedError"
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message)
    this.name = "ForbiddenError"
  }
}
