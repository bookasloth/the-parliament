"use client"

import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

// Sibling docs — same card, different data from the app rail. Marketing tone.
const DOCS = [
  { label: "About NNAWCA", href: "/about" },
  { label: "Privacy Policy", href: "/privacy" },
  { label: "Terms of Use", href: "/terms" },
  { label: "Rules & Regulations", href: "/rules" },
  { label: "Help & Support", href: "/help" },
]

export function LegalSidebar() {
  const pathname = usePathname()
  return (
    <nav aria-label="Documents" className="lg:sticky lg:top-28">
      <p className="mb-3 text-[13px] font-semibold uppercase tracking-[0.2em] text-brand">
        Documents
      </p>
      <ul className="space-y-1">
        {DOCS.map((d) => {
          const active = pathname === d.href
          return (
            <li key={d.href}>
              <a
                href={d.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "block rounded-lg px-3 py-2 text-sm transition-colors",
                  active
                    ? "bg-brand-50 font-semibold text-brand"
                    : "text-[#5b5b5b] hover:bg-black/5 hover:text-[#1a1a1a]",
                )}
              >
                {d.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
