import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import AdminShell, { type AdminIdentity } from "./admin-shell"

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || email
  const parts = source.split(/[\s@.]+/).filter(Boolean)
  const letters = (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")
  return (letters || source.slice(0, 2)).toUpperCase()
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()

  // Defence in depth: middleware already gates /admin, but never trust a single layer.
  if (!session?.user?.id) {
    redirect("/auth/signin?callbackUrl=/admin")
  }
  if (!session.user.isAdmin) {
    redirect("/feed")
  }

  const name = session.user.name || "Admin"
  const email = session.user.email || ""
  const admin: AdminIdentity = { name, email, initials: initialsFrom(name, email) }

  return <AdminShell admin={admin}>{children}</AdminShell>
}
