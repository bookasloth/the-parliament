"use client"

import { useState } from "react"
import { WhatsappLogo, Broadcast, CheckCircle, WarningCircle, Plus, Trash, Users, Drop } from "@phosphor-icons/react"
import { PageHeader, StatCard, Button, Table, Thead, Tbody, Tr, Th, Td, EmptyState, useToast, useRowAction } from "../admin-ui"
import { previewGroupAudienceAction, sendGroupWhatsAppAction, markBloodRequestFulfilledAction } from "./actions"

export interface GroupOption {
  id: string
  name: string
  type: string
  members: number
}

export interface BroadcastRow {
  id: string
  campaignName: string
  group: string
  recipientCount: number
  sentCount: number
  failedCount: number
  createdAt: string
}

const inputCls =
  "w-full rounded-[3px] border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600"

export interface BloodRow {
  id: string
  requester: string
  bloodGroup: string
  patient: string
  city: string
  hospital: string
  contact: string
  recipientCount: number
  sentCount: number
  failedCount: number
  status: string
  createdAt: string
}

export default function WhatsAppClient({
  configured,
  groups,
  broadcasts,
  bloodRequests,
}: {
  configured: boolean
  groups: GroupOption[]
  broadcasts: BroadcastRow[]
  bloodRequests: BloodRow[]
}) {
  const toast = useToast()
  const { run, isBusy } = useRowAction()
  const [fulfilled, setFulfilled] = useState<Record<string, boolean>>({})
  const [groupId, setGroupId] = useState("")
  const [campaignName, setCampaignName] = useState("")
  const [params, setParams] = useState<string[]>([])
  const [audience, setAudience] = useState<{ total: number; reachable: number } | null>(null)
  const [previewing, setPreviewing] = useState(false)
  const [sending, setSending] = useState(false)

  const selected = groups.find((g) => g.id === groupId)

  function onGroupChange(id: string) {
    setGroupId(id)
    setAudience(null)
  }

  async function preview() {
    if (!groupId) return
    setPreviewing(true)
    try {
      setAudience(await previewGroupAudienceAction(groupId))
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Preview failed")
    } finally {
      setPreviewing(false)
    }
  }

  async function send() {
    if (!groupId || !campaignName.trim()) {
      toast.error("Pick a group and enter a campaign name")
      return
    }
    if (!confirm(`Send WhatsApp campaign "${campaignName}" to ${selected?.name ?? "this group"}?`)) return
    setSending(true)
    try {
      const r = await sendGroupWhatsAppAction({ groupId, campaignName: campaignName.trim(), templateParams: params })
      if (r.skipped) {
        toast.error(`AiSensy not configured — 0 of ${r.recipientCount} sent. Add AISENSY_API_KEY.`)
      } else {
        toast.success(`Sent ${r.sent} of ${r.recipientCount}${r.failed ? `, ${r.failed} failed` : ""}`)
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="WhatsApp Broadcast"
        description="Send an approved AiSensy utility template to a group's opted-in members."
      />

      {!configured && (
        <div className="flex items-start gap-3 rounded-[5px] border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          <WarningCircle weight="duotone" className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">AiSensy not configured.</p>
            <p className="text-amber-700">
              Set <code className="rounded bg-amber-100 px-1">AISENSY_API_KEY</code> in the environment. Everything else
              is wired — sends start working the moment the key lands. Until then a broadcast is recorded but delivers
              nothing.
            </p>
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Groups" value={String(groups.length)} icon={<Users weight="duotone" />} accent="sky" />
        <StatCard
          label="Reachable in selection"
          value={audience ? String(audience.reachable) : "—"}
          icon={<WhatsappLogo weight="duotone" />}
          accent="emerald"
        />
        <StatCard
          label="Recent broadcasts"
          value={String(broadcasts.length)}
          icon={<Broadcast weight="duotone" />}
          accent="indigo"
        />
      </div>

      {/* Composer */}
      <div className="space-y-4 rounded-[5px] border border-gray-200 bg-white p-5">
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block text-sm">
            <span className="mb-1.5 block text-gray-600">Group (audience)</span>
            <select value={groupId} onChange={(e) => onGroupChange(e.target.value)} className={inputCls}>
              <option value="">Select a group…</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} · {g.type} ({g.members})
                </option>
              ))}
            </select>
          </label>

          <label className="block text-sm">
            <span className="mb-1.5 block text-gray-600">AiSensy campaign name</span>
            <input
              value={campaignName}
              onChange={(e) => setCampaignName(e.target.value)}
              placeholder="e.g. nnawca_utility_update"
              className={inputCls}
            />
            <span className="mt-1 block text-xs text-gray-500">
              Must match a live API campaign in AiSensy bound to an approved <b>utility</b> template.
            </span>
          </label>
        </div>

        {/* Template params */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600">
              Template parameters <span className="text-gray-400">(fill {"{{1}}, {{2}}"}… in order)</span>
            </span>
            <Button variant="subtle" size="sm" onClick={() => setParams((p) => [...p, ""])}>
              <Plus weight="bold" className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
          {params.length === 0 && (
            <p className="text-xs text-gray-400">No parameters — for a template with no variables.</p>
          )}
          {params.map((val, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="w-10 shrink-0 text-center text-xs text-gray-400">{`{{${i + 1}}}`}</span>
              <input
                value={val}
                onChange={(e) => setParams((p) => p.map((v, j) => (j === i ? e.target.value : v)))}
                className={inputCls}
              />
              <button
                onClick={() => setParams((p) => p.filter((_, j) => j !== i))}
                className="rounded-[3px] p-1.5 text-gray-400 hover:bg-gray-100 hover:text-rose-600"
                aria-label="Remove parameter"
              >
                <Trash weight="bold" className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3 border-t border-gray-200 pt-4">
          <Button variant="ghost" onClick={preview} disabled={!groupId || previewing}>
            {previewing ? "Checking…" : "Preview audience"}
          </Button>
          {audience && (
            <span className="text-sm text-gray-600">
              <CheckCircle weight="fill" className="mr-1 inline h-4 w-4 text-emerald-600" />
              <b className="text-gray-900">{audience.reachable}</b> reachable of {audience.total} active members
              <span className="text-gray-400"> (opted-in + valid number)</span>
            </span>
          )}
          <div className="ml-auto">
            <Button onClick={send} disabled={!groupId || !campaignName.trim() || sending}>
              <WhatsappLogo weight="duotone" className="mr-1.5 h-4 w-4" />
              {sending ? "Sending…" : "Send broadcast"}
            </Button>
          </div>
        </div>
      </div>

      {/* History */}
      <div className="rounded-[5px] border border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-5 py-3 text-sm font-semibold text-gray-800">Recent broadcasts</div>
        {broadcasts.length === 0 ? (
          <EmptyState
            icon={<Broadcast weight="duotone" />}
            title="No broadcasts yet"
            description="Sent campaigns appear here."
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Campaign</Th>
                <Th>Group</Th>
                <Th>Recipients</Th>
                <Th>Sent</Th>
                <Th>Failed</Th>
                <Th>When</Th>
              </Tr>
            </Thead>
            <Tbody>
              {broadcasts.map((b) => (
                <Tr key={b.id}>
                  <Td>{b.campaignName}</Td>
                  <Td>{b.group}</Td>
                  <Td>{b.recipientCount}</Td>
                  <Td className="text-emerald-600">{b.sentCount}</Td>
                  <Td className={b.failedCount ? "text-rose-600" : ""}>{b.failedCount}</Td>
                  <Td className="text-gray-500">{b.createdAt}</Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      {/* Blood requests (member-raised) */}
      <div className="rounded-[5px] border border-gray-200 bg-white">
        <div className="flex items-center gap-2 border-b border-gray-200 px-5 py-3 text-sm font-semibold text-gray-800">
          <Drop weight="duotone" className="h-4 w-4 text-rose-500" /> Blood requests
        </div>
        {bloodRequests.length === 0 ? (
          <EmptyState
            icon={<Drop weight="duotone" />}
            title="No blood requests yet"
            description="Member-raised requests appear here."
          />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Group</Th>
                <Th>Patient</Th>
                <Th>City</Th>
                <Th>Hospital</Th>
                <Th>Contact</Th>
                <Th>By</Th>
                <Th>Reach</Th>
                <Th>Sent</Th>
                <Th>Status</Th>
                <Th>When</Th>
                <Th> </Th>
              </Tr>
            </Thead>
            <Tbody>
              {bloodRequests.map((b) => {
                const status = fulfilled[b.id] ? "fulfilled" : b.status
                return (
                  <Tr key={b.id}>
                    <Td><span className="font-semibold text-rose-600">{b.bloodGroup}</span></Td>
                    <Td>{b.patient}</Td>
                    <Td>{b.city}</Td>
                    <Td>{b.hospital}</Td>
                    <Td>{b.contact}</Td>
                    <Td>{b.requester}</Td>
                    <Td>{b.recipientCount}</Td>
                    <Td className="text-emerald-600">{b.sentCount}{b.failedCount ? <span className="text-rose-600"> / {b.failedCount}✕</span> : null}</Td>
                    <Td>
                      <span className={status === "fulfilled" ? "text-emerald-600" : "text-gray-600"}>{status}</span>
                    </Td>
                    <Td className="text-gray-500">{b.createdAt}</Td>
                    <Td>
                      {status !== "fulfilled" && (
                        <Button
                          variant="subtle"
                          size="sm"
                          disabled={isBusy(b.id)}
                          onClick={() =>
                            run(b.id, {
                              action: async () => {
                                const r = await markBloodRequestFulfilledAction(b.id)
                                if (!r.ok) throw new Error("Failed")
                              },
                              optimistic: () => setFulfilled((f) => ({ ...f, [b.id]: true })),
                              revert: () => setFulfilled((f) => ({ ...f, [b.id]: false })),
                              success: "Marked fulfilled",
                            })
                          }
                        >
                          Mark fulfilled
                        </Button>
                      )}
                    </Td>
                  </Tr>
                )
              })}
            </Tbody>
          </Table>
        )}
      </div>
    </div>
  )
}
