"use client"

import { useState } from "react"
import { MemberCard } from "@/components/marketing/MemberCard"
import { ACCENT_HEX } from "@/components/marketing/primitives"
import type { Member, SubCommittee } from "@/lib/committee"

type TabKey = "executive" | "sub" | "advisory"
const TABS: { key: TabKey; label: string }[] = [
  { key: "executive", label: "Executive Committee" },
  { key: "sub", label: "Sub-committees" },
  { key: "advisory", label: "Advisory Board" },
]

export function CommitteeTabs({
  executive, subCommittees,
}: {
  executive: Member[]
  subCommittees: SubCommittee[]
}) {
  const [tab, setTab] = useState<TabKey>("executive")

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-black/10">
        {TABS.map((t) => {
          const active = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative -mb-px rounded-t-lg px-4 py-2.5 text-sm font-semibold transition ${
                active ? "text-brand" : "text-[#8a8a8a] hover:text-[#1a1a1a]"
              }`}
            >
              {t.label}
              {active && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-brand" />}
            </button>
          )
        })}
      </div>

      <div className="mt-8">
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

        {tab === "advisory" && (
          <div className="rounded-3xl border border-dashed border-black/15 bg-white/60 px-6 py-16 text-center">
            <p className="font-heading text-lg font-semibold text-[#1a1a1a]">Advisory Board — coming soon</p>
            <p className="mx-auto mt-2 max-w-md text-[15px] text-[#8a8a8a]">
              Senior alumni advisors who guide NNAWCA on strategy and long-term direction. The roster
              will be published here shortly.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
