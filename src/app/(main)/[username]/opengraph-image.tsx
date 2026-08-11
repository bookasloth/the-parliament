import { renderOgCard, avatarArt, OG_SIZE, OG_CONTENT_TYPE, C } from "@/lib/og"
import { prisma } from "@/lib/prisma"

export const runtime = "nodejs"
export const size = OG_SIZE
export const contentType = OG_CONTENT_TYPE
export const alt = "NNAWCA member profile"

// Generic fallback — also used to AVOID leaking PII for non-public profiles to
// unauthenticated scrapers (mirrors the profile privacy gate).
function generic() {
  return renderOgCard({
    titleLines: [{ text: "JNV Nagpur" }, { text: "Alumni Network", color: C.brand }],
    subtitle: "One network. Every batch. Since 2023.",
  })
}

export default async function Image({ params }: { params: Promise<{ username: string }> }) {
  try {
    const { username } = await params
    const u = await prisma.user.findFirst({
      where: { username },
      select: {
        legalName: true,
        displayName: true,
        profile: {
          select: {
            photoUrl: true,
            headline: true,
            visibility: true,
            house: { select: { name: true, colorHex: true } },
            batch: { select: { label: true, startYear: true } },
          },
        },
      },
    })
    // Only `public` profiles expose name/photo to unauthenticated OG scrapers.
    if (!u || (u.profile?.visibility ?? "alumni") !== "public") return generic()

    const name = u.displayName || u.legalName
    const house = u.profile?.house
    const ring = house?.colorHex ?? C.brand
    const initials = name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    const batch = u.profile?.batch?.label || (u.profile?.batch?.startYear ? String(u.profile.batch.startYear) : "")
    const subtitle = [batch && `Batch ${batch}`, house?.name, u.profile?.headline].filter(Boolean).join("  ·  ")

    return renderOgCard({
      titleLines: [{ text: name }],
      titleSize: name.length > 16 ? 52 : 64,
      subtitle: subtitle || "NNAWCA member",
      right: avatarArt(u.profile?.photoUrl ?? null, ring, initials),
    })
  } catch {
    return generic()
  }
}
