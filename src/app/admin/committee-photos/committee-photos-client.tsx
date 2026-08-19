"use client"

import { useRef, useState } from "react"
import { UploadSimple, Trash, User } from "@phosphor-icons/react"
import { PageHeader, Button, useToast } from "../admin-ui"
import { uploadCommitteePhotoAction, removeCommitteePhotoAction } from "./actions"

type Row = { key: string; name: string; position: string; photo: string | null }

export default function CommitteePhotosClient({ members }: { members: Row[] }) {
  const toast = useToast()
  const [rows, setRows] = useState(members)
  const [busy, setBusy] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  async function upload(key: string, file: File) {
    setBusy(key)
    const fd = new FormData()
    fd.append("key", key)
    fd.append("file", file)
    const res = await uploadCommitteePhotoAction(fd)
    setBusy(null)
    if ("error" in res) { toast.error(res.error); return }
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, photo: res.url } : r)))
    toast.success("Photo updated")
  }

  async function remove(key: string) {
    setBusy(key)
    const res = await removeCommitteePhotoAction(key)
    setBusy(null)
    if ("error" in res) { toast.error(res.error); return }
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, photo: null } : r)))
    toast.success("Photo removed")
  }

  return (
    <div>
      <PageHeader title="Committee Photos" description="Upload a headshot for each Executive Committee member. Shown on the public /committee and /about pages; members without a photo show an initial avatar." />
      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3 rounded-[6px] border border-zinc-800 bg-[#111113] p-3">
            <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-[4px] bg-zinc-800">
              {r.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo} alt={r.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600"><User className="h-6 w-6" weight="duotone" /></div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-zinc-100">{r.name}</p>
              <p className="truncate text-xs text-zinc-500">{r.position}</p>
            </div>
            <input
              ref={(el) => { inputs.current[r.key] = el }}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(r.key, f); e.target.value = "" }}
            />
            <Button variant="subtle" size="sm" disabled={busy === r.key} onClick={() => inputs.current[r.key]?.click()}>
              <UploadSimple className="h-4 w-4" weight="duotone" /> {busy === r.key ? "Uploading…" : r.photo ? "Replace" : "Upload"}
            </Button>
            {r.photo && (
              <Button variant="danger" size="sm" disabled={busy === r.key} onClick={() => remove(r.key)}>
                <Trash className="h-4 w-4" weight="duotone" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
