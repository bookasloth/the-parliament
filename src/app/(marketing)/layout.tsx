import type { ReactNode } from "react"
import { StickyNav } from "@/components/homepage/StickyNav"
import { Footer } from "@/components/homepage/Footer"

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Committee", href: "/committee" },
  { label: "Membership", href: "/join" },
  { label: "Donate", href: "/donate" },
  { label: "Contact", href: "/contact" },
]

const FOOTER_COLUMNS = [
  {
    title: "Association",
    links: [
      { label: "About NNAWCA", href: "/about" },
      { label: "Committee", href: "/committee" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Get Involved",
    links: [
      { label: "Membership", href: "/join" },
      { label: "Donate", href: "/donate" },
      { label: "Sign up", href: "/auth/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
]

export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-[#faf9f6] font-body">
      <StickyNav centerLinks={NAV_LINKS} ctaLabel="Join Community" />
      <main>{children}</main>
      <Footer columns={FOOTER_COLUMNS} />
    </div>
  )
}
