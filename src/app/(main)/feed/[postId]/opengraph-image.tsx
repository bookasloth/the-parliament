import { renderOgCard, avatarArt, OG_SIZE, OG_CONTENT_TYPE, C } from "@/lib/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "A post on NNAWCA"

function generic() {
  return renderOgCard({
    titleLines: [{ text: "JNV Nagpur" }, { text: "Alumni Network", color: C.brand }],
    subtitle: "One network. Every batch. Since 2023.",
  })
}

function excerpt(body: string, max = 120): string {
  const clean = body.replace(/\s+/g, " ").trim()
  return clean.length > max ? clean.slice(0, max - 1).trimEnd() + "…" : clean
}

export default async function Image({ params }: { params: Promise<{ postId: string }> }) {
  try {
    const { postId } = await params
    const post = await prisma.post.findUnique({
      where: { id: postId },
      select: {
        body: true,
        status: true,
        deletedAt: true,
        groupId: true,
        author: {
          select: {
            legalName: true,
            displayName: true,
            profile: {
              select: {
                photoUrl: true,
                house: { select: { name: true, colorHex: true } },
                batch: { select: { label: true, startYear: true } },
              },
            },
          },
        },
      },
    })
    // Only public, visible, non-group posts get a rich card.
    if (!post || post.deletedAt || post.status !== "visible" || post.groupId) return generic()

    const a = post.author
    const name = a.displayName || a.legalName
    const ring = a.profile?.house?.colorHex ?? C.brand
    const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    const batch = a.profile?.batch?.label || (a.profile?.batch?.startYear ? String(a.profile.batch.startYear) : "")
    const text = post.body ? excerpt(post.body) : "Shared a post"

    return renderOgCard({
      eyebrow: "NNAWCA",
      titleLines: [{ text: `“${text}”` }],
      titleSize: text.length > 70 ? 38 : 48,
      subtitle: [name, batch && `Batch ${batch}`].filter(Boolean).join("  ·  "),
      right: avatarArt(a.profile?.photoUrl ?? null, ring, initials),
    })
  } catch {
    return generic()
  }
}
