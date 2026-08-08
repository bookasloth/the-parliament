import { handleError, ok } from "@/lib/api"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"

// Returns all mentionable users + viewer's followed IDs in one shot.
// Client caches this and filters locally for instant @mention search.
export async function GET() {
  try {
    const viewer = await requireUser()

    const [users, follows] = await Promise.all([
      prisma.user.findMany({
        where: { status: "active", username: { not: null }, id: { not: viewer.id } },
        orderBy: { displayName: "asc" },
        select: {
          id: true,
          username: true,
          displayName: true,
          legalName: true,
          isVerified: true,
          profile: { select: { photoUrl: true, headline: true } },
        },
      }),
      prisma.follow.findMany({
        where: { followerId: viewer.id },
        select: { followingId: true },
      }),
    ])

    const followedIds = follows.map((f) => f.followingId)

    const items = users.map((u) => {
      const name = u.displayName || u.legalName
      return {
        id: u.id,
        username: u.username,
        displayName: name,
        avatarUrl:
          u.profile?.photoUrl ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        headline: u.profile?.headline ?? null,
        isVerified: u.isVerified,
      }
    })

    return ok({ items, followedIds })
  } catch (e) {
    return handleError(e)
  }
}
