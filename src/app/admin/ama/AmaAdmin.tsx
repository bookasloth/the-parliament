"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Copy } from "lucide-react"
import {
  Button, Modal, StatusBadge, Table, Thead, Tbody, Tr, Th, Td, EmptyState,
  useToast, useRowAction,
} from "../admin-ui"

interface Row {
  id: string
  title: string
  status: string
  startsAt: string
  host: string
  coHost: string | null
}

export default function AmaAdmin({ rows }: { rows: Row[] }) {
  const router = useRouter()
  const toast = useToast()
  const { run, isBusy } = useRowAction()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState("")
  const [form, setForm] = useState({ title: "", description: "", startsAt: "", coHostId: "" })

  async function create() {
    setBusy(true)
    setErr("")
    try {
      const res = await fetch("/api/admin/ama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          description: form.description || undefined,
          // datetime-local → ISO with the browser's offset.
          startsAt: new Date(form.startsAt).toISOString(),
          coHostId: form.coHostId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? "Failed to schedule")
      setOpen(false)
      setForm({ title: "", description: "", startsAt: "", coHostId: "" })
      toast.success("AMA scheduled")
      router.refresh()
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed")
    } finally {
      setBusy(false)
    }
  }

  function end(id: string) {
    if (!window.confirm("End this AMA? Participants will be disconnected.")) return
    run(id, {
      action: async () => {
        const res = await fetch(`/api/admin/ama/${id}/end`, { method: "POST" })
        if (!res.ok) throw new Error("Failed to end AMA")
        router.refresh()
      },
      success: "AMA ended",
    })
  }

  function copyLink(id: string) {
    navigator.clipboard?.writeText(`${window.location.origin}/ama/${id}`)
  }

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" /> Schedule AMA
        </Button>
      </div>

      <div className="rounded-[5px] border border-gray-200 bg-white overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No AMAs yet" description="Schedule your first Ask-Me-Anything session." />
        ) : (
          <Table>
            <Thead>
              <Tr>
                <Th>Title</Th><Th>Host</Th><Th>Co-host</Th><Th>Starts</Th><Th>Status</Th><Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="font-medium text-gray-900">{r.title}</Td>
                  <Td>{r.host}</Td>
                  <Td>{r.coHost ?? "—"}</Td>
                  <Td>{new Date(r.startsAt).toLocaleString()}</Td>
                  <Td><StatusBadge status={r.status} /></Td>
                  <Td>
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => copyLink(r.id)} title="Copy invite link">
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      <a href={`/ama/${r.id}`} target="_blank" rel="noreferrer">
                        <Button size="sm" variant="subtle">Open</Button>
                      </a>
                      {r.status !== "ended" && (
                        <Button size="sm" variant="danger" onClick={() => end(r.id)} disabled={isBusy(r.id)}>End</Button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Schedule AMA">
        <div className="space-y-3">
          <Field label="Title">
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-[3px] border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600"
              placeholder="Career Q&A with the 2010 batch"
            />
          </Field>
          <Field label="Description (optional)">
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={3}
              className="w-full rounded-[3px] border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600"
            />
          </Field>
          <Field label="Starts at">
            <input
              type="datetime-local"
              value={form.startsAt}
              onChange={(e) => setForm({ ...form, startsAt: e.target.value })}
              className="w-full rounded-[3px] border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600"
            />
          </Field>
          <Field label="Co-host user ID (optional — they can answer/publish)">
            <input
              value={form.coHostId}
              onChange={(e) => setForm({ ...form, coHostId: e.target.value })}
              className="w-full rounded-[3px] border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-900 outline-none focus:border-blue-600"
              placeholder="uuid"
            />
          </Field>
          {err && <p className="text-xs text-rose-600">{err}</p>}
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={create} disabled={busy || !form.title || !form.startsAt}>
              {busy ? "Scheduling…" : "Schedule"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-600">{label}</label>
      {children}
    </div>
  )
}
