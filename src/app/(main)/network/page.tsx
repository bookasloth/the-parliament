import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { getDefaultSchoolId } from "@/lib/school"
import { getConnectionsData } from "@/modules/connections/service"
import { colorAvatar } from "@/lib/avatar"
import { NetworkClient } from "./network-client"
import {
  suggestedEvents, chapters, recentActivity,
  type NetworkAlumni, type PendingRequest,
} from "./network-data"
import type { Membership } from "@/lib/homepage-data"

export const dynamic = "force-dynamic"

export default async function NetworkPage() {
  const sessionUser = await requireUser()
  const meId = sessionUser.id
  const schoolId = (await getDefaultSchoolId()) ?? undefined

  const [meUser, conns, connectionCount, connData] = await Promise.all([
    prisma.user.findUnique({
      where: { id: meId },
      select: {
        legalName: true, displayName: true, username: true, membershipStatus: true,
        profile: { select: { headline: true, profession: true, company: true, city: true, photoUrl: true, batch: { select: { label: true } } } },
      },
    }),
    prisma.connection.findMany({ where: { OR: [{ requesterId: meId }, { addresseeId: meId }] }, select: { requesterId: true, addresseeId: true } }),
    prisma.connection.count({ where: { status: "accepted", OR: [{ requesterId: meId }, { addresseeId: meId }] } }),
    getConnectionsData(meId),
  ])

  const excluded = new Set<string>([meId, ...conns.flatMap((c) => [c.requesterId, c.addresseeId])])

  const meBatch = meUser?.profile?.batch?.label ?? ""
  const meCity = meUser?.profile?.city ?? ""
  const meCompany = meUser?.profile?.company ?? ""

  const me = {
    name: meUser?.displayName || meUser?.legalName || "You",
    username: meUser?.username ?? "",
    headline: meUser?.profile?.headline || meUser?.profile?.profession || "",
    avatar: meUser?.profile?.photoUrl || colorAvatar(meId),
    connections: connectionCount,
  }

  const rows = await prisma.user.findMany({
    where: { status: "active", deletedAt: null, id: { notIn: [...excluded] }, ...(schoolId ? { schoolId } : {}) },
    orderBy: [{ isVerified: "desc" }, { createdAt: "desc" }],
    take: 48,
    select: {
      id: true, username: true, legalName: true, displayName: true, membershipStatus: true, isVerified: true,
      profile: { select: { headline: true, company: true, city: true, industry: true, photoUrl: true, house: { select: { name: true, colorHex: true } }, batch: { select: { label: true } } } },
    },
  })

  const suggestedAlumni: NetworkAlumni[] = rows.map((u) => {
    const p = u.profile
    const batch = p?.batch?.label ?? ""
    const socialProof = batch && batch === meBatch ? "Same batch" : p?.city && p.city === meCity ? `Lives in ${p.city}` : p?.company && p.company === meCompany ? `Works at ${p.company}` : "Suggested for you"
    return {
      id: u.username ?? u.id,
      userId: u.id,
      name: u.displayName || u.legalName,
      username: u.username ?? "",
      batch,
      batchLabel: batch ? `Batch ${batch}` : "Alumni",
      house: p?.house?.name ?? "",
      membership: (u.membershipStatus as Membership) ?? "student",
      verified: u.isVerified,
      headline: p?.headline ?? "",
      company: p?.company ?? undefined,
      city: p?.city ?? undefined,
      industry: p?.industry ?? undefined,
      avatar: p?.photoUrl || colorAvatar(u.id),
      mutualCount: 0,
      socialProof,
    }
  })

  const toPending = (u: { connectionId?: string; id: string; name: string; batch: string; house: string; avatar: string; mutualCount: number; sentAt?: string }): PendingRequest => ({
    id: u.connectionId ?? u.id,
    name: u.name,
    username: u.id,
    batch: u.batch,
    house: u.house,
    avatar: u.avatar,
    mutualCount: u.mutualCount,
    when: u.sentAt ?? "recently",
  })

  return (
    <NetworkClient
      me={me}
      meBatch={meBatch}
      meCity={meCity}
      meCompany={meCompany}
      suggestedAlumni={suggestedAlumni}
      incomingRequests={connData.received.map(toPending)}
      sentRequests={connData.pending.map(toPending)}
      recentActivity={recentActivity}
      suggestedEvents={suggestedEvents}
      chapters={chapters}
    />
  )
}
