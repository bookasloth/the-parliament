"use client"

import { useState, useTransition } from "react"
import { Flag } from "@phosphor-icons/react"
import { PageHeader, StatusBadge, Button, SectionHeader, Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "../admin-ui"
import { COUNTRIES, flagRefUrl } from "@/config/flag-challenge"
import { queueFlagAction, removeFlagAction } from "./actions"

export interface QueueRow {
  id: string
  code: string
  name: string
  date: string
  posted: boolean
  submissions: number
}

function tomorrowIso(): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

export default function FlagChallengeClient({ queue }: { queue: QueueRow[] }) {
  const [code, setCode] = useState(COUNTRIES[0].code)
  const [date, setDate] = useState(tomorrowIso())
  const [err, setErr] = useState<string | null>(null)
  const [pending, start] = useTransition()

  function add() {
    setErr(null)
    start(async () => {
      try {
        await queueFlagAction(code, date)
        setDate(tomorrowIso())
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Couldn't queue that flag")
      }
    })
  }

  function remove(id: string) {
    start(async () => {
      try {
        await removeFlagAction(id)
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Couldn't remove")
      }
    })
  }

  return (
    <div>
      <PageHeader title="Flag Challenge" description="Queue the daily draw-the-flag game. A cron posts the day's flag each morning." />

      <div className="mb-6 rounded-xl border border-zinc-800 bg-[#111113] p-4">
        <SectionHeader title="Add to queue" />
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            Flag
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={flagRefUrl(code)} alt="" className="h-6 w-9 rounded border border-zinc-700 object-cover" />
              <select
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
              >
                {COUNTRIES.map((c) => (
                  <option key={c.code} value={c.code}>{c.name}</option>
                ))}
              </select>
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm text-zinc-400">
            Date
            <input
              type="date"
              value={date}
              min={tomorrowIso()}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-zinc-100"
            />
          </label>
          <Button onClick={add} disabled={pending}>{pending ? "Saving…" : "Queue flag"}</Button>
        </div>
        {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
      </div>

      {queue.length === 0 ? (
        <EmptyState icon={<Flag weight="duotone" />} title="Nothing queued" description="Add a flag above to schedule the first daily challenge." />
      ) : (
        <Table>
          <Thead>
            <Tr>
              <Th>Date</Th>
              <Th>Flag</Th>
              <Th>Status</Th>
              <Th>Drawings</Th>
              <Th> </Th>
            </Tr>
          </Thead>
          <Tbody>
            {queue.map((r) => (
              <Tr key={r.id}>
                <Td>{r.date}</Td>
                <Td>
                  <span className="flex items-center gap-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={flagRefUrl(r.code)} alt="" className="h-5 w-8 rounded border border-zinc-700 object-cover" />
                    {r.name}
                  </span>
                </Td>
                <Td><StatusBadge status={r.posted ? "posted" : "scheduled"} /></Td>
                <Td>{r.submissions}</Td>
                <Td>
                  {!r.posted && (
                    <Button variant="danger" size="sm" onClick={() => remove(r.id)} disabled={pending}>Remove</Button>
                  )}
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      )}
    </div>
  )
}
