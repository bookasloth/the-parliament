import { requireAdmin } from "@/modules/auth/session"
import { getDefaultSchoolId } from "@/lib/school"
import { getEventReports } from "@/modules/events/service"
import { PageHeader, StatCard, Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "../../admin-ui"
import { ChartBar, Users, CurrencyInr, Star } from "@phosphor-icons/react/dist/ssr"

export const dynamic = "force-dynamic"

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`
}

export default async function AdminEventReportsPage() {
  await requireAdmin()
  const schoolId = await getDefaultSchoolId()
  const rows = schoolId ? await getEventReports(schoolId) : []

  const totals = rows.reduce(
    (a, r) => ({
      registered: a.registered + r.going,
      checkedIn: a.checkedIn + r.checkedIn,
      revenue: a.revenue + r.revenuePaise,
      feedback: a.feedback + r.feedbackCount,
    }),
    { registered: 0, checkedIn: 0, revenue: 0, feedback: 0 },
  )

  return (
    <div>
      <PageHeader title="Event Reports" description="Attendance, feedback and revenue across all events" />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <StatCard label="Total Registered" value={totals.registered.toLocaleString()} icon={<Users className="h-4.5 w-4.5" weight="duotone" />} accent="indigo" />
        <StatCard label="Checked In" value={totals.checkedIn.toLocaleString()} icon={<ChartBar className="h-4.5 w-4.5" weight="duotone" />} accent="emerald" />
        <StatCard label="Revenue" value={rupees(totals.revenue)} icon={<CurrencyInr className="h-4.5 w-4.5" weight="duotone" />} accent="amber" />
        <StatCard label="Feedback" value={totals.feedback.toLocaleString()} icon={<Star className="h-4.5 w-4.5" weight="duotone" />} accent="sky" />
      </div>

      <div className="rounded-lg border border-zinc-800 bg-[#111113] overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <Thead>
              <Tr className="hover:bg-transparent">
                {["Event", "Date", "Price", "Interested", "Registered", "Checked In", "Revenue", "Rating"].map((h) => (
                  <Th key={h} className="whitespace-nowrap">{h}</Th>
                ))}
              </Tr>
            </Thead>
            <Tbody>
              {rows.map((r) => (
                <Tr key={r.id}>
                  <Td className="max-w-[240px]">
                    <span className="text-xs font-semibold text-zinc-200">{r.title}</span>
                    {r.isPast && <span className="ml-2 rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-zinc-400">past</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-zinc-400">
                    {new Date(r.startsAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-zinc-300">{r.priceInPaise > 0 ? rupees(r.priceInPaise) : "Free"}</Td>
                  <Td className="text-xs tabular-nums text-zinc-400">{r.interested}</Td>
                  <Td className="text-xs font-bold tabular-nums text-zinc-200">{r.going}</Td>
                  <Td className="text-xs tabular-nums text-zinc-300">{r.checkedIn}<span className="text-zinc-600">/{r.going}</span></Td>
                  <Td className="whitespace-nowrap text-xs font-semibold tabular-nums text-emerald-400">{r.revenuePaise > 0 ? rupees(r.revenuePaise) : "—"}</Td>
                  <Td className="whitespace-nowrap text-xs text-zinc-300">
                    {r.feedbackAvg != null ? <>★ {r.feedbackAvg.toFixed(1)} <span className="text-zinc-600">({r.feedbackCount})</span></> : "—"}
                  </Td>
                </Tr>
              ))}
              {rows.length === 0 && (
                <Tr>
                  <Td colSpan={8}>
                    <EmptyState title="No events yet" description="Reports appear once events are created." />
                  </Td>
                </Tr>
              )}
            </Tbody>
          </Table>
        </div>
      </div>
    </div>
  )
}
