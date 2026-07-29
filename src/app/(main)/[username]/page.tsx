import { loadProfile } from "./load-profile"

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  return loadProfile(username, "posts")
}
