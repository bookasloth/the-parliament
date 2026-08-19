"use client"

import { useRef, useState } from "react"
import { UploadSimple, Trash, User, FloppyDisk } from "@phosphor-icons/react"
import { PageHeader, Button, useToast } from "../admin-ui"
import { uploadCommitteePhotoAction, removeCommitteePhotoAction, saveCommitteeTextAction } from "./actions"

type Row = { key: string; name: string; position: string; photo: string | null; profileLink: string }

const inputCls = "w-full rounded-[4px] border border-zinc-700 bg-[#0a0a0a] px-2.5 py-1.5 text-sm text-zinc-100 outline-none focus:border-blue-500"

export default function CommitteePhotosClient({ members }: { members: Row[] }) {
  const toast = useToast()
  const [rows, setRows] = useState(members)
  const [busy, setBusy] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

  const patch = (key: string, p: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...p } : r)))

  async function uploadPhoto(key: string, file: File) {
    setBusy(key)
    const fd = new FormData()
    fd.append("key", key); fd.append("file", file)
    const res = await uploadCommitteePhotoAction(fd)
    setBusy(null)
    if ("error" in res) { toast.error(res.error); return }
    patch(key, { photo: res.url }); toast.success("Photo updated")
  }

  async function removePhoto(key: string) {
    setBusy(key)
    const res = await removeCommitteePhotoAction(key)
    setBusy(null)
    if ("error" in res) { toast.error(res.error); return }
    patch(key, { photo: null }); toast.success("Photo removed")
  }

  async function saveText(row: Row) {
    setBusy(row.key)
    const res = await saveCommitteeTextAction(row.key, { name: row.name, profileLink: row.profileLink })
    setBusy(null)
    if ("error" in res) { toast.error(res.error); return }
    toast.success("Saved")
  }

  return (
    <div>
      <PageHeader title="Committee" description="Edit each Executive Committee member's name, profile link, and photo. Shown on the public /committee and /about pages; no photo shows an initial avatar." />
      <div className="space-y-3">
        {rows.map((r) => (
          <div key={r.key} className="flex flex-wrap items-center gap-3 rounded-[6px] border border-zinc-800 bg-[#111113] p-3">
            <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-[4px] bg-zinc-800">
              {r.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photo} alt={r.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-zinc-600"><User className="h-6 w-6" weight="duotone" /></div>
              )}
            </div>

            <div className="min-w-[240px] flex-1 space-y-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">{r.position}</p>
              <input className={inputCls} value={r.name} onChange={(e) => patch(r.key, { name: e.target.value })} placeholder="Full name" maxLength={120} />
              <input className={inputCls} value={r.profileLink} onChange={(e) => patch(r.key, { profileLink: e.target.value })} placeholder="Profile link (https://…) — optional" />
            </div>

            <div className="flex flex-shrink-0 items-center gap-2">
              <input
                ref={(el) => { inputs.current[r.key] = el }}
                type="file" accept="image/jpeg,image/png,image/webp" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(r.key, f); e.target.value = "" }}
              />
              <Button variant="subtle" size="sm" disabled={busy === r.key} onClick={() => inputs.current[r.key]?.click()}>
                <UploadSimple className="h-4 w-4" weight="duotone" /> {r.photo ? "Replace" : "Photo"}
              </Button>
              {r.photo && (
                <Button variant="danger" size="sm" disabled={busy === r.key} onClick={() => removePhoto(r.key)}>
                  <Trash className="h-4 w-4" weight="duotone" />
                </Button>
              )}
              <Button size="sm" disabled={busy === r.key} onClick={() => saveText(r)}>
                <FloppyDisk className="h-4 w-4" weight="duotone" /> {busy === r.key ? "Saving…" : "Save"}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
