import { prisma } from "@/lib/prisma"
import { optionalUser } from "@/modules/auth/session"
import { getSidebarViewer } from "@/components/shared/ProfileSidebar"
import { ProfileSidebarView } from "@/components/shared/ProfileSidebarView"
import { SIDEBAR_NAV } from "@/config/sidebar-nav"

/**
 * Games left rail: the standard profile card, but with games-oriented stats
 * (Played · Titles · Points) and the games nav. Replaces the old standalone
 * GamesSidebar so /games shows a single, consistent rail like every other
 * (main) section.
 */
export async function GamesRail() {
  const session = await optionalUser()
  const viewer = await getSidebarViewer()

  let played = 0
  let points = 0
  let titles = 0
  if (session?.id) {
    const [agg, titleCount] = await Promise.all([
      prisma.gameScore.aggregate({
        where: { userId: session.id },
        _count: { _all: true },
        _sum: { score: true },
      }),
      // Individual-scope champions store the user id as winnerKey.
      prisma.gameChampion.count({ where: { scope: "individual", winnerKey: session.id } }),
    ])
    played = agg._count._all
    points = agg._sum.score ?? 0
    titles = titleCount
  }

  return (
    <ProfileSidebarView
      viewer={viewer}
      nav={SIDEBAR_NAV.games}
      stats={[
        { label: "Played", value: played },
        { label: "Titles", value: titles },
        { label: "Points", value: points },
      ]}
    />
  )
}
