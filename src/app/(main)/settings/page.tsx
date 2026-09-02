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

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Settings</h1>

        <div className="space-y-6">
          <section className="rounded-[5px] border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Account</h2>
            <dl className="grid grid-cols-1 gap-3 text-sm">
              <Row label="Name" value={user.legalName} />
              <Row label="Username" value={user.username ? `@${user.username}` : "—"} />
              <Row label="Email" value={user.email} />
              <Row label="Status" value={user.status} />
              <Row
                label="Membership"
                value={`${user.membershipStatus}${user.isVerified ? " · verified" : ""}`}
              />
            </dl>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/profile/edit"
                className="rounded-[4px] bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
              >
                Edit profile
              </Link>
              <Link
                href="/membership"
                className="rounded-[4px] border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Manage membership
              </Link>
            </div>
          </section>

          {user.status === "inactive" && (
            <section className="rounded-[5px] border border-amber-300 bg-amber-50 p-6">
              <h2 className="text-lg font-semibold text-amber-900 mb-1">Your account is deactivated</h2>
              <p className="text-sm text-amber-800 mb-4">
                You’ve deactivated your account, so you can’t post, comment, or message. Reactivate to
                restore full access — your profile and content are still here.
              </p>
              <form action={reactivateAccountFormAction}>
                <button
                  type="submit"
                  className="rounded-[4px] bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
                >
                  Reactivate my account
                </button>
              </form>
            </section>
          )}

          {user.profile && (
            <section className="rounded-[5px] border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Profile</h2>
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <Row label="Headline" value={user.profile.profession ?? "—"} />
                <Row label="City" value={user.profile.city ?? "—"} />
                <Row label="Bio" value={user.profile.bio ?? "—"} />
              </dl>
            </section>
          )}

          {user.profile && (
            <PrivacyForm
              initial={{
                visibility: user.profile.visibility,
                contactAlwaysShare: user.profile.contactAlwaysShare,
                isPublicIndexed: user.profile.isPublicIndexed,
                showOnMap: user.profile.showOnMap,
              }}
            />
          )}

          <NotificationPrefsForm initial={notifPrefs} kinds={MUTEABLE_KINDS.map((k) => ({ kind: k.kind, label: k.label }))} />

          <EmailPrefsForm initial={initialPrefs} />

          <BlockedAccounts initial={blockedUsers} />

          <PasswordForm hasPassword={Boolean(user.passwordHash)} />
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
