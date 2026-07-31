"use client"

import { useState } from "react"
import {
  ShieldCheck, Clock, CheckCircle, XCircle, FileText, Eye,
  CaretDown, CaretUp, Warning, User, Calendar,
  GraduationCap, Phone, ChatCircle, X,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, StatusBadge, Button } from "../admin-ui"

interface VerificationRequest {
  id: string
  name: string
  email: string
  batch: string
  house: string
  houseColor: string
  yearsStudied: string
  currentClass: string
  mobile: string
  submitted: string
  documents: { type: string; name: string }[]
  referredBy?: string
  notes?: string
  status: "pending" | "approved" | "rejected"
  riskFlags: string[]
}

const requests: VerificationRequest[] = [
  {
    id: "v1", name: "Ananya Deshmukh", email: "ananya.d@gmail.com", batch: "2016", house: "Indira", houseColor: "#ff9933",
    yearsStudied: "Class 6 to 12 (2009 to 2016)", currentClass: "Alumni", mobile: "+91 98XXX XX341", submitted: "12 min ago",
    documents: [{ type: "ID", name: "transfer-certificate.pdf" }, { type: "Photo", name: "school-group-photo.jpg" }],
    referredBy: "Priya Sharma (Batch 2010)", status: "pending", riskFlags: [],
  },
  {
    id: "v2", name: "Rohan Kulkarni", email: "rohan.k@outlook.com", batch: "2011", house: "Laxmi", houseColor: "#e75480",
    yearsStudied: "Class 6 to 10 (2002 to 2007)", currentClass: "Alumni", mobile: "+91 97XXX XX812", submitted: "1 hr ago",
    documents: [{ type: "ID", name: "marksheet-class10.pdf" }],
    status: "pending", riskFlags: ["Batch year does not match years studied"],
  },
  {
    id: "v3", name: "Karan Patil", email: "karan.p@yahoo.com", batch: "2018", house: "Aravali", houseColor: "#5a9bd5",
    yearsStudied: "Class 6 to 12 (2011 to 2018)", currentClass: "Alumni", mobile: "+91 96XXX XX190", submitted: "5 hrs ago",
    documents: [{ type: "ID", name: "school-id-card.jpg" }, { type: "Photo", name: "farewell-photo.jpg" }],
    referredBy: "Vikram Singh (Batch 2007)", status: "pending", riskFlags: [],
  },
  {
    id: "v4", name: "Pooja Bhosale", email: "pooja.b@gmail.com", batch: "2013", house: "Nilgiri", houseColor: "#70ad47",
    yearsStudied: "Class 6 to 12 (2006 to 2013)", currentClass: "Alumni", mobile: "+91 95XXX XX567", submitted: "1 day ago",
    documents: [],
    status: "pending", riskFlags: ["No documents uploaded", "Email domain recently created"],
  },
  {
    id: "v5", name: "Sneha Joshi", email: "sneha.joshi@gmail.com", batch: "2009", house: "Udaigiri", houseColor: "#ffe135",
    yearsStudied: "Class 6 to 12 (2002 to 2009)", currentClass: "Alumni", mobile: "+91 94XXX XX234", submitted: "2 days ago",
    documents: [{ type: "ID", name: "tc-scan.pdf" }],
    status: "approved", riskFlags: [],
  },
  {
    id: "v6", name: "Unknown Applicant", email: "fastcash2025@tempmail.io", batch: "2010", house: "Shiwalik", houseColor: "#e8503a",
    yearsStudied: "Not provided", currentClass: "Alumni", mobile: "Not provided", submitted: "3 days ago",
    documents: [],
    status: "rejected", riskFlags: ["Disposable email domain", "No documents", "Name mismatch"],
  },
]

type Tab = "pending" | "approved" | "rejected"

