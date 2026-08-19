"use client"

import { useState } from "react"
import { Users, Mail, Phone, Globe } from "lucide-react"
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

      {/* Responsive grid of people cards */}
      <div key={tab} className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5" style={{ animation: "fade-in-up .28s ease" }}>
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
  const link = !placeholder && member.profileLink ? member.profileLink : null
  const contacts = !placeholder && (member.email || member.phone || link)
  return (
    <div className="group flex flex-col overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_18px_40px_-18px_rgba(26,26,26,0.28)]">
      {/* Photo — full-width square, face-focused crop */}
      <div className="relative aspect-square w-full overflow-hidden bg-gray-100">
        {member.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={member.photo}
            alt={member.name}
            className="h-full w-full object-cover object-[50%_22%] transition duration-500 group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center font-heading text-5xl font-semibold text-white" style={{ backgroundColor: ACCENT_HEX[accent] }}>
            {initial ?? <Users className="h-9 w-9" />}
          </div>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col items-center px-3 py-3.5 text-center">
        <h3 className="line-clamp-2 text-sm font-semibold leading-tight text-[#1a1a1a]">
          {placeholder ? (
            member.position
          ) : link ? (
            <a href={link} target="_blank" rel="noopener noreferrer" className="transition hover:text-brand">{member.name}</a>
          ) : (
            member.name
          )}
        </h3>
        <p className="mt-1 line-clamp-2 text-[11px] font-semibold uppercase tracking-wide text-brand">
          {placeholder ? "Committee member" : member.position}
        </p>

        {contacts && (
          <div className="mt-3 flex items-center gap-1.5">
            {member.email && (
              <a href={`mailto:${member.email}`} aria-label={`Email ${member.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-[#8a8a8a] transition hover:bg-brand hover:text-white"><Mail className="h-3.5 w-3.5" /></a>
            )}
            {member.phone && (
              <a href={`tel:${member.phone.replace(/\s+/g, "")}`} aria-label={`Call ${member.name}`} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-[#8a8a8a] transition hover:bg-brand hover:text-white"><Phone className="h-3.5 w-3.5" /></a>
            )}
            {link && (
              <a href={link} target="_blank" rel="noopener noreferrer" aria-label={`${member.name}'s profile`} className="flex h-8 w-8 items-center justify-center rounded-full bg-black/[0.04] text-[#8a8a8a] transition hover:bg-brand hover:text-white"><Globe className="h-3.5 w-3.5" /></a>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
