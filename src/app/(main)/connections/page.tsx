import { requireUser } from "@/modules/auth/session"
import { getFollowData } from "@/modules/connections/service"
import ConnectionsClient from "./connections-client"
import { AdRail } from "@/components/shared/AdRail"

export const dynamic = "force-dynamic"

export default async function ConnectionsPage() {
  const user = await requireUser()
  const data = await getFollowData(user.id)

  return (
    <ConnectionsClient
      following={data.following}
      followers={data.followers}
      suggestions={data.suggestions}
      adRail={<AdRail set="content" />}
    />
  )
}
