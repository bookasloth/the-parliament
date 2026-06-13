"use client"

import { useState } from "react"
import {
  Sparkles, Save, RotateCcw, TrendingUp, Award, Shield,
  ThumbsUp, MessageSquare, Share2, ThumbsDown, AlertTriangle,
  Plus, Minus, History, CheckCircle2, User, Gamepad2,
} from "lucide-react"
import { PageHeader, StatCard } from "../admin-ui"

// Defaults mirror src/config/karma.ts
const defaultThresholds = [
  { level: "Reader", karma: 0, unlocks: "Read posts, react with likes" },
  { level: "Commenter", karma: 25, unlocks: "Comment on posts" },
  { level: "Poster", karma: 50, unlocks: "Create own posts" },
  { level: "Poller", karma: 100, unlocks: "Create polls" },
  { level: "Group Leader", karma: 250, unlocks: "Create and lead groups" },
  { level: "Mentor", karma: 500, unlocks: "Mentorship programme, mod tools" },
]

const defaultActions = [
  { action: "Receive a like", giver: 1, receiver: 1, icon: <ThumbsUp className="h-4 w-4" /> },
  { action: "Receive a comment", giver: 1.5, receiver: 2, icon: <MessageSquare className="h-4 w-4" /> },
  { action: "Post shared", giver: 2, receiver: 3, icon: <Share2 className="h-4 w-4" /> },
  { action: "Receive a downvote", giver: 0, receiver: -2, icon: <ThumbsDown className="h-4 w-4" /> },
  { action: "Downvote a comment", giver: 0, receiver: -1, icon: <ThumbsDown className="h-4 w-4" /> },
]

const defaultCaps = [
  { label: "Likes counted per day", value: 30 },
  { label: "Comments counted per day", value: 20 },
  { label: "Shares counted per day", value: 10 },
  { label: "Same-pair likes per 24h", value: 5 },
  { label: "Max negative karma per day", value: 10 },
]

const recentAdjustments = [
  { user: "Deepak Wankhede", change: -50, reason: "Spam violation penalty (report r1)", admin: "Moderator Kiran", time: "1 hr ago" },
  { user: "Sneha Joshi", change: +25, reason: "Verification welcome bonus", admin: "System", time: "3 hrs ago" },
  { user: "Rahul Mehta", change: +100, reason: "Event organizer reward — Cricket Tournament", admin: "Admin Shubham", time: "Yesterday" },
  { user: "Sagar Pawar", change: -10, reason: "Warning issued for inappropriate comment", admin: "Moderator Kiran", time: "Yesterday" },
]

const topEarners = [
  { name: "Dr. Amit Verma", karma: 2890, level: "Mentor" },
  { name: "Vikram Singh", karma: 1530, level: "Mentor" },
  { name: "Neha Gupta", karma: 1240, level: "Mentor" },
  { name: "Sunita Patel", karma: 990, level: "Mentor" },
  { name: "Priya Sharma", karma: 876, level: "Mentor" },
]

