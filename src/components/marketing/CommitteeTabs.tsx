"use client"

import { useState } from "react"
import { Users } from "lucide-react"
import { ACCENT_HEX } from "@/components/marketing/primitives"
import { isPlaceholder } from "@/components/marketing/MemberCard"
import type { Member } from "@/lib/committee"

type TabKey = "executive" | "advisory"

export function CommitteeTabs({
  executive, advisory,
}: {
  executive: Member[]
  advisory: Member[]
}) {
  const [tab, setTab] = useState<TabKey>("executive")

  const tabs: { key: TabKey; label: string; members: Member[] }[] = [
    { key: "executive", label: "Executive Committee", members: executive },
    { key: "advisory", label: "Advisory Committee", members: advisory },
  ]
  const active = tabs.find((t) => t.key === tab)!

  return (
    <div>
      {/* Tab bar */}
      <div className="flex flex-wrap gap-2 border-b border-black/10">
        {tabs.map((t) => {
          const on = tab === t.key
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative -mb-px flex items-center gap-2 rounded-t-[4px] px-4 py-2.5 text-sm font-semibold transition ${
                on ? "text-brand" : "text-[#8a8a8a] hover:text-[#1a1a1a]"
              }`}
            >
              {t.label}
              <span className={`rounded-[3px] px-1.5 py-0.5 text-[11px] font-bold ${on ? "bg-brand-50 text-brand" : "bg-black/5 text-[#a3a3a3]"}`}>
                {t.members.length}
              </span>
              {on && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-[3px] bg-brand" />}
            </button>
          )
        })}
      </div>

      {/* 6-per-row grid of photo · name · role */}
      <div key={tab} className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6" style={{ animation: "fade-in-up .28s ease" }}>
        {active.members.map((m, i) => (
          <MemberTile key={m.name + i} member={m} accent={(i % 4) as 0 | 1 | 2 | 3} />
        ))}
      </div>
    </div>
  )
}

function MemberTile({ member, accent }: { member: Member; accent: 0 | 1 | 2 | 3 }) {
  const placeholder = isPlaceholder(member.name)
  const initial = placeholder ? null : member.name.replace(/^(Shri\.|Smt\.|Dr\.)\s*/i, "").charAt(0)
  return (
    <div className="flex flex-col items-center rounded-[5px] border border-black/5 bg-white p-4 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_10px_28px_-12px_rgba(26,26,26,0.16)]">
      {member.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={member.photo} alt={member.name} className="h-16 w-16 rounded-[4px] object-cover" />
      ) : (
        <div
          className="flex h-16 w-16 items-center justify-center rounded-[4px] font-heading text-2xl font-semibold text-white"
          style={{ backgroundColor: ACCENT_HEX[accent] }}
        >
          {initial ?? <Users className="h-6 w-6" />}
        </div>
      )}
      <p className="mt-3 line-clamp-2 text-sm font-semibold leading-tight text-[#1a1a1a]">
        {placeholder ? member.position : member.name}
      </p>
      <p className="mt-0.5 line-clamp-2 text-xs text-[#8a8a8a]">
        {placeholder ? "Committee member" : member.position}
      </p>
    </div>
  )
}
