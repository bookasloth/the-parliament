"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  FileText,
  PencilSimple,
  ClockCounterClockwise,
  Plus,
  ArrowCounterClockwise,
} from "@phosphor-icons/react"
import {
  PageHeader,
  StatusBadge,
  Button,
  Modal,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  EmptyState,
  useToast,
} from "../admin-ui"
import {
  savePageAction,
  getPageAction,
  publishPageAction,
  listVersionsAction,
  revertPageAction,
} from "./actions"

export interface PageRow {
  id: string
  slug: string
  title: string
  status: string
  versionCount: number
  publishedAt: string | null
  updatedAt: string
}

interface VersionRow {
  id: string
  title: string
  editedBy: string | null
  createdAt: string
}

const inputCls =
  "w-full rounded-[4px] border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-800 placeholder-gray-400 outline-none focus:border-blue-600"

export default function PagesClient({ pages }: { pages: PageRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const notify = useToast()

  // Editor state
  const [editorOpen, setEditorOpen] = useState(false)
  const [editId, setEditId] = useState<string | undefined>(undefined)
  const [slug, setSlug] = useState("")
  const [title, setTitle] = useState("")
  const [body, setBody] = useState("")

  // History state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyPage, setHistoryPage] = useState<PageRow | null>(null)
  const [versions, setVersions] = useState<VersionRow[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  function flash(t: { ok: boolean; msg: string }) {
    if (t.ok) notify.success(t.msg)
    else notify.error(t.msg)
  }

  function openCreate() {
    setEditId(undefined)
    setSlug("")
    setTitle("")
    setBody("")
    setEditorOpen(true)
  }

  function openEdit(row: PageRow) {
    setEditId(row.id)
    setSlug(row.slug)
    setTitle(row.title)
    setBody("")
    setEditorOpen(true)
    startTransition(async () => {
      try {
        const p = await getPageAction(row.id)
        setSlug(p.slug)
        setTitle(p.title)
        setBody(p.body)
      } catch {
        flash({ ok: false, msg: "Failed to load page content." })
      }
    })
  }

  function save(e: React.FormEvent) {
    e.preventDefault()
    if (!slug.trim() || !title.trim()) return
    startTransition(async () => {
      const r = await savePageAction({ id: editId, slug: slug.trim(), title: title.trim(), body })
      if (r.ok) {
        setEditorOpen(false)
        flash({ ok: true, msg: editId ? "Page saved." : "Page created." })
        router.refresh()
      } else {
        flash({ ok: false, msg: r.error })
      }
    })
  }

  function togglePublish(row: PageRow) {
    const publish = row.status !== "published"
    startTransition(async () => {
      const r = await publishPageAction(row.id, publish)
      if (r.ok) {
        flash({ ok: true, msg: publish ? "Page published." : "Page unpublished." })
        router.refresh()
      } else {
        flash({ ok: false, msg: r.error })
      }
    })
  }

  function openHistory(row: PageRow) {
    setHistoryPage(row)
    setVersions([])
    setHistoryOpen(true)
    setHistoryLoading(true)
    startTransition(async () => {
      try {
        const v = await listVersionsAction(row.id)
        setVersions(v)
      } catch {
        flash({ ok: false, msg: "Failed to load history." })
      } finally {
        setHistoryLoading(false)
      }
    })
  }

  function revert(versionId: string) {
    if (!historyPage) return
    startTransition(async () => {
      const r = await revertPageAction(historyPage.id, versionId)
      if (r.ok) {
        setHistoryOpen(false)
        flash({ ok: true, msg: "Reverted to selected version." })
        router.refresh()
      } else {
        flash({ ok: false, msg: r.error })
      }
    })
  }

  return (
    <div>
      <PageHeader
        title="Pages"
        description="Editable static pages — about, rules, FAQ, terms, privacy — with draft/publish and version history"
        actions={
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4" weight="duotone" /> New Page
          </Button>
        }
      />

      <div className="rounded-[4px] border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr className="border-b border-gray-200 hover:bg-transparent">
                <Th>Slug</Th>
                <Th>Title</Th>
                <Th>Status</Th>
                <Th>Versions</Th>
                <Th>Last updated</Th>
                <Th className="text-right">Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {pages.length === 0 && (
                <Tr className="hover:bg-transparent">
                  <Td colSpan={6}>
                    <EmptyState
                      icon={<FileText className="h-8 w-8" weight="duotone" />}
                      title="No pages yet"
                      description="Create your first editable static page."
                      action={
                        <Button onClick={openCreate}>
                          <Plus className="h-4 w-4" weight="duotone" /> New Page
                        </Button>
                      }
                    />
                  </Td>
                </Tr>
              )}
              {pages.map((row) => (
                <Tr key={row.id}>
                  <Td className="whitespace-nowrap">
                    <span className="rounded-[3px] bg-gray-100 px-1.5 py-0.5 font-mono text-[11px] text-gray-700">
                      /{row.slug}
                    </span>
                  </Td>
                  <Td className="text-gray-800">{row.title}</Td>
                  <Td className="whitespace-nowrap">
                    <StatusBadge status={row.status} />
                  </Td>
                  <Td className="whitespace-nowrap tabular-nums text-gray-600">{row.versionCount}</Td>
                  <Td className="whitespace-nowrap text-gray-600">
                    {new Date(row.updatedAt).toLocaleDateString()}
                  </Td>
                  <Td className="whitespace-nowrap text-right">
                    <div className="inline-flex items-center gap-1.5">
                      <Button size="sm" variant="ghost" onClick={() => openEdit(row)} disabled={pending}>
                        <PencilSimple className="h-3.5 w-3.5" weight="duotone" /> Edit
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => openHistory(row)} disabled={pending}>
                        <ClockCounterClockwise className="h-3.5 w-3.5" weight="duotone" /> History
                      </Button>
                      <Button
                        size="sm"
                        variant={row.status === "published" ? "subtle" : "primary"}
                        onClick={() => togglePublish(row)}
                        disabled={pending}
                      >
                        {row.status === "published" ? "Unpublish" : "Publish"}
                      </Button>
                    </div>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </div>
      </div>

      {/* Editor */}
      <Modal
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        title={editId ? "Edit page" : "New page"}
      >
        <form onSubmit={save} className="space-y-3">
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">
              Slug (kebab-case)
            </label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              maxLength={80}
              required
              placeholder="about"
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
              placeholder="About NNAWCA"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-wide text-gray-500 mb-1">
              Body (markdown)
            </label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={100_000}
              rows={16}
              placeholder="# Heading&#10;&#10;Plain markdown — no rich-text editor."
              className={`${inputCls} font-mono resize-y`}
            />
            <p className="mt-1 text-[11px] text-gray-400">
              Plain markdown textarea — rich-text editing is out of scope.
            </p>
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button type="button" variant="ghost" onClick={() => setEditorOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !slug.trim() || !title.trim()}>
              {pending ? "Saving…" : editId ? "Save changes" : "Create page"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* History */}
      <Modal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title={historyPage ? `History — ${historyPage.title}` : "History"}
      >
        {historyLoading && <p className="text-sm text-gray-500">Loading versions…</p>}
        {!historyLoading && versions.length === 0 && (
          <EmptyState
            icon={<ClockCounterClockwise className="h-8 w-8" weight="duotone" />}
            title="No previous versions"
            description="Edits and reverts snapshot the prior body here."
          />
        )}
        {!historyLoading && versions.length > 0 && (
          <ul className="divide-y divide-gray-200">
            {versions.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm text-gray-800">{v.title}</p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(v.createdAt).toLocaleString()}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => revert(v.id)} disabled={pending}>
                  <ArrowCounterClockwise className="h-3.5 w-3.5" weight="duotone" /> Revert
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Modal>
    </div>
  )
}
