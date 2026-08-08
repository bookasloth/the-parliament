"use client"

import Image from "next/image"
import { MapPin } from "lucide-react"
import type { OnboardingData, OnboardingStep } from "@/lib/onboarding"

// Live preview of the member's profile / intro as they fill the wizard.
export function OnboardingPreview({
  data, step, memberName, houseName, houseColor, batchLabel,
}: {
  data: OnboardingData
  step: OnboardingStep
  memberName: string
  houseName: string | null
  houseColor: string | null
  batchLabel: string | null
}) {
  const { profile, work } = data
  const headline = [work.position, work.company].filter(Boolean).join(" at ") || work.industry || null

  return (
    <div className="w-full max-w-sm">
      <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-white/70">Live preview</p>

      {/* Profile card */}
      <div className="overflow-hidden rounded-[5px] bg-white shadow-xl">
        <div className="h-16 bg-gradient-to-r from-brand-400 to-brand-600" />
        <div className="px-5 pb-5 -mt-8">
          <div className="relative mx-auto h-20 w-20 overflow-hidden rounded-[4px] border-4 border-white bg-gray-100 shadow">
            {profile.photoUrl
              ? <Image src={profile.photoUrl} alt="" fill sizes="80px" className="h-full w-full object-cover" />
              : <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-300">{memberName.charAt(0)}</div>}
          </div>
          <h3 className="mt-2 text-center text-lg font-bold text-gray-900">{memberName}</h3>
          {profile.username && <p className="text-center text-xs text-gray-400">@{profile.username}</p>}
          {headline && <p className="mt-1 text-center text-sm text-gray-600">{headline}</p>}

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
            {houseName && <span className="rounded-[3px] px-2.5 py-1 font-semibold text-white" style={{ backgroundColor: houseColor ?? "#6b7280" }}>{houseName}</span>}
            {batchLabel && <span className="rounded-[3px] bg-gray-100 px-2.5 py-1 font-medium text-gray-600">{batchLabel}</span>}
          </div>

          {profile.location && (
            <p className="mt-3 flex items-center justify-center gap-1 text-xs text-gray-500">
              <MapPin className="h-3.5 w-3.5" /> {profile.location}
            </p>
          )}
          {profile.bio && <p className="mt-3 border-t border-gray-100 pt-3 text-center text-sm text-gray-600">{profile.bio}</p>}
        </div>
      </div>

      {/* Intro post preview */}
      {step === "intro" && data.intro.text && (
        <div className="mt-4 rounded-[5px] bg-white p-4 shadow-xl">
          <p className="mb-2 text-xs font-semibold text-gray-400">Your first post</p>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gray-700">{data.intro.text}</p>
        </div>
      )}
    </div>
  )
}
