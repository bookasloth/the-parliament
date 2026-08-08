import { Users, Mail, Phone } from "lucide-react"
import { ACCENT_HEX } from "@/components/marketing/primitives"
import type { Member } from "@/lib/committee"

export function isPlaceholder(name: string) {
  return name.includes("{{")
}

/** Alumni committee member card — colored avatar, position, name, email + phone. */
export function MemberCard({
  member,
  accent,
}: {
  member: Member
  accent: 0 | 1 | 2 | 3
}) {
  const placeholder = isPlaceholder(member.name)
  const initial = placeholder ? null : member.name.charAt(0)
  return (
    <div className="flex items-center gap-4 rounded-[5px] border border-black/5 bg-white p-4 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_10px_28px_-12px_rgba(26,26,26,0.16)]">
      <div
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[4px] font-heading text-lg font-semibold text-white"
        style={{ backgroundColor: ACCENT_HEX[accent] }}
      >
        {initial ?? <Users className="h-5 w-5" />}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight text-[#1a1a1a]">
          {placeholder ? member.position : member.name}
        </p>
        <p className="truncate text-sm text-[#8a8a8a]">
          {placeholder ? "Committee member" : member.position}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
          {member.email && (
            <a
              href={`mailto:${member.email}`}
              className="inline-flex items-center gap-1 text-xs text-[#6b7280] transition hover:text-brand"
            >
              <Mail className="h-3.5 w-3.5" /> Email
            </a>
          )}
          {member.phone && (
            <a
              href={`tel:${member.phone.replace(/\s|\{|\}/g, "")}`}
              className="inline-flex items-center gap-1 text-xs text-[#6b7280] transition hover:text-brand"
            >
              <Phone className="h-3.5 w-3.5" /> Call
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
