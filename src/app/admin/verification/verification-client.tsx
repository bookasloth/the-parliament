"use client"

import { useState, useEffect, useTransition } from "react"
import {
  ShieldCheck, Clock, CheckCircle, XCircle, FileText, Eye,
  CaretDown, CaretUp, User, EnvelopeSimple, IdentificationCard, X, UsersThree, PaperPlaneTilt,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, Button, useRowAction } from "../admin-ui"
import {
  approveVerificationAction, rejectVerificationAction,
  listSuggestedEndorsersAction, requestEndorsementAction,
} from "./actions"

export interface VReq {
  id: string
  name: string
  email: string
  username: string | null
  memberType: string
  method: string
  instituteEmail: string | null
  evidenceUrl: string | null
  submitted: string
  endorsements: { asked: number; endorsed: number; declined: number }
}

interface Suggested {
  userId: string
  name: string
  username: string | null
  photoUrl: string | null
  batchLabel: string | null
  houseName: string | null
  reason: string
  alreadyAsked: boolean
  endorsementStatus: string | null
}

function EndorseModal({ req, onClose }: { req: VReq; onClose: () => void }) {
  const [list, setList] = useState<Suggested[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [asked, setAsked] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, startLoad] = useTransition()
  const [, startAsk] = useTransition()

  // Load suggestions once on mount.
  useEffect(() => {
    startLoad(async () => {
      try {
        const rows = (await listSuggestedEndorsersAction(req.id)) as Suggested[]
        setList(rows)
        setAsked(new Set(rows.filter((r) => r.alreadyAsked).map((r) => r.userId)))
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : "Failed to load suggestions")
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [req.id])

  function ask(userId: string) {
    setBusyId(userId)
    startAsk(async () => {
      try {
        await requestEndorsementAction(req.id, userId)
        setAsked((s) => new Set(s).add(userId))
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : "Failed to send request")
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[5px] border border-gray-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-gray-200 p-4">
          <div>
            <h2 className="text-sm font-bold text-gray-900">Ask peers to endorse</h2>
            <p className="text-xs text-gray-500 mt-0.5">Batch & house-mates of {req.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="h-4.5 w-4.5" weight="duotone" /></button>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-2">
          {loading && <p className="py-8 text-center text-xs text-gray-500">Finding peers…</p>}
          {loadErr && <p className="rounded-[3px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadErr}</p>}
          {list && list.length === 0 && !loading && (
            <p className="py-8 text-center text-xs text-gray-500">No verified peers found for this candidate&apos;s batch or house.</p>
          )}
          {list?.map((s) => {
            const isAsked = asked.has(s.userId)
            const endorsed = s.endorsementStatus === "endorsed"
            return (
              <div key={s.userId} className="flex items-center gap-3 rounded-[4px] border border-gray-200 bg-gray-100/40 p-2.5">
                {s.photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.photoUrl} alt="" className="h-9 w-9 rounded-[4px] object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-blue-600 text-[11px] font-bold text-white">
                    {s.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-gray-800">{s.name}</p>
                  <p className="truncate text-[11px] text-gray-500">
                    {[s.batchLabel, s.houseName].filter(Boolean).join(" · ")} · {s.reason}
                  </p>
                </div>
                {endorsed ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle className="h-3.5 w-3.5" weight="duotone" /> Endorsed</span>
                ) : isAsked ? (
                  <span className="text-[11px] font-semibold text-gray-500">Asked</span>
                ) : (
                  <button
                    onClick={() => ask(s.userId)}
                    disabled={busyId === s.userId}
                    className="flex items-center gap-1 rounded-[3px] bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-500 disabled:opacity-50"
                  >
                    <PaperPlaneTilt className="h-3 w-3" weight="duotone" /> {busyId === s.userId ? "Sending…" : "Ask"}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

const methodLabel: Record<string, string> = {
  id_upload: "ID document upload",
  alumni_vouch: "Alumni vouch",
  institute_email: "Institute email",
}

export default function VerificationClient({
  requests, approved30d, rejected30d,
}: { requests: VReq[]; approved30d: number; rejected30d: number }) {
  const [expanded, setExpanded] = useState<string | null>(requests[0]?.id ?? null)
  const [done, setDone] = useState<Record<string, "approved" | "rejected">>({})
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")
  const [endorseFor, setEndorseFor] = useState<VReq | null>(null)
  const { run, isBusy } = useRowAction()

  const list = requests.filter((r) => !done[r.id])

  function approve(id: string) {
    run(id, {
      optimistic: () => { setDone((d) => ({ ...d, [id]: "approved" })); setExpanded(null) },
      revert: () => setDone((d) => { const n = { ...d }; delete n[id]; return n }),
      action: () => approveVerificationAction(id),
      success: "Approved & verified",
    })
  }

  function reject(id: string) {
    const reason = rejectReason
    run(id, {
      optimistic: () => {
        setDone((d) => ({ ...d, [id]: "rejected" }))
        setRejectFor(null)
        setRejectReason("")
        setExpanded(null)
      },
      revert: () => setDone((d) => { const n = { ...d }; delete n[id]; return n }),
      action: () => rejectVerificationAction(id, reason),
      success: "Verification rejected",
    })
  }

  return (
    <div>
      <PageHeader
        title="Verification Queue"
        description="Review alumni identity claims before granting verified status"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Pending Review" value={String(list.length)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Approved (30d)" value={String(approved30d)} icon={<CheckCircle className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Rejected (30d)" value={String(rejected30d)} icon={<XCircle className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
        <StatCard label="In Queue" value={String(requests.length)} icon={<ShieldCheck className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
      </div>

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="rounded-[4px] border border-gray-200 bg-white py-16 text-center">
            <ShieldCheck className="h-8 w-8 text-gray-400 mx-auto mb-2" weight="duotone" />
            <p className="text-sm font-medium text-gray-600">Queue is clear</p>
            <p className="text-xs text-gray-500 mt-1">No pending verification requests</p>
          </div>
        )}

        {list.map((req) => {
          const isOpen = expanded === req.id
          return (
            <div key={req.id} className="rounded-[4px] border border-gray-200 bg-white overflow-hidden transition-colors">
              <button onClick={() => setExpanded(isOpen ? null : req.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-gray-100/60 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-blue-600 text-xs font-bold text-white flex-shrink-0">
                  {req.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{req.name}</p>
                    <StatusBadge status="pending" />
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{methodLabel[req.method] ?? req.method} · submitted {req.submitted}</p>
                </div>
                {isOpen ? <CaretUp className="h-4 w-4 text-gray-500 flex-shrink-0" weight="duotone" /> : <CaretDown className="h-4 w-4 text-gray-500 flex-shrink-0" weight="duotone" />}
              </button>

              {isOpen && (
                <div className="border-t border-gray-200 p-4 sm:p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div className="rounded-[4px] bg-gray-50 border border-gray-200 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">Applicant</p>
                      <ul className="space-y-2 text-xs text-gray-700">
                        <li className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> {req.name} {req.username && <span className="text-gray-500">@{req.username}</span>}</li>
                        <li className="flex items-center gap-2"><EnvelopeSimple className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> {req.email}</li>
                        <li className="flex items-center gap-2"><IdentificationCard className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> {methodLabel[req.method] ?? req.method}</li>
                        {req.instituteEmail && (
                          <li className="flex items-center gap-2"><EnvelopeSimple className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> Institute email: <span className="text-gray-800">{req.instituteEmail}</span></li>
                        )}
                        <li className="flex items-center gap-2 capitalize"><ShieldCheck className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> {req.memberType}</li>
                      </ul>
                    </div>

                    <div className="rounded-[4px] bg-gray-50 border border-gray-200 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">Submitted evidence</p>
                      {req.evidenceUrl ? (
                        <a href={req.evidenceUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-[3px] bg-white border border-gray-200 px-2.5 py-2 hover:border-blue-700">
                          <FileText className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" weight="duotone" />
                          <span className="flex-1 text-xs text-gray-700 truncate">View uploaded document</span>
                          <Eye className="h-3.5 w-3.5 text-blue-600" weight="duotone" />
                        </a>
                      ) : (
                        <p className="text-xs text-gray-500 italic">No document uploaded ({methodLabel[req.method] ?? req.method})</p>
                      )}
                    </div>
                  </div>

                  {rejectFor === req.id ? (
                    <div className="rounded-[4px] border border-rose-200 bg-rose-50/30 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-rose-700">Rejection reason (sent to applicant)</p>
                        <button onClick={() => setRejectFor(null)} className="text-rose-500 hover:text-rose-700"><X className="h-4 w-4" weight="duotone" /></button>
                      </div>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder="e.g. Documents do not match the claimed batch year. Please re-submit with a valid transfer certificate."
                        className="w-full rounded-[4px] border border-rose-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-100 resize-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button variant="danger" size="sm" onClick={() => reject(req.id)} disabled={isBusy(req.id) || rejectReason.trim().length < 3}>
                          {isBusy(req.id) ? "Rejecting…" : "Confirm Rejection"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRejectFor(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <button onClick={() => approve(req.id)} disabled={isBusy(req.id)}
                        className="flex items-center gap-1.5 rounded-[4px] bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                        <CheckCircle className="h-3.5 w-3.5" weight="duotone" /> {isBusy(req.id) ? "Working…" : "Approve & Verify"}
                      </button>
                      <button onClick={() => setRejectFor(req.id)} disabled={isBusy(req.id)}
                        className="flex items-center gap-1.5 rounded-[4px] border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                        <XCircle className="h-3.5 w-3.5" weight="duotone" /> Reject
                      </button>
                      <button onClick={() => setEndorseFor(req)} disabled={isBusy(req.id)}
                        className="flex items-center gap-1.5 rounded-[4px] border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                        <UsersThree className="h-3.5 w-3.5" weight="duotone" /> Endorsements
                      </button>
                      {req.endorsements.asked > 0 && (
                        <span className="text-[11px] font-semibold text-gray-500">
                          {req.endorsements.endorsed}/{req.endorsements.asked} endorsed
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {endorseFor && <EndorseModal req={endorseFor} onClose={() => setEndorseFor(null)} />}
    </div>
  )
}
