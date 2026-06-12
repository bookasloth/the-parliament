"use client"

import { useState, useCallback, useEffect } from "react"
import type { JnvData } from "@/lib/onboarding"
import { STATUS_OPTIONS } from "@/lib/onboarding"

interface School {
  id: string
  name: string
}

interface House {
  id: string
  name: string
}

interface StepJnvProps {
  data: JnvData
  onNext: () => void
}

export function StepJnv({ data, onNext }: StepJnvProps) {
  const [form, setForm] = useState<JnvData>(data)
  const [schools, setSchools] = useState<School[]>([])
  const [houses, setHouses] = useState<House[]>([])
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [schoolsRes, housesRes] = await Promise.all([
          fetch("/api/schools"),
          fetch("/api/houses"),
        ])
        if (schoolsRes.ok) {
          const s = await schoolsRes.json()
          setSchools(s.schools || [])
        }
        if (housesRes.ok) {
          const h = await housesRes.json()
          setHouses(h.houses || [])
        }
      } catch {
        // silently fail
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const update = useCallback((key: keyof JnvData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleNext = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/onboarding/jnv", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error("Failed to save")
      onNext()
    } catch {
      setSaving(false)
    }
  }, [form, onNext])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">JNV Details</h1>
        <p className="text-sm text-gray-500">Tell us about your time at JNV</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">JNV School</label>
          <select
            value={form.schoolId}
            onChange={(e) => update("schoolId", e.target.value)}
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-white"
          >
            <option value="">Select your JNV school</option>
            {schools.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch Year</label>
          <input
            type="number"
            value={form.batchYear}
            onChange={(e) => update("batchYear", e.target.value)}
            placeholder="e.g. 2010"
            min={1960}
            max={2030}
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">House</label>
          <select
            value={form.houseId}
            onChange={(e) => update("houseId", e.target.value)}
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-white"
          >
            <option value="">Select your house</option>
            {houses.map((h) => (
              <option key={h.id} value={h.id}>{h.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Years Studied</label>
          <input
            type="number"
            value={form.yearsStudied}
            onChange={(e) => update("yearsStudied", e.target.value)}
            placeholder="e.g. 7"
            min={1}
            max={12}
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current Status</label>
          <select
            value={form.currentStatus}
            onChange={(e) => update("currentStatus", e.target.value)}
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-white"
          >
            <option value="">Select your status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={saving || !form.schoolId || !form.currentStatus}
        className={`w-full rounded py-3 text-base font-semibold text-white transition-colors ${
          saving || !form.schoolId || !form.currentStatus
            ? "cursor-not-allowed bg-gray-300"
            : "bg-brand hover:bg-brand-600"
        }`}
      >
        {saving ? "Saving..." : "Continue"}
      </button>
    </div>
  )
}
