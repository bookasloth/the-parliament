import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { getMessages, getConversationMeta } from "@/modules/messaging/service"
import { isBirthdayNear, ageYears } from "@/config/chat-themes"
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

    // Theme context: birthday of either participant + under-18 (minor) gate for
    // the Valentine theme. In an alumni network anyone under 18 is a current
    // student, so age alone is the robust signal (DOB is always present).
    const people = await prisma.user.findMany({
      where: { id: { in: [user.id, meta.otherUser.id] } },
      select: { id: true, dateOfBirth: true },
    })
    const viewer = people.find((p) => p.id === user.id)
    const birthday = people.some((p) => isBirthdayNear(p.dateOfBirth))
    const suppressValentine = !!viewer?.dateOfBirth && ageYears(viewer.dateOfBirth) < 18

    return (
      <ConversationView
        conversationId={conversationId}
        viewerId={user.id}
        otherUser={meta.otherUser}
        initialMessages={messages}
        initialOtherLastReadAt={meta.otherLastReadAt}
        initialMuted={meta.muted}
        initialBlocked={meta.blocked}
        birthday={birthday}
        suppressValentine={suppressValentine}
      />
    )
  } catch (e) {
    if (e instanceof ForbiddenError) notFound()
    throw e
  }
}
