"use client"

import { useState } from "react"
import { Megaphone, Broadcast, Clock, CheckCircle, Trash, Plus } from "@phosphor-icons/react"
import { PageHeader, StatCard, Button, Modal, EmptyState, useRowAction } from "../admin-ui"
import { createAnnouncementAction, deleteAnnouncementAction } from "./actions"

export interface AnnouncementRow {
  id: string
  title: string
  body: string | null
  ctaLabel: string | null
  ctaHref: string | null
  startsAtISO: string
  endsAtISO: string
  starts: string
  ends: string
  status: "scheduled" | "active" | "expired"
}

const STATUS_STYLE: Record<AnnouncementRow["status"], string> = {
  active: "bg-emerald-50 text-emerald-700 border-emerald-200",
  scheduled: "bg-sky-50 text-sky-700 border-sky-200",
  expired: "bg-gray-100 text-gray-500 border-gray-300",
}

// datetime-local wants "YYYY-MM-DDTHH:mm" in local time.
function toLocalInput(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`
}

export default function AnnouncementsClient({
  announcements,
  stats,
}: {
  announcements: AnnouncementRow[]
  stats: { active: number; scheduled: number; expired: number }
}) {
  const { run, isBusy } = useRowAction()
  const [open, setOpen] = useState(false)
  const [deleted, setDeleted] = useState<Record<string, boolean>>({})

  const now = new Date()
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")
  const [ctaLabel, setCtaLabel] = useState("")
  const [ctaHref, setCtaHref] = useState("")
  const [startsAt, setStartsAt] = useState(toLocalInput(now))
  const [endsAt, setEndsAt] = useState(toLocalInput(new Date(now.getTime() + 7 * 86400_000)))

  const list = announcements.filter((a) => !deleted[a.id])

  function create() {
    run("create", {
      action: async () => {
        const r = await createAnnouncementAction({
          title,
          body: body || undefined,
          ctaLabel: ctaLabel || undefined,
          ctaHref: ctaHref || undefined,
          startsAt: new Date(startsAt).toISOString(),
          endsAt: new Date(endsAt).toISOString(),
        })
        if (!r.ok) throw new Error("Failed")
        setOpen(false)
        setTitle(""); setBody(""); setCtaLabel(""); setCtaHref("")
      },
      success: "Announcement scheduled",
    })
  }

  function remove(id: string) {
    if (!confirm("Delete this announcement? It disappears from the feed immediately.")) return
    run(id, {
      optimistic: () => setDeleted((d) => ({ ...d, [id]: true })),
      revert: () => setDeleted((d) => { const n = { ...d }; delete n[id]; return n }),
      action: () => deleteAnnouncementAction(id),
      success: "Announcement deleted",
    })
  }

  const canSubmit = title.trim().length >= 3 && startsAt && endsAt && new Date(endsAt) > new Date(startsAt)

  return (
    <div className="max-w-4xl">
      <PageHeader
        title="Announcements"
        description="Banners shown at the top of the member feed for a set duration"
        actions={<Button variant="primary" size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" weight="duotone" /> New announcement</Button>}
      />

      <div className="grid grid-cols-3 gap-3 mb-5">
        <StatCard label="Active now" value={String(stats.active)} icon={<CheckCircle className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Scheduled" value={String(stats.scheduled)} icon={<Clock className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
        <StatCard label="Expired" value={String(stats.expired)} icon={<Broadcast className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
      </div>

      {list.length === 0 ? (
        <div className="rounded-[5px] border border-gray-200 bg-white">
          <EmptyState
            icon={<Megaphone className="h-8 w-8" weight="duotone" />}
            title="No announcements"
            description="Create one to show a banner at the top of everyone's feed for a chosen window."
            action={<Button variant="primary" size="sm" onClick={() => setOpen(true)}><Plus className="h-3.5 w-3.5" weight="duotone" /> New announcement</Button>}
          />
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((a) => (
            <div key={a.id} className="flex items-start gap-3 rounded-[5px] border border-gray-200 bg-white p-4">
              <Megaphone className="h-5 w-5 text-gray-400 flex-shrink-0 mt-0.5" weight="duotone" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-800">{a.title}</p>
                  <span className={`rounded-[3px] border px-1.5 py-0.5 text-[10px] font-semibold capitalize ${STATUS_STYLE[a.status]}`}>{a.status}</span>
                  {a.ctaLabel && <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-500">CTA: {a.ctaLabel}</span>}
                </div>
                {a.body && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{a.body}</p>}
                <p className="text-[11px] text-gray-500 mt-1">{a.starts} → {a.ends}</p>
              </div>
              <button onClick={() => remove(a.id)} disabled={isBusy(a.id)} aria-label="Delete"
                className="rounded-[3px] p-1.5 text-gray-400 hover:text-rose-600 hover:bg-rose-50 disabled:opacity-40">
                <Trash className="h-4 w-4" weight="duotone" />
              </button>
            </div>
          ))}
        </div>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="New announcement">
        <div className="space-y-3">
          <Field label="Title">
            <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200}
              placeholder="Reunion 2026 registrations are open"
              className={inputCls} />
          </Field>
          <Field label="Body (optional)">
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Button label (optional)">
              <input value={ctaLabel} onChange={(e) => setCtaLabel(e.target.value)} maxLength={60} placeholder="Register" className={inputCls} />
            </Field>
            <Field label="Button link (optional)">
              <input value={ctaHref} onChange={(e) => setCtaHref(e.target.value)} placeholder="/events/reunion-2026" className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts">
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputCls} />
            </Field>
            <Field label="Ends">
              <input type="datetime-local" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputCls} />
            </Field>
          </div>
          {!canSubmit && (title.length > 0 || endsAt) && (
            <p className="text-[11px] text-rose-600">Title needs 3+ chars and End must be after Start.</p>
          )}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
            <button onClick={create} disabled={!canSubmit || isBusy("create")}
              className="rounded-[3px] bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50">
              {isBusy("create") ? "Scheduling…" : "Schedule announcement"}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

const inputCls =
  "w-full rounded-[3px] border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}
