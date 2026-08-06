export interface ConversationSummary {
  id: string
  otherUser: { id: string; name: string; username: string | null; avatar: string | null; isVerified: boolean }
  lastMessagePreview: string
  lastMessageAt: string | null
  unreadCount: number
  muted: boolean
  // "Deleted" (cleared) by the viewer and nothing new since. Kept in the list so
  // the client stays subscribed to its Realtime channel; hidden from the sidebar
  // until the peer's next message reveals it. See MessagesShell.
  hidden?: boolean
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

// Lifecycle of a call-log message. "ringing" flips to one terminal state:
// completed (was answered — has durationSec) or missed (never connected).
export type CallStatus = "ringing" | "completed" | "missed"

export interface CallData {
  status: CallStatus
  audioOnly: boolean
  endedAt: string | null
  durationSec: number | null
}

export interface MessageView {
  id: string
  senderId: string
  /** "text" for a normal message, "call" for a call-log entry (see call). */
  type: "text" | "call"
  body: string
  media: string[]
  createdAt: string
  editedAt: string | null
  deleted: boolean
  reactions: MessageReactionView[]
  replyTo: ReplyStub | null
  /** Present only when type === "call". */
  call: CallData | null
}
