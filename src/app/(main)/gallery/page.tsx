import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import { Images as ImagesIcon, Calendar } from "lucide-react"
import { optionalUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { getPublishedAlbums } from "@/modules/gallery/service"
import { CreateAlbumButton } from "./create-album-button"

export const dynamic = "force-dynamic"
export const metadata = { title: "Gallery — NNAWCA" }

export default async function GalleryPage() {
  const user = await optionalUser()
  if (!user) redirect("/auth/signin?callbackUrl=/gallery")

  const [albums, events] = await Promise.all([
    getPublishedAlbums(),
    prisma.event.findMany({ where: { status: "published" }, orderBy: { startsAt: "desc" }, take: 50, select: { id: true, title: true } }),
  ])

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gallery</h1>
          <p className="mt-1 text-sm text-gray-500">Shared albums from reunions, meetups and events. Create one and add your photos.</p>
        </div>
        <CreateAlbumButton events={events} />
      </header>

      {albums.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-gray-300 bg-white py-20 text-center">
          <ImagesIcon className="h-10 w-10 text-gray-300" />
          <h2 className="mt-3 text-base font-semibold text-gray-800">No albums yet</h2>
          <p className="mt-1 max-w-sm text-sm text-gray-500">Start the first one — a reunion, a chapter meetup, an event — and invite everyone to drop their photos in.</p>
          <div className="mt-4"><CreateAlbumButton events={events} /></div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {albums.map((a) => (
            <Link key={a.id} href={`/gallery/${a.slug}`} className="group overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
              <div className="relative aspect-[4/3] bg-gray-100">
                {a.coverImageUrl ? (
                  <Image src={a.coverImageUrl} alt={a.title} fill sizes="(max-width: 640px) 50vw, 25vw" draggable={false} className="object-cover transition-transform duration-300 group-hover:scale-105" />
                ) : (
                  <div className="flex h-full items-center justify-center text-gray-300"><ImagesIcon className="h-8 w-8" /></div>
                )}
                {a.eventId && (
                  <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    <Calendar className="h-3 w-3" /> Event
                  </span>
                )}
              </div>
              <div className="p-3">
                <h3 className="truncate text-sm font-semibold text-gray-900">{a.title}</h3>
                <p className="mt-0.5 text-xs text-gray-500">{a.imageCount} {a.imageCount === 1 ? "photo" : "photos"}</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
