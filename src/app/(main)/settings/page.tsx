import Link from "next/link"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import EmailPrefsForm from "./email-prefs-form"
import PasswordForm from "./password-form"
import PrivacyForm from "./privacy-form"
import { BlockedAccounts } from "./blocked-accounts"
import { NotificationPrefsForm } from "./notification-prefs-form"
import { reactivateAccountFormAction } from "./actions"
import { listBlockedUsers } from "@/modules/connections/blocks"
import { getNotificationPrefs, MUTEABLE_KINDS } from "@/modules/notifications/service"
import { EMAIL_PREF_KEYS, type EmailPrefKey } from "./prefs"
import { SettingsNav, type NavItem } from "./settings-nav"
import { DangerZone } from "./danger-zone"
import { User as UserIcon, IdCard, Pencil } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function SettingsPage() {
  const sessionUser = await requireUser()

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      legalName: true,
      email: true,
      username: true,
      status: true,
      membershipStatus: true,
      isVerified: true,
      passwordHash: true,
      profile: {
        select: {
          photoUrl: true,
          bio: true,
          city: true,
          profession: true,
          visibility: true,
          contactAlwaysShare: true,
          isPublicIndexed: true,
          showOnMap: true,
        },
      },
    },
  })

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-gray-500">Account not found.</p>
      </div>
    )
  }

  // Standalone model (no Prisma relation) — fetch separately. Absent row = all on.
  const savedPrefs = await prisma.emailPreference.findUnique({ where: { userId: sessionUser.id } })
  const initialPrefs = Object.fromEntries(
    EMAIL_PREF_KEYS.map(k => [k, savedPrefs ? (savedPrefs[k] as boolean) : true]),
  ) as Record<EmailPrefKey, boolean>

  const [blockedUsers, notifPrefs] = await Promise.all([
    listBlockedUsers(sessionUser.id),
    getNotificationPrefs(sessionUser.id),
  ])

  const navItems: NavItem[] = [
    { id: "account", label: "Account", icon: "User" },
    ...(user.profile ? ([{ id: "profile", label: "Profile", icon: "IdCard" }, { id: "privacy", label: "Privacy", icon: "Shield" }] as NavItem[]) : []),
    { id: "notifications", label: "Notifications", icon: "Bell" },
    { id: "email", label: "Email", icon: "Mail" },
    { id: "security", label: "Security", icon: "Lock" },
    { id: "blocked", label: "Blocked", icon: "Ban" },
    { id: "danger", label: "Danger zone", icon: "TriangleAlert", danger: true },
  ]

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-8">
        <h1 className="mb-5 text-2xl font-bold text-gray-900">Settings</h1>

        <div className="lg:grid lg:grid-cols-[200px_1fr] lg:gap-8">
          {/* Section nav */}
          <aside className="mb-4 lg:mb-0">
            <SettingsNav items={navItems} />
          </aside>

          {/* Content */}
          <div className="space-y-6">
            <section id="account" className="scroll-mt-20 rounded-[5px] border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] bg-brand/10 text-brand"><UserIcon className="h-4.5 w-4.5" /></span>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                  <p className="text-sm text-gray-500">Your identity and membership on NNAWCA.</p>
                </div>
              </div>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <Row label="Name" value={user.legalName} />
                <Row label="Username" value={user.username ? `@${user.username}` : "—"} />
                <Row label="Email" value={user.email} />
                <Row label="Status" value={user.status} />
                <Row label="Membership" value={`${user.membershipStatus}${user.isVerified ? " · verified" : ""}`} />
              </dl>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/profile/edit" className="rounded-[4px] bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700">Edit profile</Link>
                <Link href="/membership" className="rounded-[4px] border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Manage membership</Link>
              </div>
            </section>

            {user.status === "inactive" && (
              <section className="scroll-mt-20 rounded-[5px] border border-amber-300 bg-amber-50 p-6">
                <h2 className="mb-1 text-lg font-semibold text-amber-900">Your account is deactivated</h2>
                <p className="mb-4 text-sm text-amber-800">
                  You’ve deactivated your account, so you can’t post, comment, or message. Reactivate to
                  restore full access — your profile and content are still here.
                </p>
                <form action={reactivateAccountFormAction}>
                  <button type="submit" className="rounded-[4px] bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700">
                    Reactivate my account
                  </button>
                </form>
              </section>
            )}

            {user.profile && (
              <section id="profile" className="scroll-mt-20 rounded-[5px] border border-gray-200 bg-white p-6 shadow-sm">
                <div className="mb-4 flex items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-[4px] bg-brand/10 text-brand"><IdCard className="h-4.5 w-4.5" /></span>
                  <div className="flex-1">
                    <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
                    <p className="text-sm text-gray-500">How you appear to other alumni.</p>
                  </div>
                  <Link href="/profile/edit" className="flex items-center gap-1.5 rounded-[4px] border border-gray-200 px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </Link>
                </div>
                <dl className="grid grid-cols-1 gap-3 text-sm">
                  <Row label="Headline" value={user.profile.profession ?? "—"} />
                  <Row label="City" value={user.profile.city ?? "—"} />
                  <Row label="Bio" value={user.profile.bio ?? "—"} />
                </dl>
              </section>
            )}

            {user.profile && (
              <div id="privacy" className="scroll-mt-20">
                <PrivacyForm
                  initial={{
                    visibility: user.profile.visibility,
                    contactAlwaysShare: user.profile.contactAlwaysShare,
                    isPublicIndexed: user.profile.isPublicIndexed,
                    showOnMap: user.profile.showOnMap,
                  }}
                />
              </div>
            )}

            <div id="notifications" className="scroll-mt-20">
              <NotificationPrefsForm initial={notifPrefs} kinds={MUTEABLE_KINDS.map((k) => ({ kind: k.kind, label: k.label }))} />
            </div>

            <div id="email" className="scroll-mt-20">
              <EmailPrefsForm initial={initialPrefs} />
            </div>

            <div id="security" className="scroll-mt-20">
              <PasswordForm hasPassword={Boolean(user.passwordHash)} />
            </div>

            <div id="blocked" className="scroll-mt-20">
              <BlockedAccounts initial={blockedUsers} />
            </div>

            {user.status !== "inactive" && (
              <div id="danger" className="scroll-mt-20">
                <DangerZone />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <dt className="text-gray-500">{label}</dt>
      <dd className="col-span-2 text-gray-900">{value}</dd>
    </div>
  )
}
