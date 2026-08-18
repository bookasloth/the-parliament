import { requirePermission } from "@/lib/gate"
import { getDefaultSchoolId } from "@/lib/school"
import { getEventReports } from "@/modules/events/service"
import { PageHeader, StatCard, Table, Thead, Tbody, Tr, Th, Td, EmptyState } from "../../admin-ui"
import { ChartBar, Users, CurrencyInr, Star } from "@phosphor-icons/react/dist/ssr"

export const dynamic = "force-dynamic"

function rupees(paise: number): string {
  return `₹${(paise / 100).toLocaleString("en-IN")}`
}

export default async function AdminEventReportsPage() {
  await requirePermission("events:manage")
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

      <div className="rounded-[4px] border border-gray-200 bg-white overflow-hidden">
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
                    <span className="text-xs font-semibold text-gray-800">{r.title}</span>
                    {r.isPast && <span className="ml-2 rounded-[3px] bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-600">past</span>}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-gray-600">
                    {new Date(r.startsAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}
                  </Td>
                  <Td className="whitespace-nowrap text-xs text-gray-700">{r.priceInPaise > 0 ? rupees(r.priceInPaise) : "Free"}</Td>
                  <Td className="text-xs tabular-nums text-gray-600">{r.interested}</Td>
                  <Td className="text-xs font-bold tabular-nums text-gray-800">{r.going}</Td>
                  <Td className="text-xs tabular-nums text-gray-700">{r.checkedIn}<span className="text-gray-400">/{r.going}</span></Td>
                  <Td className="whitespace-nowrap text-xs font-semibold tabular-nums text-emerald-600">{r.revenuePaise > 0 ? rupees(r.revenuePaise) : "—"}</Td>
                  <Td className="whitespace-nowrap text-xs text-gray-700">
                    {r.feedbackAvg != null ? <>★ {r.feedbackAvg.toFixed(1)} <span className="text-gray-400">({r.feedbackCount})</span></> : "—"}
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
