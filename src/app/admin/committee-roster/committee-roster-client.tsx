"use client"

import { useState } from "react"
import {
  Trash, User, PencilSimple, Plus, ArrowUp, ArrowDown, Eye, EyeSlash,
  EnvelopeSimple, Phone, LinkSimple, Camera,
} from "@phosphor-icons/react"
import { PageHeader, Button, Modal, EmptyState, useToast } from "../admin-ui"
import type { RosterMemberDTO, RosterGroup } from "@/modules/committee/roster"
import {
  createRosterMemberAction, updateRosterMemberAction, deleteRosterMemberAction,
  setRosterPublishedAction, reorderRosterAction, uploadRosterPhotoAction, removeRosterPhotoAction,
} from "./actions"

const inputCls = "w-full rounded-[4px] border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"
const GROUPS: { key: RosterGroup; label: string }[] = [
  { key: "executive", label: "Executive Committee" },
  { key: "advisory", label: "Advisory Committee" },
]

type Draft = { name: string; position: string; groupType: RosterGroup; profileLink: string; email: string; phone: string }
const draftOf = (m: RosterMemberDTO | null, group: RosterGroup): Draft =>
  m ? { name: m.name, position: m.position, groupType: m.groupType, profileLink: m.profileLink ?? "", email: m.email ?? "", phone: m.phone ?? "" }
    : { name: "", position: "", groupType: group, profileLink: "", email: "", phone: "" }

/** Downscale + re-encode to a small JPEG in the browser before upload. Fixes
 *  huge phone photos (>5MB) and normalises format, so the server always gets a
 *  tidy JPEG. Throws a friendly message if the file can't be decoded (e.g. HEIC
 *  on browsers that can't read it). */
async function resizeImage(file: File, maxDim = 800, quality = 0.85): Promise<File> {
  let bitmap: ImageBitmap
  try { bitmap = await createImageBitmap(file) }
  catch { throw new Error("Couldn't read this image — try a JPEG or PNG (HEIC isn't supported).") }
  const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height))
  const w = Math.max(1, Math.round(bitmap.width * scale))
  const h = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement("canvas")
  canvas.width = w; canvas.height = h
  const ctx = canvas.getContext("2d")
  if (!ctx) throw new Error("Your browser can't process images here.")
  ctx.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", quality))
  if (!blob) throw new Error("Couldn't process this image.")
  return new File([blob], "photo.jpg", { type: "image/jpeg" })
}

