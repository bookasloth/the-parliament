"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { activeSection, sectionBadgeCount, type Badges, type NavSection } from "./nav-config"
import { ICONS } from "./icon-map"

export default function PrimaryRail({ sections, badges }: { sections: NavSection[]; badges: Badges }) {
  const pathname = usePathname()
  const active = activeSection(sections, pathname)

  return (
    <nav className="hidden w-14 flex-shrink-0 flex-col items-center gap-1 border-r border-gray-200 bg-gray-50 py-3 lg:flex">
      {sections.map(section => {
        const Icon = ICONS[section.icon]
        const isActive = section.key === active?.key
        const first = section.items[0]?.href ?? "/admin"
        const count = sectionBadgeCount(section, badges)
        return (
          <Link
            key={section.key}
            href={first}
            aria-label={section.label}
            aria-current={isActive ? "true" : undefined}
            className="group relative flex h-10 w-10 items-center justify-center rounded-[4px] transition-colors hover:bg-gray-100"
          >
            {isActive && (
              <span
                className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r"
                style={{ backgroundColor: section.color }}
              />
            )}
            <span
              className={`flex h-10 w-10 items-center justify-center rounded-[4px] ${isActive ? "bg-gray-100" : ""}`}
            >
              {Icon && (
                <Icon
                  className="h-5.5 w-5.5"
                  weight={isActive ? "fill" : "regular"}
                  color={section.color}
                />
              )}
            </span>
            {count > 0 && (
              <span
                aria-hidden
                className="absolute right-1 top-1 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-gray-50"
              />
            )}
            {/* Tooltip */}
            <span className="pointer-events-none absolute left-full z-50 ml-2 whitespace-nowrap rounded-[3px] border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-900 opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {section.label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
