export interface ChatMessage {
  id: string
  sender: "me" | "them"
  text: string
  time: string
  /** When set, a centered date divider is shown above this message */
  dateDivider?: string
}

export interface ChatConversation {
  id: string
  name: string
  subtitle: string
  avatar: string
  preview: string
  unread?: number
  online?: boolean
  houseColor?: string
  messages: ChatMessage[]
}

export const conversations: ChatConversation[] = [
  {
    id: "durga-laxne",
    name: "Durga Laxne",
    subtitle: "23rd Batch (2008-2015)",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop&crop=face",
    preview: "New Message",
    unread: 1,
    online: true,
    houseColor: "#70ad47",
    messages: [
      { id: "m1", sender: "them", text: "Hi! Are you joining the alumni reunion this year?", time: "10:05 AM", dateDivider: "Jul 16, 2026, 10:05 AM" },
      { id: "m2", sender: "me", text: "Yes, planning to! Helping organise it actually.", time: "10:08 AM" },
      { id: "m3", sender: "them", text: "That's wonderful. Let me know how I can help.", time: "10:10 AM" },
      { id: "m4", sender: "them", text: "New Message", time: "10:12 AM" },
    ],
  },
  {
    id: "shubham-datarkar",
    name: "Shubham Datarkar",
    subtitle: "21st Batch (2006-2013)",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop&crop=face",
    preview: "Thank you for....",
    online: false,
    houseColor: "#2563EB",
    messages: [
      { id: "m1", sender: "them", text: "Night signs creeping yielding green Seasons.", time: "6:15 AM", dateDivider: "Jul 16, 2026, 06:15 AM" },
      { id: "m2", sender: "me", text: "Creeping earth under was You're without which image.", time: "6:20 AM" },
      { id: "m3", sender: "them", text: "Thank you for prompt response", time: "12:16 PM" },
    ],
  },
  {
    id: "neha-gupta",
    name: "Neha Gupta",
    subtitle: "20th Batch (2005-2012)",
    avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=200&h=200&fit=crop&crop=face",
    preview: "Loved your post about the cricket memories!",
    online: true,
    houseColor: "#D4A017",
    messages: [
      { id: "m1", sender: "them", text: "Loved your post about the cricket memories!", time: "9:15 AM", dateDivider: "Jul 15, 2026, 09:15 AM" },
      { id: "m2", sender: "me", text: "Haha thanks! Those JNV days were something else.", time: "9:18 AM" },
    ],
  },
  {
    id: "dr-amit-verma",
    name: "Dr. Amit Verma",
    subtitle: "15th Batch (2000-2007)",
    avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=200&h=200&fit=crop&crop=face",
    preview: "See you at the medical camp.",
    online: false,
    houseColor: "#8B5CF6",
    messages: [
      { id: "m1", sender: "them", text: "We're organising a free medical camp at the campus next month.", time: "Yesterday", dateDivider: "Jul 14, 2026" },
      { id: "m2", sender: "me", text: "Count me in. I'll help coordinate volunteers.", time: "Yesterday" },
      { id: "m3", sender: "them", text: "See you at the medical camp.", time: "Yesterday" },
    ],
  },
]

export function getConversation(id: string): ChatConversation | undefined {
  return conversations.find((c) => c.id === id)
}
