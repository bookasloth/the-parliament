import Link from "next/link"
import { Users, Mail, Phone, MapPin } from "lucide-react"
import type { FooterColumn } from "@/lib/homepage-data"

interface FooterProps {
  columns?: FooterColumn[]
  email?: string
}

const DEFAULT_COLUMNS: FooterColumn[] = [
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
      { label: "Events", href: "/events" },
      { label: "Sign up", href: "/auth/signup" },
    ],
  },
  {
    title: "Legal",
    links: [
      { label: "Memorandum (MOA)", href: "/moa" },
      { label: "Rules & Regulations", href: "/rules" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Use", href: "/terms" },
    ],
  },
]

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com/nnawca", icon: "IG" },
  { label: "YouTube", href: "https://youtube.com/@nnawca", icon: "YT" },
  { label: "LinkedIn", href: "https://linkedin.com/company/nnawca", icon: "IN" },
  { label: "Facebook", href: "https://facebook.com/nnawca", icon: "FB" },
]

export function Footer({
  columns = DEFAULT_COLUMNS,
  email = "contact@nnawca.org",
}: FooterProps) {
  return (
    <footer className="bg-[#111113] text-white">
      {/* Main grid */}
      <div className="mx-auto max-w-7xl px-6 pt-16 pb-8">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-12">
          {/* Brand column */}
          <div className="lg:col-span-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-[5px] bg-brand">
                <Users className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-sm font-bold tracking-wide">NNAWCA</span>
                <p className="text-[11px] text-white/40">Est. 1985</p>
              </div>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/50">
              Nagpur Navodaya Alumni Welfare and Charitable Association —
              connecting JNV Nagpur alumni to each other and to the school that
              shaped them.
            </p>

            {/* Contact details */}
            <div className="mt-6 space-y-2.5">
              <a
                href={`mailto:${email}`}
                className="flex items-center gap-2.5 text-sm text-white/50 transition hover:text-white"
              >
                <Mail className="h-4 w-4 shrink-0" /> {email}
              </a>
              <div className="flex items-center gap-2.5 text-sm text-white/50">
                <MapPin className="h-4 w-4 shrink-0" />
                <span>JNV Navegaon Khairi, Nagpur, MH</span>
              </div>
            </div>

            {/* Social row */}
            <div className="mt-6 flex gap-2">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={s.label}
                  className="flex h-9 w-9 items-center justify-center rounded-[4px] bg-white/[0.06] text-[11px] font-bold text-white/60 transition hover:bg-white/10 hover:text-white"
                >
                  {s.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <div key={col.title} className="lg:col-span-2">
              <h4 className="text-xs font-bold uppercase tracking-widest text-white/30">
                {col.title}
              </h4>
              <ul className="mt-4 space-y-2.5">
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-white/55 transition hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/[0.06] pt-6 sm:flex-row">
          <p className="text-xs text-white/30">
            &copy; {new Date().getFullYear()} NNAWCA. All rights reserved.
          </p>
          <div className="flex gap-6 text-xs text-white/30">
            <Link href="/privacy" className="transition hover:text-white/60">
              Privacy
            </Link>
            <Link href="/terms" className="transition hover:text-white/60">
              Terms
            </Link>
            <Link href="/rules" className="transition hover:text-white/60">
              Rules
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
