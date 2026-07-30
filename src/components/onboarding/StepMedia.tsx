"use client"

import { useCallback } from "react"
import { Camera, ImagePlus } from "lucide-react"
import type { MediaData } from "@/lib/onboarding"
import { BLOOD_GROUPS } from "@/lib/onboarding"

interface StepMediaProps {
  data: MediaData
  set: (patch: Partial<MediaData>) => void
  onNext: () => void
}

export function StepMedia({ data, set, onNext }: StepMediaProps) {
  // ponytail: previews use local object URLs. Upload to R2 on submit later.
  const pick = useCallback(
    (key: "photoUrl" | "coverUrl") => (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) set({ [key]: URL.createObjectURL(file) } as Partial<MediaData>)
    },
    [set],
  )

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Set up your profile</h1>
        <p className="text-sm text-gray-500">Add a photo, a cover, and a line about yourself.</p>
      </div>

      {/* Cover + avatar */}
      <div>
        <div
          className="relative h-32 w-full rounded-lg bg-gray-100 bg-cover bg-center"
          style={data.coverUrl ? { backgroundImage: `url(${data.coverUrl})` } : undefined}
        >
          <label className="absolute right-2 top-2 inline-flex cursor-pointer items-center gap-1.5 rounded bg-white/90 px-3 py-1.5 text-xs font-medium text-gray-700 shadow-sm hover:bg-white">
            <ImagePlus className="h-4 w-4" />
            {data.coverUrl ? "Change cover" : "Add cover"}
            <input type="file" accept="image/*" onChange={pick("coverUrl")} className="hidden" />
          </label>

          <label className="absolute -bottom-8 left-4 flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-white bg-gray-200 shadow">
            {data.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={data.photoUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <Camera className="h-6 w-6 text-gray-400" />
            )}
            <input type="file" accept="image/*" onChange={pick("photoUrl")} className="hidden" />
          </label>
        </div>
        <div className="h-8" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Bio</label>
        <textarea
          value={data.bio}
          onChange={(e) => set({ bio: e.target.value })}
          rows={3}
          placeholder="Tell fellow Navodayans a little about yourself…"
          className="w-full resize-none rounded border border-gray-300 px-4 py-3 text-base outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
      </div>

      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Blood group</label>
        <div className="flex flex-wrap gap-2">
          {BLOOD_GROUPS.map((bg) => (
            <button
              key={bg}
              type="button"
              onClick={() => set({ bloodGroup: data.bloodGroup === bg ? "" : bg })}
              className={`rounded border px-3 py-2 text-sm font-semibold transition-colors ${
                data.bloodGroup === bg
                  ? "border-brand bg-brand-50 text-brand"
                  : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
              }`}
            >
              {bg}
            </button>
          ))}
        </div>
      </div>

      <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <input
          type="checkbox"
          checked={data.willingToDonate}
          onChange={(e) => set({ willingToDonate: e.target.checked })}
          className="mt-0.5 h-5 w-5 accent-brand"
        />
        <span className="text-sm text-gray-700">
          <span className="font-medium">I&apos;m willing to donate blood if a fellow member needs it.</span>
          <br />
          <span className="text-gray-500">You&apos;ll only be contacted for genuine, urgent requests.</span>
        </span>
      </label>

      <button
        onClick={onNext}
        className="w-full rounded bg-brand py-3 text-base font-semibold text-white transition-colors hover:bg-brand-600"
      >
        Continue
      </button>
    </div>
  )
}
