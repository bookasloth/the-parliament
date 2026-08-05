"use client"

import { useState } from "react"
import { MemberCard } from "@/components/marketing/MemberCard"
import { ACCENT_HEX } from "@/components/marketing/primitives"
import type { Member, SubCommittee } from "@/lib/committee"

type TabKey = "executive" | "sub" | "advisory" | "district"

export function CommitteeTabs({
  executive, subCommittees,
}: {
  executive: Member[]
  subCommittees: SubCommittee[]
}) {
  const [tab, setTab] = useState<TabKey>("executive")

  const subMemberCount = subCommittees.reduce((n, sc) => n + sc.members.length, 0)
  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: "executive", label: "Executive Committee", count: executive.length },
    { key: "sub", label: "Sub-committees", count: subMemberCount },
    { key: "advisory", label: "Advisory Board", count: 0 },
    { key: "district", label: "District Representatives", count: 0 },
  ]

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-black/10">
        {tabs.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative -mb-px flex items-center gap-2 rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                active ? "text-brand" : "text-[#8a8a8a] hover:text-[#1a1a1a]"
              }`}
            >
              {t.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
                  active ? "bg-brand-50 text-brand" : "bg-black/5 text-[#a3a3a3]"
                }`}
              >
                {t.count}
              </span>
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
            </button>
          )
        })}
      </div>

      {/* Panel — keyed so it remounts + fades/slides on every tab switch. */}
      <div key={tab} className="mt-8" style={{ animation: "fade-in-up .28s ease" }}>
        {tab === "executive" && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {executive.map((m, i) => (
              <MemberCard key={m.position + i} member={m} accent={(i % 4) as 0 | 1 | 2 | 3} />
            ))}
          </div>
        )}

        {tab === "sub" && (
          <div className="grid gap-6 md:grid-cols-2">
            {subCommittees.map((sc) => (
              <div key={sc.name} className="h-full rounded-3xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <div className="flex items-center gap-2.5">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: ACCENT_HEX[sc.accent] }} />
                  <h3 className="font-heading text-lg font-semibold text-[#1a1a1a]">{sc.name}</h3>
                  <span className="ml-auto text-xs font-medium uppercase tracking-wide text-[#a3a3a3]">
                    {sc.members.length} members
                  </span>
                </div>
                <div className="mt-5 space-y-3">
                  {sc.members.map((m, j) => (
                    <MemberCard key={m.position + j} member={m} accent={sc.accent} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {tab === "advisory" && <ComingSoon
          title="Advisory Board — coming soon"
          body="Senior alumni advisors who guide NNAWCA on strategy and long-term direction. The roster will be published here shortly."
        />}

        {tab === "district" && <ComingSoon
          title="District Representatives — coming soon"
          body="Alumni who represent NNAWCA across districts, coordinating local chapters and events. Representatives will be listed here soon."
        />}
      </div>
    </div>
  )
}

function ComingSoon({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 px-6 py-16 text-center">
      <p className="font-heading text-lg font-semibold text-[#1a1a1a]">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-[15px] text-[#8a8a8a]">{body}</p>
    </div>
  )
}
