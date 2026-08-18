import { redirect } from "next/navigation"
import { notFound } from "next/navigation"
import { auth } from "@/lib/auth"
import { canEnterConsole, can } from "@/modules/admin/permissions"
import AdminShell, { type AdminIdentity } from "./admin-shell"
import { NAV } from "./nav/nav-config"

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
  return (letters || source.slice(0, 2)).toUpperCase()
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // Authoritative gate for the whole console. Full admins (session.user.isAdmin)
  // OR any lower back-office role (moderator/support/analyst) may enter; each
  // surface inside then enforces `can()` per action. Logged-out → signin;
  // logged-in without console access → 404 so the surface isn't discoverable.
  if (!session?.user?.id) redirect("/auth/admin?callbackUrl=/admin")
  const mayEnter =
    session.user.isAdmin ||
    canEnterConsole({ email: session.user.email, roles: session.user.roles })
  if (!mayEnter) notFound()

  const name = session.user.name || "Admin"
  const email = session.user.email || ""
  const admin: AdminIdentity = { name, email, initials: initialsFrom(name, email) }

  // Role-scope the nav server-side: an item shows if adminOnly ? isAdmin :
  // permission ? can() : always. A section shows if it has >= 1 visible item.
  const principal = { email: session.user.email, roles: session.user.roles }
  const isAdmin = session.user.isAdmin
  const sections = NAV
    .map(s => ({
      ...s,
      items: s.items.filter(i => (i.adminOnly ? isAdmin : i.permission ? can(principal, i.permission) : true)),
    }))
    .filter(s => s.items.length > 0)

  const env =
    process.env.VERCEL_ENV === "production"
      ? "Production"
      : process.env.VERCEL_ENV === "preview"
        ? "Preview"
        : "Local"

  return (
    <div className="admin-root">
      <AdminShell admin={admin} env={env} sections={sections}>{children}</AdminShell>
    </div>
  )
}