export default function AdminKarmaPage() {
  const [thresholds, setThresholds] = useState(defaultThresholds)
  const [caps, setCaps] = useState(defaultCaps)
  const [retention, setRetention] = useState(80)
  const [dirty, setDirty] = useState(false)
  const [saved, setSaved] = useState(false)

  const [adjustUser, setAdjustUser] = useState("")
  const [adjustAmount, setAdjustAmount] = useState("")
  const [adjustReason, setAdjustReason] = useState("")
  const [adjustDone, setAdjustDone] = useState(false)

  function updateThreshold(i: number, value: number) {
    setThresholds(t => t.map((th, j) => j === i ? { ...th, karma: value } : th))
    setDirty(true)
    setSaved(false)
  }

  function updateCap(i: number, value: number) {
    setCaps(c => c.map((cap, j) => j === i ? { ...cap, value } : cap))
    setDirty(true)
    setSaved(false)
  }

  function save() {
    setDirty(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  function reset() {
    setThresholds(defaultThresholds)
    setCaps(defaultCaps)
    setRetention(80)
    setDirty(false)
  }

  function applyAdjustment() {
    if (!adjustUser.trim() || !adjustAmount.trim() || !adjustReason.trim()) return
    setAdjustDone(true)
    setAdjustUser(""); setAdjustAmount(""); setAdjustReason("")
    setTimeout(() => setAdjustDone(false), 2500)
  }

  return (
    <div>
      <PageHeader
        title="Karma System"
        description="Configure thresholds, action values, daily caps, and manual adjustments"
        actions={
          <>
            <button onClick={reset} className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <RotateCcw className="h-3.5 w-3.5" /> Reset to Defaults
            </button>
            <button onClick={save} disabled={!dirty}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors ${saved ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700"} disabled:opacity-50`}>
              {saved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save Changes</>}
            </button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Karma Issued (30d)" value="18,420" delta="+14%" deltaUp icon={<Sparkles className="h-4.5 w-4.5" />} accent="violet" />
        <StatCard label="Avg User Karma" value="312" icon={<TrendingUp className="h-4.5 w-4.5" />} accent="indigo" />
        <StatCard label="Mentor-level Users" value="38" icon={<Award className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Penalties Applied (30d)" value="17" icon={<AlertTriangle className="h-4.5 w-4.5" />} accent="rose" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Left column: thresholds + actions */}
        <div className="xl:col-span-2 space-y-4">

          {/* Level thresholds */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Level Thresholds</h2>
              <p className="text-xs text-slate-400 mt-0.5">Karma required to unlock each capability. Persisted per-school in KarmaThreshold.</p>
            </div>
            <div className="divide-y divide-slate-50">
              {thresholds.map((t, i) => (
                <div key={t.level} className="flex items-center gap-3 px-4 sm:px-5 py-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-500 text-xs font-bold flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-slate-800">{t.level}</p>
                    <p className="text-[11px] text-slate-400 truncate">{t.unlocks}</p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input
                      type="number"
                      value={t.karma}
                      onChange={e => updateThreshold(i, Number(e.target.value))}
                      disabled={i === 0}
                      className="w-20 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 text-right tabular-nums outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    <span className="text-[10px] text-slate-400 font-semibold w-10">karma</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Action values (read-only reference) */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 sm:px-5 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900">Action Values</h2>
              <p className="text-xs text-slate-400 mt-0.5">Karma awarded per engagement action (giver / receiver)</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-left">
                    {["Action", "Giver", "Receiver"].map(h => (
                      <th key={h} className="px-4 sm:px-5 py-2.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {defaultActions.map((a, i) => (
                    <tr key={i}>
                      <td className="px-4 sm:px-5 py-3">
                        <span className="flex items-center gap-2 text-xs font-medium text-slate-700">
                          <span className="text-violet-400">{a.icon}</span> {a.action}
                        </span>
                      </td>
                      <td className={`px-4 sm:px-5 py-3 text-xs font-bold tabular-nums ${a.giver < 0 ? "text-rose-500" : "text-slate-700"}`}>{a.giver > 0 ? `+${a.giver}` : a.giver}</td>
                      <td className={`px-4 sm:px-5 py-3 text-xs font-bold tabular-nums ${a.receiver < 0 ? "text-rose-500" : "text-emerald-600"}`}>{a.receiver > 0 ? `+${a.receiver}` : a.receiver}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Daily caps + rules */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-1">Daily Caps</h2>
              <p className="text-xs text-slate-400 mb-4">Anti-gaming limits per user per day</p>
              <div className="space-y-3">
                {caps.map((c, i) => (
                  <div key={c.label} className="flex items-center gap-2">
                    <span className="flex-1 text-xs text-slate-600">{c.label}</span>
                    <input
                      type="number"
                      value={c.value}
                      onChange={e => updateCap(i, Number(e.target.value))}
                      className="w-16 rounded-lg border border-slate-200 px-2 py-1.5 text-xs font-bold text-slate-700 text-right tabular-nums outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <h2 className="text-sm font-bold text-slate-900 mb-1">System Rules</h2>
              <p className="text-xs text-slate-400 mb-4">Global karma behaviour</p>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs text-slate-600">Karma retained on unlock spend</span>
                    <span className="text-xs font-bold text-indigo-600 tabular-nums">{retention}%</span>
                  </div>
                  <input
                    type="range" min={0} max={100} step={5} value={retention}
                    onChange={e => { setRetention(Number(e.target.value)); setDirty(true) }}
                    className="w-full accent-indigo-600"
                  />
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 p-3">
                  <Gamepad2 className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="flex-1 text-xs text-slate-600">Game karma hard-capped at</span>
                  <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-bold text-slate-600">0</span>
                </div>
                <div className="flex items-center gap-2 rounded-lg bg-slate-50 border border-slate-100 p-3">
                  <Shield className="h-4 w-4 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-600">Per-school overrides via <span className="font-mono text-[11px] text-violet-600">KarmaThreshold</span> model</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: manual adjustment + logs */}
        <div className="space-y-4">

          {/* Manual adjustment */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
            <h2 className="text-sm font-bold text-slate-900 mb-1">Manual Adjustment</h2>
            <p className="text-xs text-slate-400 mb-4">Grant or deduct karma with an audit trail</p>
            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Member</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input value={adjustUser} onChange={e => setAdjustUser(e.target.value)} placeholder="Search member by name..."
                    className="w-full rounded-lg border border-slate-200 pl-8 pr-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Amount</label>
                <div className="flex gap-1.5">
                  <button onClick={() => setAdjustAmount(a => String(Math.abs(Number(a) || 25)))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 hover:bg-emerald-50"><Plus className="h-3.5 w-3.5" /></button>
                  <button onClick={() => setAdjustAmount(a => String(-Math.abs(Number(a) || 25)))} className="flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50"><Minus className="h-3.5 w-3.5" /></button>
                  <input value={adjustAmount} onChange={e => setAdjustAmount(e.target.value)} type="number" placeholder="e.g. 50 or -25"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold tabular-nums outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1">Reason (required, logged)</label>
                <textarea value={adjustReason} onChange={e => setAdjustReason(e.target.value)} rows={2}
                  placeholder="e.g. Reward for organizing the blood donation camp"
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 resize-none" />
              </div>
              <button onClick={applyAdjustment}
                disabled={!adjustUser.trim() || !adjustAmount.trim() || !adjustReason.trim()}
                className={`w-full rounded-lg py-2.5 text-xs font-bold text-white transition-colors ${adjustDone ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700"} disabled:opacity-50`}>
                {adjustDone ? "Adjustment Applied" : "Apply Adjustment"}
              </button>
            </div>
          </div>

          {/* Recent adjustments log */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><History className="h-4 w-4 text-violet-500" /> Recent Adjustments</h2>
            </div>
            <ul className="divide-y divide-slate-50">
              {recentAdjustments.map((a, i) => (
                <li key={i} className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className={`text-xs font-bold tabular-nums ${a.change > 0 ? "text-emerald-600" : "text-rose-500"}`}>
                      {a.change > 0 ? `+${a.change}` : a.change}
                    </span>
                    <span className="text-xs font-semibold text-slate-800">{a.user}</span>
                  </div>
                  <p className="text-[11px] text-slate-500">{a.reason}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">by {a.admin} · {a.time}</p>
                </li>
              ))}
            </ul>
          </div>

          {/* Top earners */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2"><Award className="h-4 w-4 text-amber-500" /> Top Karma Earners</h2>
            </div>
            <ul className="divide-y divide-slate-50">
              {topEarners.map((u, i) => (
                <li key={i} className="flex items-center gap-3 px-4 py-2.5">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-bold flex-shrink-0 ${
                    i === 0 ? "bg-amber-100 text-amber-700" : i === 1 ? "bg-slate-200 text-slate-600" : i === 2 ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-400"
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-xs font-semibold text-slate-700 truncate">{u.name}</span>
                  <span className="text-xs font-bold text-violet-600 tabular-nums">{u.karma.toLocaleString()}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
