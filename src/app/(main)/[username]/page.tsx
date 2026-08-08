import { Suspense } from "react"
import { loadProfile } from "./load-profile"
import ProfileSkeleton from "./loading"

async function ProfileData({ username }: { username: string }) {
  return loadProfile(username, "posts")
}

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileData username={username} />
    </Suspense>
  )
}
