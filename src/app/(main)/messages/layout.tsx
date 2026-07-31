import { requireUser } from "@/modules/auth/session"
import { listConversations } from "@/modules/messaging/service"
import { MessagesShell } from "./MessagesShell"

export const dynamic = "force-dynamic"

export default async function MessagesLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  const conversations = await listConversations(user.id)

  return <MessagesShell conversations={conversations}>{children}</MessagesShell>
}
