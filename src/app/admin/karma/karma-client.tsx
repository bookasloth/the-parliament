"use client"

import { useState, useTransition } from "react"
import {
  Sparkle, TrendUp, Medal, Shield, ThumbsUp, ChatCircle, ShareNetwork,
  ThumbsDown, Warning, Plus, Minus, ClockCounterClockwise, User, GameController,
} from "@phosphor-icons/react"
import { PageHeader, StatCard } from "../admin-ui"
import { adjustKarmaAction } from "./actions"

export interface Earner { name: string; karma: number; level: string }
export interface Adjustment { user: string; change: number; reason: string; time: string }
interface Stats { issued30d: number; avgKarma: number; mentorCount: number }

// Read-only reference — values live in src/config/karma.ts and are enforced there.
const thresholds = [
  { level: "Reader", karma: 0, unlocks: "Read posts, react with likes" },
  { level: "Commenter", karma: 25, unlocks: "Comment on posts" },
  { level: "Poster", karma: 50, unlocks: "Create own posts" },
  { level: "Poller", karma: 100, unlocks: "Create polls" },
  { level: "Group Leader", karma: 250, unlocks: "Create and lead groups" },
  { level: "Mentor", karma: 500, unlocks: "Mentorship programme, mod tools" },
]

const actions = [
  { action: "Receive a like", giver: 1, receiver: 1, icon: <ThumbsUp className="h-4 w-4" weight="duotone" /> },
  { action: "Receive a comment", giver: 1.5, receiver: 2, icon: <ChatCircle className="h-4 w-4" weight="duotone" /> },
  { action: "Post shared", giver: 2, receiver: 3, icon: <ShareNetwork className="h-4 w-4" weight="duotone" /> },
  { action: "Receive a downvote", giver: 0, receiver: -2, icon: <ThumbsDown className="h-4 w-4" weight="duotone" /> },
  { action: "Downvote a comment", giver: 0, receiver: -1, icon: <ThumbsDown className="h-4 w-4" weight="duotone" /> },
]

const caps = [
  { label: "Likes counted per day", value: 30 },
  { label: "Comments counted per day", value: 20 },
  { label: "Shares counted per day", value: 10 },
  { label: "Same-pair likes per 24h", value: 5 },
  { label: "Max negative karma per day", value: 10 },
]

