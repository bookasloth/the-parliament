"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import { Camera, Loader2, Check, X } from "lucide-react"
import type { ProfileData } from "@/lib/onboarding"
import { checkUsername, saveProfileStep } from "@/app/(onboarding)/onboarding/actions"

const MAX_BYTES = 4 * 1024 * 1024

export function StepProfile({
  data, set, onNext,
}: {
  data: ProfileData
  set: (patch: Partial<ProfileData>) => void
  onNext: () => void
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const [uname, setUname] = useState<{ state: "idle" | "checking" | "ok" | "bad"; reason?: string }>({ state: "idle" })
  const fileRef = useRef<HTMLInputElement>(null)

  // Debounced username availability check.
  useEffect(() => {
    const v = data.username.trim()
    if (!v) { setUname({ state: "idle" }); return }
    setUname({ state: "checking" })
    const t = setTimeout(async () => {
      const r = await checkUsername(v)
      setUname(r.ok ? { state: "ok" } : { state: "bad", reason: r.reason })
    }, 450)
    return () => clearTimeout(t)
  }, [data.username])

  const pickPhoto = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    if (!file.type.startsWith("image/")) return setError("Please choose an image file.")
    if (file.size > MAX_BYTES) return setError("Image must be under 4 MB.")
    set({ photoUrl: URL.createObjectURL(file) })
    setUploading(true)
    try {
      const ext = file.name.split(".").pop() || "jpg"
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "avatar", contentType: file.type, ext }),
      })
      if (!signRes.ok) throw new Error("Could not start upload")
      const { key, uploadUrl } = await signRes.json()
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file })
      if (!put.ok) throw new Error("Upload failed")
      set({ photoKey: key })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed")
      set({ photoKey: "", photoUrl: "" })
    } finally {
      setUploading(false)
    }
  }, [set])

  const canContinue =
    uname.state === "ok" && data.bio.trim().length > 0 && data.location.trim().length > 0 && !uploading && !saving

  async function submit() {
    setError(""); setSaving(true)
    try {
      const { username } = await saveProfileStep({
        photoKey: data.photoKey || undefined,
        username: data.username,
        bio: data.bio,
        location: data.location,
      })
      set({ username })
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
        <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">Set up your profile</h1>
        <p className="text-sm text-gray-500">This is how fellow Navodayans will find and recognise you. Required.</p>
      </div>

      <div className="flex items-center gap-4">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative flex h-20 w-20 items-center justify-center overflow-hidden rounded-[4px] border-4 border-white bg-gray-100 shadow ring-1 ring-gray-200"
        >
          {uploading ? <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            : data.photoUrl ? <Image src={data.photoUrl} alt="" fill sizes="80px" className="h-full w-full object-cover" />
            : <Camera className="h-6 w-6 text-gray-400" />}
        </button>
        <div className="text-sm">
          <button type="button" onClick={() => fileRef.current?.click()} className="font-semibold text-brand hover:underline">
            {data.photoUrl ? "Change photo" : "Add profile photo"}
          </button>
          <p className="text-xs text-gray-400">PNG/JPG, under 4 MB. Optional.</p>
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={pickPhoto} className="hidden" />
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Username <span className="text-red-500">*</span></label>
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">@</span>
          <input
            value={data.username}
            onChange={(e) => set({ username: e.target.value })}
            placeholder="yourname"
            className="w-full rounded-[4px] border border-gray-300 py-2.5 pl-7 pr-9 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            {uname.state === "checking" && <Loader2 className="h-4 w-4 animate-spin text-gray-400" />}
            {uname.state === "ok" && <Check className="h-4 w-4 text-green-600" />}
            {uname.state === "bad" && <X className="h-4 w-4 text-red-500" />}
          </span>
        </div>
        {uname.state === "bad" && <p className="mt-1 text-xs text-red-600">{uname.reason}</p>}
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Short bio <span className="text-red-500">*</span></label>
        <textarea
          value={data.bio} onChange={(e) => set({ bio: e.target.value })} rows={3} maxLength={160}
          placeholder="Tell fellow Navodayans a little about yourself…"
          className="w-full resize-none rounded-[4px] border border-gray-300 px-4 py-3 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
        <p className="mt-1 text-[11px] text-gray-400">{160 - data.bio.length} left</p>
      </div>

      <div>
        <label className="mb-1 block text-sm font-semibold text-gray-700">Location <span className="text-red-500">*</span></label>
        <input
          value={data.location} onChange={(e) => set({ location: e.target.value })}
          placeholder="City, Country"
          className="w-full rounded-[4px] border border-gray-300 px-4 py-2.5 text-sm outline-none focus:border-brand focus:ring-2 focus:ring-brand/10"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button
        onClick={submit} disabled={!canContinue}
        className={`w-full rounded-[4px] py-3 text-base font-semibold text-white transition-colors ${canContinue ? "bg-brand hover:bg-brand-600" : "cursor-not-allowed bg-gray-300"}`}
      >
        {saving ? "Saving…" : "Continue"}
      </button>
    </div>
  )
}
