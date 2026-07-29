import { requireUser } from "@/modules/auth/session"
import { getConnectionsData } from "@/modules/connections/service"
import ConnectionsClient, {
  MOCK_CONNECTED,
  MOCK_PENDING,
  MOCK_RECEIVED,
  MOCK_SUGGESTIONS,
} from "./connections-client"

export const dynamic = "force-dynamic"

export default async function ConnectionsPage() {
  const user = await requireUser()
  const data = await getConnectionsData(user.id)

  return (
    <ConnectionsClient
      connected={[...data.connected, ...MOCK_CONNECTED]}
      pending={[...data.pending, ...MOCK_PENDING]}
      received={[...data.received, ...MOCK_RECEIVED]}
      suggestions={[...data.suggestions, ...MOCK_SUGGESTIONS]}
    />
  )
}
