"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Camera } from "lucide-react"

/** Owner-only overlay button on the profile avatar to upload a new photo. */
export function AvatarUploader() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError("")
    setBusy(true)
    const body = new FormData()
    body.append("file", file)
    const res = await fetch("/api/profile/photo", { method: "POST", body })
    setBusy(false)
    if (!res.ok) {
      const d = await res.json().catch(() => ({}))
      setError(d.error ?? "Upload failed")
      return
    }
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title="Change photo"
        className="absolute bottom-1 right-1 flex h-8 w-8 items-center justify-center rounded-[4px] border-2 border-white bg-brand text-white shadow hover:bg-brand-600 disabled:opacity-60"
      >
        <Camera className="h-4 w-4" />
      </button>
      <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onPick} className="hidden" />
      {error && <p className="absolute -bottom-6 left-0 whitespace-nowrap text-xs text-red-600">{error}</p>}
    </>
  )
}
