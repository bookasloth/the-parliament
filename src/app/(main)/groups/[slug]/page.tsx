import { notFound } from "next/navigation"
import { optionalUser } from "@/modules/auth/session"
import { getGroupPageData } from "@/modules/groups/service"
import GroupDetailClient from "./group-detail-client"

export const dynamic = "force-dynamic"

export default async function GroupDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const user = await optionalUser()

  let data
  try {
    data = await getGroupPageData(slug, user?.id ?? null)
  } catch {
    notFound()
  }
  if (!data) notFound()

  return <GroupDetailClient data={data} loggedIn={!!user} />
}
