import type { Metadata } from "next"
import Link from "next/link"
import Image from "next/image"
import { Images as ImagesIcon } from "lucide-react"
import { Section, Eyebrow, Reveal, CtaBand } from "@/components/marketing/primitives"
import { GalleryMasonry } from "@/components/shared/GalleryMasonry"
import { getPublishedAlbums, getPublishedGalleryImages } from "@/modules/gallery/service"

export const metadata: Metadata = {
  title: "Gallery — moments from the NNAWCA family",
  description:
    "Photos from JNV Nagpur alumni reunions, chapter meetups, community drives and celebrations — the memories and milestones of the Navodaya family.",
}

// Public gallery. Fail-soft reads keep this page rendering (empty) even before
// the migration runs, so deploy order is never load-bearing. ISR keeps it cheap.
export const revalidate = 300

export default async function GalleryPage() {
  const [albums, images] = await Promise.all([getPublishedAlbums(), getPublishedGalleryImages()])
  const isEmpty = albums.length === 0 && images.length === 0

  return (
    <>
      <Section width="6xl" className="pt-32 text-center lg:pt-40">
        <Reveal>
          <Eyebrow accent={0}>Gallery</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-5 max-w-3xl font-heading text-4xl font-semibold tracking-[-0.035em] text-balance text-[#1a1a1a] sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            Our memories, in one place.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#5b5b5b]">
            Reunions, chapter meetups, community drives and celebrations — the moments that keep the
            JNV Nagpur family close.
          </p>
        </Reveal>
      </Section>

      <Section width="7xl" className="pt-0">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-[#d8d3c8] py-20 text-center">
            <ImagesIcon className="h-10 w-10" style={{ color: "#c4bdae" }} />
            <h2 className="mt-3 text-lg font-semibold text-[#1a1a1a]">Photos coming soon</h2>
            <p className="mt-1 text-sm text-[#5b5b5b]">The wall of memories is being put together.</p>
          </div>
        ) : (
          <div className="space-y-12">
            {albums.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-[#8a8378]">Albums</h2>
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {albums.map((a) => (
                    <Link key={a.id} href={`/gallery/${a.slug}`} className="group overflow-hidden rounded-2xl border border-[#e7e2d8] bg-white shadow-sm transition-shadow hover:shadow-md">
                      <div className="relative aspect-[4/3] bg-[#f4f1ea]">
                        {a.coverImageUrl ? (
                          <Image
                            src={a.coverImageUrl}
                            alt={a.title}
                            fill
                            sizes="(max-width: 640px) 50vw, 25vw"
                            draggable={false}
                            className="object-cover transition-transform duration-300 group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center text-[#cfc8ba]"><ImagesIcon className="h-8 w-8" /></div>
                        )}
                      </div>
                      <div className="p-3">
                        <h3 className="truncate font-heading text-sm font-semibold text-[#1a1a1a]">{a.title}</h3>
                        <p className="mt-0.5 text-xs text-[#8a8378]">{a.imageCount} {a.imageCount === 1 ? "photo" : "photos"}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {images.length > 0 && (
              <div>
                <h2 className="mb-4 font-heading text-sm font-semibold uppercase tracking-wide text-[#8a8378]">All Photos</h2>
                <GalleryMasonry images={images} />
              </div>
            )}
          </div>
        )}
      </Section>

      <CtaBand
        title="Have photos from an event?"
        sub="Share your reunion and meetup pictures — we'd love to add them to the wall of memories."
        primary={{ label: "Send us photos", href: "/contact" }}
        secondary={{ label: "Become a member", href: "/join" }}
      />
    </>
  )
}
