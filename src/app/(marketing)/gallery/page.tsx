import type { Metadata } from "next"
import { Section, Eyebrow, Reveal, CtaBand } from "@/components/marketing/primitives"
import { GalleryGrid, type GalleryPhoto } from "@/components/marketing/GalleryGrid"

export const metadata: Metadata = {
  title: "Gallery — moments from the NNAWCA family",
  description:
    "Photos from JNV Nagpur alumni reunions, chapter meetups, community drives and celebrations — the memories and milestones of the Navodaya family.",
}

// {{PLACEHOLDER}} — swap with real event photography as it comes in.
const PHOTOS: GalleryPhoto[] = [
  { src: "https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&q=70", title: "Annual Grand Reunion", event: "Nagpur", year: "2025", category: "Reunions" },
  { src: "https://images.unsplash.com/photo-1523580494863-6f3031224c94?w=800&q=70", title: "Career Guidance Meet", event: "Pune Chapter", year: "2025", category: "Meetups" },
  { src: "https://images.unsplash.com/photo-1475721027785-f74eccf877e2?w=800&q=70", title: "Batch Graduation Throwback", event: "JNV Nagpur", year: "2024", category: "Celebrations" },
  { src: "https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&q=70", title: "Mumbai Networking Evening", event: "Mumbai Chapter", year: "2025", category: "Meetups" },
  { src: "https://images.unsplash.com/photo-1559136555-9303baea8ebd?w=800&q=70", title: "Entrepreneurship Summit", event: "Nagpur", year: "2024", category: "Meetups" },
  { src: "https://images.unsplash.com/photo-1517457373958-b7bdd4587205?w=800&q=70", title: "Scholarship Drive", event: "Campus", year: "2025", category: "Community" },
  { src: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&q=70", title: "Founders' Day", event: "JNV Nagpur", year: "2024", category: "Celebrations" },
  { src: "https://images.unsplash.com/photo-1531058020387-3be344556be6?w=800&q=70", title: "Alumni Volunteers", event: "Community Drive", year: "2025", category: "Community" },
  { src: "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=70", title: "Reunion Night", event: "Nagpur", year: "2023", category: "Reunions" },
]

export default function GalleryPage() {
  return (
    <>
      <Section width="6xl" className="pt-32 lg:pt-40 text-center">
        <Reveal>
          <Eyebrow accent={0}>Gallery</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-5 max-w-3xl font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
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
        <GalleryGrid photos={PHOTOS} />
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
