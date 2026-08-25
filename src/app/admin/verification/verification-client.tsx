"use client"

import { useState, useEffect, useTransition } from "react"
import {
  ShieldCheck, Clock, CheckCircle, XCircle, FileText, Eye,
  User, EnvelopeSimple, IdentificationCard, X, UsersThree, PaperPlaneTilt,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, Button, useRowAction } from "../admin-ui"
import {
  approveVerificationAction, rejectVerificationAction,
  listSuggestedEndorsersAction, requestEndorsementAction,
  startUserReviewAction, verifyUserNowAction,
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

export interface VCandidate {
  userId: string
  name: string
  email: string
  username: string | null
  memberType: string
  profileCompletion: number
  hasJnvData: boolean
  followers: number
  endorsedCount: number
  joined: string
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

const methodLabel: Record<string, string> = {
  id_upload: "ID document upload",
  alumni_vouch: "Alumni vouch",
  institute_email: "Institute email",
  admin_review: "Admin review",
}

// One normalized row for the unified queue. `verificationId` is present only when
// a verification request already exists (submitted evidence OR moved to review);
// candidates who never submitted have it null until Endorsements creates one.
interface Row {
  userId: string
  verificationId: string | null
  name: string
  email: string
  username: string | null
  memberType: string
  method: string | null
  instituteEmail: string | null
  evidenceUrl: string | null
  meta: string
  endorsements: { asked: number; endorsed: number; declined: number } | null
  // candidate-only signal chips (undefined for submitted requests)
  profileCompletion?: number
  hasJnvData?: boolean
  followers?: number
  endorsedCount?: number
}

function initials(name: string) {
  return name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
}

function EndorsePanel({ verificationId, name }: { verificationId: string; name: string }) {
  const [list, setList] = useState<Suggested[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [asked, setAsked] = useState<Set<string>>(new Set())
  const [busyId, setBusyId] = useState<string | null>(null)
  const [loading, startLoad] = useTransition()
  const [, startAsk] = useTransition()

  useEffect(() => {
    startLoad(async () => {
      try {
        const rows = (await listSuggestedEndorsersAction(verificationId)) as Suggested[]
        setList(rows)
        setAsked(new Set(rows.filter((r) => r.alreadyAsked).map((r) => r.userId)))
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : "Failed to load suggestions")
      }
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [verificationId])

  function ask(userId: string) {
    setBusyId(userId)
    startAsk(async () => {
      try {
        await requestEndorsementAction(verificationId, userId)
        setAsked((s) => new Set(s).add(userId))
      } catch (e) {
        setLoadErr(e instanceof Error ? e.message : "Failed to send request")
      } finally {
        setBusyId(null)
      }
    })
  }

  return (
    <div className="rounded-[4px] bg-gray-50 border border-gray-200 p-4">
      <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-1">Ask peers to endorse</p>
      <p className="text-xs text-gray-500 mb-3">Batch &amp; house-mates of {name}</p>
      <div className="max-h-[40vh] overflow-y-auto space-y-2">
        {loading && <p className="py-6 text-center text-xs text-gray-500">Finding peers…</p>}
        {loadErr && <p className="rounded-[3px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">{loadErr}</p>}
        {list && list.length === 0 && !loading && (
          <p className="py-6 text-center text-xs text-gray-500">No verified peers found for this candidate&apos;s batch or house.</p>
        )}
        {list?.map((s) => {
          const isAsked = asked.has(s.userId)
          const endorsed = s.endorsementStatus === "endorsed"
          return (
            <div key={s.userId} className="flex items-center gap-3 rounded-[4px] border border-gray-200 bg-white p-2.5">
              {s.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.photoUrl} alt="" className="h-9 w-9 rounded-[4px] object-cover" />
              ) : (
                <div className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-blue-600 text-[11px] font-bold text-white">{initials(s.name)}</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-gray-800">{s.name}</p>
                <p className="truncate text-[11px] text-gray-500">{[s.batchLabel, s.houseName].filter(Boolean).join(" · ")} · {s.reason}</p>
              </div>
              {endorsed ? (
                <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600"><CheckCircle className="h-3.5 w-3.5" weight="duotone" /> Endorsed</span>
              ) : isAsked ? (
                <span className="text-[11px] font-semibold text-gray-500">Asked</span>
              ) : (
                <button onClick={() => ask(s.userId)} disabled={busyId === s.userId}
                  className="flex items-center gap-1 rounded-[3px] bg-blue-600 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-blue-500 disabled:opacity-50">
                  <PaperPlaneTilt className="h-3 w-3" weight="duotone" /> {busyId === s.userId ? "Sending…" : "Ask"}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

// Right-side review drawer — the single place identity claims are actioned.
function ReviewDrawer({
  row, onClose, onApprove, onReject, onStartReview, isBusy,
}: {
  row: Row
  onClose: () => void
  onApprove: (row: Row) => void
  onReject: (row: Row, reason: string) => void
  onStartReview: (userId: string) => Promise<string>
  isBusy: (id: string) => boolean
}) {
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")
  const [endorseId, setEndorseId] = useState<string | null>(row.verificationId)
  const [endorseOpen, setEndorseOpen] = useState(false)
  const [starting, setStarting] = useState(false)
  const busy = isBusy(row.userId)

  async function toggleEndorse() {
    if (endorseOpen) { setEndorseOpen(false); return }
    if (!endorseId) {
      // Never-submitted member: create the review request on demand so endorsers
      // can be attached (replaces the old standalone "Start review" button).
      setStarting(true)
      try {
        const id = await onStartReview(row.userId)
        setEndorseId(id)
      } finally {
        setStarting(false)
      }
    }
    setEndorseOpen(true)
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/50" role="presentation" onClick={onClose} />
      <div className="relative flex h-full w-full max-w-md flex-col border-l border-gray-200 bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-gray-200 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-[3px] bg-blue-600 text-xs font-bold text-white flex-shrink-0">{initials(row.name)}</div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-sm font-bold text-gray-900">{row.name}</p>
              <StatusBadge status="pending" />
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{(row.method ? methodLabel[row.method] ?? row.method : "Unverified")} · {row.meta}</p>
          </div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700"><X className="h-4.5 w-4.5" weight="duotone" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="rounded-[4px] bg-gray-50 border border-gray-200 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">Applicant</p>
            <ul className="space-y-2 text-xs text-gray-700">
              <li className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> {row.name} {row.username && <span className="text-gray-500">@{row.username}</span>}</li>
              <li className="flex items-center gap-2"><EnvelopeSimple className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> {row.email}</li>
              <li className="flex items-center gap-2"><IdentificationCard className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> {row.method ? methodLabel[row.method] ?? row.method : "No submission"}</li>
              {row.instituteEmail && (
                <li className="flex items-center gap-2"><EnvelopeSimple className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> Institute email: <span className="text-gray-800">{row.instituteEmail}</span></li>
              )}
              <li className="flex items-center gap-2 capitalize"><ShieldCheck className="h-3.5 w-3.5 text-gray-500" weight="duotone" /> {row.memberType}</li>
            </ul>
            {/* Candidate signal chips */}
            {row.verificationId === null && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {row.endorsedCount ? <span className="rounded-[3px] bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-700">{row.endorsedCount} vouch{row.endorsedCount > 1 ? "es" : ""}</span> : null}
                <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">{row.profileCompletion}% profile</span>
                {row.hasJnvData && <span className="rounded-[3px] bg-sky-50 border border-sky-200 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700">JNV data</span>}
                {row.followers ? <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600">{row.followers} follower{row.followers > 1 ? "s" : ""}</span> : null}
              </div>
            )}
          </div>

          <div className="rounded-[4px] bg-gray-50 border border-gray-200 p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-gray-500 mb-3">Submitted evidence</p>
            {row.evidenceUrl ? (
              <a href={row.evidenceUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-[3px] bg-white border border-gray-200 px-2.5 py-2 hover:border-blue-700">
                <FileText className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" weight="duotone" />
                <span className="flex-1 text-xs text-gray-700 truncate">View uploaded document</span>
                <Eye className="h-3.5 w-3.5 text-blue-600" weight="duotone" />
              </a>
            ) : (
              <p className="text-xs text-gray-500 italic">No document uploaded ({row.method ? methodLabel[row.method] ?? row.method : "no submission"})</p>
            )}
          </div>

          {endorseOpen && endorseId && <EndorsePanel verificationId={endorseId} name={row.name} />}

          {rejecting && (
            <div className="rounded-[4px] border border-rose-200 bg-rose-50/30 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold text-rose-700">Rejection reason (sent to applicant)</p>
                <button onClick={() => setRejecting(false)} className="text-rose-500 hover:text-rose-700"><X className="h-4 w-4" weight="duotone" /></button>
              </div>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
                placeholder="e.g. Documents do not match the claimed batch year. Please re-submit with a valid transfer certificate."
                className="w-full rounded-[4px] border border-rose-200 bg-white px-3 py-2 text-xs text-gray-800 placeholder-gray-400 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-100 resize-none" />
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-gray-200 p-4">
          {rejecting ? (
            <div className="flex gap-2">
              <Button variant="danger" size="sm" onClick={() => onReject(row, reason)} disabled={busy || reason.trim().length < 3}>
                {busy ? "Rejecting…" : "Confirm Rejection"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setRejecting(false)}>Cancel</Button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={() => onApprove(row)} disabled={busy}
                className="flex items-center gap-1.5 rounded-[4px] bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50">
                <CheckCircle className="h-3.5 w-3.5" weight="duotone" /> {busy ? "Working…" : "Approve & Verify"}
              </button>
              {/* Reject applies once a verification request exists */}
              {row.verificationId && (
                <button onClick={() => setRejecting(true)} disabled={busy}
                  className="flex items-center gap-1.5 rounded-[4px] border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:opacity-50">
                  <XCircle className="h-3.5 w-3.5" weight="duotone" /> Reject
                </button>
              )}
              <button onClick={toggleEndorse} disabled={busy || starting}
                className="flex items-center gap-1.5 rounded-[4px] border border-gray-300 bg-white px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-100 disabled:opacity-50">
                <UsersThree className="h-3.5 w-3.5" weight="duotone" /> {starting ? "Opening…" : "Endorsements"}
              </button>
              {row.endorsements && row.endorsements.asked > 0 && (
                <span className="text-[11px] font-semibold text-gray-500">{row.endorsements.endorsed}/{row.endorsements.asked} endorsed</span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function VerificationClient({
  requests, candidates, approved30d, rejected30d,
}: { requests: VReq[]; candidates: VCandidate[]; approved30d: number; rejected30d: number }) {
  const [done, setDone] = useState<Record<string, "approved" | "rejected">>({})
  const [drawer, setDrawer] = useState<Row | null>(null)
  const { run, isBusy } = useRowAction()

  // Unified queue: submitted requests first, then unverified members.
  const rows: Row[] = [
    ...requests.map((r): Row => ({
      userId: r.id, // request id doubles as row key for submitted rows
      verificationId: r.id,
      name: r.name, email: r.email, username: r.username, memberType: r.memberType,
      method: r.method, instituteEmail: r.instituteEmail, evidenceUrl: r.evidenceUrl,
      meta: `submitted ${r.submitted}`, endorsements: r.endorsements,
    })),
    ...candidates.map((c): Row => ({
      userId: c.userId, verificationId: null,
      name: c.name, email: c.email, username: c.username, memberType: c.memberType,
      method: null, instituteEmail: null, evidenceUrl: null,
      meta: `joined ${c.joined}`, endorsements: null,
      profileCompletion: c.profileCompletion, hasJnvData: c.hasJnvData,
      followers: c.followers, endorsedCount: c.endorsedCount,
    })),
  ].filter((row) => !done[row.userId])

  function closeDrawerIfRow(id: string) {
    setDrawer((d) => (d && d.userId === id ? null : d))
  }

  function approve(row: Row) {
    run(row.userId, {
      optimistic: () => { setDone((d) => ({ ...d, [row.userId]: "approved" })); closeDrawerIfRow(row.userId) },
      revert: () => setDone((d) => { const n = { ...d }; delete n[row.userId]; return n }),
      action: () => row.verificationId ? approveVerificationAction(row.verificationId) : verifyUserNowAction(row.userId),
      success: "Approved & verified",
    })
  }

  function reject(row: Row, reason: string) {
    if (!row.verificationId) return
    const vid = row.verificationId
    run(row.userId, {
      optimistic: () => { setDone((d) => ({ ...d, [row.userId]: "rejected" })); closeDrawerIfRow(row.userId) },
      revert: () => setDone((d) => { const n = { ...d }; delete n[row.userId]; return n }),
      action: () => rejectVerificationAction(vid, reason),
      success: "Verification rejected",
    })
  }

  async function startReview(userId: string): Promise<string> {
    const res = await startUserReviewAction(userId)
    return res.verificationId
  }

  return (
    <div>
      <PageHeader
        title="Verification Queue"
        description="Review alumni identity claims and grant verified status"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Pending Review" value={String(requests.length)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Approved (30d)" value={String(approved30d)} icon={<CheckCircle className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Rejected (30d)" value={String(rejected30d)} icon={<XCircle className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
        <StatCard label="Unverified" value={String(candidates.length)} icon={<ShieldCheck className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[4px] border border-gray-200 bg-white py-16 text-center">
          <ShieldCheck className="h-8 w-8 text-gray-400 mx-auto mb-2" weight="duotone" />
          <p className="text-sm font-medium text-gray-600">Queue is clear</p>
          <p className="text-xs text-gray-500 mt-1">No one waiting for verification</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.userId} className="flex items-center gap-3 rounded-[4px] border border-gray-200 bg-white p-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-[3px] bg-blue-600 text-[11px] font-bold text-white flex-shrink-0">{initials(row.name)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800 truncate">{row.name}</p>
                  {row.verificationId
                    ? <StatusBadge status="pending" />
                    : <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold capitalize text-gray-500">{row.memberType}</span>}
                </div>
                <p className="text-[11px] text-gray-500 truncate">{row.username ? `@${row.username} · ` : ""}{(row.method ? methodLabel[row.method] ?? row.method : "unverified")} · {row.meta}</p>
              </div>
              <button onClick={() => setDrawer(row)} disabled={isBusy(row.userId)}
                className="flex items-center gap-1.5 rounded-[3px] bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500 disabled:opacity-50 flex-shrink-0">
                <ShieldCheck className="h-3.5 w-3.5" weight="duotone" /> Verify
              </button>
            </div>
          ))}
        </div>
      )}

      {drawer && (
        <ReviewDrawer
          row={drawer}
          onClose={() => setDrawer(null)}
          onApprove={approve}
          onReject={reject}
          onStartReview={startReview}
          isBusy={isBusy}
        />
      )}
    </div>
  )
}
