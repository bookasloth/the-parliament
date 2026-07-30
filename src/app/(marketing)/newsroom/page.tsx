import type { Metadata } from "next"
import { ArrowRight, Newspaper } from "lucide-react"
import {
  Section,
  Eyebrow,
  Reveal,
  CtaBand,
  ACCENT_HEX,
  ACCENT_TEXT,
} from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Newsroom — updates from NNAWCA",
  description:
    "Announcements, reunions, initiatives and milestones from the JNV Nagpur alumni network.",
}

// {{PLACEHOLDER}} — replace with real posts round-2.
interface Post {
  title: string
  excerpt: string
  category: string
  date: string
  accent: 0 | 1 | 2 | 3
  featured?: boolean
}
const POSTS: Post[] = [
  {
    title: "Launch of our new alumni portal",
    excerpt:
      "A single home for the whole JNV Nagpur family — directory, events, groups and giving, all in one place. Here's what's new and what's coming.",
    category: "Announcement",
    date: "July 2026",
    accent: 0,
    featured: true,
  },
  {
    title: "Annual reunion 2026 — save the date",
    excerpt: "Batches reunite this winter in Nagpur. Registration opens soon.",
    category: "Events",
    date: "July 2026",
    accent: 1,
  },
  {
    title: "Scholarship drive crosses its first milestone",
    excerpt: "Thanks to member donations, we've funded our first cohort of students this year.",
    category: "Impact",
    date: "June 2026",
    accent: 3,
  },
  {
    title: "Mentorship programme opens for sign-ups",
    excerpt: "Senior alumni are pairing with students and recent grads. Volunteer to mentor.",
    category: "Community",
    date: "June 2026",
    accent: 2,
  },
  {
    title: "New sub-committees take charge",
    excerpt: "Tech & Media, Culture, Alumni Relations and Election teams are now active.",
    category: "Governance",
    date: "May 2026",
    accent: 0,
  },
]

export default function NewsroomPage() {
  const [featured, ...rest] = POSTS
  return (
    <>
      {/* ── Hero + featured ── */}
      <Section width="7xl" className="pt-32 lg:pt-40">
        <Reveal>
          <Eyebrow>Newsroom</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mt-5 max-w-3xl font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            What's happening in the family.
          </h1>
        </Reveal>

        {/* Featured */}
        <Reveal delay={0.12}>
          <a
            href="#"
            className="group mt-12 grid overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_20px_48px_-20px_rgba(26,26,26,0.22)] lg:grid-cols-2"
          >
            <div
              className="flex min-h-[220px] items-center justify-center p-10"
              style={{ backgroundColor: `${ACCENT_HEX[featured.accent]}12` }}
            >
              <Newspaper className="h-16 w-16" style={{ color: ACCENT_HEX[featured.accent] }} />
            </div>
            <div className="p-8 lg:p-10">
              <div className="flex items-center gap-3 text-xs">
                <span
                  className="rounded-full px-3 py-1 font-semibold"
                  style={{ backgroundColor: `${ACCENT_HEX[featured.accent]}14`, color: ACCENT_HEX[featured.accent] }}
                >
                  {featured.category}
                </span>
                <span className="text-[#a3a3a3]">{featured.date}</span>
              </div>
              <h2 className="mt-4 font-heading text-2xl font-semibold text-[#1a1a1a] sm:text-3xl">
                {featured.title}
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b]">{featured.excerpt}</p>
              <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                Read more
                <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
              </span>
            </div>
          </a>
        </Reveal>
      </Section>

      {/* ── Post grid ── */}
      <Section width="7xl" className="pt-0">
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((p, i) => (
            <Reveal key={p.title} delay={(i % 3) * 0.07}>
              <a
                href="#"
                className="group flex h-full flex-col rounded-3xl border border-black/5 bg-white p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_16px_40px_-16px_rgba(26,26,26,0.2)]"
              >
                <div className="flex items-center gap-3 text-xs">
                  <span className={`font-semibold ${ACCENT_TEXT[p.accent]}`}>{p.category}</span>
                  <span className="text-[#a3a3a3]">· {p.date}</span>
                </div>
                <h3 className="mt-3 font-heading text-lg font-semibold text-[#1a1a1a]">
                  {p.title}
                </h3>
                <p className="mt-2 flex-1 text-[15px] leading-relaxed text-[#5b5b5b]">{p.excerpt}</p>
                <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-[#1a1a1a] transition group-hover:text-brand">
                  Read more
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </a>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="Never miss an update."
        sub="Join the network and get reunions, initiatives and milestones straight to your feed."
        primary={{ label: "Join the network", href: "/auth/signup" }}
        secondary={{ label: "Contact us", href: "/contact" }}
      />
    </>
  )
}
