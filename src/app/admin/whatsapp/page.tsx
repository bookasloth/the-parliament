import { requireAdmin } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { isAiSensyConfigured } from "@/lib/aisensy"
import WhatsAppClient, { type GroupOption, type BroadcastRow } from "./whatsapp-client"

export const dynamic = "force-dynamic"

const fmt = (d: Date) =>
  d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })

export default async function AdminWhatsAppPage() {
  await requireAdmin()

  const [groups, broadcasts] = await Promise.all([
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
  ])

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

  return <WhatsAppClient configured={isAiSensyConfigured()} groups={groupOptions} broadcasts={rows} />
}
