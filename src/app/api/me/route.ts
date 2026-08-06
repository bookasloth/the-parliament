import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"

// Lightweight viewer card (name + avatar) for client components like the composer.
export async function GET() {
  try {
    // Name is already in the session token — only the avatar needs a query.
    const user = await requireUser()
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { profile: { select: { photoUrl: true } } },
    })
    const name = user.name || "You"
    const photoUrl =
      u?.profile?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
    return ok({ name, photoUrl })
  } catch (e) {
    return handleError(e)
  }
}
