import { auth } from "@/lib/auth"
import { can } from "@/modules/admin/permissions"
import { GUIDES } from "./guides"
import HelpClient from "./help-client"

export const dynamic = "force-dynamic"

// Console entry is gated by the admin layout; here we only role-scope which
// guides are visible, mirroring the nav rule:
//   adminOnly ? isAdmin : permission ? can(principal, permission) : true
export default async function HelpPage() {
  const session = await auth()
  const isAdmin = session?.user?.isAdmin ?? false
  const principal = { email: session?.user?.email, roles: session?.user?.roles }

  const visible = GUIDES.filter((g) =>
    g.adminOnly ? isAdmin : g.permission ? can(principal, g.permission) : true,
  )

  return <HelpClient guides={visible} />
}
