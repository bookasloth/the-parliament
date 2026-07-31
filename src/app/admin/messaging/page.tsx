"use client"

import { ChatsCircle } from "@phosphor-icons/react"
import { ComingSoon } from "../admin-ui"

export default function AdminMessagingPage() {
  return (
    <ComingSoon
      title="Messaging Administration"
      description="Oversee direct-messaging health: spam controls, blocked-user management, and message-request policies."
      icon={<ChatsCircle className="h-7 w-7" weight="duotone" />}
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
