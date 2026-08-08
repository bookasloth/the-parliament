import type { Metadata } from "next"
import {
  Landmark,
  Crown,
  Orbit,
  Mountain,
  Gem,
  TrendingUp,
  Vote,
  Map,
  Rocket,
  GraduationCap,
  Activity,
  CalendarCheck,
  Megaphone,
  Briefcase,
  MessageCircle,
  Compass,
  BadgeCheck,
  Search,
  Check,
  type LucideIcon,
} from "lucide-react"
import {
  Section,
  Eyebrow,
  Reveal,
  Typewriter,
  CtaBand,
  ACCENT_HEX,
} from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Changelog — what's new on NNAWCA",
  description:
    "Every week the JNV Nagpur alumni network gets a little better. See what shipped, release by release.",
}

interface Release {
  name: string
  date: string
  tagline: string
  blurb: string
  features: string[]
  footnote: string
  icon: LucideIcon
}

// Newest first. One release ships (almost) every week — keep this list at the top.
const RELEASES: Release[] = [
  {
    name: "Legacy",
    date: "1 August 2026",
    tagline: "Building something that lasts.",
    blurb:
      "NNAWCA takes another step toward preserving the long-term impact of our alumni community.",
    features: [
      "Endowment tracking",
      "Scholarship management",
      "Public impact reporting",
      "Better visibility into community contributions",
    ],
    footnote:
      "Legacy brings alumni impact, scholarships and institutional initiatives into one place — showing not just where we are today, but what we're building for those who come next.",
    icon: Landmark,
  },
  {
    name: "Crown",
    date: "25 July 2026",
    tagline: "Recognising those who give back.",
    blurb:
      "Every strong community has people who quietly help it grow. Crown gives those contributions the visibility they deserve.",
    features: [
      "Donor recognition wall",
      "Legacy contributor badges",
      "Sponsorship management",
      "Contributor recognition across profiles",
    ],
    footnote:
      "Contributions can now become part of an alumnus's visible legacy within NNAWCA.",
    icon: Crown,
  },
  {
    name: "Orbit",
    date: "18 July 2026",
    tagline: "Smaller circles. Stronger conversations.",
    blurb:
      "Not every conversation belongs in the main feed. Orbit introduces dedicated spaces for experienced alumni, community leaders and long-term members to connect more meaningfully.",
    features: [
      "Lifetime Member Lounge",
      "Closed roundtables",
      "Leadership forums",
      "Private community spaces",
    ],
    footnote: "The goal is simple: create room for conversations that benefit from a smaller table.",
    icon: Orbit,
  },
  {
    name: "Summit",
    date: "11 July 2026",
    tagline: "Bringing the network into one room.",
    blurb:
      "Online connections become far more powerful when they turn into real conversations. Summit introduces the foundation for NNAWCA's flagship alumni gatherings.",
    features: [
      "Annual Summit experience",
      "Speaker profiles and portal",
      "Event registration",
      "VIP participation tiers",
    ],
    footnote:
      "From discovering speakers to attending the event, the entire experience can now live inside the alumni network.",
    icon: Mountain,
  },
  {
    name: "Prism",
    date: "4 July 2026",
    tagline: "Celebrating excellence across the network.",
    blurb:
      "Our alumni are building businesses, leading teams, creating opportunities and achieving remarkable things. Prism makes those stories easier to discover.",
    features: [
      "Alumni Awards",
      "Featured Member showcases",
      "Recognition across profiles",
      "Premium visibility for notable achievements",
    ],
    footnote: "Great work deserves more than a passing mention.",
    icon: Gem,
  },
  {
    name: "Vector",
    date: "27 June 2026",
    tagline: "Understanding where our alumni are going.",
    blurb:
      "A network becomes more valuable when it can understand its own journey. Vector introduces a new insight layer to NNAWCA.",
    features: [
      "Career progression analytics",
      "Industry insights",
      "Alumni growth trends",
      "Network-level professional insights",
    ],
    footnote:
      "Over time, these insights help us understand how careers, industries and opportunities evolve across generations of alumni.",
    icon: TrendingUp,
  },
  {
    name: "Current",
    date: "20 June 2026",
    tagline: "More ways to have your say.",
    blurb:
      "NNAWCA isn't meant to be a one-way notice board. Current makes community participation more active and democratic.",
    features: [
      "Trending discussions",
      "Community polls",
      "Community voting",
      "Improved discussion discovery",
    ],
    footnote:
      "See what the community is talking about, join the conversation, and make your voice count.",
    icon: Vote,
  },
  {
    name: "Atlas",
    date: "13 June 2026",
    tagline: "The alumni network now has a map.",
    blurb:
      "Our alumni aren't confined to one city, state or even country. Atlas makes the geographical reach of NNAWCA visible.",
    features: [
      "Alumni world map",
      "Regional chapters",
      "Chapter discovery",
      "Dedicated chapter dashboards",
    ],
    footnote: "Wherever alumni go, the network can now travel with them.",
    icon: Map,
  },
  {
    name: "Nebula",
    date: "6 June 2026",
    tagline: "Find people to build with.",
    blurb:
      "Sometimes the most valuable connection isn't a job referral or introduction — it's finding the right person for an idea.",
    features: [
      "Alumni startup directory",
      "Co-founder discovery",
      "Project showcases",
      "Collaboration opportunities",
    ],
    footnote:
      "Nebula turns the alumni network into a place where ideas can find people, and people can find opportunities to build together.",
    icon: Rocket,
  },
  {
    name: "Forge",
    date: "30 May 2026",
    tagline: "Learn from people who've already walked the road.",
    blurb:
      "The collective experience inside an alumni network is enormous. Forge makes more of that knowledge accessible.",
    features: [
      "Alumni-led webinars",
      "Resource library",
      "Workshops",
      "Professional learning sessions",
    ],
    footnote: "Knowledge shouldn't disappear after a conversation. Now it can become part of the network.",
    icon: GraduationCap,
  },
  {
    name: "Pulse",
    date: "23 May 2026",
    tagline: "Taking the pulse of the community.",
    blurb:
      "A healthy network isn't measured only by how many members it has — it's measured by how many participate.",
    features: [
      "Engagement dashboard",
      "Community leaderboards",
      "Newsletter engine",
      "Network activity insights",
    ],
    footnote: "Pulse helps us understand what alumni care about and where the community is most active.",
    icon: Activity,
  },
  {
    name: "Gravity",
    date: "16 May 2026",
    tagline: "Turning online connections into real meetings.",
    blurb:
      "Some connections need more than a profile and a message. Gravity introduces a better way to discover and participate in alumni events.",
    features: ["Event discovery", "RSVP system", "Event galleries", "Automated reminders"],
    footnote: "Discover what's happening, RSVP in seconds, and stay connected before and after the event.",
    icon: CalendarCheck,
  },
  {
    name: "Echo",
    date: "9 May 2026",
    tagline: "Every alumni network has stories worth telling.",
    blurb: "Echo creates a dedicated space to celebrate the people behind NNAWCA.",
    features: [
      "Alumni Spotlights",
      "Video testimonials",
      "Monthly alumni highlights",
      "Featured stories",
    ],
    footnote: "Achievements deserve an audience, and journeys deserve to be remembered.",
    icon: Megaphone,
  },
  {
    name: "Circuit",
    date: "2 May 2026",
    tagline: "Turning connections into opportunities.",
    blurb:
      "Networking becomes significantly more valuable when it creates tangible outcomes. Circuit introduces the career and hiring layer of NNAWCA.",
    features: [
      "Alumni Job Board",
      "Referral opportunities",
      "Hiring Alumni badges",
      "Alumni-first career discovery",
    ],
    footnote:
      "Whether you're looking for your next opportunity or your next team member, start with the network.",
    icon: Briefcase,
  },
  {
    name: "Signal",
    date: "25 April 2026",
    tagline: "The network can finally talk.",
    blurb:
      "Finding the right alumnus is useful. Being able to start a conversation is what makes the connection matter.",
    features: [
      "Direct messaging",
      "Industry channels",
      "Mentorship requests",
      "Easier member-to-member communication",
    ],
    footnote:
      "From a quick introduction to long-term mentorship, conversations can now begin directly inside NNAWCA.",
    icon: MessageCircle,
  },
  {
    name: "Drift",
    date: "18 April 2026",
    tagline: "Your network should keep moving.",
    blurb:
      "Drift introduces discovery beyond search. NNAWCA can now help you find people and conversations that may be relevant to you.",
    features: [
      "Suggested alumni connections",
      "Follow system",
      "Alumni activity feed",
      "Improved network discovery",
    ],
    footnote:
      "Instead of rebuilding your network from scratch, Drift helps the right people gradually find their way into it.",
    icon: Compass,
  },
  {
    name: "Snowflake",
    date: "11 April 2026",
    tagline: "Every alumnus has a different story.",
    blurb:
      "This week is all about identity. Snowflake introduces richer alumni profiles designed to showcase more than a name, batch and graduation year.",
    features: [
      "Enhanced alumni profiles",
      "Achievement showcases",
      "Verification badges",
      "Improved professional information",
    ],
    footnote: "Your NNAWCA profile can now become a living record of where your journey has taken you.",
    icon: BadgeCheck,
  },
  {
    name: "Local",
    date: "4 April 2026",
    tagline: "Finding your people just got easier.",
    blurb:
      "We start with the most important part of any alumni network: helping alumni find each other again. Local introduces the first generation of alumni discovery tools on NNAWCA.",
    features: [
      "Smart alumni search",
      "Batch-based discovery",
      "Batch groups",
      "Location-based alumni discovery",
    ],
    footnote: "This is where the network begins.",
    icon: Search,
  },
]

