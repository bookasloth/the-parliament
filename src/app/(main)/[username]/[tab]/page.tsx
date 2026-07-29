import { notFound } from "next/navigation"
import { loadProfile, VALID_TABS, type TabKey } from "../load-profile"

export default async function ProfileTabPage({
  params,
}: {
  params: Promise<{ username: string; tab: string }>
}) {
  const { username, tab } = await params
  if (!VALID_TABS.includes(tab as TabKey)) notFound()
  return loadProfile(username, tab as TabKey)
}
