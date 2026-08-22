"use client"

import Image from "next/image"
import { useRef, useState } from "react"
import { ImagePlus, X, Loader2, Building2 } from "lucide-react"

const ALLOWED = ["image/jpeg", "image/png", "image/webp"]
const MAX_BYTES = 4 * 1024 * 1024

/**
 * Upload a single business image (logo or banner) via the shared presign flow.
 * Calls onChange with the R2 key on success, or null when removed. The parent
 * decides how key/null maps to keep/set/remove.
 */
export function BusinessImageUploader({
  label,
  shape,
  initialUrl,
  onChange,
}: {
  label: string
  shape: "square" | "wide"
  initialUrl: string | null
  onChange: (key: string | null) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<string | null>(initialUrl)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function pick(file: File) {
    setErr(null)
    if (!ALLOWED.includes(file.type)) { setErr("Use a JPG, PNG, or WebP image."); return }
    if (file.size > MAX_BYTES) { setErr("Image must be under 4 MB."); return }
    setBusy(true)
    try {
      const signRes = await fetch("/api/uploads/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ kind: "business", contentType: file.type }),
      })
      if (!signRes.ok) throw new Error("Could not start upload")
      const { key, uploadUrl } = await signRes.json()
      const put = await fetch(uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file })
      if (!put.ok) throw new Error("Upload failed")
      setPreview(URL.createObjectURL(file))
      onChange(key)
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Upload failed")
    } finally {
      setBusy(false)
    }
  }

  function remove() {
    setPreview(null)
    onChange(null)
    if (inputRef.current) inputRef.current.value = ""
  }

  const box = shape === "square" ? "h-24 w-24" : "h-24 w-full"

  return (
    <div>
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <div className="mt-1 flex items-center gap-3">
        <div className={`relative ${box} overflow-hidden rounded-[4px] border border-gray-200 bg-gray-50`}>
          {preview ? (
            <Image src={preview} alt="" fill sizes="200px" className="object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-gray-300"><Building2 className="h-7 w-7" /></div>
          )}
          {busy && <div className="absolute inset-0 flex items-center justify-center bg-white/60"><Loader2 className="h-5 w-5 animate-spin text-brand" /></div>}
        </div>
        <div className="flex flex-col gap-1.5">
          <button type="button" onClick={() => inputRef.current?.click()} disabled={busy}
            className="flex items-center gap-1.5 rounded-[4px] border border-gray-300 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50">
            <ImagePlus className="h-4 w-4" /> {preview ? "Replace" : "Upload"}
          </button>
          {preview && (
            <button type="button" onClick={remove} className="flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-500">
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
      </div>
      {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" hidden
        onChange={(e) => { const file = e.target.files?.[0]; if (file) pick(file) }} />
    </div>
  )
}
