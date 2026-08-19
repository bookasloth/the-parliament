import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { isAiSensyConfigured } from "@/lib/aisensy"
import WhatsAppClient, { type GroupOption, type BroadcastRow, type BloodRow } from "./whatsapp-client"

export const dynamic = "force-dynamic"

const fmt = (d: Date) =>
  d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export default async function AdminWhatsAppPage() {
  await requireAdmin()

  const [groups, broadcasts, bloodRequests] = await Promise.all([
    prisma.group.findMany({
      orderBy: [{ type: "asc" }, { name: "asc" }],
      take: 500,
      select: {
        id: true,
        name: true,
        type: true,
        _count: { select: { members: { where: { status: "active" } } } },
      },
    }),
    prisma.whatsAppBroadcast.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        campaignName: true,
        groupId: true,
        recipientCount: true,
        sentCount: true,
        failedCount: true,
        createdAt: true,
      },
    }),
    prisma.bloodRequest.findMany({
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        requesterId: true,
        bloodGroup: true,
        patient: true,
        city: true,
        hospital: true,
        contact: true,
        recipientCount: true,
        sentCount: true,
        failedCount: true,
        status: true,
        createdAt: true,
      },
    }),
  ])

  // FK-less log → resolve requester names in one lookup.
  const requesterIds = [...new Set(bloodRequests.map((b) => b.requesterId))]
  const requesters = requesterIds.length
    ? await prisma.user.findMany({
        where: { id: { in: requesterIds } },
        select: { id: true, displayName: true, legalName: true },
      })
    : []
  const requesterName = new Map(requesters.map((u) => [u.id, u.displayName || u.legalName || "—"]))

  const groupName = new Map(groups.map((g) => [g.id, g.name]))
  const groupOptions: GroupOption[] = groups.map((g) => ({
    id: g.id,
    name: g.name,
    type: g.type,
    members: g._count.members,
  }))
  const rows: BroadcastRow[] = broadcasts.map((b) => ({
    id: b.id,
    campaignName: b.campaignName,
    group: b.groupId ? groupName.get(b.groupId) ?? "—" : "—",
    recipientCount: b.recipientCount,
    sentCount: b.sentCount,
    failedCount: b.failedCount,
    createdAt: fmt(b.createdAt),
  }))

  const bloodRows: BloodRow[] = bloodRequests.map((b) => ({
    id: b.id,
    requester: requesterName.get(b.requesterId) ?? "—",
    bloodGroup: b.bloodGroup,
    patient: b.patient,
    city: b.city,
    hospital: b.hospital,
    contact: b.contact,
    recipientCount: b.recipientCount,
    sentCount: b.sentCount,
    failedCount: b.failedCount,
    status: b.status,
    createdAt: fmt(b.createdAt),
  }))

  return (
    <WhatsAppClient
      configured={isAiSensyConfigured()}
      groups={groupOptions}
      broadcasts={rows}
      bloodRequests={bloodRows}
    />
  )
}
