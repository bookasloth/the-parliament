"use client"

import { useState, useTransition } from "react"
import { Table, Thead, Tbody, Tr, Th, Td, StatusBadge, Button, EmptyState } from "../admin-ui"
import { setApprovalAction } from "./actions"

export interface ContributionRow {
  id: string
  name: string
  kind: string
  tier: string
  amount: string
  status: string
  showOnWall: boolean
  isAnonymous: boolean
  approved: boolean
  websiteUrl: string | null
  time: string
}

export default function ContributionsClient({ rows }: { rows: ContributionRow[] }) {
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)

  function toggle(id: string, approved: boolean) {
    setBusyId(id)
    startTransition(async () => {
      await setApprovalAction(id, approved)
      setBusyId(null)
    })
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No contributions yet"
        description="Paid contributions appear here. If you expected data, apply the contributions migration (prisma/migrations) to the database first."
      />
    )
  }

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Name</Th>
          <Th>Kind</Th>
          <Th>Tier</Th>
          <Th>Amount</Th>
          <Th>Status</Th>
          <Th>Wall</Th>
          <Th>When</Th>
          <Th>Action</Th>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((r) => {
          const canApprove = r.status === "paid" && r.showOnWall && !r.isAnonymous
          const busy = pending && busyId === r.id
          return (
            <Tr key={r.id}>
              <Td>
                {r.websiteUrl ? (
                  <a href={r.websiteUrl} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{r.name}</a>
                ) : (
                  r.name
                )}
              </Td>
              <Td className="capitalize">{r.kind}</Td>
              <Td className="capitalize">{r.tier}</Td>
              <Td className="tabular-nums">{r.amount}</Td>
              <Td><StatusBadge status={r.status} /></Td>
              <Td>
                {r.isAnonymous ? (
                  <span className="text-gray-500">anonymous</span>
                ) : !r.showOnWall ? (
                  <span className="text-gray-500">hidden</span>
                ) : r.approved ? (
                  <span className="text-emerald-600">live</span>
                ) : (
                  <span className="text-amber-600">pending</span>
                )}
              </Td>
              <Td className="text-gray-500">{r.time}</Td>
              <Td>
                {canApprove &&
                  (r.approved ? (
                    <Button variant="subtle" size="sm" disabled={busy} onClick={() => toggle(r.id, false)}>
                      {busy ? "…" : "Unpublish"}
                    </Button>
                  ) : (
                    <Button variant="primary" size="sm" disabled={busy} onClick={() => toggle(r.id, true)}>
                      {busy ? "…" : "Approve"}
                    </Button>
                  ))}
              </Td>
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}
