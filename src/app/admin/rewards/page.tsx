"use client"

import { Trophy } from "lucide-react"
import { ComingSoon } from "../admin-ui"

export default function AdminRewardsPage() {
  return (
    <ComingSoon
      title="Badges & Rewards"
      description="Design achievement badges, configure reward rules, and recognize outstanding contributors across the alumni network."
      icon={<Trophy className="h-7 w-7" />}
      planned={[
        "Create and edit achievement badges with custom criteria",
        "Configure automatic badge awards tied to karma milestones",
        "Run seasonal recognition campaigns (Alumni of the Month)",
        "Manage physical reward fulfilment for top contributors",
        "Audit badge grants and revoke incorrectly awarded badges",
      ]}
    />
  )
}
