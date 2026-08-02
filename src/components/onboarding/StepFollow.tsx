"use client"

import { useState } from "react"
import Image from "next/image"
import { Check, UserPlus } from "lucide-react"
import type { FollowData } from "@/lib/onboarding"
import type { SuggestedPerson } from "@/modules/onboarding/suggestions"
import { followPerson } from "@/app/(onboarding)/onboarding/actions"

export function StepFollow({
  suggestions, data, set, onNext, onSkip,
}: {
  suggestions: SuggestedPerson[]
  data: FollowData
  set: (patch: Partial<FollowData>) => void
  onNext: () => void
  onSkip: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const followed = new Set(data.followedIds)

  async function toggle(id: string) {
    if (followed.has(id) || busy) return
    setBusy(id)
    try {
      await followPerson(id)
      set({ followedIds: [...data.followedIds, id] })
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Follow 3 people</h1>
        <p className="text-sm text-gray-500">A few Navodayans to get your feed started. You can skip this.</p>
      </div>

      <div className="space-y-3">
        {suggestions.length === 0 && <p className="text-sm text-gray-500">No suggestions yet — come back once more members join.</p>}
        {suggestions.map((s) => {
          const isFollowed = followed.has(s.id)
          return (
            <div key={s.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-3">
              <Image src={s.photoUrl} alt={s.name} width={44} height={44} className="h-11 w-11 flex-shrink-0 rounded-full object-cover ring-1 ring-gray-200" />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-bold text-gray-900">{s.name}</div>
                <div className="truncate text-xs text-gray-500">
                  {s.headline || "Navodayan"}
                  {s.houseName && <span style={s.houseColor ? { color: s.houseColor } : undefined}> · {s.houseName}</span>}
                  {s.batchLabel && <span className="text-gray-400"> · {s.batchLabel}</span>}
                </div>
                <div className="mt-0.5 text-[11px] font-medium text-brand">{s.reason}</div>
              </div>
              <button
                onClick={() => toggle(s.id)}
                disabled={isFollowed || busy === s.id}
                className={`flex flex-shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold transition-colors ${
                  isFollowed ? "bg-green-50 text-green-700" : "bg-brand text-white hover:bg-brand-600"
                }`}
              >
                {isFollowed ? <><Check className="h-4 w-4" /> Following</> : <><UserPlus className="h-4 w-4" /> Follow</>}
              </button>
            </div>
          )
        })}
      </div>

      <div className="flex items-center gap-3">
        <button onClick={onSkip} className="rounded-lg px-4 py-3 text-sm font-semibold text-gray-500 hover:bg-gray-100">Skip</button>
        <button onClick={onNext} className="flex-1 rounded-lg bg-brand py-3 text-base font-semibold text-white hover:bg-brand-600">
          {followed.size > 0 ? `Continue (${followed.size} followed)` : "Continue"}
        </button>
      </div>
    </div>
  )
}
