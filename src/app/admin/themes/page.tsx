"use client"

import { useState } from "react"
import {
  Palette, Sparkles, CheckCircle2, Plus, Save, Info, Calendar,
} from "lucide-react"
import { PageHeader, StatCard } from "../admin-ui"
import { ChatDecorations } from "@/components/shared/ChatDecorations"
import {
  FESTIVE_THEMES, DEFAULT_THEME, getActiveTheme, formatSchedule,
  type ChatTheme,
} from "@/config/chat-themes"

const REF_YEAR = 2026
const pad = (n: number) => String(n).padStart(2, "0")

function scheduleToDate(month: number, day: number) {
  return `${REF_YEAR}-${pad(month)}-${pad(day)}`
}
function dateToMonthDay(value: string): { month: number; day: number } {
  const [, m, d] = value.split("-").map(Number)
  return { month: m, day: d }
}

/** Small live preview of a themed conversation. */
function MiniChatPreview({ theme }: { theme: ChatTheme }) {
  const isDark = theme.dark ?? false
  const bubbles = [
    { me: false, text: "Happy festivities! 🎉" },
    { me: true, text: "Wishing you the same!" },
    { me: false, text: "See you at the celebration." },
  ]
  return (
    <div
      className="relative h-[180px] overflow-hidden rounded-lg border border-slate-200"
      style={theme.conversationBackground ? { background: theme.conversationBackground } : { background: "#f1f5f9" }}
    >
      <ChatDecorations decoration={theme.decoration} />
      <div className="relative z-10 flex flex-col gap-2 p-3">
        <p className="text-center text-[10px] font-medium" style={{ color: isDark ? "#cbb48a" : theme.dividerColor }}>
          Today
        </p>
        {bubbles.map((b, i) => {
          const style = b.me ? theme.sent : theme.received
          return (
            <div key={i} className={`flex ${b.me ? "justify-end" : "justify-start"}`}>
              <span
                className="rounded-2xl px-3 py-1.5 text-xs shadow-sm max-w-[75%]"
                style={{ background: style.background, color: style.color }}
              >
                {b.text}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default function AdminThemesPage() {
  const [themes, setThemes] = useState<ChatTheme[]>(FESTIVE_THEMES)
  const [saved, setSaved] = useState(false)

  const activeToday = getActiveTheme(new Date(), themes)

  function update(id: string, patch: Partial<ChatTheme>) {
    setThemes((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)))
    setSaved(false)
  }
  function updateSchedule(id: string, which: "start" | "end", value: string) {
    const { month, day } = dateToMonthDay(value)
    setThemes((prev) =>
      prev.map((t) => {
        if (t.id !== id || !t.schedule) return t
        const schedule = { ...t.schedule }
        if (which === "start") { schedule.startMonth = month; schedule.startDay = day }
        else { schedule.endMonth = month; schedule.endDay = day }
        return { ...t, schedule }
      })
    )
    setSaved(false)
  }

  function save() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  const enabledCount = themes.filter((t) => t.enabled).length

  return (
    <div>
      <PageHeader
        title="Festive Chat Themes"
        description="Schedule seasonal looks for the chat. When a window is active, every conversation adopts that theme's bubbles, background, and decorations."
        actions={
          <>
            <button className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50">
              <Plus className="h-3.5 w-3.5" /> Add Custom Theme
            </button>
            <button
              onClick={save}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-colors ${saved ? "bg-emerald-600" : "bg-indigo-600 hover:bg-indigo-700"}`}
            >
              {saved ? <><CheckCircle2 className="h-3.5 w-3.5" /> Saved</> : <><Save className="h-3.5 w-3.5" /> Save Schedule</>}
            </button>
          </>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
        <StatCard label="Festive Themes" value={String(themes.length)} icon={<Palette className="h-4.5 w-4.5" />} accent="violet" />
        <StatCard label="Enabled" value={String(enabledCount)} icon={<CheckCircle2 className="h-4.5 w-4.5" />} accent="emerald" />
        <StatCard label="Active Today" value={activeToday.name} icon={<Sparkles className="h-4.5 w-4.5" />} accent="amber" />
      </div>

      {/* Active-today banner */}
      <div className="mb-5 flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-4">
        <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Info className="h-4.5 w-4.5" />
        </div>
        <div className="text-sm text-slate-600">
          {activeToday.id === "default" ? (
            <>
              No festival window matches today, so chats show the{" "}
              <span className="font-semibold text-slate-800">Default</span> theme. Adjust a window below to cover today and it
              will take over automatically.
            </>
          ) : (
            <>
              The <span className="font-semibold text-slate-800">{activeToday.name}</span> theme is live right now across all
              conversations.
            </>
          )}
        </div>
      </div>

      {/* Theme cards */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {themes.map((theme) => (
          <div key={theme.id} className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            {/* Card header */}
            <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3.5">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex gap-0.5 flex-shrink-0">
                  {theme.swatch.map((c, i) => (
                    <span key={i} className="h-5 w-5 rounded-full border border-slate-200" style={{ background: c }} />
                  ))}
                </div>
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    {theme.name}
                    {activeToday.id === theme.id && (
                      <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-600 border border-emerald-200">Live</span>
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400 truncate">{theme.description}</p>
                </div>
              </div>
              {/* Enabled toggle */}
              <button
                onClick={() => update(theme.id, { enabled: !theme.enabled })}
                className={`relative h-6 w-11 flex-shrink-0 rounded-full transition-colors ${theme.enabled ? "bg-indigo-600" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${theme.enabled ? "left-[22px]" : "left-0.5"}`} />
              </button>
            </div>

            {/* Card body: preview + schedule */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4">
              <MiniChatPreview theme={theme} />

              <div className="space-y-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wide text-slate-400 mb-1 flex items-center gap-1">
                    <Calendar className="h-3 w-3" /> Active window
                  </label>
                  {theme.schedule ? (
                    <>
                      <div className="flex items-center gap-2">
                        <input
                          type="date"
                          value={scheduleToDate(theme.schedule.startMonth, theme.schedule.startDay)}
                          onChange={(e) => updateSchedule(theme.id, "start", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                        />
                        <span className="text-xs text-slate-400">to</span>
                        <input
                          type="date"
                          value={scheduleToDate(theme.schedule.endMonth, theme.schedule.endDay)}
                          onChange={(e) => updateSchedule(theme.id, "end", e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-2 py-1.5 text-xs outline-none focus:border-indigo-400"
                        />
                      </div>
                      <p className="mt-1.5 text-[11px] text-slate-400">
                        Recurs every year · <span className="font-medium text-slate-600">{formatSchedule(theme.schedule)}</span>
                      </p>
                    </>
                  ) : (
                    <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-3 py-2.5">
                      <p className="text-[11px] text-slate-500">
                        <span className="font-semibold text-slate-700">On-demand theme.</span> No automatic window —
                        members can pick it manually from the chat theme menu.
                      </p>
                    </div>
                  )}
                </div>

                <div className="rounded-lg bg-slate-50 border border-slate-100 p-2.5 text-[11px] text-slate-500 space-y-1">
                  <p><span className="font-semibold text-slate-700">Decoration:</span> <span className="capitalize">{theme.decoration === "none" ? "None" : theme.decoration}</span></p>
                  <p><span className="font-semibold text-slate-700">Sent bubble:</span> outgoing messages</p>
                  <p><span className="font-semibold text-slate-700">Received bubble:</span> incoming messages</p>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Default theme reference */}
      <div className="mt-4 rounded-xl border border-dashed border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex gap-0.5">
            {DEFAULT_THEME.swatch.map((c, i) => (
              <span key={i} className="h-5 w-5 rounded-full border border-slate-200" style={{ background: c }} />
            ))}
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900">Default Theme</h3>
            <p className="text-[11px] text-slate-400">{DEFAULT_THEME.description}</p>
          </div>
          <span className="ml-auto rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-500">Always on (fallback)</span>
        </div>
      </div>
    </div>
  )
}
