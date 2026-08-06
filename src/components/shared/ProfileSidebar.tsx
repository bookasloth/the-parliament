import type { ReactNode } from "react"
import { optionalUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { ProfileSidebarView, type SidebarViewer } from "./ProfileSidebarView"
import type { SidebarNav } from "@/config/sidebar-nav"

export type { SidebarViewer } from "./ProfileSidebarView"

export async function getSidebarViewer(): Promise<SidebarViewer | null> {
  const session = await optionalUser()
  if (!session?.id) return null
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      username: true,
      displayName: true,
      legalName: true,
      profile: { select: { photoUrl: true, coverUrl: true, headline: true } },
      _count: { select: { posts: true, followers: true, following: true } },
    },
  })
  if (!u) return null
  const name = u.displayName || u.legalName
  return {
    name,
    username: u.username ?? null,
    photoUrl:
      u.profile?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
    coverUrl: u.profile?.coverUrl ?? null,
    headline: u.profile?.headline ?? "",
    posts: u._count.posts,
    followers: u._count.followers,
    following: u._count.following,
  }
}

/**
 * Self-fetching left-rail profile card — drop `<ProfileSidebar/>` on any server
 * page. Client pages that already hold the viewer render `ProfileSidebarView`.
 */
export async function ProfileSidebar({
  data,
  nav,
}: {
  data?: SidebarViewer | null
  nav?: SidebarNav
}) {
  const viewer = data !== undefined ? data : await getSidebarViewer()
  return <ProfileSidebarView viewer={viewer} nav={nav} />
}

/**
 * Standard left-rail page shell: 280px sticky ProfileSidebar + main column.
 * For simple single-column server pages (games, etc.). Feed keeps its own 3-col grid.
 */
export function LeftRailShell({ nav, children }: { nav?: SidebarNav; children: ReactNode }) {
  return (
    <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="hidden lg:block w-[280px] flex-shrink-0">
          <div className="sticky top-20">
            <ProfileSidebar nav={nav} />
          </div>
        </aside>
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
