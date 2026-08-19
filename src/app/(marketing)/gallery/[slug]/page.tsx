import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { ChevronLeft, Images as ImagesIcon } from "lucide-react"
import { Section, CtaBand } from "@/components/marketing/primitives"
import { GalleryMasonry } from "@/components/shared/GalleryMasonry"
import { getPublishedAlbumBySlug } from "@/modules/gallery/service"

export const revalidate = 300

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getPublishedAlbumBySlug(slug)
  if (!data) return { title: "Album — NNAWCA Gallery" }
  return { title: `${data.album.title} — Gallery`, description: data.album.description ?? undefined }
}

export default async function AlbumPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const data = await getPublishedAlbumBySlug(slug)
  if (!data) notFound()
  const { album, images } = data

  return (
    <>
      <Section width="7xl" className="pt-32 lg:pt-40">
        <Link href="/gallery" className="mb-6 inline-flex items-center gap-1 text-sm font-medium text-[#8a8378] transition-colors hover:text-[#1a1a1a]">
          <ChevronLeft className="h-4 w-4" /> All albums
        </Link>
        <h1 className="max-w-3xl font-heading text-3xl font-semibold tracking-[-0.03em] text-[#1a1a1a] sm:text-4xl lg:text-5xl">
          {album.title}
        </h1>
        {album.description && <p className="mt-4 max-w-2xl text-lg leading-relaxed text-[#5b5b5b]">{album.description}</p>}
        <p className="mt-2 text-sm text-[#8a8378]">{images.length} {images.length === 1 ? "photo" : "photos"}</p>

        <div className="mt-8">
          {images.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8d3c8] py-20 text-center">
              <ImagesIcon className="h-10 w-10" style={{ color: "#c4bdae" }} />
              <h2 className="mt-3 text-lg font-semibold text-[#1a1a1a]">This album is empty</h2>
              <p className="mt-1 text-sm text-[#5b5b5b]">No photos have been added here yet.</p>
            </div>
          ) : (
            <GalleryMasonry images={images} />
          )}
        </div>
      </Section>

      <CtaBand
        title="Have photos to add?"
        sub="Send us your pictures from this event — we'd love to include them."
        primary={{ label: "Send us photos", href: "/contact" }}
        secondary={{ label: "Back to gallery", href: "/gallery" }}
      />
    </>
  )
}
