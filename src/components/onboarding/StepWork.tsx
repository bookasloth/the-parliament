"use client"

import type { WorkData } from "@/lib/onboarding"
import { WORK_YEARS, MONTHS, daysInMonth } from "@/lib/onboarding"

interface StepWorkProps {
  data: WorkData
  set: (patch: Partial<WorkData>) => void
  onNext: () => void
}

export function StepWork({ data, set, onNext }: StepWorkProps) {
  // Progressive reveal: month appears once a year is picked, day once a month is picked.
  const showMonth = !!data.sinceYear
  const showDay = showMonth && !!data.sinceMonth
  const dayCount =
    showDay ? daysInMonth(Number(data.sinceYear), MONTHS.indexOf(data.sinceMonth as (typeof MONTHS)[number]) + 1) : 0

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Where do you work?</h1>
        <p className="text-sm text-gray-500">All optional — share as much or as little as you like.</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Company</label>
          <input
            value={data.company}
            onChange={(e) => set({ company: e.target.value })}
            placeholder="e.g. Infosys, Self-employed, Government of India"
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Position</label>
          <input
            value={data.position}
            onChange={(e) => set({ position: e.target.value })}
            placeholder="e.g. Software Engineer, Doctor, Founder"
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Working here since</label>
          <div className="grid grid-cols-3 gap-2">
            <select
              value={data.sinceYear}
              onChange={(e) => set({ sinceYear: e.target.value, sinceMonth: "", sinceDay: "" })}
              className="rounded border border-gray-300 bg-white px-3 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
            >
              <option value="">Year</option>
              {WORK_YEARS.map((y) => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>

            {showMonth && (
              <select
                value={data.sinceMonth}
                onChange={(e) => set({ sinceMonth: e.target.value, sinceDay: "" })}
                className="rounded border border-gray-300 bg-white px-3 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                <option value="">Month</option>
                {MONTHS.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            )}

            {showDay && (
              <select
                value={data.sinceDay}
                onChange={(e) => set({ sinceDay: e.target.value })}
                className="rounded border border-gray-300 bg-white px-3 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
              >
                <option value="">Day</option>
                {Array.from({ length: dayCount }, (_, i) => String(i + 1)).map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            )}
          </div>
        </div>
      </div>

      <button
        onClick={onNext}
        className="w-full rounded bg-brand py-3 text-base font-semibold text-white transition-colors hover:bg-brand-600"
      >
        Continue
      </button>
    </div>
  )
}