export default function CommitteeRosterClient({ initialMembers }: { initialMembers: RosterMemberDTO[] }) {
  const toast = useToast()
  const [members, setMembers] = useState(initialMembers)
  const [editing, setEditing] = useState<RosterMemberDTO | null>(null)
  const [creating, setCreating] = useState<RosterGroup | null>(null)

  const patch = (id: string, p: Partial<RosterMemberDTO>) => setMembers((ms) => ms.map((m) => (m.id === id ? { ...m, ...p } : m)))

  async function run(action: () => Promise<{ ok: true } | { error: string }>, ok?: string) {
    const res = await action()
    if ("error" in res) { toast.error(res.error); return false }
    if (ok) toast.success(ok)
    return true
  }

  async function togglePublish(m: RosterMemberDTO) {
    const next = !m.isPublished
    patch(m.id, { isPublished: next })
    if (!(await run(() => setRosterPublishedAction(m.id, next)))) patch(m.id, { isPublished: m.isPublished })
  }
  async function del(m: RosterMemberDTO) {
    if (!confirm(`Remove ${m.name} from the committee?`)) return
    const prev = members
    setMembers((ms) => ms.filter((x) => x.id !== m.id))
    if (!(await run(() => deleteRosterMemberAction(m.id), "Removed"))) setMembers(prev)
  }
  async function move(group: RosterGroup, index: number, dir: -1 | 1) {
    const list = members.filter((m) => m.groupType === group)
    const j = index + dir
    if (j < 0 || j >= list.length) return
    const reordered = [...list]
    ;[reordered[index], reordered[j]] = [reordered[j], reordered[index]]
    const others = members.filter((m) => m.groupType !== group)
    setMembers(group === "executive" ? [...reordered, ...others] : [...others, ...reordered])
    await run(() => reorderRosterAction(reordered.map((m) => m.id)))
  }

  /** Resize then upload; returns the new photo URL (or throws). */
  async function uploadPhoto(id: string, file: File): Promise<string> {
    const resized = await resizeImage(file)
    const fd = new FormData(); fd.append("id", id); fd.append("file", resized)
    const res = await uploadRosterPhotoAction(fd)
    if ("error" in res) throw new Error(res.error)
    patch(id, { photo: res.member.photo })
    return res.member.photo ?? ""
  }
  async function removePhoto(id: string) {
    const target = members.find((m) => m.id === id)
    patch(id, { photo: null })
    if (!(await run(() => removeRosterPhotoAction(id), "Photo removed"))) patch(id, { photo: target?.photo ?? null })
  }

  return (
    <div>
      <PageHeader title="Committee Roster" description="Add, edit, reorder, hide or remove the members shown on /committee and /about. Click a member to edit details and photo." />

      {members.length === 0 && (
        <EmptyState icon={<User className="h-6 w-6" weight="duotone" />} title="No members" description="Add the first committee member." action={<Button onClick={() => setCreating("executive")}><Plus className="h-4 w-4" weight="duotone" /> Add member</Button>} />
      )}

      {members.length > 0 && GROUPS.map(({ key, label }) => {
        const list = members.filter((m) => m.groupType === key)
        return (
          <section key={key} className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">{label} <span className="text-zinc-600">· {list.length}</span></h2>
              <Button variant="subtle" size="sm" onClick={() => setCreating(key)}><Plus className="h-4 w-4" weight="duotone" /> Add</Button>
            </div>
            <div className="space-y-2">
              {list.map((m, i) => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-[6px] border border-zinc-800 bg-[#111113] p-3">
                  <button onClick={() => setEditing(m)} className="group relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-[4px] bg-zinc-800" aria-label={`Edit ${m.name}`}>
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                    ) : <div className="flex h-full items-center justify-center text-zinc-600"><User className="h-6 w-6" weight="duotone" /></div>}
                    <span className="absolute inset-0 flex items-center justify-center bg-black/50 text-white opacity-0 transition group-hover:opacity-100"><Camera className="h-5 w-5" weight="duotone" /></span>
                  </button>
                  <button onClick={() => setEditing(m)} className="min-w-[200px] flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-zinc-100">{m.name}</p>
                      {!m.isPublished && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">Hidden</span>}
                    </div>
                    <p className="truncate text-xs text-zinc-500">{m.position}</p>
                    <div className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-zinc-600">
                      {m.email && <span className="inline-flex items-center gap-1"><EnvelopeSimple className="h-3 w-3" weight="duotone" />{m.email}</span>}
                      {m.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" weight="duotone" />{m.phone}</span>}
                      {m.profileLink && <span className="inline-flex items-center gap-1"><LinkSimple className="h-3 w-3" weight="duotone" />link</span>}
                    </div>
                  </button>
                  <div className="flex flex-shrink-0 items-center gap-1 text-zinc-400">
                    <button onClick={() => move(key, i, -1)} aria-label="Up" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><ArrowUp className="h-4 w-4" weight="duotone" /></button>
                    <button onClick={() => move(key, i, 1)} aria-label="Down" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><ArrowDown className="h-4 w-4" weight="duotone" /></button>
                    <button onClick={() => togglePublish(m)} aria-label={m.isPublished ? "Hide" : "Show"} className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100">{m.isPublished ? <Eye className="h-4 w-4" weight="duotone" /> : <EyeSlash className="h-4 w-4" weight="duotone" />}</button>
                    <button onClick={() => setEditing(m)} aria-label="Edit" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><PencilSimple className="h-4 w-4" weight="duotone" /></button>
                    <button onClick={() => del(m)} aria-label="Delete" className="rounded p-1.5 hover:bg-red-500/15 hover:text-red-400"><Trash className="h-4 w-4" weight="duotone" /></button>
                  </div>
                </div>
              ))}
              {list.length === 0 && <p className="rounded-[6px] border border-dashed border-zinc-800 p-4 text-center text-xs text-zinc-600">No {label.toLowerCase()} members yet.</p>}
            </div>
          </section>
        )
      })}

      {(editing || creating) && (
        <MemberModal
          member={editing}
          group={creating ?? "executive"}
          onClose={() => { setEditing(null); setCreating(null) }}
          onSaveText={async (draft) => {
            if (editing) {
              const res = await updateRosterMemberAction(editing.id, draft)
              if ("error" in res) return res.error
              patch(editing.id, res.member); toast.success("Saved"); return null
            }
            const res = await createRosterMemberAction(draft)
            if ("error" in res) return res.error
            setMembers((ms) => [...ms, res.member]); toast.success("Added"); return null
          }}
          onUploadPhoto={editing ? (f) => uploadPhoto(editing.id, f) : undefined}
          onRemovePhoto={editing ? () => removePhoto(editing.id) : undefined}
        />
      )}
    </div>
  )
}

