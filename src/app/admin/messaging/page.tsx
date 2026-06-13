"use client"

import { MessagesSquare } from "lucide-react"
import { ComingSoon } from "../admin-ui"

export default function AdminMessagingPage() {
  return (
    <ComingSoon
      title="Messaging Administration"
      description="Oversee direct-messaging health: spam controls, blocked-user management, and message-request policies."
      icon={<MessagesSquare className="h-7 w-7" />}
      planned={[
        "Configure messaging quotas per membership tier",
        "Review reported conversations with privacy-preserving tooling",
        "Manage platform-wide block and mute lists",
        "Tune spam detection rules for unsolicited outreach",
        "Set message-request policies for unconnected members",
      ]}
    />
  )
}
