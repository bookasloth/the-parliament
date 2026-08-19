"use client"

import { useRef, useState } from "react"
import NextImage from "next/image"
import {
  UploadSimple, Trash, PencilSimple, Eye, EyeSlash, ArrowUp, ArrowDown, Star,
  Plus, ImageSquare, ArrowClockwise, FolderSimple,
} from "@phosphor-icons/react"
import { PageHeader, StatCard, Button, Modal, EmptyState, useToast } from "../admin-ui"
import type { GalleryAlbumDTO, GalleryImageDTO } from "@/modules/gallery/types"
import {
  uploadGalleryImageAction, updateGalleryImageAction, setGalleryPublishedAction, deleteGalleryImageAction,
  reorderGalleryImagesAction, assignImagesToAlbumAction,
  createAlbumAction, updateAlbumAction, deleteAlbumAction, setAlbumPublishedAction, reorderAlbumsAction,
  setAlbumCoverAction,
} from "./actions"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])

type Pending = {
  tempId: string
  name: string
  previewUrl: string
  status: "uploading" | "error"
  file: File
  width: number
  height: number
  albumId: string | null
}

let tempSeq = 0

function measure(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const im = new window.Image()
    im.onload = () => { resolve({ width: im.naturalWidth, height: im.naturalHeight }); URL.revokeObjectURL(url) }
    im.onerror = () => { resolve(null); URL.revokeObjectURL(url) }
    im.src = url
  })
}

