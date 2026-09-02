import Link from "next/link"
import { notFound } from "next/navigation"
import { requirePermission } from "@/lib/gate"
import { prisma } from "@/lib/prisma"
import { getUserTimeline, type TimelineEntry } from "@/modules/admin/timeline"
import { PageHeader, StatusBadge } from "../../admin-ui"

export const dynamic = "force-dynamic"

const SOURCE_COLOR: Record<TimelineEntry["source"], string> = {
  audit: "bg-sky-500/15 text-sky-300",
  moderation: "bg-rose-500/15 text-rose-300",
  membership: "bg-emerald-500/15 text-emerald-300",
}

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
}

export default async function AdminUserTimelinePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("members:read")
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true, legalName: true, displayName: true, username: true, email: true,
      status: true, membershipStatus: true, isVerified: true, createdAt: true,
    },
  })
  if (!user) notFound()

  const timeline = await getUserTimeline(id)
  const name = user.displayName || user.legalName

  return (
    <div>
      <PageHeader
        title={name}
        description={`${user.email} · joined ${fmt(user.createdAt.toISOString())}`}
        actions={
          <Link href="/admin/users" className="text-xs text-zinc-400 hover:text-zinc-200">← All users</Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2 text-xs">
        <StatusBadge status={user.status} />
        <StatusBadge status={user.membershipStatus} />
        {user.isVerified && <span className="rounded-[3px] bg-emerald-500/15 px-2 py-0.5 text-emerald-300">verified</span>}
        {user.username && (
          <a href={`/${user.username}`} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline">view profile ↗</a>
        )}
      </div>

      <div className="rounded-[4px] border border-zinc-800 bg-[#111113] p-4">
        <h2 className="mb-3 text-sm font-semibold text-zinc-200">Activity timeline</h2>
        {timeline.length === 0 ? (
          <p className="text-sm text-zinc-500">No recorded activity for this account.</p>
        ) : (
          <ul className="space-y-2">
            {timeline.map((e, i) => (
              <li key={i} className="flex items-start gap-3 border-b border-zinc-800/60 pb-2 last:border-0">
                <span className={`mt-0.5 rounded-[3px] px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_COLOR[e.source]}`}>{e.source}</span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-200">{e.summary}</p>
                  {e.detail && <p className="truncate text-xs text-zinc-500">{e.detail}</p>}
                </div>
                <span className="whitespace-nowrap text-[11px] text-zinc-500">{fmt(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