export default function ChangelogPage() {
  return (
    <>
      {/* ── Hero ── */}
      <Section width="6xl" className="pt-32 text-center lg:pt-40">
        <Reveal>
          <Eyebrow>Changelog</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-5 max-w-4xl font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            Every week, we ship something
            {/* own line + reserved height so type/erase never shifts the layout */}
            <span className="mt-1 block min-h-[1.15em]">
              <Typewriter words={["new.", "useful.", "for you.", "worth the visit."]} />
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#5b5b5b]">
            Small improvements. Stronger connections. A better alumni network, one release
            at a time. Here's everything that's shipped so far.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-[#7a7a7a]">
            <span>
              <span className="font-semibold text-[#1a1a1a]">{RELEASES.length}</span> releases
            </span>
            <span className="hidden sm:inline text-black/15">·</span>
            <span>Updated weekly</span>
            <span className="hidden sm:inline text-black/15">·</span>
            <span>
              Latest: <span className="font-semibold text-[#1a1a1a]">{RELEASES[0].date}</span>
            </span>
          </div>
        </Reveal>
      </Section>

      {/* ── Timeline ── */}
      <Section width="5xl" className="pt-0">
        <ol className="relative ml-4 space-y-8 border-l border-dashed border-black/12 sm:ml-6">
          {RELEASES.map((r, i) => {
            const accent = (i % 4) as 0 | 1 | 2 | 3
            const hex = ACCENT_HEX[accent]
            const Icon = r.icon
            return (
              <li key={r.name} className="relative pl-8 sm:pl-12">
                {/* Node */}
                <span
                  aria-hidden
                  className="absolute top-1 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-[4px] border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)] left-0"
                  style={{ borderColor: `${hex}40`, color: hex, backgroundColor: `${hex}0f` }}
                >
                  <Icon className="h-[18px] w-[18px]" />
                </span>

                <Reveal>
                  <div className="rounded-[5px] border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_18px_44px_-20px_rgba(26,26,26,0.22)] sm:p-8">
                    {/* Header */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                      <h2 className="font-heading text-2xl font-semibold tracking-[-0.02em] text-[#1a1a1a]">
                        {r.name}
                      </h2>
                      {i === 0 && (
                        <span
                          className="rounded-[3px] px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white"
                          style={{ backgroundColor: hex }}
                        >
                          Latest
                        </span>
                      )}
                      <span className="ml-auto text-sm font-medium text-[#a3a3a3]">{r.date}</span>
                    </div>

                    {/* Tagline */}
                    <p
                      className="mt-1.5 font-heading text-lg font-semibold"
                      style={{ color: hex }}
                    >
                      {r.tagline}
                    </p>

                    {/* Blurb */}
                    <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b]">{r.blurb}</p>

                    {/* What's new */}
                    <div className="mt-5">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">
                        What's new
                      </p>
                      <ul className="mt-3 grid gap-2.5 sm:grid-cols-2">
                        {r.features.map((f) => (
                          <li key={f} className="flex items-start gap-2.5 text-[15px] text-[#2b2b2b]">
                            <span
                              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[4px]"
                              style={{ backgroundColor: `${hex}18`, color: hex }}
                            >
                              <Check className="h-3 w-3" strokeWidth={3} />
                            </span>
                            {f}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Footnote */}
                    <p className="mt-6 border-t border-black/5 pt-4 text-sm italic leading-relaxed text-[#7a7a7a]">
                      {r.footnote}
                    </p>
                  </div>
                </Reveal>
              </li>
            )
          })}

          {/* Origin marker */}
          <li className="relative pl-8 sm:pl-12">
            <span
              aria-hidden
              className="absolute left-0 top-1 h-3 w-3 -translate-x-1/2 rounded-full bg-black/15"
            />
            <p className="text-sm font-medium text-[#a3a3a3]">
              The beginning — where the network started.
            </p>
          </li>
        </ol>
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="Don't just read the updates. Use them."
        sub="Join the network and every new release lands right in your feed."
        primary={{ label: "Join the network", href: "/auth/signup" }}
        secondary={{ label: "About NNAWCA", href: "/about" }}
      />
    </>
  )
}
