import type { ReactNode } from "react"
import Image from "next/image"
import { UsersRound, Bookmark, Star, Award, CreditCard } from "lucide-react"
import { SidebarFooter } from "./SidebarFooter"

export type SidebarViewer = {
  name: string
  username: string | null
  photoUrl: string
  coverUrl: string | null
  headline: string
  posts: number
  followers: number
  following: number
}

// Secondary destinations — deliberately NOT the top-navbar/mobile-tab targets
// (Feed/Events/Messages/Notifications/Settings live there). This rail surfaces
// the stuff otherwise buried in the profile dropdown.
const SIDEBAR_NAV = [
  { label: "My Groups", href: "/groups", icon: UsersRound },
  { label: "Saved", href: "/saved", icon: Bookmark },
  { label: "Karma", href: "/karma", icon: Star },
  { label: "Achievements", href: "/achievements", icon: Award },
  { label: "Membership", href: "/membership", icon: CreditCard },
] as const

export function compactNum(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`
  return String(n)
}

/**
 * Presentational left-rail profile card. Sync + client-safe (no server imports)
 * so client pages like the feed can render it with an already-fetched viewer.
 * Server pages use the self-fetching `ProfileSidebar` wrapper instead.
 */
export function ProfileSidebarView({ viewer }: { viewer: SidebarViewer | null }) {
  const name = viewer?.name ?? "Guest"
  const photo =
    viewer?.photoUrl ?? `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`
  const profileHref = viewer?.username ? `/${viewer.username}` : "/profile/edit"
  const stats = [
    { label: "Post", value: viewer?.posts ?? 0 },
    { label: "Followers", value: viewer?.followers ?? 0 },
    { label: "Following", value: viewer?.following ?? 0 },
  ]

  return (
    <div className="space-y-3">
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {/* Cover */}
        {viewer?.coverUrl ? (
          <div className="relative h-[68px]">
            <Image src={viewer.coverUrl} alt="" fill sizes="320px" className="object-cover" />
          </div>
        ) : (
          <div className="h-[68px] bg-gradient-to-r from-brand to-brand-700" />
        )}
        <div className="px-4 pt-0 pb-3">
          <div className="text-center">
            {/* z-10 so avatar paints above the absolutely-positioned cover */}
            <div className="relative z-10 -mt-9 mb-2 flex justify-center">
              <Image
                className="h-16 w-16 rounded-full border-[3px] border-white object-cover shadow-sm"
                src={photo}
                alt=""
                width={64}
                height={64}
              />
            </div>
            <h6 className="mb-0 text-sm font-semibold text-gray-900">
              <a href={profileHref} className="hover:text-brand transition-colors">
                {name}
              </a>
            </h6>
            <small className="text-xs text-gray-500">{viewer?.headline || "—"}</small>

            {/* Stats: Post · Followers · Following */}
            <div className="mt-3 flex items-stretch">
              {stats.map((s, i) => (
                <div key={s.label} className={`flex-1 ${i > 0 ? "border-l border-gray-100" : ""}`}>
                  <h6 className="mb-0 text-sm font-semibold text-gray-900 tabular-nums">
                    {compactNum(s.value)}
                  </h6>
                  <small className="text-[10px] text-gray-500">{s.label}</small>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Secondary nav */}
        <nav className="border-t border-gray-100 p-2">
          {SIDEBAR_NAV.map(({ label, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-brand-50 hover:text-brand transition-colors"
            >
              <Icon className="h-[18px] w-[18px] flex-shrink-0 text-gray-400" />
              {label}
            </a>
          ))}
        </nav>

        <div className="border-t border-gray-100 py-2.5 text-center">
          <a
            href={profileHref}
            className="text-xs font-semibold text-brand hover:text-brand-600 transition-colors"
          >
            View Profile
          </a>
        </div>
      </div>

      <SidebarFooter />
    </div>
  )
}

/**
 * Client-safe two-column rail layout: 280px sticky sidebar + main content.
 * For client pages (groups/events/community) that fetch the viewer server-side
 * and pass it down. Place INSIDE the page's existing max-width container.
 * Server pages use `LeftRailShell` instead.
 */
export function RailColumns({
  sidebarViewer,
  children,
}: {
  sidebarViewer: SidebarViewer | null
  children: ReactNode
}) {
  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="hidden lg:block w-[280px] flex-shrink-0">
        <div className="sticky top-20">
          <ProfileSidebarView viewer={sidebarViewer} />
        </div>
      </aside>
      <div className="flex-1 min-w-0">{children}</div>
    </div>
  )
}
