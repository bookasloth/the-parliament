"use client"

import { GameController } from "@phosphor-icons/react"
import { ComingSoon } from "../admin-ui"

export default function AdminGamesPage() {
  return (
    <ComingSoon
      title="Games & Tournaments"
      description="Configure casual games, run inter-batch tournaments, and manage leaderboards — with the zero-karma policy enforced platform-wide."
      icon={<GameController className="h-7 w-7" weight="duotone" />}
      planned={[
        "Enable or disable individual games for the community",
        "Create and schedule inter-batch and inter-house tournaments",
        "Manage tournament brackets, scoring, and prize fulfilment",
        "Monitor leaderboards and handle fair-play reports",
        "Enforce the game karma hard-cap of zero (no karma farming)",
      ]}
    />
  )
}
