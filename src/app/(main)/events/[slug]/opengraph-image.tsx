import { renderOgCard, calendarArt, bannerArt, OG_SIZE, OG_CONTENT_TYPE, C } from "@/lib/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "An event on NNAWCA"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function generic() {
  return renderOgCard({
    titleLines: [{ text: "JNV Nagpur" }, { text: "Alumni Network", color: C.brand }],
    subtitle: "One network. Every batch. Since 2023.",
  })
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  try {
    // The [slug] segment is actually the event id (getEventById).
    const { slug } = await params
    const ev = await prisma.event.findUnique({
      where: { id: slug },
      select: { title: true, startsAt: true, venue: true, mode: true, bannerUrl: true },
    })
    if (!ev) return generic()

    const d = ev.startsAt
    // Format in IST to match how the app shows event times.
    const ist = new Date(d.getTime() + 5.5 * 60 * 60 * 1000)
    const dateLabel = `${MONTHS[ist.getUTCMonth()]} ${ist.getUTCDate()}, ${ist.getUTCFullYear()}`
    const where = ev.venue || (ev.mode === "online" ? "Online" : "")
    const long = ev.title.length > 40

    return renderOgCard({
      eyebrow: "NNAWCA EVENT",
      titleLines: [{ text: ev.title }],
      titleSize: long ? 44 : 58,
      subtitle: [dateLabel, where].filter(Boolean).join("  ·  "),
      right: ev.bannerUrl
        ? bannerArt(ev.bannerUrl)
        : calendarArt(MONTHS[ist.getUTCMonth()], String(ist.getUTCDate())),
    })
  } catch {
    return generic()
  }
}