export default function GalleryAdminClient({
  initialAlbums, initialImages,
}: { initialAlbums: GalleryAlbumDTO[]; initialImages: GalleryImageDTO[] }) {
  const toast = useToast()
  const [tab, setTab] = useState<"photos" | "albums">("photos")
  const [albums, setAlbums] = useState(initialAlbums)
  const [images, setImages] = useState(initialImages)
  const [uploads, setUploads] = useState<Pending[]>([])
  const [filter, setFilter] = useState<string>("all") // "all" | "unfiled" | albumId
  const [editImage, setEditImage] = useState<GalleryImageDTO | null>(null)
  const [albumModal, setAlbumModal] = useState<{ mode: "create" | "edit"; album?: GalleryAlbumDTO } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const albumName = (id: string | null) => (id ? albums.find((a) => a.id === id)?.title ?? "—" : "Unfiled")

  const visibleImages = images.filter((im) =>
    filter === "all" ? true : filter === "unfiled" ? im.albumId === null : im.albumId === filter,
  )

  // ---- optimistic runner: apply locally, call server, roll back on error ----
  async function run(apply: () => void, revert: () => void, action: () => Promise<{ ok: true } | { error: string }>, okMsg?: string) {
    apply()
    const res = await action()
    if ("error" in res) { revert(); toast.error(res.error) }
    else if (okMsg) toast.success(okMsg)
  }

  // ---- uploads ----
  async function onFiles(list: FileList | File[]) {
    const albumId = filter === "all" || filter === "unfiled" ? null : filter
    for (const file of Array.from(list)) {
      if (!ALLOWED.has(file.type)) { toast.error(`${file.name}: unsupported type`); continue }
      if (file.size > MAX_BYTES) { toast.error(`${file.name}: over 5MB`); continue }
      const dims = await measure(file)
      if (!dims) { toast.error(`${file.name}: could not read image`); continue }
      const pending: Pending = {
        tempId: `t${++tempSeq}`, name: file.name, previewUrl: URL.createObjectURL(file),
        status: "uploading", file, width: dims.width, height: dims.height, albumId,
      }
      setUploads((u) => [pending, ...u])
      void doUpload(pending)
    }
  }

  async function doUpload(p: Pending) {
    setUploads((u) => u.map((x) => (x.tempId === p.tempId ? { ...x, status: "uploading" } : x)))
    const fd = new FormData()
    fd.append("file", p.file)
    fd.append("width", String(p.width))
    fd.append("height", String(p.height))
    if (p.albumId) fd.append("albumId", p.albumId)
    const res = await uploadGalleryImageAction(fd)
    if ("error" in res) {
      setUploads((u) => u.map((x) => (x.tempId === p.tempId ? { ...x, status: "error" } : x)))
      toast.error(`${p.name}: ${res.error}`)
    } else {
      URL.revokeObjectURL(p.previewUrl)
      setUploads((u) => u.filter((x) => x.tempId !== p.tempId))
      setImages((imgs) => [...imgs, res.image])
    }
  }

  // ---- image mutations ----
  function togglePublish(im: GalleryImageDTO) {
    const next = !im.isPublished
    run(
      () => setImages((s) => s.map((x) => (x.id === im.id ? { ...x, isPublished: next } : x))),
      () => setImages((s) => s.map((x) => (x.id === im.id ? { ...x, isPublished: im.isPublished } : x))),
      () => setGalleryPublishedAction(im.id, next),
    )
  }

  function removeImage(im: GalleryImageDTO) {
    if (!confirm(`Delete this photo? This can't be undone.`)) return
    run(
      () => setImages((s) => s.filter((x) => x.id !== im.id)),
      () => setImages((s) => [...s, im].sort((a, b) => a.displayOrder - b.displayOrder)),
      () => deleteGalleryImageAction(im.id),
      "Photo deleted",
    )
  }

  function assign(im: GalleryImageDTO, albumId: string | null) {
    run(
      () => setImages((s) => s.map((x) => (x.id === im.id ? { ...x, albumId } : x))),
      () => setImages((s) => s.map((x) => (x.id === im.id ? { ...x, albumId: im.albumId } : x))),
      () => assignImagesToAlbumAction([im.id], albumId),
      "Moved",
    )
  }

  function makeCover(im: GalleryImageDTO) {
    if (!im.albumId) return
    const albumId = im.albumId
    run(
      () => setAlbums((s) => s.map((a) => (a.id === albumId ? { ...a, coverImageId: im.id, coverImageUrl: im.imageUrl } : a))),
      () => setAlbums((s) => [...s]),
      () => setAlbumCoverAction(albumId, im.id),
      "Cover set",
    )
  }

  function moveImage(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= images.length) return
    const prev = images
    const next = [...images]
    ;[next[i], next[j]] = [next[j], next[i]]
    run(
      () => setImages(next.map((x, k) => ({ ...x, displayOrder: k }))),
      () => setImages(prev),
      () => reorderGalleryImagesAction(next.map((x) => x.id)),
    )
  }

  // ---- album mutations ----
  function toggleAlbumPublish(a: GalleryAlbumDTO) {
    const next = !a.isPublished
    run(
      () => setAlbums((s) => s.map((x) => (x.id === a.id ? { ...x, isPublished: next } : x))),
      () => setAlbums((s) => s.map((x) => (x.id === a.id ? { ...x, isPublished: a.isPublished } : x))),
      () => setAlbumPublishedAction(a.id, next),
    )
  }

  function removeAlbum(a: GalleryAlbumDTO) {
    if (!confirm(`Delete album "${a.title}"? Its photos stay, just unfiled.`)) return
    run(
      () => { setAlbums((s) => s.filter((x) => x.id !== a.id)); setImages((s) => s.map((x) => (x.albumId === a.id ? { ...x, albumId: null } : x))) },
      () => setAlbums((s) => [...s, a].sort((x, y) => x.displayOrder - y.displayOrder)),
      () => deleteAlbumAction(a.id),
      "Album deleted",
    )
  }

  function moveAlbum(i: number, dir: -1 | 1) {
    const j = i + dir
    if (j < 0 || j >= albums.length) return
    const prev = albums
    const next = [...albums]
    ;[next[i], next[j]] = [next[j], next[i]]
    run(
      () => setAlbums(next.map((x, k) => ({ ...x, displayOrder: k }))),
      () => setAlbums(prev),
      () => reorderAlbumsAction(next.map((x) => x.id)),
    )
  }

  const publishedCount = images.filter((i) => i.isPublished).length

  return (
    <div>
      <PageHeader
        title="Gallery"
        description="Upload photos, organise them into albums, and control what's public."
        actions={
          <>
            <Button variant="subtle" onClick={() => setTab(tab === "photos" ? "albums" : "photos")}>
              {tab === "photos" ? "Manage Albums" : "Manage Photos"}
            </Button>
            {tab === "photos" ? (
              <Button onClick={() => fileRef.current?.click()}>
                <UploadSimple className="h-4 w-4" weight="duotone" /> Upload
              </Button>
            ) : (
              <Button onClick={() => setAlbumModal({ mode: "create" })}>
                <Plus className="h-4 w-4" weight="duotone" /> New Album
              </Button>
            )}
          </>
        }
      />

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Photos" value={String(images.length)} icon={<ImageSquare className="h-4.5 w-4.5" weight="duotone" />} accent="violet" />
        <StatCard label="Published" value={String(publishedCount)} icon={<Eye className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Albums" value={String(albums.length)} icon={<FolderSimple className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        multiple
        hidden
        onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = "" }}
      />

      {tab === "photos" ? (
        <PhotosTab
          images={visibleImages}
          allOrdered={filter === "all"}
          fullIndexOf={(id) => images.findIndex((x) => x.id === id)}
          uploads={uploads}
          albums={albums}
          filter={filter}
          setFilter={setFilter}
          dragOver={dragOver}
          setDragOver={setDragOver}
          onFiles={onFiles}
          onEdit={setEditImage}
          onTogglePublish={togglePublish}
          onDelete={removeImage}
          onAssign={assign}
          onMakeCover={makeCover}
          onMove={moveImage}
          onRetry={doUpload}
          onDismissUpload={(t) => setUploads((u) => u.filter((x) => x.tempId !== t))}
        />
      ) : (
        <AlbumsTab albums={albums} onEdit={(a) => setAlbumModal({ mode: "edit", album: a })} onTogglePublish={toggleAlbumPublish} onDelete={removeAlbum} onMove={moveAlbum} />
      )}

      {editImage && (
        <EditImageModal
          image={editImage}
          onClose={() => setEditImage(null)}
          onSaved={(patch) => setImages((s) => s.map((x) => (x.id === editImage.id ? { ...x, ...patch } : x)))}
        />
      )}
      {albumModal && (
        <AlbumModal
          mode={albumModal.mode}
          album={albumModal.album}
          onClose={() => setAlbumModal(null)}
          onCreated={(a) => setAlbums((s) => [...s, a])}
          onUpdated={(a) => setAlbums((s) => s.map((x) => (x.id === a.id ? { ...x, ...a } : x)))}
        />
      )}
    </div>
  )
}

