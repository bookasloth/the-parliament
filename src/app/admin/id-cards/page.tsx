import { requireAdmin } from "@/modules/auth/session"
import { IdentificationCard, Truck, Clock } from "@phosphor-icons/react/dist/ssr"
import { prisma } from "@/lib/prisma"
import { relativeTime } from "@/lib/relative-time"
import { formatInr } from "@/config/id-card"
import { PageHeader, StatCard } from "../admin-ui"
import IdCardsClient, { type IdCardOrderRow } from "./id-cards-client"

export const dynamic = "force-dynamic"

export default async function AdminIdCardsPage() {
  await requireAdmin()

  let rows: IdCardOrderRow[] = []
  let stats = { collected: 0, awaiting: 0, shipped: 0 }
  try {
    const orders = await prisma.idCardOrder.findMany({
      where: { status: { in: ["paid", "printing", "shipped", "delivered", "cancelled"] } },
      orderBy: { createdAt: "desc" },
      take: 300,
      include: { user: { select: { username: true, legalName: true } } },
    })
    rows = orders.map((o) => ({
      id: o.id,
      member: o.user.legalName ?? o.user.username ?? "—",
      username: o.user.username,
      qty: o.qty,
      amount: formatInr(o.amountPaise),
      status: o.status,
      recipientName: o.recipientName,
      phone: o.phone,
      address: `${o.addressLine}, ${o.city}, ${o.state} ${o.pincode}`,
      trackingId: o.trackingId,
      time: relativeTime(o.createdAt),
    }))
    stats = {
      collected: orders.filter((o) => o.status !== "cancelled").reduce((s, o) => s + o.amountPaise, 0),
      awaiting: orders.filter((o) => o.status === "paid" || o.status === "printing").length,
      shipped: orders.filter((o) => o.status === "shipped" || o.status === "delivered").length,
    }
  } catch {
    // table missing — apply the id_card_orders migration in prisma/migrations.
  }

  return (
    <div className="space-y-6">
      <PageHeader title="ID Cards" description="Printed alumni ID-card orders and the fulfilment queue." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Collected" value={formatInr(stats.collected)} icon={<IdentificationCard weight="duotone" />} accent="emerald" />
        <StatCard label="Awaiting print" value={String(stats.awaiting)} icon={<Clock weight="duotone" />} accent="amber" />
        <StatCard label="Shipped" value={String(stats.shipped)} icon={<Truck weight="duotone" />} accent="sky" />
      </div>

      <IdCardsClient rows={rows} />
    </div>
  )
}
