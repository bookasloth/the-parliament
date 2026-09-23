"use client"

import { useState, useTransition } from "react"
import { Table, Thead, Tbody, Tr, Th, Td, StatusBadge, Button, EmptyState } from "../admin-ui"
import { updateIdCardOrderAction } from "./actions"

export interface IdCardOrderRow {
  id: string
  member: string
  username: string | null
  qty: number
  amount: string
  status: string
  recipientName: string
  phone: string
  address: string
  trackingId: string | null
  time: string
}

// Fulfilment pipeline: paid → printing → shipped → delivered.
const NEXT: Record<string, { status: "printing" | "shipped" | "delivered"; label: string } | undefined> = {
  paid: { status: "printing", label: "Mark printing" },
  printing: { status: "shipped", label: "Mark shipped" },
  shipped: { status: "delivered", label: "Mark delivered" },
}

export default function IdCardsClient({ rows }: { rows: IdCardOrderRow[] }) {
  const [pending, startTransition] = useTransition()
  const [busyId, setBusyId] = useState<string | null>(null)
  const [tracking, setTracking] = useState<Record<string, string>>({})

  function advance(row: IdCardOrderRow) {
    const next = NEXT[row.status]
    if (!next) return
    setBusyId(row.id)
    startTransition(async () => {
      await updateIdCardOrderAction({
        id: row.id,
        status: next.status,
        trackingId: next.status === "shipped" ? tracking[row.id] : undefined,
      })
      setBusyId(null)
    })
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No card orders yet"
        description="Paid printed-card orders appear here. If you expected data, apply the id_card_orders migration (prisma/migrations) to the database first."
      />
    )
  }

  return (
    <Table>
      <Thead>
        <Tr>
          <Th>Member</Th>
          <Th>Qty</Th>
          <Th>Amount</Th>
          <Th>Ship to</Th>
          <Th>Status</Th>
          <Th>Tracking</Th>
          <Th>When</Th>
          <Th>Action</Th>
        </Tr>
      </Thead>
      <Tbody>
        {rows.map((r) => {
          const next = NEXT[r.status]
          const busy = pending && busyId === r.id
          return (
            <Tr key={r.id}>
              <Td>
                {r.username ? (
                  <a href={`/${r.username}`} target="_blank" rel="noopener noreferrer" className="text-sky-600 hover:underline">{r.member}</a>
                ) : (
                  r.member
                )}
              </Td>
              <Td className="tabular-nums">{r.qty}</Td>
              <Td className="tabular-nums">{r.amount}</Td>
              <Td className="max-w-[260px]">
                <div className="text-gray-200">{r.recipientName} · {r.phone}</div>
                <div className="text-xs text-gray-500">{r.address}</div>
              </Td>
              <Td><StatusBadge status={r.status} /></Td>
              <Td>
                {r.trackingId ? (
                  <span className="text-gray-300">{r.trackingId}</span>
                ) : r.status === "printing" ? (
                  <input
                    value={tracking[r.id] ?? ""}
                    onChange={(e) => setTracking((t) => ({ ...t, [r.id]: e.target.value }))}
                    placeholder="Tracking id"
                    className="w-32 rounded border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-100"
                  />
                ) : (
                  <span className="text-gray-600">—</span>
                )}
              </Td>
              <Td className="text-gray-500">{r.time}</Td>
              <Td>
                {next && (
                  <Button variant="primary" size="sm" disabled={busy} onClick={() => advance(r)}>
                    {busy ? "…" : next.label}
                  </Button>
                )}
              </Td>
            </Tr>
          )
        })}
      </Tbody>
    </Table>
  )
}