/* ------------------------------- Photos tab ------------------------------- */

function PhotosTab(props: {
  images: GalleryImageDTO[]
  allOrdered: boolean
  fullIndexOf: (id: string) => number
  uploads: Pending[]
  albums: GalleryAlbumDTO[]
  filter: string
  setFilter: (v: string) => void
  dragOver: boolean
  setDragOver: (v: boolean) => void
  onFiles: (f: FileList | File[]) => void
  onEdit: (im: GalleryImageDTO) => void
  onTogglePublish: (im: GalleryImageDTO) => void
  onDelete: (im: GalleryImageDTO) => void
  onAssign: (im: GalleryImageDTO, albumId: string | null) => void
  onMakeCover: (im: GalleryImageDTO) => void
  onMove: (i: number, dir: -1 | 1) => void
  onRetry: (p: Pending) => void
  onDismissUpload: (tempId: string) => void
}) {
  const { images, uploads, albums, filter, setFilter } = props
  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <label className="text-xs font-medium text-zinc-400">Album</label>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="rounded-[4px] border border-zinc-700 bg-[#111113] px-2 py-1.5 text-xs text-zinc-200 outline-none focus:border-blue-500"
        >
          <option value="all">All photos</option>
          <option value="unfiled">Unfiled</option>
          {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
        </select>
        {!props.allOrdered && <span className="text-[11px] text-zinc-500">Switch to “All photos” to reorder.</span>}
      </div>

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); props.setDragOver(true) }}
        onDragLeave={() => props.setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); props.setDragOver(false); if (e.dataTransfer.files.length) props.onFiles(e.dataTransfer.files) }}
        className={`mb-4 rounded-[6px] border-2 border-dashed px-4 py-6 text-center text-xs transition-colors ${props.dragOver ? "border-blue-500 bg-blue-500/10 text-blue-300" : "border-zinc-700 text-zinc-500"}`}
      >
        Drag & drop images here (JPEG/PNG/WebP, ≤5MB) — or use the Upload button.
      </div>

      {images.length === 0 && uploads.length === 0 ? (
        <EmptyState icon={<ImageSquare className="h-6 w-6" weight="duotone" />} title="No photos" description="Upload images to get started." />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {uploads.map((p) => (
            <div key={p.tempId} className="overflow-hidden rounded-[6px] border border-zinc-800 bg-[#111113]">
              <div className="relative aspect-square bg-zinc-900">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.previewUrl} alt={p.name} className="h-full w-full object-cover opacity-60" />
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50 text-center text-[11px] text-white">
                  {p.status === "uploading" ? (
                    <span className="animate-pulse">Uploading…</span>
                  ) : (
                    <>
                      <span className="text-red-300">Upload failed</span>
                      <div className="flex gap-1">
                        <button onClick={() => props.onRetry(p)} className="inline-flex items-center gap-1 rounded bg-white/15 px-2 py-1 hover:bg-white/25">
                          <ArrowClockwise className="h-3 w-3" weight="duotone" /> Retry
                        </button>
                        <button onClick={() => props.onDismissUpload(p.tempId)} className="rounded bg-white/15 px-2 py-1 hover:bg-white/25">Dismiss</button>
                      </div>
                    </>
                  )}
                </div>
              </div>
              <p className="truncate px-2 py-1.5 text-[11px] text-zinc-400">{p.name}</p>
            </div>
          ))}

          {images.map((im) => {
            const idx = props.fullIndexOf(im.id)
            return (
              <div key={im.id} className="group overflow-hidden rounded-[6px] border border-zinc-800 bg-[#111113]">
                <div className="relative aspect-square bg-zinc-900">
                  <NextImage src={im.imageUrl} alt={im.caption || "Photo"} fill sizes="200px" className={`object-cover ${im.isPublished ? "" : "opacity-40"}`} />
                  {!im.isPublished && <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">Hidden</span>}
                  {props.allOrdered && (
                    <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                      <button onClick={() => props.onMove(idx, -1)} aria-label="Move up" className="rounded bg-black/60 p-1 text-white hover:bg-black/80"><ArrowUp className="h-3 w-3" weight="duotone" /></button>
                      <button onClick={() => props.onMove(idx, 1)} aria-label="Move down" className="rounded bg-black/60 p-1 text-white hover:bg-black/80"><ArrowDown className="h-3 w-3" weight="duotone" /></button>
                    </div>
                  )}
                </div>

                <div className="space-y-1.5 p-2">
                  <p className="truncate text-[11px] text-zinc-300">{im.caption || <span className="text-zinc-600">No caption</span>}</p>
                  <select
                    value={im.albumId ?? ""}
                    onChange={(e) => props.onAssign(im, e.target.value || null)}
                    className="w-full rounded-[3px] border border-zinc-700 bg-[#0a0a0a] px-1.5 py-1 text-[11px] text-zinc-300 outline-none focus:border-blue-500"
                  >
                    <option value="">Unfiled</option>
                    {albums.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
                  </select>
                  <div className="flex items-center justify-between gap-1 pt-0.5 text-zinc-400">
                    <button onClick={() => props.onEdit(im)} aria-label="Edit" className="rounded p-1 hover:bg-zinc-800 hover:text-zinc-100"><PencilSimple className="h-3.5 w-3.5" weight="duotone" /></button>
                    <button onClick={() => props.onTogglePublish(im)} aria-label={im.isPublished ? "Hide" : "Publish"} className="rounded p-1 hover:bg-zinc-800 hover:text-zinc-100">
                      {im.isPublished ? <Eye className="h-3.5 w-3.5" weight="duotone" /> : <EyeSlash className="h-3.5 w-3.5" weight="duotone" />}
                    </button>
                    <button onClick={() => props.onMakeCover(im)} disabled={!im.albumId} aria-label="Set as album cover" className="rounded p-1 enabled:hover:bg-zinc-800 enabled:hover:text-zinc-100 disabled:opacity-30"><Star className="h-3.5 w-3.5" weight="duotone" /></button>
                    <button onClick={() => props.onDelete(im)} aria-label="Delete" className="rounded p-1 hover:bg-red-500/15 hover:text-red-400"><Trash className="h-3.5 w-3.5" weight="duotone" /></button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ------------------------------- Albums tab ------------------------------- */

function AlbumsTab({ albums, onEdit, onTogglePublish, onDelete, onMove }: {
  albums: GalleryAlbumDTO[]
  onEdit: (a: GalleryAlbumDTO) => void
  onTogglePublish: (a: GalleryAlbumDTO) => void
  onDelete: (a: GalleryAlbumDTO) => void
  onMove: (i: number, dir: -1 | 1) => void
}) {
  if (albums.length === 0) {
    return <EmptyState icon={<FolderSimple className="h-6 w-6" weight="duotone" />} title="No albums" description="Create an album to group photos." />
  }
  return (
    <div className="space-y-2">
      {albums.map((a, i) => (
        <div key={a.id} className="flex items-center gap-3 rounded-[6px] border border-zinc-800 bg-[#111113] p-3">
          <div className="relative h-14 w-20 flex-shrink-0 overflow-hidden rounded bg-zinc-900">
            {a.coverImageUrl ? (
              <NextImage src={a.coverImageUrl} alt={a.title} fill sizes="80px" className="object-cover" />
            ) : (
              <div className="flex h-full items-center justify-center text-zinc-700"><ImageSquare className="h-5 w-5" weight="duotone" /></div>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-sm font-semibold text-zinc-100">{a.title}</h3>
              {!a.isPublished && <span className="rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">Hidden</span>}
            </div>
            <p className="truncate text-[11px] text-zinc-500">/{a.slug} · {a.imageCount} photos</p>
          </div>
          <div className="flex items-center gap-1 text-zinc-400">
            <button onClick={() => onMove(i, -1)} aria-label="Move up" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><ArrowUp className="h-4 w-4" weight="duotone" /></button>
            <button onClick={() => onMove(i, 1)} aria-label="Move down" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><ArrowDown className="h-4 w-4" weight="duotone" /></button>
            <button onClick={() => onEdit(a)} aria-label="Edit" className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100"><PencilSimple className="h-4 w-4" weight="duotone" /></button>
            <button onClick={() => onTogglePublish(a)} aria-label={a.isPublished ? "Hide" : "Publish"} className="rounded p-1.5 hover:bg-zinc-800 hover:text-zinc-100">
              {a.isPublished ? <Eye className="h-4 w-4" weight="duotone" /> : <EyeSlash className="h-4 w-4" weight="duotone" />}
            </button>
            <button onClick={() => onDelete(a)} aria-label="Delete" className="rounded p-1.5 hover:bg-red-500/15 hover:text-red-400"><Trash className="h-4 w-4" weight="duotone" /></button>
          </div>
        </div>
      ))}
    </div>
  )
}

/* --------------------------------- Modals --------------------------------- */

const inputCls = "w-full rounded-[4px] border border-gray-300 bg-white px-2.5 py-1.5 text-sm text-gray-900 outline-none focus:border-blue-500"

function EditImageModal({ image, onClose, onSaved }: {
  image: GalleryImageDTO
  onClose: () => void
  onSaved: (patch: Partial<GalleryImageDTO>) => void
}) {
  const toast = useToast()
  const [caption, setCaption] = useState(image.caption)
  const [description, setDescription] = useState(image.description ?? "")
  const [location, setLocation] = useState(image.location ?? "")
  const [photographer, setPhotographer] = useState(image.photographer ?? "")
  const [saving, setSaving] = useState(false)

  async function submit() {
    setSaving(true)
    const res = await updateGalleryImageAction(image.id, { caption, description, location, photographer })
    setSaving(false)
    if ("error" in res) { toast.error(res.error); return }
    onSaved(res.image)
    toast.success("Saved")
    onClose()
  }

  return (
    <Modal open onClose={onClose} title="Edit photo">
      <div className="space-y-3">
        <Field label="Caption"><input className={inputCls} value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} /></Field>
        <Field label="Description"><textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Location"><input className={inputCls} value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} /></Field>
          <Field label="Photographer"><input className={inputCls} value={photographer} onChange={(e) => setPhotographer(e.target.value)} maxLength={120} /></Field>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </div>
      </div>
    </Modal>
  )
}

function AlbumModal({ mode, album, onClose, onCreated, onUpdated }: {
  mode: "create" | "edit"
  album?: GalleryAlbumDTO
  onClose: () => void
  onCreated: (a: GalleryAlbumDTO) => void
  onUpdated: (a: GalleryAlbumDTO) => void
}) {
  const toast = useToast()
  const [title, setTitle] = useState(album?.title ?? "")
  const [description, setDescription] = useState(album?.description ?? "")
  const [saving, setSaving] = useState(false)

  async function submit() {
    if (!title.trim()) { toast.error("Title is required"); return }
    setSaving(true)
    const res = mode === "create"
      ? await createAlbumAction({ title, description: description || undefined })
      : await updateAlbumAction(album!.id, { title, description: description || null })
    setSaving(false)
    if ("error" in res) { toast.error(res.error); return }
    if (mode === "create") onCreated(res.album); else onUpdated(res.album)
    toast.success(mode === "create" ? "Album created" : "Saved")
    onClose()
  }

  return (
    <Modal open onClose={onClose} title={mode === "create" ? "New album" : "Edit album"}>
      <div className="space-y-3">
        <Field label="Title"><input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} autoFocus /></Field>
        <Field label="Description"><textarea className={inputCls} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} maxLength={2000} /></Field>
        <div className="flex justify-end gap-2 pt-1">
          <Button variant="subtle" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? "Saving…" : mode === "create" ? "Create" : "Save"}</Button>
        </div>
      </div>
    </Modal>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-gray-500">{label}</span>
      {children}
    </label>
  )
}
