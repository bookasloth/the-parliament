import { auth } from "@/lib/auth"
import { ForbiddenError, UnauthorizedError } from "@/lib/errors"
import { canSignIn, blockedReason } from "@/lib/account-status"

export { ForbiddenError, UnauthorizedError }

export type SessionUser = {
  id: string
  email: string
  name?: string | null
  username?: string
  onboardingStep?: string
  onboardingCompleted?: boolean
  membershipStatus?: string
  /** UserStatus: active | inactive | suspended | banned (from the JWT, refreshed ≤60s). */
  status?: string
  isAdmin?: boolean
  roles?: string[]
}

export async function requireUser(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.id) {
    throw new UnauthorizedError()
  }
  const user = session.user as SessionUser
  // Hard-blocked accounts (suspended/banned) can hold a valid cookie until their
  // JWT expires, so enforce status on every gated action — the single point that
  // makes the moderation console's suspend/ban actually stop a user. `inactive`
  // (self-closed) is allowed through here; its reactivation gate is separate.
  if (!canSignIn(user.status)) {
    throw new ForbiddenError(blockedReason(user.status) ?? "Account not active")
  }
  return user
}

export async function optionalUser(): Promise<SessionUser | null> {
  const session = await auth()
  if (!session?.user?.id) return null
  const user = session.user as SessionUser
  // A hard-blocked user browsing a public page is treated as a logged-out guest
  // (never crashes a read page, never acts).
  if (!canSignIn(user.status)) return null
  return user
}

/** Server guard for admin route handlers / server components. */
export async function requireAdmin(): Promise<SessionUser> {
  const session = await auth()
  if (!session?.user?.id) throw new UnauthorizedError()
  if (!session.user.isAdmin) throw new ForbiddenError("Admin access required")
  return session.user as SessionUser
}
