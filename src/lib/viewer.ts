import { cache } from "react"
import { prisma } from "@/lib/prisma"

/**
 * The viewer's own profile card, shared by the navbar (main layout), the feed
 * viewer card, and the left-rail ProfileSidebar. These three all render on the
 * same request and used to each fire their own near-identical user.findUnique.
 * Wrapped in React cache() with a SUPERSET select so one query per request
 * serves all of them. Keep the select a superset of every consumer's needs.
 */
export const loadViewer = cache((id: string) =>
  prisma.user.findUnique({
    where: { id },
    select: {
      username: true,
      displayName: true,
      legalName: true,
      membershipStatus: true,
      eggBalance: true,
      shellBalance: true,
      profile: {
        select: {
          photoUrl: true,
          coverUrl: true,
          headline: true,
          batch: { select: { label: true, startYear: true } },
          house: { select: { name: true } },
        },
      },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  }),
)

export type ViewerRow = NonNullable<Awaited<ReturnType<typeof loadViewer>>>
