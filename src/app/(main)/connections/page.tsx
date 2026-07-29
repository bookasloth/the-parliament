import { requireUser } from "@/modules/auth/session"
import { getConnectionsData } from "@/modules/connections/service"
import ConnectionsClient from "./connections-client"

export const dynamic = "force-dynamic"

export default async function ConnectionsPage() {
  const user = await requireUser()
  const data = await getConnectionsData(user.id)

  return (
    <ConnectionsClient
      connected={data.connected}
      pending={data.pending}
      received={data.received}
      suggestions={data.suggestions}
    />
  )
}
