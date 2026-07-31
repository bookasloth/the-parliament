"use client"

import { ChartBar } from "@phosphor-icons/react"
import { ComingSoon } from "../admin-ui"

export default function AdminAnalyticsPage() {
  return (
    <ComingSoon
      title="Platform Analytics"
      description="Deep-dive analytics across engagement, retention, growth funnels, and content performance for the entire alumni network."
      icon={<ChartBar className="h-7 w-7" weight="duotone" />}
      planned={[
        "Daily / weekly / monthly active user trends with cohort retention",
        "Engagement funnels: signup, onboarding completion, first post, first connection",
        "Content performance leaderboards across posts, groups, and events",
        "Batch-wise and house-wise participation breakdowns",
        "Exportable reports for NNAWCA committee meetings",
      ]}
    />
  )
}