export default function AdminVerificationPage() {
  const [tab, setTab] = useState<Tab>("pending")
  const [expanded, setExpanded] = useState<string | null>("v1")
  const [decisions, setDecisions] = useState<Record<string, "approved" | "rejected" | undefined>>({})
  const [rejectFor, setRejectFor] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const list = requests.filter(r => (decisions[r.id] ?? r.status) === tab)

  function approve(id: string) {
    setDecisions(d => ({ ...d, [id]: "approved" }))
    setExpanded(null)
  }

  function reject(id: string) {
    setDecisions(d => ({ ...d, [id]: "rejected" }))
    setRejectFor(null)
    setRejectReason("")
    setExpanded(null)
  }

  return (
    <div>
      <PageHeader
        title="Verification Queue"
        description="Review alumni identity claims before granting verified status"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Pending Review" value={String(requests.filter(r => (decisions[r.id] ?? r.status) === "pending").length)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Approved (30d)" value="86" icon={<CheckCircle className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Rejected (30d)" value="9" icon={<XCircle className="h-4.5 w-4.5" weight="duotone" />} accent="rose" />
        <StatCard label="Avg Review Time" value="4.2 hrs" icon={<ShieldCheck className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 rounded-lg border border-zinc-800 bg-[#111113] p-1 w-fit">
        {(["pending", "approved", "rejected"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-blue-600 text-white" : "text-zinc-400 hover:text-zinc-200"}`}>
            {t}
            {t === "pending" && <span className="ml-1.5 rounded-full bg-amber-400 text-amber-950 px-1.5 text-[10px] font-bold">{requests.filter(r => (decisions[r.id] ?? r.status) === "pending").length}</span>}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="space-y-3">
        {list.length === 0 && (
          <div className="rounded-lg border border-zinc-800 bg-[#111113] py-16 text-center">
            <ShieldCheck className="h-8 w-8 text-zinc-700 mx-auto mb-2" weight="duotone" />
            <p className="text-sm font-medium text-zinc-400">Queue is clear</p>
            <p className="text-xs text-zinc-500 mt-1">No {tab} verification requests</p>
          </div>
        )}

        {list.map(req => {
          const isOpen = expanded === req.id
          const effectiveStatus = decisions[req.id] ?? req.status
          return (
            <div key={req.id} className={`rounded-lg border bg-[#111113] overflow-hidden transition-colors ${req.riskFlags.length > 0 && effectiveStatus === "pending" ? "border-amber-900" : "border-zinc-800"}`}>
              {/* Row header */}
              <button onClick={() => setExpanded(isOpen ? null : req.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-zinc-900/60 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: req.houseColor === "#ffe135" ? "#d4a017" : req.houseColor }}>
                  {req.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-zinc-200">{req.name}</p>
                    <StatusBadge status={effectiveStatus} />
                    {req.riskFlags.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-950/50 border border-amber-800 px-2 py-0.5 text-[10px] font-bold text-amber-300">
                        <Warning className="h-3 w-3" weight="duotone" /> {req.riskFlags.length} flag{req.riskFlags.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-zinc-500 mt-0.5">Claims Batch {req.batch} · {req.house} House · submitted {req.submitted}</p>
                </div>
                {isOpen ? <CaretUp className="h-4 w-4 text-zinc-500 flex-shrink-0" weight="duotone" /> : <CaretDown className="h-4 w-4 text-zinc-500 flex-shrink-0" weight="duotone" />}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-zinc-800 p-4 sm:p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Claimed details */}
                    <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 mb-3">Claimed details</p>
                      <ul className="space-y-2 text-xs text-zinc-300">
                        <li className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> {req.email}</li>
                        <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> {req.mobile}</li>
                        <li className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> {req.yearsStudied}</li>
                        <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> Batch {req.batch} · {req.house} House</li>
                        {req.referredBy && (
                          <li className="flex items-center gap-2"><ChatCircle className="h-3.5 w-3.5 text-zinc-500" weight="duotone" /> Referred by <span className="font-semibold text-blue-400">{req.referredBy}</span></li>
                        )}
                      </ul>
                    </div>

                    {/* Documents + flags */}
                    <div className="space-y-3">
                      <div className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-zinc-500 mb-3">Submitted documents</p>
                        {req.documents.length === 0 ? (
                          <p className="text-xs text-zinc-500 italic">No documents uploaded</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {req.documents.map((d, i) => (
                              <li key={i} className="flex items-center gap-2 rounded-md bg-[#111113] border border-zinc-800 px-2.5 py-2">
                                <FileText className="h-3.5 w-3.5 text-blue-400 flex-shrink-0" weight="duotone" />
                                <span className="flex-1 text-xs text-zinc-300 truncate">{d.name}</span>
                                <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-400">{d.type}</span>
                                <button className="text-blue-400 hover:text-blue-300"><Eye className="h-3.5 w-3.5" weight="duotone" /></button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {req.riskFlags.length > 0 && (
                        <div className="rounded-lg bg-amber-950/30 border border-amber-800 p-4">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-400 mb-2 flex items-center gap-1">
                            <Warning className="h-3.5 w-3.5" weight="duotone" /> Risk flags
                          </p>
                          <ul className="space-y-1">
                            {req.riskFlags.map((f, i) => (
                              <li key={i} className="text-xs text-amber-300">- {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision actions */}
                  {effectiveStatus === "pending" && (
                    rejectFor === req.id ? (
                      <div className="rounded-lg border border-rose-900 bg-rose-950/30 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-rose-300">Rejection reason (sent to applicant)</p>
                          <button onClick={() => setRejectFor(null)} className="text-rose-500 hover:text-rose-300"><X className="h-4 w-4" weight="duotone" /></button>
                        </div>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          rows={2}
                          placeholder="e.g. Documents do not match the claimed batch year. Please re-submit with a valid transfer certificate."
                          className="w-full rounded-lg border border-rose-900 bg-[#111113] px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-rose-600 focus:ring-2 focus:ring-rose-950 resize-none"
                        />
                        <div className="mt-2 flex gap-2">
                          <Button variant="danger" size="sm" onClick={() => reject(req.id)} disabled={!rejectReason.trim()}>
                            Confirm Rejection
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setRejectFor(null)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => approve(req.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-500">
                          <CheckCircle className="h-3.5 w-3.5" weight="duotone" /> Approve & Verify
                        </button>
                        <button onClick={() => setRejectFor(req.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-rose-800 bg-[#111113] px-4 py-2 text-xs font-bold text-rose-400 hover:bg-rose-950/40">
                          <XCircle className="h-3.5 w-3.5" weight="duotone" /> Reject
                        </button>
                        <button className="flex items-center gap-1.5 rounded-lg border border-zinc-700 text-zinc-200 hover:bg-zinc-800 px-4 py-2 text-xs font-semibold">
                          <ChatCircle className="h-3.5 w-3.5" weight="duotone" /> Request More Info
                        </button>
                      </div>
                    )
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
