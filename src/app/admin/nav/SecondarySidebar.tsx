"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { activeSection, itemActive, type Badges, type NavSection } from "./nav-config"
import { ICONS } from "./icon-map"

export default function SecondarySidebar({
  sections,
  badges,
  onNavigate,
}: {
  sections: NavSection[]
  badges: Badges
  onNavigate?: () => void
}) {
  const pathname = usePathname()
  const section = activeSection(sections, pathname)
  if (!section) return null

  return (
    <div className="flex h-full w-[220px] flex-col border-r border-gray-200 bg-gray-50">
      <div className="flex h-12 flex-shrink-0 items-center px-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">{section.label}</p>
      </div>
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
        {section.items.map(item => {
          const Icon = ICONS[item.icon]
          const active = itemActive(item.href, pathname)
          const count = item.badge ? badges[item.badge] ?? 0 : 0
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`relative flex items-center gap-2.5 rounded-[3px] px-2.5 py-2 text-[13px] font-medium transition-colors ${
                  active ? "bg-gray-100 text-gray-900" : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {active && (
                  <span
                    className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r"
                    style={{ backgroundColor: section.color }}
                  />
                )}
                {Icon && <Icon className="h-4.5 w-4.5" weight="regular" color={active ? section.color : undefined} />}
                <span className="flex-1">{item.label}</span>
                {count > 0 && (
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-1.5 text-[10px] font-semibold text-rose-700">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
