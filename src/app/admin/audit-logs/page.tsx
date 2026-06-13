"use client"

import { ScrollText } from "lucide-react"
import { ComingSoon } from "../admin-ui"

export default function AdminAuditLogsPage() {
  return (
    <ComingSoon
      title="Audit Logs"
      description="A tamper-evident trail of every administrative action — who did what, when, and from where."
      icon={<ScrollText className="h-7 w-7" />}
      planned={[
        "Chronological log of all admin and moderator actions",
        "Filter by actor, action type, target entity, and date range",
        "IP address and session metadata for each entry",
        "Immutable retention policy with scheduled exports",
        "Alerts for sensitive actions (deletions, role changes, key rotations)",
      ]}
    />
  )
}
