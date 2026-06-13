"use client"

import { Briefcase } from "lucide-react"
import { ComingSoon } from "../admin-ui"

export default function AdminJobsPage() {
  return (
    <ComingSoon
      title="Job Board"
      description="Manage job postings shared by alumni, employer accounts, and application analytics for the network's career hub."
      icon={<Briefcase className="h-7 w-7" />}
      planned={[
        "Review and approve job postings before they go live",
        "Manage posting quotas per membership tier",
        "Flag and remove expired or fraudulent listings",
        "Track application counts and placement success stories",
        "Curate a weekly opportunities digest for the newsletter",
      ]}
    />
  )
}
