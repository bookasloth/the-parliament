"use client"

import { useEffect, useState } from "react"
import { User, IdCard, Shield, Bell, Mail, Lock, Ban, TriangleAlert } from "lucide-react"

const ICON = { User, IdCard, Shield, Bell, Mail, Lock, Ban, TriangleAlert }
type IconKey = keyof typeof ICON

export interface NavItem {
  id: string
  label: string
  icon: IconKey
  danger?: boolean
}

/** Sticky section nav for the settings page. Left rail on lg+, a horizontal
 *  scroll strip on mobile. Highlights the section currently in view and
 *  smooth-scrolls on click (accounting for the h-14 sticky navbar). */
export function SettingsNav({ items }: { items: NavItem[] }) {
  const [active, setActive] = useState(items[0]?.id)

  useEffect(() => {
    const sections = items
      .map((i) => document.getElementById(i.id))
      .filter((el): el is HTMLElement => !!el)
    if (!sections.length) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)
        if (visible[0]) setActive(visible[0].target.id)
      },
      // Bias toward the section whose top just passed the sticky navbar.
      { rootMargin: "-72px 0px -55% 0px", threshold: [0, 0.25, 0.5, 1] },
    )
    for (const s of sections) obs.observe(s)
    return () => obs.disconnect()
  }, [items])

  function jump(e: React.MouseEvent, id: string) {
    e.preventDefault()
    const el = document.getElementById(id)
    if (!el) return
    const y = el.getBoundingClientRect().top + window.scrollY - 72
    window.scrollTo({ top: y, behavior: "smooth" })
    setActive(id)
  }

  return (
    <nav className="lg:sticky lg:top-20">
      <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:flex-col lg:gap-0.5 lg:overflow-visible lg:pb-0">
        {items.map((item) => {
          const Icon = ICON[item.icon]
          const on = active === item.id
          return (
            <li key={item.id} className="flex-shrink-0">
              <a
                href={`#${item.id}`}
                onClick={(e) => jump(e, item.id)}
                className={`flex items-center gap-2.5 rounded-[4px] px-3 py-2 text-sm font-medium transition-colors ${
                  on
                    ? item.danger ? "bg-red-50 text-red-600" : "bg-brand/10 text-brand"
                    : item.danger ? "text-red-500 hover:bg-red-50" : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="whitespace-nowrap">{item.label}</span>
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
