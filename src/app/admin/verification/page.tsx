"use client"

import { useState } from "react"
import {
  ShieldCheck, Clock, CheckCircle2, XCircle, FileText, Eye,
  ChevronDown, ChevronUp, AlertTriangle, User, Calendar,
  GraduationCap, Phone, MessageSquare, X,
} from "lucide-react"
import { PageHeader, StatCard, StatusBadge } from "../admin-ui"

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
        <StatCard label="Pending Review" value={String(requests.filter(r => (decisions[r.id] ?? r.status) === "pending").length)} icon={<Clock className="h-4.5 w-4.5" />} accent="amber" />
        <StatCard label="Approved (30d)" value="86" icon={<CheckCircle2 className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Rejected (30d)" value="9" icon={<XCircle className="h-4.5 w-4.5" />} accent="rose" />
        <StatCard label="Avg Review Time" value="4.2 hrs" icon={<ShieldCheck className="h-4.5 w-4.5" />} accent="indigo" />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 rounded-lg border border-slate-200 bg-white p-1 w-fit">
        {(["pending", "approved", "rejected"] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-md px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${tab === t ? "bg-indigo-600 text-white" : "text-slate-500 hover:text-slate-700"}`}>
            {t}
            {t === "pending" && <span className="ml-1.5 rounded-full bg-amber-400 text-amber-900 px-1.5 text-[10px] font-bold">{requests.filter(r => (decisions[r.id] ?? r.status) === "pending").length}</span>}
          </button>
        ))}
      </div>

      {/* Queue */}
      <div className="space-y-3">
        {list.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
            <ShieldCheck className="h-8 w-8 text-slate-200 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Queue is clear</p>
            <p className="text-xs text-slate-400 mt-1">No {tab} verification requests</p>
          </div>
        )}

        {list.map(req => {
          const isOpen = expanded === req.id
          const effectiveStatus = decisions[req.id] ?? req.status
          return (
            <div key={req.id} className={`rounded-xl border bg-white overflow-hidden transition-colors ${req.riskFlags.length > 0 && effectiveStatus === "pending" ? "border-amber-200" : "border-slate-200"}`}>
              {/* Row header */}
              <button onClick={() => setExpanded(isOpen ? null : req.id)} className="flex w-full items-center gap-3 p-4 text-left hover:bg-slate-50/60 transition-colors">
                <div className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white flex-shrink-0" style={{ backgroundColor: req.houseColor === "#ffe135" ? "#d4a017" : req.houseColor }}>
                  {req.name.split(" ").map(n => n[0]).join("").slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-slate-800">{req.name}</p>
                    <StatusBadge status={effectiveStatus} />
                    {req.riskFlags.length > 0 && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                        <AlertTriangle className="h-3 w-3" /> {req.riskFlags.length} flag{req.riskFlags.length > 1 ? "s" : ""}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Claims Batch {req.batch} · {req.house} House · submitted {req.submitted}</p>
                </div>
                {isOpen ? <ChevronUp className="h-4 w-4 text-slate-400 flex-shrink-0" /> : <ChevronDown className="h-4 w-4 text-slate-400 flex-shrink-0" />}
              </button>

              {/* Expanded detail */}
              {isOpen && (
                <div className="border-t border-slate-100 p-4 sm:p-5">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Claimed details */}
                    <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Claimed details</p>
                      <ul className="space-y-2 text-xs text-slate-600">
                        <li className="flex items-center gap-2"><User className="h-3.5 w-3.5 text-slate-400" /> {req.email}</li>
                        <li className="flex items-center gap-2"><Phone className="h-3.5 w-3.5 text-slate-400" /> {req.mobile}</li>
                        <li className="flex items-center gap-2"><GraduationCap className="h-3.5 w-3.5 text-slate-400" /> {req.yearsStudied}</li>
                        <li className="flex items-center gap-2"><Calendar className="h-3.5 w-3.5 text-slate-400" /> Batch {req.batch} · {req.house} House</li>
                        {req.referredBy && (
                          <li className="flex items-center gap-2"><MessageSquare className="h-3.5 w-3.5 text-slate-400" /> Referred by <span className="font-semibold text-indigo-600">{req.referredBy}</span></li>
                        )}
                      </ul>
                    </div>

                    {/* Documents + flags */}
                    <div className="space-y-3">
                      <div className="rounded-lg bg-slate-50 border border-slate-100 p-4">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-3">Submitted documents</p>
                        {req.documents.length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No documents uploaded</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {req.documents.map((d, i) => (
                              <li key={i} className="flex items-center gap-2 rounded-md bg-white border border-slate-200 px-2.5 py-2">
                                <FileText className="h-3.5 w-3.5 text-indigo-400 flex-shrink-0" />
                                <span className="flex-1 text-xs text-slate-700 truncate">{d.name}</span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{d.type}</span>
                                <button className="text-indigo-500 hover:text-indigo-700"><Eye className="h-3.5 w-3.5" /></button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                      {req.riskFlags.length > 0 && (
                        <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
                          <p className="text-[11px] font-bold uppercase tracking-wide text-amber-600 mb-2 flex items-center gap-1">
                            <AlertTriangle className="h-3.5 w-3.5" /> Risk flags
                          </p>
                          <ul className="space-y-1">
                            {req.riskFlags.map((f, i) => (
                              <li key={i} className="text-xs text-amber-700">- {f}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Decision actions */}
                  {effectiveStatus === "pending" && (
                    rejectFor === req.id ? (
                      <div className="rounded-lg border border-rose-200 bg-rose-50 p-4">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-xs font-bold text-rose-700">Rejection reason (sent to applicant)</p>
                          <button onClick={() => setRejectFor(null)} className="text-rose-400 hover:text-rose-600"><X className="h-4 w-4" /></button>
                        </div>
                        <textarea
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          rows={2}
                          placeholder="e.g. Documents do not match the claimed batch year. Please re-submit with a valid transfer certificate."
                          className="w-full rounded-lg border border-rose-200 bg-white px-3 py-2 text-xs outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100 resize-none"
                        />
                        <div className="mt-2 flex gap-2">
                          <button onClick={() => reject(req.id)} disabled={!rejectReason.trim()}
                            className="rounded-lg bg-rose-600 px-4 py-2 text-xs font-bold text-white hover:bg-rose-700 disabled:opacity-50">
                            Confirm Rejection
                          </button>
                          <button onClick={() => setRejectFor(null)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        <button onClick={() => approve(req.id)}
                          className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                          <CheckCircle2 className="h-3.5 w-3.5" /> Approve & Verify
                        </button>
                        <button onClick={() => setRejectFor(req.id)}
                          className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">
                          <XCircle className="h-3.5 w-3.5" /> Reject
                        </button>
                        <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
                          <MessageSquare className="h-3.5 w-3.5" /> Request More Info
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
