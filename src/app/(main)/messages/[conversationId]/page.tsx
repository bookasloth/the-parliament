import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { getMessages, getConversationMeta } from "@/modules/messaging/service"
import { ForbiddenError } from "@/lib/errors"
import ConversationView from "./ConversationView"

export const dynamic = "force-dynamic"

export default async function ConversationPage({ params }: { params: Promise<{ conversationId: string }> }) {
  const { conversationId } = await params
  const user = await requireUser()

  try {
    const [messages, meta] = await Promise.all([
      getMessages(user.id, conversationId),
      getConversationMeta(user.id, conversationId),
    ])
    return (
      <ConversationView
        conversationId={conversationId}
        viewerId={user.id}
        otherUser={meta.otherUser}
        initialMessages={messages}
        initialOtherLastReadAt={meta.otherLastReadAt}
      />
    )
  } catch (e) {
    if (e instanceof ForbiddenError) notFound()
    throw e
  }
}
