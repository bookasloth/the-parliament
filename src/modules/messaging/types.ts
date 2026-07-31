export interface ConversationSummary {
  id: string
  otherUser: { id: string; name: string; username: string | null; avatar: string | null }
  lastMessagePreview: string
  lastMessageAt: string | null
  unreadCount: number
}

export interface MessageView {
  id: string
  senderId: string
  body: string
  media: string[]
  createdAt: string
  editedAt: string | null
  deleted: boolean
}
