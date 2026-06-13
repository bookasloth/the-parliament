"use client"

import { useState } from "react"
import {
  ArrowLeft, Eye, ThumbsUp, ThumbsDown, MessageCircle, Share2,
  TrendingUp, TrendingDown, Users, BarChart2, Award, Clock,
  Home, Calendar, Menu, Plus, X,
} from "lucide-react"

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const viewsData = [120, 340, 280, 510, 890, 1240, 1240]
const upvotesData = [4, 12, 8, 18, 34, 56, 56]
const commentsData = [1, 4, 3, 7, 12, 18, 18]

const topCommenters = [
  { name: "Dr. Amit Verma", headline: "Cardiologist · AIIMS", avatar: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=100&h=100&fit=crop&crop=face", count: 3 },
  { name: "Neha Gupta", headline: "IAS Officer", avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=100&h=100&fit=crop&crop=face", count: 2 },
  { name: "Priya Sharma", headline: "Engineer · Google", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop&crop=face", count: 2 },
]

const batchDistribution = [
  { batch: "20th (2005-12)", count: 4, pct: 22 },
  { batch: "21st (2006-13)", count: 8, pct: 44 },
  { batch: "22nd (2007-14)", count: 3, pct: 17 },
  { batch: "23rd (2008-15)", count: 2, pct: 11 },
  { batch: "Others", count: 1, pct: 6 },
]

const shareBreakdown = [
  { method: "Direct Message", count: 1, pct: 33 },
  { method: "Copy Link", count: 1, pct: 33 },
  { method: "External Share", count: 1, pct: 34 },
]

const awardsReceived = [
  { emoji: "🔥", label: "Fire Post", count: 2 },
  { emoji: "👑", label: "Crown", count: 1 },
]

function MiniBarChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  return (
    <div className="flex items-end gap-1 h-16">
      {data.map((v, i) => (
        <div key={i} className="flex flex-col items-center gap-1 flex-1">
          <div
            className="w-full rounded-sm transition-all"
            style={{ height: `${(v / max) * 56}px`, backgroundColor: color, opacity: i === data.length - 1 ? 1 : 0.45 + (i / data.length) * 0.55 }}
          />
        </div>
      ))}
    </div>
  )
}

function MiniLineChart({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 280
  const h = 80
  const points = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * (h - 10) - 5}`)
  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="overflow-visible">
      <defs>
        <linearGradient id={`grad-${color}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.2" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`M ${points.join(" L ")} L ${w},${h} L 0,${h} Z`}
        fill={`url(#grad-${color})`}
      />
      <path
        d={`M ${points.join(" L ")}`}
        fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
      />
      {data.map((v, i) => (
        <circle key={i}
          cx={(i / (data.length - 1)) * w}
          cy={h - ((v - min) / range) * (h - 10) - 5}
          r={i === data.length - 1 ? 4 : 2.5}
          fill={i === data.length - 1 ? color : "white"}
          stroke={color} strokeWidth="1.5"
        />
      ))}
    </svg>
  )
}

export default function PostAnalyticsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [range, setRange] = useState<"7d" | "30d">("7d")

  const stats = [
    { label: "Total Views", value: "1,240", change: "+34%", up: true, icon: <Eye className="h-5 w-5" />, color: "text-blue-500", bg: "bg-blue-50" },
    { label: "Upvotes", value: "56", change: "+12%", up: true, icon: <ThumbsUp className="h-5 w-5" />, color: "text-brand", bg: "bg-brand-50" },
    { label: "Comments", value: "18", change: "+8%", up: true, icon: <MessageCircle className="h-5 w-5" />, color: "text-green-500", bg: "bg-green-50" },
    { label: "Shares", value: "3", change: "0%", up: true, icon: <Share2 className="h-5 w-5" />, color: "text-purple-500", bg: "bg-purple-50" },
    { label: "Downvotes", value: "12", change: "+2%", up: false, icon: <ThumbsDown className="h-5 w-5" />, color: "text-red-400", bg: "bg-red-50" },
    { label: "Engagement Rate", value: "7.1%", change: "+1.2%", up: true, icon: <BarChart2 className="h-5 w-5" />, color: "text-amber-500", bg: "bg-amber-50" },
  ]

  return (
    <div className="min-h-screen bg-[#f3f2ef] pb-16 lg:pb-0">
      {sidebarOpen && <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      <div className={`fixed top-0 left-0 z-50 h-full w-72 bg-white shadow-xl transition-transform lg:hidden ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex justify-end p-3 border-b"><button onClick={() => setSidebarOpen(false)}><X className="h-5 w-5 text-gray-400" /></button></div>
      </div>

      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex h-[52px] max-w-[1100px] items-center gap-3 px-4 sm:px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden p-1.5 rounded-lg hover:bg-gray-100">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>
          <a href="/feed/1" className="flex items-center gap-1.5 text-gray-500 hover:text-brand transition-colors">
            <ArrowLeft className="h-5 w-5" />
            <span className="text-sm font-medium hidden sm:inline">Back to Post</span>
          </a>
          <span className="text-sm font-semibold text-gray-900">Post Analytics</span>
          <div className="flex-1" />
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            {(["7d", "30d"] as const).map(r => (
              <button key={r} onClick={() => setRange(r)}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${range === r ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
                {r === "7d" ? "7 Days" : "30 Days"}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1100px] px-4 sm:px-6 py-6 space-y-5">
        {/* Post Thumbnail */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
          <img src="https://images.unsplash.com/photo-1461896836934-bd45ba8fcf9b?w=120&h=80&fit=crop" alt="" className="h-16 w-24 rounded-lg object-cover flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800 line-clamp-2">It&apos;s a reminder: Of early mornings, late nights, Near-falls and never-quits…</p>
            <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
              <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> Published Jun 10, 2026</span>
              <span className="flex items-center gap-1"><Eye className="h-3 w-3" /> 1,240 views</span>
            </div>
          </div>
        </div>

        {/* Summary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {stats.map((s, i) => (
            <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div className={`rounded-lg p-2 ${s.bg}`}>
                  <span className={s.color}>{s.icon}</span>
                </div>
                <span className={`flex items-center gap-0.5 text-xs font-medium ${s.up ? "text-green-600" : "text-red-500"}`}>
                  {s.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {s.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Views Over Time */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Views Over Time</h3>
              <span className="text-xs text-gray-400">Last 7 days</span>
            </div>
            <div className="overflow-hidden">
              <MiniLineChart data={viewsData} color="#009ae4" />
            </div>
            <div className="flex justify-between mt-2">
              {DAYS.map(d => <span key={d} className="text-[10px] text-gray-400">{d}</span>)}
            </div>
          </div>

          {/* Upvotes Over Time */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-900">Upvotes &amp; Comments</h3>
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="h-2 w-2 rounded-full bg-brand inline-block" /> Upvotes</span>
                <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="h-2 w-2 rounded-full bg-green-500 inline-block" /> Comments</span>
              </div>
            </div>
            <div className="flex items-end gap-1.5 h-16">
              {upvotesData.map((v, i) => {
                const maxV = Math.max(...upvotesData)
                return (
                  <div key={i} className="flex-1 flex gap-0.5 items-end">
                    <div className="flex-1 rounded-sm bg-brand" style={{ height: `${(v / maxV) * 56}px`, opacity: 0.5 + (i / upvotesData.length) * 0.5 }} />
                    <div className="flex-1 rounded-sm bg-green-400" style={{ height: `${(commentsData[i] / maxV) * 56}px`, opacity: 0.5 + (i / commentsData.length) * 0.5 }} />
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2">
              {DAYS.map(d => <span key={d} className="text-[10px] text-gray-400">{d}</span>)}
            </div>
          </div>

          {/* Audience — Batch Distribution */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Audience by Batch</h3>
            <div className="space-y-3">
              {batchDistribution.map((b, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{b.batch}</span>
                    <span className="text-xs font-semibold text-gray-900 tabular-nums">{b.pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-brand transition-all"
                      style={{ width: `${b.pct}%`, opacity: 0.5 + (b.pct / 100) * 0.5 }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Shares Breakdown */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Share Breakdown</h3>
            <div className="space-y-3">
              {shareBreakdown.map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className={`h-8 w-8 rounded-lg flex items-center justify-center flex-shrink-0 ${i === 0 ? "bg-brand-50 text-brand" : i === 1 ? "bg-purple-50 text-purple-500" : "bg-green-50 text-green-500"}`}>
                    <Share2 className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between mb-1">
                      <span className="text-xs text-gray-600 truncate">{s.method}</span>
                      <span className="text-xs font-semibold text-gray-900 ml-2">{s.count}</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div className={`h-full rounded-full ${i === 0 ? "bg-brand" : i === 1 ? "bg-purple-400" : "bg-green-400"}`}
                        style={{ width: `${s.pct}%` }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-5 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Upvote vs Downvote Ratio</h4>
              <div className="flex items-center gap-2">
                <div className="flex-1 h-3 rounded-full overflow-hidden flex">
                  <div className="bg-brand" style={{ width: "82%" }} />
                  <div className="bg-red-400 flex-1" />
                </div>
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-xs text-brand font-medium">56 upvotes (82%)</span>
                <span className="text-xs text-red-400 font-medium">12 downvotes (18%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Top Commenters */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Top Commenters</h3>
            <div className="space-y-3">
              {topCommenters.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-xs font-bold text-gray-400 w-4 tabular-nums">{i + 1}</span>
                  <img src={c.avatar} alt={c.name} className="h-8 w-8 rounded-full object-cover flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{c.name}</p>
                    <p className="text-xs text-gray-500 truncate">{c.headline}</p>
                  </div>
                  <span className="text-xs font-semibold text-gray-700 bg-gray-100 rounded-full px-2.5 py-0.5">{c.count} comments</span>
                </div>
              ))}
            </div>
          </div>

          {/* Awards & Misc */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Awards Received</h3>
            {awardsReceived.length > 0 ? (
              <div className="space-y-2">
                {awardsReceived.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg bg-gray-50 px-3 py-2.5">
                    <span className="text-xl">{a.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-800">{a.label}</p>
                    </div>
                    <span className="text-xs font-semibold text-gray-500 bg-white rounded-full px-2 py-0.5 border border-gray-200">×{a.count}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-6 text-center">
                <Award className="h-8 w-8 text-gray-200 mb-2" />
                <p className="text-sm text-gray-400">No awards yet</p>
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-gray-100">
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Reach Estimate</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Unique Visitors", value: "840", icon: <Users className="h-4 w-4 text-brand" /> },
                  { label: "Avg. Time on Post", value: "1m 42s", icon: <Clock className="h-4 w-4 text-amber-500" /> },
                ].map((r, i) => (
                  <div key={i} className="rounded-lg bg-gray-50 p-3 flex items-center gap-2">
                    {r.icon}
                    <div>
                      <p className="text-sm font-bold text-gray-900">{r.value}</p>
                      <p className="text-[10px] text-gray-500">{r.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      <nav className="fixed bottom-0 left-0 right-0 z-30 bg-white border-t border-gray-200 lg:hidden">
        <div className="flex items-center justify-around py-1.5">
          <a href="/feed" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Home className="h-5 w-5" /><span className="text-[10px] font-medium">Home</span></a>
          <a href="/connections" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Users className="h-5 w-5" /><span className="text-[10px] font-medium">Network</span></a>
          <span className="flex flex-col items-center px-3 py-1 -mt-3">
            <div className="h-11 w-11 rounded-full bg-gradient-to-br from-brand to-brand-700 flex items-center justify-center shadow-md"><Plus className="h-5 w-5 text-white" /></div>
          </span>
          <a href="/events" className="flex flex-col items-center gap-0.5 text-gray-400 hover:text-brand px-3 py-1"><Calendar className="h-5 w-5" /><span className="text-[10px] font-medium">Events</span></a>
          <button onClick={() => setSidebarOpen(true)} className="flex flex-col items-center gap-0.5 text-gray-400 px-3 py-1"><Menu className="h-5 w-5" /><span className="text-[10px] font-medium">Menu</span></button>
        </div>
      </nav>
    </div>
  )
}
