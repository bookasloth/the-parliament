import { PrivateNavbar, type NavbarViewer } from "@/components/shared/PrivateNavbar"
import { MobileTabBar } from "@/components/shared/MobileTabBar"
import { FollowStoreProvider } from "@/components/shared/follow-store"
import { optionalUser } from "@/modules/auth/session"
import { loadViewer } from "@/lib/viewer"

const TIERS = ["student", "associate", "premium", "life", "inactive", "committee"] as const
type Tier = (typeof TIERS)[number]

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await optionalUser()
  let viewer: NavbarViewer | null = null
  if (session?.id) {
    const u = await loadViewer(session.id)
    if (u) {
      const name = u.displayName || u.legalName
      const tier = (TIERS as readonly string[]).includes(u.membershipStatus)
        ? (u.membershipStatus as Tier)
        : "associate"
      viewer = {
        name,
        batch: u.profile?.batch?.label ? `Batch ${u.profile.batch.label}` : "—",
        avatar:
          u.profile?.photoUrl ??
          `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}`,
        membership: tier,
        username: u.username ?? "",
      }
    }
  }
  return (
    <FollowStoreProvider>
      <PrivateNavbar viewer={viewer} />
      {/* Reserve space for the mobile tab bar (incl. safe-area) so fixed bottom
          nav never covers page content. Desktop has no bottom bar. */}
      <div className="pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0">
        {children}
      </div>
      <MobileTabBar />
    </FollowStoreProvider>
  )
}
