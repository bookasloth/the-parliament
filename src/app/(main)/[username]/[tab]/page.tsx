import { Suspense } from "react"
import { notFound } from "next/navigation"
import { loadProfile, VALID_TABS, type TabKey } from "../load-profile"
import ProfileSkeleton from "../loading"

async function ProfileTabData({ username, tab }: { username: string; tab: TabKey }) {
  return loadProfile(username, tab)
}

export default async function ProfileTabPage({
  params,
}: {
  params: Promise<{ username: string; tab: string }>
}) {
  const { username, tab } = await params
  if (!VALID_TABS.includes(tab as TabKey)) notFound()
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileTabData username={username} tab={tab as TabKey} />
    </Suspense>
  )
}
