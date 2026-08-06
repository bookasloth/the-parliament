"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import {
  ArrowLeft, Users, Lock, BadgeCheck, X,
  AlertTriangle, Plane, KeyRound, Briefcase, GraduationCap,
} from "lucide-react"
import type { GroupPageData } from "@/modules/groups/service"
import { joinGroupAction, submitGroupRequestAction, type SubmitGroupRequestInput } from "../actions"

type Category = SubmitGroupRequestInput["category"]

const CATEGORIES: { key: Category; label: string; icon: typeof AlertTriangle }[] = [
  { key: "emergency", label: "Emergency", icon: AlertTriangle },
  { key: "travel", label: "Travel", icon: Plane },
  { key: "access", label: "Access", icon: KeyRound },
  { key: "career", label: "Career", icon: Briefcase },
  { key: "mentor", label: "Mentor", icon: GraduationCap },
]

function initials(name: string): string {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join("")
}

function Avatar({ name, src, size = 40, className = "" }: { name: string; src: string | null; size?: number; className?: string }) {
  if (src) {
    return <Image src={src} alt={name} width={size} height={size} className={`rounded-full object-cover ${className}`} style={{ width: size, height: size }} />
  }
  return (
    <span
      className={`inline-flex items-center justify-center rounded-full bg-brand-50 text-brand font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials(name) || "?"}
    </span>
  )
}

export default function GroupDetailClient({ data, loggedIn }: { data: GroupPageData; loggedIn: boolean }) {
  const [joined, setJoined] = useState(data.isJoined)
  const [memberCount, setMemberCount] = useState(data.memberCount)
  const [modalOpen, setModalOpen] = useState(false)
  const [category, setCategory] = useState<Category>("emergency")
  const [body, setBody] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startAction] = useTransition()

  function join() {
    if (joined) return
    setJoined(true)
    setMemberCount(c => c + 1)
    startAction(async () => {
      try { await joinGroupAction(data.id) } catch { setJoined(false); setMemberCount(c => c - 1) }
    })
  }

  function submitRequest() {
    setMsg(null)
    startAction(async () => {
      const r = await submitGroupRequestAction({ groupId: data.id, category, body })
      if (r.ok) {
        setMsg({ ok: true, text: "Request submitted." })
        setBody("")
        setTimeout(() => setModalOpen(false), 900)
      } else {
        setMsg({ ok: false, text: r.error ?? "Failed to submit" })
      }
    })
  }

  const canSeeAll = data.canSeeAll || joined
  const shownMembers = canSeeAll ? data.members : data.members.slice(0, 7)
  const avatarRow = data.members.slice(0, 8)
  const overflow = memberCount - avatarRow.length

  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-4 space-y-4">
        <a href="/groups" className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-brand transition-colors">
          <ArrowLeft className="h-4 w-4" /> Groups
        </a>

        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full bg-brand-50 text-3xl">{data.icon}</span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h1 className="text-xl font-bold text-gray-900 truncate">{data.name}</h1>
                  {data.isOfficial && <BadgeCheck className="h-5 w-5 text-brand flex-shrink-0" />}
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                  {data.privacy === "private" && <Lock className="h-3.5 w-3.5" />}
                  <span className="capitalize">{data.privacy} group</span>
                  <span className="text-gray-300">·</span>
                  <span>{memberCount.toLocaleString("en-IN")} Members</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={join}
                disabled={joined || pending}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${joined ? "bg-gray-100 text-gray-500 cursor-default" : "border border-gray-200 text-gray-700 hover:border-brand hover:text-brand"}`}
              >
                {joined ? "Joined" : "Join"}
              </button>
              <button
                onClick={() => { setMsg(null); setModalOpen(true) }}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
              >
                + Request
              </button>
            </div>
          </div>

          {/* Avatar row */}
          {avatarRow.length > 0 && (
            <div className="flex items-center gap-3 mt-5">
              <div className="flex -space-x-2">
                {avatarRow.map(m => (
                  <Avatar key={m.id} name={m.name} src={m.photoUrl} size={34} className="border-2 border-white" />
                ))}
                {overflow > 0 && (
                  <span className="inline-flex h-[34px] w-[34px] items-center justify-center rounded-full bg-brand text-white text-xs font-bold border-2 border-white">+{overflow}</span>
                )}
              </div>
              <p className="text-sm text-brand truncate">
                {data.recentJoinNames.join(", ")}
                {memberCount > data.recentJoinNames.length && `, and ${memberCount - data.recentJoinNames.length} joined group`}
              </p>
            </div>
          )}
        </div>

        {/* Three info cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Top Contributors */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Top Contributors</h3>
            {data.topContributors.length === 0 ? (
              <p className="text-xs text-gray-400">No contributors yet.</p>
            ) : (
              <div className="space-y-2.5">
                {data.topContributors.map((c, i) => (
                  <div key={c.id} className="flex items-center gap-2.5">
                    <Avatar name={c.name} src={c.photoUrl} size={32} />
                    <a href={`/${c.id}`} className="flex-1 min-w-0 text-sm font-medium text-gray-800 hover:text-brand truncate">{c.name}</a>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${i === 0 ? "bg-amber-100 text-amber-700" : "bg-brand-50 text-brand"}`}>{c.karma} Karma</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Most Request Accepted */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Most Request Accepted</h3>
            {data.acceptedTags.length === 0 ? (
              <p className="text-xs text-gray-400">No accepted requests yet.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {data.acceptedTags.map(tag => (
                  <span key={tag} className="text-xs font-medium text-gray-600 bg-gray-100 px-2.5 py-1 rounded-md capitalize">{tag}</span>
                ))}
              </div>
            )}
          </div>

          {/* Welcome New Members */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-900 mb-3">Welcome New Members</h3>
            {data.newMemberCount === 0 ? (
              <p className="text-xs text-gray-400">No new members this week.</p>
            ) : (
              <>
                <div className="flex -space-x-2 mb-2">
                  {data.newMembers.map(m => (
                    <Avatar key={m.id} name={m.name} src={m.photoUrl} size={34} className="border-2 border-white" />
                  ))}
                </div>
                <p className="text-xs text-gray-500">
                  Say hi to <span className="font-bold text-gray-800">{data.newMemberCount} new member{data.newMemberCount === 1 ? "" : "s"}</span> this week!
                </p>
              </>
            )}
          </div>
        </div>

        {/* Group Members */}
        <div className="bg-white border border-gray-200 rounded-xl p-5 sm:p-6">
          <h2 className="text-lg font-bold text-gray-900 mb-4">Group Members</h2>
          {data.members.length === 0 ? (
            <p className="text-sm text-gray-400">No members yet.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {shownMembers.map(m => (
                <div key={m.id} className="border border-gray-200 rounded-xl p-4 flex flex-col items-center text-center">
                  <Avatar name={m.name} src={m.photoUrl} size={56} />
                  <div className="flex items-center gap-1 mt-2">
                    <p className="text-sm font-semibold text-gray-900 truncate">{m.name}</p>
                    {m.isVerified && <BadgeCheck className="h-3.5 w-3.5 text-brand flex-shrink-0" />}
                  </div>
                  {m.yearsLabel && <p className="text-xs text-gray-400">{m.yearsLabel}</p>}
                  <a href={`/${m.id}`} className="mt-3 w-full rounded-md border border-brand px-3 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-colors">
                    View Profile
                  </a>
                </div>
              ))}
              {!canSeeAll && memberCount > shownMembers.length && (
                <div className="rounded-xl bg-brand p-4 flex flex-col items-center justify-center text-center text-white">
                  <Lock className="h-6 w-6 mb-2" />
                  <p className="text-sm font-bold">More Members</p>
                  <p className="text-xs text-white/80 mb-3">Unlock to see all</p>
                  <button onClick={join} disabled={pending} className="rounded-md bg-white px-4 py-1.5 text-sm font-semibold text-brand hover:bg-white/90 transition-colors">
                    {loggedIn ? "Join to unlock" : "Unlock"}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Submit a Request modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setModalOpen(false)}>
          <div className="w-full max-w-lg rounded-xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-gray-900">Submit a Request</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 rounded-lg text-gray-400 hover:bg-gray-100"><X className="h-5 w-5" /></button>
            </div>

            <div className="grid grid-cols-5 gap-2 mb-4">
              {CATEGORIES.map(({ key, label, icon: Icon }) => (
                <button
                  key={key}
                  onClick={() => setCategory(key)}
                  className={`flex flex-col items-center gap-1.5 rounded-lg border px-2 py-3 text-xs font-medium transition-colors ${category === key ? "border-brand bg-brand-50 text-brand" : "border-gray-200 bg-gray-50 text-gray-600 hover:border-gray-300"}`}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </button>
              ))}
            </div>

            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Explain your request</label>
            <textarea
              value={body}
              onChange={e => setBody(e.target.value)}
              rows={4}
              placeholder="Write here in details…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-brand focus:ring-2 focus:ring-brand-50 resize-none"
            />

            <div className="flex items-center justify-between gap-3 mt-4">
              {msg ? <p className={`text-xs font-medium ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}>{msg.text}</p> : <span />}
              <button
                onClick={submitRequest}
                disabled={pending || body.trim().length < 5}
                className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:bg-brand-600 transition-colors disabled:opacity-50"
              >
                {pending ? "Submitting…" : "Submit Request"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
