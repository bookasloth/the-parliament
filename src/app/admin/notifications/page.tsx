"use client"

import { Megaphone } from "lucide-react"
import { ComingSoon } from "../admin-ui"

export default function AdminNotificationsPage() {
  return (
    <ComingSoon
      title="Announcements & Broadcasts"
      description="Send platform-wide announcements, targeted notifications, and email campaigns to segments of the alumni network."
      icon={<Megaphone className="h-7 w-7" />}
      planned={[
        "Compose platform-wide banner announcements with scheduling",
        "Send targeted push and email notifications by batch, house, or plan",
        "Build the monthly alumni digest newsletter from top content",
        "Track open rates and click-through performance",
        "Manage notification templates for system events",
      ]}
    />
  )
}
