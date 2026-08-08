import { notFound } from "next/navigation"
import { CalendarDays } from "lucide-react"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { callsEnabled } from "@/config/calls"

export const dynamic = "force-dynamic"

export default async function AmaListPage() {
  await requireUser()
  if (!callsEnabled()) notFound()

  const sessions = await prisma.amaSession.findMany({
    where: { status: { not: "ended" } },
    orderBy: { startsAt: "asc" },
    take: 50,
  })

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6">
      <h1 className="text-xl font-bold text-gray-900">AMA Sessions</h1>
      <p className="mt-1 text-sm text-gray-500">Live and upcoming Ask-Me-Anything rooms. Free to attend for every member.</p>

      {sessions.length === 0 ? (
        <div className="mt-8 flex flex-col items-center rounded-xl border border-gray-200 bg-white py-14 text-center">
          <CalendarDays className="h-8 w-8 text-gray-300" />
          <p className="mt-3 text-sm font-medium text-gray-700">No AMAs scheduled</p>
          <p className="text-sm text-gray-400">Check back soon.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <a
                href={`/ama/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 hover:border-brand hover:shadow-sm transition"
              >
                <div className="min-w-0">
                  <p className="truncate font-semibold text-gray-900">{s.title}</p>
                  <p className="text-xs text-gray-500">{new Date(s.startsAt).toLocaleString()}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${s.status === "live" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                  {s.status === "live" ? "● Live" : "Upcoming"}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
