import { prisma } from "@/lib/prisma"
import { ForbiddenError } from "@/lib/errors"
import { canAct, blockedReason } from "@/lib/account-status"

/**
 * Assert a user may perform a gated WRITE (post/comment/react/follow/DM).
 *
 * `requireUser` blocks suspended/banned but deliberately lets `inactive`
 * (self-deactivated) accounts through, so they can still reach /settings to
 * reactivate (audit P0-9). That left a hole: an inactive user could still act.
 * This is the write-side guard — call it at the top of a mutation. It reads
 * status from the DB (not the JWT), so it isn't subject to the ≤60s session lag
 * and reflects a just-applied suspension immediately. Throws ForbiddenError with
 * a human-facing reason otherwise.
 */
export async function assertActive(userId: string): Promise<void> {
  const u = await prisma.user.findUnique({ where: { id: userId }, select: { status: true } })
  if (!canAct(u?.status)) {
    throw new ForbiddenError(blockedReason(u?.status) ?? "Account not active")
  }
}
