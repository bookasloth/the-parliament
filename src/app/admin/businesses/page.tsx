"use client"

import { Storefront } from "@phosphor-icons/react"
import { ComingSoon } from "../admin-ui"

export default function AdminBusinessesPage() {
  return (
    <ComingSoon
      title="Business Directory"
      description="Moderate alumni-owned business listings, review submissions, and manage the verified business badge programme."
      icon={<Storefront className="h-7 w-7" weight="duotone" />}
      planned={[
        "Approve or reject new business listing submissions",
        "Verify business ownership claims with document review",
        "Moderate business reviews and ratings for authenticity",
        "Manage listing quotas tied to membership tiers",
        "Feature alumni businesses on the homepage and newsletter",
      ]}
    />
  )
}
