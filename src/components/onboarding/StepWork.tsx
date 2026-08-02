"use client"

import { useState } from "react"
import type { WorkData } from "@/lib/onboarding"
import { INDUSTRIES, MONTHS, WORK_YEARS } from "@/lib/onboarding"
import { saveWorkStep } from "@/app/(onboarding)/onboarding/actions"

const input =
  "w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"

export function StepWork({
  data, set, onNext, onSkip,
}: {
  data: WorkData
  set: (patch: Partial<WorkData>) => void
  onNext: () => void
  onSkip: () => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  async function submit() {
    setError(""); setSaving(true)
    try {
      await saveWorkStep({
        industry: data.industry, company: data.company, position: data.position,
        sinceYear: data.sinceYear, sinceMonth: data.sinceMonth,
      })
      onNext()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">What do you do?</h1>
        <p className="text-sm text-gray-500">Helps alumni find you for jobs, mentorship and referrals. You can skip this.</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Industry</label>
        <select value={data.industry} onChange={(e) => set({ industry: e.target.value })} className={`${input} appearance-none`}>
          <option value="">Select industry</option>
          {INDUSTRIES.map((i) => <option key={i} value={i}>{i}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Company</label>
          <input className={input} value={data.company} onChange={(e) => set({ company: e.target.value })} placeholder="e.g. Microsoft" />
        </div>
        <div>
          <label className="mb-1 block text-sm font-semibold text-gray-700">Position</label>
          <input className={input} value={data.position} onChange={(e) => set({ position: e.target.value })} placeholder="e.g. Product Manager" />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Start date</label>
        <div className="grid grid-cols-2 gap-4">
          <select value={data.sinceYear} onChange={(e) => set({ sinceYear: e.target.value })} className={`${input} appearance-none`}>
            <option value="">Year</option>
            {WORK_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={data.sinceMonth} onChange={(e) => set({ sinceMonth: e.target.value })} disabled={!data.sinceYear} className={`${input} appearance-none disabled:bg-gray-50`}>
            <option value="">Month</option>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
        </div>
      </div>

      <label className="flex cursor-pointer items-center gap-2.5">
        <input type="checkbox" checked={data.current} onChange={(e) => set({ current: e.target.checked })} className="h-4 w-4 accent-brand" />
        <span className="text-sm text-gray-700">I currently work here</span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex items-center gap-3">
        <button onClick={onSkip} className="rounded-lg px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100">Skip</button>
        <button onClick={submit} disabled={saving} className="flex-1 rounded-lg bg-brand py-3 text-base font-semibold text-white hover:bg-brand-600 disabled:opacity-60">
          {saving ? "Saving…" : "Continue"}
        </button>
      </div>
    </div>
  )
}
