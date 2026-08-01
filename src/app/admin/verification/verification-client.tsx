"use client"

import { useState, useTransition } from "react"
import {
  ShieldCheck, Clock, CheckCircle, XCircle, FileText, Eye,
  CaretDown, CaretUp, User, EnvelopeSimple, IdentificationCard, X,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, Button } from "../admin-ui"
import { approveVerificationAction, rejectVerificationAction } from "./actions"

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
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  const list = requests.filter((r) => !done[r.id])

  function approve(id: string) {
    setError(null)
    startTransition(async () => {
      try {
        await approveVerificationAction(id)
        setDone((d) => ({ ...d, [id]: "approved" }))
        setExpanded(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Approve failed")
      }
    })
  }

  function reject(id: string) {
    setError(null)
    startTransition(async () => {
      try {
        await rejectVerificationAction(id, rejectReason)
        setDone((d) => ({ ...d, [id]: "rejected" }))
        setRejectFor(null)
        setRejectReason("")
        setExpanded(null)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Reject failed")
      }
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

      {error && (
        <div className="mb-4 rounded-lg border border-rose-900 bg-rose-950/40 px-4 py-2.5 text-xs font-semibold text-rose-300">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {list.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-[#111113] py-16 text-center">
            <ShieldCheck className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
            <p className="text-sm font-medium text-zinc-400">Queue is clear</p>
            <p className="text-xs text-zinc-500 mt-1">No pending verification requests</p>
          </div>
        )}

        {list.map((req) => {
          const isOpen = expanded === req.id
          return (
            <div key={req.id} className="rounded-lg border border-zinc-800 bg-[#111113] overflow-hidden transition-colors">
              <button onClick={() => setExpanded(isOpen ? null : req.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-900/60 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white flex-shrink-0">
                  {req.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-200">{req.name}</p>
                    <StatusBadge status="pending" />
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">{methodLabel[req.method] ?? req.method} · submitted {req.submitted}</p>
                </div>
                {isOpen ? <CaretUp className="h-4 w-4 text-zinc-500 flex-shrink-0" weight="duotone" /> : <CaretDown className="h-4 w-4 text-zinc-500 flex-shrink-0" weight="duotone" />}
              </button>

              {isOpen && (
                <div className="border-t border-zinc-800 p-4 sm:p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 mb-3">Applicant</p>
                      <ul className="space-y-2 text-xs text-zinc-300">
                        <li className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> {req.name} {req.username && <span className="text-zinc-500">@{req.username}</span>}</li>
                        <li className="flex items-center gap-2"><EnvelopeSimple className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> {req.email}</li>
                        <li className="flex items-center gap-2"><IdentificationCard className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> {methodLabel[req.method] ?? req.method}</li>
                        {req.instituteEmail && (
                          <li className="flex items-center gap-2"><EnvelopeSimple className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> Institute email: <span className="text-zinc-200">{req.instituteEmail}</span></li>
                        )}
                        <li className="flex items-center gap-2 capitalize"><ShieldCheck className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> {req.memberType}</li>
                      </ul>
                    </div>

                    <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 mb-3">Submitted evidence</p>
                      {req.evidenceUrl ? (
                        <a href={req.evidenceUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-2 rounded-md bg-[#111113] border border-zinc-800 px-2.5 py-2 hover:border-blue-700">
                          <FileText className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" weight="duotone" />
                          <span className="flex-1 text-xs text-zinc-300 truncate">View uploaded document</span>
                          <Eye className="h-3.5 w-3.5 text-blue-400" weight="duotone" />
                        </a>
                      ) : (
                        <p className="text-xs text-zinc-500 italic">No document uploaded ({methodLabel[req.method] ?? req.method})</p>
                      )}
                    </div>
                  </div>

                  {rejectFor === req.id ? (
                    <div className="rounded-lg border border-rose-900 bg-rose-950/30 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-bold text-rose-300">Rejection reason (sent to applicant)</p>
                        <button onClick={() => setRejectFor(null)} className="text-rose-500 hover:text-rose-300"><X className="h-4 w-4" weight="duotone" /></button>
                      </div>
                      <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        rows={2}
                        placeholder="e.g. Documents do not match the claimed batch year. Please re-submit with a valid transfer certificate."
                        className="w-full rounded-lg border border-rose-900 bg-[#111113] px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-950 resize-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button variant="danger" size="sm" onClick={() => reject(req.id)} disabled={pending || rejectReason.trim().length < 3}>
                          {pending ? "Rejecting…" : "Confirm Rejection"}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => setRejectFor(null)}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button onClick={() => approve(req.id)} disabled={pending}
                        className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                        <CheckCircle className="h-3.5 w-3.5" weight="duotone" /> {pending ? "Working…" : "Approve & Verify"}
                      </button>
                      <button onClick={() => setRejectFor(req.id)} disabled={pending}
                        className="flex items-center gap-1.5 rounded-lg border border-rose-800 bg-[#111113] px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40 disabled:opacity-50">
                        <XCircle className="h-3.5 w-3.5" weight="duotone" /> Reject
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
