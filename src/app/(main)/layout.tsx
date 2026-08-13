import { PrivateNavbar, type NavbarViewer } from "@/components/shared/PrivateNavbar"
import { MobileTabBar } from "@/components/shared/MobileTabBar"
import { PushRegistrar } from "@/components/shared/PushRegistrar"
import { FollowStoreProvider } from "@/components/shared/follow-store"
import { optionalUser } from "@/modules/auth/session"
import { loadViewer } from "@/lib/viewer"
import { getCurrent } from "@/modules/membership/service"

const TIERS = ["student", "associate", "premium", "life", "inactive", "committee"] as const
type Tier = (typeof TIERS)[number]

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const session = await optionalUser()
  // Guests are allowed on the public pages in this group (/[username] profiles,
  // /events). Private pages are gated by middleware (PRIVATE_PREFIXES). The
  // navbar renders a guest variant when viewer is null.
  let viewer: NavbarViewer | null = null
  if (session?.id) {
    const u = await loadViewer(session.id)
    if (u) {
      const name = u.displayName || u.legalName
      // Resolve tier from active Membership rows (same source as /membership),
      // NOT the denormalized User.membershipStatus column, which can drift and
      // made the navbar show "premium" while /membership showed "life".
      const resolvedPlan = (await getCurrent(session.id)).planCode
      const tier = (TIERS as readonly string[]).includes(resolvedPlan)
        ? (resolvedPlan as Tier)
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
      {session?.id && <PushRegistrar />}
      <PrivateNavbar viewer={viewer} />
      {/* Reserve space for the mobile tab bar (incl. safe-area) so fixed bottom
          nav never covers page content. Desktop has no bottom bar. */}
      {/* overflow-x-clip: kill any stray wide child (the black right-edge bar) without
          creating a scroll container — position:sticky in page rails still works. */}
      {/* Bottom padding only when the member tab bar is present (logged in). */}
      <div className={session?.id ? "overflow-x-clip pb-[calc(3.5rem+env(safe-area-inset-bottom))] lg:pb-0" : "overflow-x-clip"}>
        {children}
      </div>
      {session?.id && <MobileTabBar />}
    </FollowStoreProvider>
  )
}
