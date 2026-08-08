import Link from "next/link"
import {
  Search,
  Users,
  Briefcase,
  HandHeart,
  ArrowRight,
  CalendarDays,
  MapPin,
  Video,
} from "lucide-react"
import { StickyNav } from "./StickyNav"
import { Footer } from "./Footer"
import { HeroCycler } from "./HeroCycler"
import {
  Section,
  SectionHeading,
  Reveal,
  CountUp,
  CtaBand,
  ACCENT_HEX,
} from "@/components/marketing/primitives"
import type { EventItem } from "@/modules/events/service"
import type { GroupListItem } from "@/modules/groups/service"

const NAV_LINKS = [
  { label: "Directory", href: "/community" },
  { label: "Events", href: "/events" },
  { label: "Groups", href: "/groups" },
  { label: "About", href: "/about" },
  { label: "Resources", href: "/help" },
]

const STATS = [
  { to: 700, suffix: "+", label: "Alumni connected" },
  { to: 30, suffix: "+", label: "Events & reunions" },
  { to: 10, suffix: "+", label: "Students supported" },
  { to: 40, suffix: "+", label: "Years of the bond" },
]

const FEATURES = [
  {
    icon: Search,
    title: "Find Alumni",
    body: "Search by name, batch, house, city or company — and reconnect.",
    href: "/community",
    cta: "Explore",
  },
  {
    icon: Users,
    title: "Grow Your Network",
    body: "Build connections across batches that open real doors.",
    href: "/connections",
    cta: "Learn more",
  },
  {
    icon: Briefcase,
    title: "Discover Opportunities",
    body: "Jobs, referrals, mentorship and collaborations, alumni-to-alumni.",
    href: "/business",
    cta: "Explore",
  },
  {
    icon: HandHeart,
    title: "Give Back",
    body: "Mentor, donate or volunteer and lift the batch that follows.",
    href: "/join",
    cta: "Learn more",
  },
]

export function Homepage({
  events,
  groups,
}: {
  events: EventItem[]
  groups: GroupListItem[]
}) {
  return (
    <div id="main-content" className="bg-white">
      <StickyNav centerLinks={NAV_LINKS} />

      {/* ── Hero ── */}
      <Section width="7xl" className="pt-28 pb-12 lg:pt-32">
        <Reveal>
          <span className="mb-6 inline-flex items-center gap-2 rounded-[3px] border border-black/10 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand">
            <span className="h-1.5 w-1.5 rounded-full bg-brand" />
            The JNV Nagpur alumni network
          </span>
        </Reveal>
        <Reveal delay={0.05}>
          <HeroCycler />
        </Reveal>

        {/* Stats row */}
        <div className="mt-16 grid gap-8 border-t border-black/5 pt-10 sm:grid-cols-4">
          {STATS.map((s, i) => (
            <Reveal key={s.label} delay={i * 0.08} className="text-center sm:text-left">
              <p className="font-heading text-4xl font-semibold text-[#1a1a1a] lg:text-5xl">
                <CountUp to={s.to} suffix={s.suffix} />
              </p>
              <p className="mt-1.5 text-sm text-[#8a8a8a]">{s.label}</p>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Feature cards ── */}
      <Section width="7xl" className="!pt-4">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal key={f.title} delay={i * 0.07}>
                <Link
                  href={f.href}
                  className="group flex h-full flex-col rounded-[5px] border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_36px_-16px_rgba(26,26,26,0.2)]"
                >
                  <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-brand/10 text-brand ring-1 ring-brand/15">
                    <Icon className="h-6 w-6" strokeWidth={1.75} />
                  </div>
                  <h3 className="mt-5 font-heading text-lg font-semibold text-[#1a1a1a]">
                    {f.title}
                  </h3>
                  <p className="mt-1.5 flex-1 text-sm leading-relaxed text-[#5b5b5b]">
                    {f.body}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    {f.cta}
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            )
          })}
        </div>
      </Section>

      {/* ── Featured Events (real data) ── */}
      {events.length > 0 && (
        <Section width="7xl" className="!py-14">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading title="Featured events" className="!max-w-none" />
            <Link
              href="/events"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {events.slice(0, 3).map((e, i) => (
              <Reveal key={e.id} delay={i * 0.07}>
                <Link
                  href={`/events/${e.slug}`}
                  className="group flex h-full flex-col overflow-hidden rounded-[5px] border border-black/5 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_14px_36px_-16px_rgba(26,26,26,0.2)]"
                >
                  <div
                    className="h-36 bg-cover bg-center"
                    style={{
                      backgroundImage: e.cover
                        ? `url(${e.cover})`
                        : `linear-gradient(135deg, ${ACCENT_HEX[i % 4]}22, ${ACCENT_HEX[i % 4]}0a)`,
                    }}
                  />
                  <div className="flex flex-1 flex-col p-5">
                    <ModeBadge mode={e.mode} />
                    <h3 className="mt-3 font-heading text-base font-semibold leading-snug text-[#1a1a1a] line-clamp-2">
                      {e.title}
                    </h3>
                    <div className="mt-3 flex items-center gap-1.5 text-sm text-[#8a8a8a]">
                      <CalendarDays className="h-4 w-4" /> {e.date}
                      {e.time ? ` · ${e.time}` : ""}
                    </div>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ── Featured Groups (real data) ── */}
      {groups.length > 0 && (
        <Section width="7xl" className="!pt-4 !pb-16 bg-[#f9f8f6]">
          <div className="flex items-end justify-between gap-4">
            <SectionHeading title="Featured groups" className="!max-w-none" />
            <Link
              href="/groups"
              className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
            >
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {groups.slice(0, 3).map((g, i) => (
              <Reveal key={g.id} delay={i * 0.07}>
                <Link
                  href={`/groups/${g.slug}`}
                  className="group flex h-full flex-col rounded-[5px] border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_14px_36px_-16px_rgba(26,26,26,0.2)]"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[5px] bg-brand/10 text-2xl">
                      {g.icon || "👥"}
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate font-heading text-base font-semibold text-[#1a1a1a]">
                        {g.name}
                      </h3>
                      <p className="text-xs text-[#8a8a8a]">
                        {g.members.toLocaleString("en-IN")} members
                      </p>
                    </div>
                  </div>
                  <p className="mt-4 flex-1 text-sm leading-relaxed text-[#5b5b5b] line-clamp-2">
                    {g.description}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-brand">
                    Join group
                    <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                  </span>
                </Link>
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* ── CTA ── */}
      <CtaBand
        title="Be part of something bigger."
        sub="Join thousands of JNV Nagpur alumni already reconnecting, collaborating and growing together."
        primary={{ label: "Sign up now", href: "/auth/signup" }}
        secondary={{ label: "Explore directory", href: "/community" }}
      />

      <Footer />
    </div>
  )
}

function ModeBadge({ mode }: { mode: EventItem["mode"] }) {
  const label = mode === "virtual" ? "Online" : mode === "hybrid" ? "Hybrid" : "In person"
  const Icon = mode === "virtual" ? Video : MapPin
  return (
    <span className="inline-flex w-max items-center gap-1.5 rounded-[3px] bg-brand-50 px-2.5 py-1 text-[11px] font-semibold text-brand">
      <Icon className="h-3 w-3" /> {label}
    </span>
  )
}

