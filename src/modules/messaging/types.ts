export interface ConversationSummary {
  id: string
  otherUser: { id: string; name: string; username: string | null; avatar: string | null; isVerified: boolean }
  lastMessagePreview: string
  lastMessageAt: string | null
  unreadCount: number
  muted: boolean
}

export interface MessageReactionView {
  emoji: string
  userId: string
}

/** Minimal quoted-parent stub shown above a reply bubble. */
export interface ReplyStub {
  id: string
  senderId: string
  body: string
  deleted: boolean
}

export interface MessageView {
  id: string
  senderId: string
  body: string
  media: string[]
  createdAt: string
  editedAt: string | null
  deleted: boolean
  reactions: MessageReactionView[]
  replyTo: ReplyStub | null
}
