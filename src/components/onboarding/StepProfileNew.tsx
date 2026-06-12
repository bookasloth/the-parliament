"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import type { ProfileData } from "@/lib/onboarding"
import { GENDER_OPTIONS } from "@/lib/onboarding"

interface StepProfileNewProps {
  data: ProfileData
  onNext: () => void
}

export function StepProfileNew({ data, onNext }: StepProfileNewProps) {
  const router = useRouter()
  const [form, setForm] = useState<ProfileData>(data)
  const [saving, setSaving] = useState(false)

  const update = useCallback((key: keyof ProfileData, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }, [])

  const handleNext = useCallback(async () => {
    setSaving(true)
    try {
      const res = await fetch("/api/onboarding/profile", {
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

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Complete Your Profile</h1>
        <p className="text-sm text-gray-500">Help alumni know you better</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
          <input
            type="tel"
            value={form.mobile}
            onChange={(e) => update("mobile", e.target.value)}
            placeholder="+91 98765 43210"
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Gender <span className="text-gray-400">(optional)</span></label>
          <select
            value={form.gender}
            onChange={(e) => update("gender", e.target.value)}
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 bg-white"
          >
            <option value="">Select gender</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date of Birth <span className="text-gray-400">(optional)</span></label>
          <input
            type="date"
            value={form.dob}
            onChange={(e) => update("dob", e.target.value)}
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Current City</label>
          <input
            type="text"
            value={form.city}
            onChange={(e) => update("city", e.target.value)}
            placeholder="e.g. Mumbai, Delhi, Bangalore"
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Profession</label>
          <input
            type="text"
            value={form.profession}
            onChange={(e) => update("profession", e.target.value)}
            placeholder="e.g. Engineer, Doctor, Teacher"
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Bio <span className="text-gray-400">(optional)</span></label>
          <textarea
            value={form.bio}
            onChange={(e) => update("bio", e.target.value)}
            placeholder="Tell us a little about yourself..."
            rows={3}
            className="w-full rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10 resize-none"
          />
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={saving || !form.city || !form.profession}
        className={`w-full rounded py-3 text-base font-semibold text-white transition-colors ${
          saving || !form.city || !form.profession
            ? "cursor-not-allowed bg-gray-300"
            : "bg-brand hover:bg-brand-600"
        }`}
      >
        {saving ? "Saving..." : "Continue"}
      </button>
    </div>
  )
}
