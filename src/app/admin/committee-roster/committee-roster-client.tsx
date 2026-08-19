"use client"

import { useRef, useState } from "react"
import {
  UploadSimple, Trash, User, PencilSimple, Plus, ArrowUp, ArrowDown, Eye, EyeSlash,
  EnvelopeSimple, Phone, LinkSimple,
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
const emptyDraft = (groupType: RosterGroup): Draft => ({ name: "", position: "", groupType, profileLink: "", email: "", phone: "" })

export default function CommitteeRosterClient({ initialMembers }: { initialMembers: RosterMemberDTO[] }) {
  const toast = useToast()
  const [members, setMembers] = useState(initialMembers)
  const [editing, setEditing] = useState<RosterMemberDTO | null>(null)
  const [creating, setCreating] = useState<RosterGroup | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const inputs = useRef<Record<string, HTMLInputElement | null>>({})

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

  async function uploadPhoto(m: RosterMemberDTO, file: File) {
    setBusy(m.id)
    const fd = new FormData(); fd.append("id", m.id); fd.append("file", file)
    const res = await uploadRosterPhotoAction(fd)
    setBusy(null)
    if ("error" in res) { toast.error(res.error); return }
    patch(m.id, { photo: res.member.photo }); toast.success("Photo updated")
  }
  async function removePhoto(m: RosterMemberDTO) {
    patch(m.id, { photo: null })
    if (!(await run(() => removeRosterPhotoAction(m.id), "Photo removed"))) patch(m.id, { photo: m.photo })
  }

  return (
    <div>
      <PageHeader
        title="Committee Roster"
        description="Add, edit, reorder, hide or remove the committee members shown on /committee and /about."
      />

      {members.length === 0 && (
        <EmptyState icon={<User className="h-6 w-6" weight="duotone" />} title="No members" description="Add the first committee member." action={<Button onClick={() => setCreating("executive")}><Plus className="h-4 w-4" weight="duotone" /> Add member</Button>} />
      )}

      {GROUPS.map(({ key, label }) => {
        const list = members.filter((m) => m.groupType === key)
        if (members.length === 0) return null
        return (
          <section key={key} className="mb-8">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold uppercase tracking-wide text-zinc-400">{label} <span className="text-zinc-600">· {list.length}</span></h2>
              <Button variant="subtle" size="sm" onClick={() => setCreating(key)}><Plus className="h-4 w-4" weight="duotone" /> Add</Button>
            </div>
            <div className="space-y-2">
              {list.map((m, i) => (
                <div key={m.id} className="flex flex-wrap items-center gap-3 rounded-[6px] border border-zinc-800 bg-[#111113] p-3">
                  <div className="h-14 w-14 flex-shrink-0 overflow-hidden rounded-[4px] bg-zinc-800">
                    {m.photo ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.photo} alt={m.name} className="h-full w-full object-cover" />
                    ) : <div className="flex h-full items-center justify-center text-zinc-600"><User className="h-6 w-6" weight="duotone" /></div>}
                  </div>
                  <div className="min-w-[200px] flex-1">
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
                  </div>
                  <div className="flex flex-shrink-0 items-center gap-1 text-zinc-400">
                    <button onClick={() => move(key, i, -1)} aria-label="Up" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><ArrowUp className="h-4 w-4" weight="duotone" /></button>
                    <button onClick={() => move(key, i, 1)} aria-label="Down" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><ArrowDown className="h-4 w-4" weight="duotone" /></button>
                    <input ref={(el) => { inputs.current[m.id] = el }} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadPhoto(m, f); e.target.value = "" }} />
                    <button onClick={() => inputs.current[m.id]?.click()} disabled={busy === m.id} aria-label="Photo" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100 disabled:opacity-50"><UploadSimple className="h-4 w-4" weight="duotone" /></button>
                    {m.photo && <button onClick={() => removePhoto(m)} aria-label="Remove photo" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><Trash className="h-4 w-4" weight="duotone" /></button>}
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
          initial={editing ? {
            name: editing.name, position: editing.position, groupType: editing.groupType,
            profileLink: editing.profileLink ?? "", email: editing.email ?? "", phone: editing.phone ?? "",
          } : emptyDraft(creating!)}
          title={editing ? "Edit member" : "Add member"}
          onClose={() => { setEditing(null); setCreating(null) }}
          onSave={async (draft) => {
            if (editing) {
              const res = await updateRosterMemberAction(editing.id, draft)
              if ("error" in res) return res.error
              patch(editing.id, res.member); toast.success("Saved"); return null
            } else {
              const res = await createRosterMemberAction(draft)
              if ("error" in res) return res.error
              setMembers((ms) => [...ms, res.member]); toast.success("Added"); return null
            }
          }}
        />
      )}
    </div>
  )
}

function MemberModal({ initial, title, onClose, onSave }: {
  initial: Draft; title: string; onClose: () => void; onSave: (d: Draft) => Promise<string | null>
}) {
  const [d, setD] = useState<Draft>(initial)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (p: Partial<Draft>) => setD((x) => ({ ...x, ...p }))

  async function submit() {
    setSaving(true); setError(null)
    const err = await onSave(d)
    setSaving(false)
    if (err) setError(err); else onClose()
  }

  return (
    <Modal open onClose={onClose} title={title}>
      <div className="space-y-3">
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
        <p className="text-[11px] text-gray-400">Add the photo from the member’s row after saving.</p>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>{children}</label>
}
