"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ChevronLeft, Upload, Trash, Flag, RotateCw, Images as ImagesIcon } from "lucide-react"
import { GalleryLightbox } from "@/components/shared/GalleryLightbox"
import { canDeleteImage } from "@/modules/gallery/mappers"
import type { GalleryAlbumDTO, GalleryImageDTO } from "@/modules/gallery/types"
import { uploadMemberPhotoAction, deleteMemberPhotoAction, reportPhotoAction } from "../actions"

const MAX_BYTES = 5 * 1024 * 1024
const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"])
const SIZES = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"

type Pending = { tempId: string; name: string; previewUrl: string; status: "uploading" | "error"; file: File; width: number; height: number }
let seq = 0

function measure(file: File): Promise<{ width: number; height: number } | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const im = new window.Image()
    im.onload = () => { resolve({ width: im.naturalWidth, height: im.naturalHeight }); URL.revokeObjectURL(url) }
    im.onerror = () => { resolve(null); URL.revokeObjectURL(url) }
    im.src = url
  })
}

export default function AlbumClient({ album, initialImages, viewerId, isAdmin }: {
  album: GalleryAlbumDTO
  initialImages: GalleryImageDTO[]
  viewerId: string
  isAdmin: boolean
}) {
  const [images, setImages] = useState(initialImages)
  const [uploads, setUploads] = useState<Pending[]>([])
  const [lightbox, setLightbox] = useState<number | null>(null)
  const [toast, setToast] = useState<{ msg: string; kind: "ok" | "err" } | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  function flash(msg: string, kind: "ok" | "err" = "ok") {
    setToast({ msg, kind })
    setTimeout(() => setToast(null), 2600)
  }

  async function onFiles(list: FileList | File[]) {
    for (const file of Array.from(list)) {
      if (!ALLOWED.has(file.type)) { flash(`${file.name}: unsupported type`, "err"); continue }
      if (file.size > MAX_BYTES) { flash(`${file.name}: over 5MB`, "err"); continue }
      const dims = await measure(file)
      if (!dims) { flash(`${file.name}: could not read image`, "err"); continue }
      const p: Pending = { tempId: `t${++seq}`, name: file.name, previewUrl: URL.createObjectURL(file), status: "uploading", file, ...dims }
      setUploads((u) => [p, ...u])
      void doUpload(p)
    }
  }

  async function doUpload(p: Pending) {
    setUploads((u) => u.map((x) => (x.tempId === p.tempId ? { ...x, status: "uploading" } : x)))
    const fd = new FormData()
    fd.append("file", p.file)
    fd.append("albumId", album.id)
    fd.append("width", String(p.width))
    fd.append("height", String(p.height))
    const res = await uploadMemberPhotoAction(fd)
    if ("error" in res) {
      setUploads((u) => u.map((x) => (x.tempId === p.tempId ? { ...x, status: "error" } : x)))
      flash(res.error, "err")
    } else {
      URL.revokeObjectURL(p.previewUrl)
      setUploads((u) => u.filter((x) => x.tempId !== p.tempId))
      setImages((imgs) => [...imgs, res.image])
    }
  }

  async function remove(img: GalleryImageDTO) {
    if (!confirm("Remove this photo?")) return
    const prev = images
    setImages((s) => s.filter((x) => x.id !== img.id))
    const res = await deleteMemberPhotoAction(img.id)
    if ("error" in res) { setImages(prev); flash(res.error, "err") } else flash("Photo removed")
  }

  async function report(img: GalleryImageDTO) {
    const res = await reportPhotoAction({ imageId: img.id, reason: "inappropriate" })
    flash("error" in res ? res.error : "Reported — thanks, we'll take a look.", "error" in res ? "err" : "ok")
  }

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <Link href="/gallery" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-gray-500 hover:text-gray-800">
        <ChevronLeft className="h-4 w-4" /> All albums
      </Link>

      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{album.title}</h1>
          {album.description && <p className="mt-1 max-w-2xl text-sm text-gray-600">{album.description}</p>}
          <p className="mt-1 text-xs text-gray-400">{images.length} {images.length === 1 ? "photo" : "photos"}</p>
        </div>
        <button onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-sm hover:brightness-95">
          <Upload className="h-4 w-4" /> Add photos
        </button>
      </header>

      <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={(e) => { if (e.target.files) onFiles(e.target.files); e.target.value = "" }} />

      {/* Dropzone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files.length) onFiles(e.dataTransfer.files) }}
        className={`mb-5 rounded-xl border-2 border-dashed px-4 py-5 text-center text-xs transition-colors ${dragOver ? "border-brand bg-brand/5 text-brand" : "border-gray-300 text-gray-400"}`}
      >
        Drag & drop your photos here — JPEG/PNG/WebP, up to 5MB each.
      </div>

      {images.length === 0 && uploads.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-16 text-center">
          <ImagesIcon className="h-9 w-9 text-gray-300" />
          <h2 className="mt-3 text-sm font-semibold text-gray-800">No photos yet</h2>
          <p className="mt-1 text-sm text-gray-500">Be the first to add photos to this album.</p>
        </div>
      ) : (
        <div className="columns-2 gap-3 sm:columns-3 lg:columns-4 xl:columns-5 [&>*]:mb-3 [&>*]:break-inside-avoid" onContextMenu={(e) => e.preventDefault()}>
          {uploads.map((p) => (
            <div key={p.tempId} className="relative overflow-hidden rounded-lg bg-gray-200">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.previewUrl} alt={p.name} className="w-full opacity-60" />
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/40 text-center text-[11px] text-white">
                {p.status === "uploading" ? <span className="animate-pulse">Uploading…</span> : (
                  <>
                    <span className="text-red-200">Failed</span>
                    <div className="flex gap-1">
                      <button onClick={() => doUpload(p)} className="inline-flex items-center gap-1 rounded bg-white/20 px-2 py-1 hover:bg-white/30"><RotateCw className="h-3 w-3" /> Retry</button>
                      <button onClick={() => setUploads((u) => u.filter((x) => x.tempId !== p.tempId))} className="rounded bg-white/20 px-2 py-1 hover:bg-white/30">Dismiss</button>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}

          {images.map((img, i) => (
            <div key={img.id} className="group relative overflow-hidden rounded-lg bg-gray-200">
              <button
                type="button"
                onClick={() => setLightbox(i)}
                aria-label={img.caption || "Open photo"}
                style={{ aspectRatio: `${img.width} / ${img.height}` }}
                className="block w-full"
              >
                <Image src={img.imageUrl} alt={img.caption || "Photo"} fill sizes={SIZES} loading="lazy" draggable={false} className="select-none object-cover" />
              </button>
              <div className="absolute right-1 top-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                {canDeleteImage(img, viewerId, isAdmin) ? (
                  <button onClick={() => remove(img)} aria-label="Remove" className="rounded bg-black/55 p-1.5 text-white hover:bg-red-600"><Trash className="h-3.5 w-3.5" /></button>
                ) : (
                  <button onClick={() => report(img)} aria-label="Report" className="rounded bg-black/55 p-1.5 text-white hover:bg-black/80"><Flag className="h-3.5 w-3.5" /></button>
                )}
              </div>
              {img.uploaderName && (
                <span className="pointer-events-none absolute bottom-1 left-1 max-w-[80%] truncate rounded bg-black/55 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                  {img.uploaderName}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      <GalleryLightbox images={images} index={lightbox} onClose={() => setLightbox(null)} onIndexChange={setLightbox} />

      {toast && (
        <div className={`fixed bottom-5 left-1/2 z-[110] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-white shadow-lg ${toast.kind === "ok" ? "bg-gray-900" : "bg-red-600"}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}
