import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"

// Lightweight viewer card (name + avatar) for client components like the composer.
export async function GET() {
  try {
    const user = await requireUser()
    const u = await prisma.user.findUnique({
      where: { id: user.id },
      select: { displayName: true, legalName: true, profile: { select: { photoUrl: true } } },
    })
    const name = u?.displayName || u?.legalName || "You"
    const photoUrl =
      u?.profile?.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
    return ok({ name, photoUrl })
  } catch (e) {
    return handleError(e)
  }
}