export default function KarmaClient({
  stats, earners, adjustments,
}: { stats: Stats; earners: Earner[]; adjustments: Adjustment[] }) {
  const [query, setQuery] = useState("")
  const [amount, setAmount] = useState("")
  const [reason, setReason] = useState("")
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [pending, startTransition] = useTransition()

  function apply() {
    const amt = Number(amount)
    if (!query.trim() || !Number.isInteger(amt) || amt === 0 || !reason.trim()) return
    setMsg(null)
    startTransition(async () => {
      try {
        const res = await adjustKarmaAction({ query, amount: amt, reason })
        setMsg({ ok: true, text: `${amt > 0 ? "+" : ""}${amt} → ${res.name} (new balance ${res.balance})` })
        setQuery(""); setAmount(""); setReason("")
      } catch (e) {
        setMsg({ ok: false, text: e instanceof Error ? e.message : "Adjustment failed" })
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="Karma System"
        description="Live thresholds, action values, and manual adjustments"
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Karma Issued (30d)" value={stats.issued30d.toLocaleString("en-IN")} icon={<Sparkle className="h-4.5 w-4.5" weight="duotone" />} accent="violet" />
        <StatCard label="Avg User Karma" value={stats.avgKarma.toLocaleString("en-IN")} icon={<TrendUp className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Mentor-level Users" value={String(stats.mentorCount)} icon={<Medal className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Config" value="Read-only" icon={<Shield className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-100">Level Thresholds</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Enforced in <span className="font-mono text-[11px] text-violet-400">src/config/karma.ts</span> — edit there to change gates.</p>
            </div>
            <div className="divide-y divide-zinc-800">
              {thresholds.map((t, i) => (
                <div key={t.level} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-950/40 text-violet-400 text-xs font-bold flex-shrink-0">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-zinc-200">{t.level}</p>
                    <p className="text-[11px] text-zinc-500 truncate">{t.unlocks}</p>
                  </div>
                  <span className="text-xs font-bold text-zinc-200 tabular-nums">{t.karma} <span className="text-[10px] text-zinc-500 font-semibold">karma</span></span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-100">Action Values</h2>
              <p className="text-xs text-zinc-500 mt-0.5">Karma per engagement action (giver / receiver)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-900 text-left">
                    {["Action", "Giver", "Receiver"].map((h) => (
                      <th key={h} className="px-4 sm:px-5 py-2.5 text-[11px] font-medium uppercase tracking-wider text-zinc-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {actions.map((a, i) => (
                    <tr key={i} className="border-t border-zinc-800">
                      <td className="px-4 sm:px-5 py-3"><span className="flex items-center gap-2 text-xs font-medium text-zinc-300"><span className="text-violet-400">{a.icon}</span> {a.action}</span></td>
                      <td className={`px-4 sm:px-5 py-3 text-xs font-bold tabular-nums ${a.giver < 0 ? "text-rose-400" : "text-zinc-300"}`}>{a.giver > 0 ? `+${a.giver}` : a.giver}</td>
                      <td className={`px-4 sm:px-5 py-3 text-xs font-bold tabular-nums ${a.receiver < 0 ? "text-rose-400" : "text-emerald-400"}`}>{a.receiver > 0 ? `+${a.receiver}` : a.receiver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#111113] p-4 sm:p-5">
            <h2 className="text-sm font-bold text-zinc-100 mb-1">Daily Caps &amp; Rules</h2>
            <p className="text-xs text-zinc-500 mb-4">Anti-gaming limits per user per day</p>
            <div className="space-y-2.5">
              {caps.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                  <span className="flex-1 text-xs text-zinc-400">{c.label}</span>
                  <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-300 tabular-nums">{c.value}</span>
                </div>
              ))}
              <div className="flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 p-3 mt-3">
                <GameController className="h-4 w-4 text-zinc-500 flex-shrink-0" weight="duotone" />
                <span className="flex-1 text-xs text-zinc-400">Game karma hard-capped at</span>
                <span className="rounded-md bg-zinc-800 px-2 py-0.5 text-xs font-bold text-zinc-300">0</span>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-[#111113] p-4 sm:p-5">
            <h2 className="text-sm font-bold text-zinc-100 mb-1">Manual Adjustment</h2>
            <p className="text-xs text-zinc-500 mb-4">Grant or deduct karma with an audit trail</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">Member (username or email)</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" weight="duotone" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="e.g. amit-verma or amit@…"
                    className="w-full rounded-md border border-zinc-800 bg-[#0a0a0a] pl-8 pr-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">Amount</label>
                <div className="flex gap-1.5">
                  <button onClick={() => setAmount((a) => String(Math.abs(Number(a) || 25)))} className="flex h-8 w-8 items-center justify-center rounded-md border border-emerald-800 text-emerald-400 hover:bg-emerald-950/50"><Plus className="h-3.5 w-3.5" weight="duotone" /></button>
                  <button onClick={() => setAmount((a) => String(-Math.abs(Number(a) || 25)))} className="flex h-8 w-8 items-center justify-center rounded-md border border-rose-800 text-rose-400 hover:bg-rose-950/50"><Minus className="h-3.5 w-3.5" weight="duotone" /></button>
                  <input value={amount} onChange={(e) => setAmount(e.target.value)} type="number" placeholder="e.g. 50 or -25"
                    className="flex-1 rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-xs font-bold text-zinc-200 placeholder-zinc-500 tabular-nums outline-none focus:border-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-zinc-500 mb-1">Reason (required, logged)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
                  placeholder="e.g. Reward for organizing the blood donation camp"
                  className="w-full rounded-md border border-zinc-800 bg-[#0a0a0a] px-3 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none focus:border-blue-500 resize-none" />
              </div>
              {msg && (
                <div className={`rounded-md px-3 py-2 text-xs font-semibold ${msg.ok ? "bg-emerald-950/50 border border-emerald-800 text-emerald-300" : "bg-rose-950/40 border border-rose-900 text-rose-300"}`}>{msg.text}</div>
              )}
              <button onClick={apply} disabled={pending || !query.trim() || !amount.trim() || !reason.trim()}
                className="w-full rounded-md py-2.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-500 disabled:opacity-50">
                {pending ? "Applying…" : "Apply Adjustment"}
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><ClockCounterClockwise className="h-4 w-4 text-violet-400" weight="duotone" /> Recent Adjustments</h2>
            </div>
            {adjustments.length === 0 ? (
              <p className="px-4 py-6 text-xs text-zinc-500 text-center">No manual adjustments yet</p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {adjustments.map((a, i) => (
                  <li key={i} className="px-4 py-3">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-bold tabular-nums ${a.change > 0 ? "text-emerald-400" : "text-rose-400"}`}>{a.change > 0 ? `+${a.change}` : a.change}</span>
                      <span className="text-xs font-semibold text-zinc-200">{a.user}</span>
                    </div>
                    <p className="text-[11px] text-zinc-400">{a.reason}</p>
                    <p className="text-[10px] text-zinc-500 mt-0.5">{a.time}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-zinc-800 bg-[#111113] overflow-hidden">
            <div className="px-4 py-3.5 border-b border-zinc-800">
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-2"><Medal className="h-4 w-4 text-amber-400" weight="duotone" /> Top Karma Earners</h2>
            </div>
            {earners.length === 0 ? (
              <p className="px-4 py-6 text-xs text-zinc-500 text-center">No karma earned yet</p>
            ) : (
              <ul className="divide-y divide-zinc-800">
                {earners.map((u, i) => (
                  <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${i === 0 ? "bg-amber-950/50 text-amber-300" : i === 1 ? "bg-zinc-800 text-zinc-300" : i === 2 ? "bg-orange-950/50 text-orange-300" : "bg-zinc-900 text-zinc-500"}`}>{i + 1}</span>
                    <span className="flex-1 text-xs font-semibold text-zinc-300 truncate">{u.name}</span>
                    <span className="text-xs font-bold text-violet-400 tabular-nums capitalize">{u.level}</span>
                    <span className="text-xs font-bold text-zinc-400 tabular-nums w-12 text-right">{u.karma.toLocaleString("en-IN")}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
