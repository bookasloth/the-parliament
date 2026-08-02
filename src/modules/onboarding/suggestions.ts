import { prisma } from "@/lib/prisma"
import { Prisma } from "@/generated/prisma/client"
import { colorAvatar } from "@/lib/avatar"

const ANCHOR_EMAIL = "sndatarkar@gmail.com"

export interface SuggestedPerson {
  id: string
  username: string | null
  name: string
  photoUrl: string
  headline: string | null
  houseName: string | null
  houseColor: string | null
  batchLabel: string | null
  reason: string
}

// Curated "Follow 3 people" set: the network anchor + one housemate + one
// batchmate + one opposite-gender member + one from another batch — each the
// most recently joined in its bucket. Deduped, self/already-followed excluded.
export async function getFollowSuggestions(userId: string): Promise<SuggestedPerson[]> {
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { gender: true, profile: { select: { houseId: true, batchId: true } } },
  })
  const houseId = me?.profile?.houseId ?? null
  const batchId = me?.profile?.batchId ?? null
  const gender = me?.gender ?? null

  const alreadyFollowing = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  })
  const excluded = new Set<string>([userId, ...alreadyFollowing.map((f) => f.followingId)])

  // One recent, active candidate matching a filter (excluding taken ids).
  async function pick(where: Prisma.UserWhereInput, reason: string): Promise<SuggestedPerson | null> {
    const u = await prisma.user.findFirst({
      where: {
        deletedAt: null,
        status: "active",
        id: { notIn: [...excluded] },
        username: { not: null },
        ...where,
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, legalName: true, displayName: true,
        profile: {
          select: {
            photoUrl: true, headline: true, designation: true,
            house: { select: { name: true, colorHex: true } },
            batch: { select: { label: true, startYear: true, endYear: true } },
          },
        },
      },
    })
    if (!u) return null
    excluded.add(u.id)
    const p = u.profile
    return {
      id: u.id,
      username: u.username,
      name: u.displayName || u.legalName,
      photoUrl: p?.photoUrl || colorAvatar(u.id),
      headline: p?.headline ?? p?.designation ?? null,
      houseName: p?.house?.name ?? null,
      houseColor: p?.house?.colorHex ?? null,
      batchLabel: p?.batch?.label ?? (p?.batch ? `${p.batch.startYear}–${p.batch.endYear}` : null),
      reason,
    }
  }

  const out: SuggestedPerson[] = []
  const anchor = await pick({ email: ANCHOR_EMAIL }, "NNAWCA anchor")
  if (anchor) out.push(anchor)
  if (houseId) { const h = await pick({ profile: { houseId } }, "Same house"); if (h) out.push(h) }
  if (batchId) { const b = await pick({ profile: { batchId } }, "Your batch"); if (b) out.push(b) }
  if (gender) { const g = await pick({ gender: { not: gender } }, "Say hi"); if (g) out.push(g) }
  if (batchId) { const o = await pick({ profile: { batchId: { not: batchId } } }, "Beyond your batch"); if (o) out.push(o) }

  // Backfill to at least 5 with any recent active members.
  while (out.length < 5) {
    const f = await pick({}, "Recently active")
    if (!f) break
    out.push(f)
  }
  return out
}
