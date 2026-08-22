import { renderOgCard, bannerArt, clusterArt, OG_SIZE, OG_CONTENT_TYPE, C } from "@/lib/og"
import { getBusinessBySlug } from "@/modules/business/service"

export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "Alumni business on NNAWCA"

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const b = await getBusinessBySlug(slug)
  const name = b?.name ?? "Alumni Business"
  // Split a long name across two lines; second line brand-coloured.
  const words = name.split(" ")
  const mid = Math.ceil(words.length / 2)
  const titleLines =
    words.length > 2
      ? [{ text: words.slice(0, mid).join(" ") }, { text: words.slice(mid).join(" "), color: C.brand }]
      : [{ text: name, color: C.brand }]

  return renderOgCard({
    eyebrow: "NNAWCA · BUSINESS",
    titleLines,
    titleSize: name.length > 22 ? 52 : 66,
    subtitle: b?.category.label ?? "Alumni-run business",
    right: b?.logoUrl ? bannerArt(b.logoUrl) : clusterArt(),
  })
}
