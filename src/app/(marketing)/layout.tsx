import type { ReactNode } from "react"
import { StickyNav } from "@/components/homepage/StickyNav"
import { Footer } from "@/components/homepage/Footer"
import { optionalUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"

const NAV_LINKS = [
  { label: "About", href: "/about" },
  { label: "Committee", href: "/committee" },
  { label: "Gallery", href: "/gallery" },
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
      { label: "Governance", href: "/governance" },
      { label: "Newsroom", href: "/newsroom" },
      { label: "Changelog", href: "/changelog" },
      { label: "Contact", href: "/contact" },
    ],
  },
  {
    title: "Get Involved",
    links: [
      { label: "Membership", href: "/join" },
      { label: "Donate", href: "/donate" },
      { label: "Wall of Honour", href: "/wall-of-honour" },
      { label: "Gallery", href: "/gallery" },
      { label: "Sponsorship", href: "/sponsorship" },
      { label: "Sign up", href: "/auth/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Memorandum (MOA)", href: "/moa" },
      { label: "Rules & Regulations", href: "/rules" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
]

export default async function MarketingLayout({ children }: { children: ReactNode }) {
  const session = await optionalUser()
  let user: { name: string; avatar: string | null; username: string | null } | null = null
  if (session) {
    const u = await prisma.user.findUnique({
      where: { id: session.id },
      select: { displayName: true, legalName: true, username: true, profile: { select: { photoUrl: true } } },
    })
    if (u) user = { name: u.displayName || u.legalName, avatar: u.profile?.photoUrl ?? null, username: u.username }
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] font-body">
      <StickyNav centerLinks={NAV_LINKS} ctaLabel="Join Community" user={user} />
      <main>{children}</main>
      <Footer columns={FOOTER_COLUMNS} />
    </div>
  )
}