function MemberModal({ member, group, onClose, onSaveText, onUploadPhoto, onRemovePhoto }: {
  member: RosterMemberDTO | null
  group: RosterGroup
  onClose: () => void
  onSaveText: (d: Draft) => Promise<string | null>
  onUploadPhoto?: (file: File) => Promise<string>
  onRemovePhoto?: () => Promise<void>
}) {
  const toast = useToast()
  const [d, setD] = useState<Draft>(draftOf(member, group))
  const [photo, setPhoto] = useState<string | null>(member?.photo ?? null)
  const [saving, setSaving] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))
  const initial = d.name.trim().replace(/^(Shri\.|Smt\.|Dr\.)\s*/i, "").charAt(0).toUpperCase() || "?"

  async function pick(file: File) {
    if (!onUploadPhoto) return
    setPhotoBusy(true)
    try { setPhoto(await onUploadPhoto(file)); toast.success("Photo updated") }
    catch (e) { toast.error(e instanceof Error ? e.message : "Upload failed") }
    finally { setPhotoBusy(false) }
  }
  async function clearPhoto() {
    if (!onRemovePhoto) return
    setPhotoBusy(true)
    try { await onRemovePhoto(); setPhoto(null) } finally { setPhotoBusy(false) }
  }

  async function submit() {
    setSaving(true); setError(null)
    const err = await onSaveText(d)
    setSaving(false)
    if (err) setError(err); else onClose()
  }

  return (
    <Modal open onClose={onClose} title={member ? "Edit member" : "Add member"}>
      <div className="space-y-4">
        {/* Photo */}
        {member ? (
          <div className="flex items-center gap-4">
            <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-[6px] border border-gray-200 bg-gray-100">
              {photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photo} alt={d.name} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-blue-600 font-heading text-2xl font-semibold text-white">{initial}</div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className={`inline-flex cursor-pointer items-center gap-1.5 rounded-[4px] bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-500 ${photoBusy ? "pointer-events-none opacity-60" : ""}`}>
                <Camera className="h-3.5 w-3.5" weight="duotone" /> {photoBusy ? "Uploading…" : photo ? "Replace photo" : "Upload photo"}
                <input type="file" accept="image/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) pick(f); e.target.value = "" }} />
              </label>
              {photo && <button onClick={clearPhoto} disabled={photoBusy} className="text-left text-xs text-red-600 hover:underline disabled:opacity-50">Remove photo</button>}
              <p className="text-[11px] text-gray-400">JPEG/PNG. Auto-resized; any size is fine.</p>
            </div>
          </div>
        ) : (
          <p className="rounded-[4px] bg-gray-100 px-3 py-2 text-[11px] text-gray-500">Save the member first, then reopen to add a photo.</p>
        )}

        {/* Fields */}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name"><input className={inputCls} value={d.name} onChange={(e) => set({ name: e.target.value })} maxLength={120} autoFocus /></Field>
          <Field label="Position"><input className={inputCls} value={d.position} onChange={(e) => set({ position: e.target.value })} maxLength={80} placeholder="President, Treasurer…" /></Field>
        </div>
        <Field label="Group">
          <select className={inputCls} value={d.groupType} onChange={(e) => set({ groupType: e.target.value as RosterGroup })}>
            <option value="executive">Executive Committee</option>
            <option value="advisory">Advisory Committee</option>
          </select>
        </Field>
        <Field label="Profile link (optional)"><input className={inputCls} value={d.profileLink} onChange={(e) => set({ profileLink: e.target.value })} placeholder="https://…" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Email (optional)"><input className={inputCls} value={d.email} onChange={(e) => set({ email: e.target.value })} maxLength={254} /></Field>
          <Field label="Phone (optional)"><input className={inputCls} value={d.phone} onChange={(e) => set({ phone: e.target.value })} maxLength={20} /></Field>
        </div>
        {error && <p className="text-xs text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving || !d.name.trim() || !d.position.trim()}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>{children}</label>
}
