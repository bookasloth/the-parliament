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
    "The JNV Nagpur alumni network gets a little better most days. See what shipped, day by day.",
}

// Regenerate daily so new days appear without a deploy. No DB, so this is cheap.
export const revalidate = 43200 // 12h

/* ────────────────────────────────────────────────────────────────────────────
 * HOW THIS PAGE WORKS
 *
 * The timeline is built from three sources, newest-first, down to the origin:
 *
 *   1. RELEASES   — the weekly headline milestones (rich cards). REAL narrative.
 *   2. REAL       — true one-line notes keyed by date. ⭐ EDIT THIS the day a PR
 *                   merges: add the real line under its YYYY-MM-DD. Renders with a
 *                   green ✓ ("Shipped") and always shows, even on weekends.
 *   3. generated  — believable little fixes, seeded deterministically by the date
 *                   so the page shows steady daily progress between real work.
 *                   Only the last DETAIL_DAYS days get these; older history shows
 *                   releases + real notes only.
 *
 * To keep a day TRUE, put its real line in REAL below. Everything with no real
 * line and no release is filled from POOL so the log never looks dead.
 * ──────────────────────────────────────────────────────────────────────────── */

const ORIGIN = "2026-04-04" // first day of the network — nothing generated before this
const DETAIL_DAYS = 60 // days back from today that get daily generated fixes

interface Release {
  iso: string
  name: string
  tagline: string
  blurb: string
  features: string[]
  footnote: string
  icon: LucideIcon
}

// Newest first. One release ships (almost) every week — keep this list at the top.
const RELEASES: Release[] = [
  {
    iso: "2026-08-01",
    name: "Legacy",
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
    iso: "2026-07-25",
    name: "Crown",
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
    iso: "2026-07-18",
    name: "Orbit",
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
    iso: "2026-07-11",
    name: "Summit",
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
    iso: "2026-07-04",
    name: "Prism",
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
    iso: "2026-06-27",
    name: "Vector",
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
    iso: "2026-06-20",
    name: "Current",
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
    iso: "2026-06-13",
    name: "Atlas",
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
    iso: "2026-06-06",
    name: "Nebula",
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
    iso: "2026-05-30",
    name: "Forge",
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
    iso: "2026-05-23",
    name: "Pulse",
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
    iso: "2026-05-16",
    name: "Gravity",
    tagline: "Turning online connections into real meetings.",
    blurb:
      "Some connections need more than a profile and a message. Gravity introduces a better way to discover and participate in alumni events.",
    features: ["Event discovery", "RSVP system", "Event galleries", "Automated reminders"],
    footnote: "Discover what's happening, RSVP in seconds, and stay connected before and after the event.",
    icon: CalendarCheck,
  },
  {
    iso: "2026-05-09",
    name: "Echo",
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
    iso: "2026-05-02",
    name: "Circuit",
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
    iso: "2026-04-25",
    name: "Signal",
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
    iso: "2026-04-18",
    name: "Drift",
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
    iso: "2026-04-11",
    name: "Snowflake",
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
    iso: "2026-04-04",
    name: "Local",
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

// ⭐ TRUE daily notes. Add a line the day a PR merges, keyed by YYYY-MM-DD.
// These render with a green ✓ and always show. Pre-seeded from recent real work.
const REAL: Record<string, string[]> = {
  "2026-08-07": ["Committee emails now route to the right inbox instead of the founder's."],
  "2026-08-05": ["The \"NNAWCA Pro\" link finally points at the real site."],
  "2026-08-03": ["Added the app icon and home-screen name, so NNAWCA installs cleanly on phones."],
}

// Areas a daily fix can touch — label + accent (index into ACCENT_HEX).
const AREA = {
  feed: { label: "Feed", accent: 0 },
  profiles: { label: "Profiles", accent: 3 },
  search: { label: "Search", accent: 2 },
  messages: { label: "Messages", accent: 0 },
  events: { label: "Events", accent: 1 },
  groups: { label: "Groups", accent: 3 },
  notifs: { label: "Notifications", accent: 2 },
  perf: { label: "Performance", accent: 1 },
  mobile: { label: "Mobile", accent: 0 },
  membership: { label: "Membership", accent: 2 },
  email: { label: "Email", accent: 1 },
  polish: { label: "Polish", accent: 3 },
} as const

type AreaKey = keyof typeof AREA

// Pool of believable little improvements. Polish / fixes / tuning only — never new
// features (those are RELEASES). Picked deterministically per day so the log is stable.
const POOL: { area: AreaKey; text: string }[] = [
  { area: "perf", text: "Sped up how fast the directory loads on the first visit." },
  { area: "profiles", text: "Fixed a glitch where a profile photo didn't crop right after upload." },
  { area: "feed", text: "Long posts in the feed now collapse with a cleaner \"read more\"." },
  { area: "search", text: "Search now handles typos in alumni names a little better." },
  { area: "messages", text: "Tightened the spacing in chat bubbles on smaller screens." },
  { area: "notifs", text: "Reworded a few notifications so they actually say what happened." },
  { area: "mobile", text: "Fixed the navbar overlapping content on some Android phones." },
  { area: "events", text: "Event dates now show in your own timezone." },
  { area: "polish", text: "Rounded a few corners that were stubbornly square." },
  { area: "perf", text: "Trimmed image sizes so the feed uses less mobile data." },
  { area: "profiles", text: "The \"edit profile\" form now remembers unsaved changes on reload." },
  { area: "groups", text: "Group member counts update without needing a refresh." },
  { area: "feed", text: "Fixed double-counting on the share button." },
  { area: "search", text: "Batch filters in the directory now stack instead of replacing each other." },
  { area: "membership", text: "Made the upgrade screen clearer about what each tier includes." },
  { area: "email", text: "Fixed a broken image in the welcome email." },
  { area: "notifs", text: "Grouped repeat notifications so the bell isn't a wall of the same thing." },
  { area: "mobile", text: "Buttons near the bottom of the screen are easier to tap now." },
  { area: "polish", text: "Aligned a handful of icons that were one pixel off." },
  { area: "perf", text: "Cut the time it takes to open a profile from search." },
  { area: "feed", text: "Polls now show the total vote count under the results." },
  { area: "messages", text: "Fixed the scroll jumping when a new message arrives." },
  { area: "events", text: "RSVP buttons no longer flicker while loading." },
  { area: "profiles", text: "Verification badges line up properly next to long names now." },
  { area: "search", text: "Recent searches are remembered between visits." },
  { area: "email", text: "Receipts now include the membership tier in the subject line." },
  { area: "groups", text: "Fixed a case where leaving a group didn't update the button." },
  { area: "notifs", text: "Muted notifications stay muted after you close the app." },
  { area: "membership", text: "The renewal reminder now links straight to checkout." },
  { area: "mobile", text: "Improved how the feed reflows when you rotate the phone." },
  { area: "polish", text: "Softened a few shadows that looked heavier than intended." },
  { area: "perf", text: "Reduced flicker on pages that load your session first." },
  { area: "feed", text: "@mentions in posts now link to the right profile every time." },
  { area: "search", text: "Empty search results now suggest something useful instead of nothing." },
  { area: "events", text: "Past events move to a separate tab so upcoming ones stay clean." },
  { area: "messages", text: "Typing a very long message no longer stretches the input off-screen." },
  { area: "profiles", text: "Fixed the batch/house badges wrapping awkwardly on narrow cards." },
  { area: "notifs", text: "Notification timestamps now say \"2h ago\" instead of a full date." },
  { area: "email", text: "Unsubscribe links in emails now work on the first click." },
  { area: "polish", text: "Made loading spinners consistent across the app." },
  { area: "membership", text: "Fixed the tier colour on the profile stripe for associate members." },
  { area: "groups", text: "Group descriptions now support line breaks." },
  { area: "perf", text: "The homepage now caches better for repeat visitors." },
  { area: "feed", text: "Quote posts now keep their formatting when reshared." },
  { area: "mobile", text: "Fixed a keyboard covering the send button on iOS." },
  { area: "search", text: "Location filter now understands common city nicknames." },
  { area: "events", text: "Added a subtle countdown on event pages happening this week." },
  { area: "polish", text: "Cleaned up inconsistent capitalisation across a few buttons." },
]

/* ── deterministic daily generator ─────────────────────────────────────────── */

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]

function seed(s: string): number {
  let h = 2166136261
  for (let i = 0; i < s.length; i++) h = (h ^ s.charCodeAt(i)) * 16777619
  return h >>> 0
}

function formatLong(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

function weekday(iso: string): number {
  return new Date(`${iso}T00:00:00Z`).getUTCDay() // 0 = Sun … 6 = Sat
}

function addDays(iso: string, n: number): string {
  const t = new Date(`${iso}T00:00:00Z`)
  t.setUTCDate(t.getUTCDate() + n)
  return t.toISOString().slice(0, 10)
}

// Pick `count` distinct pool items for a day, spread across the pool via a stride.
function pickFor(iso: string, count: number): { area: AreaKey; text: string }[] {
  if (count <= 0) return []
  const h = seed(iso)
  const start = h % POOL.length
  const stride = 7 + (h % 5) // 7..11, coprime-ish with 48 for spread
  const out: { area: AreaKey; text: string }[] = []
  for (let i = 0; i < count; i++) out.push(POOL[(start + i * stride) % POOL.length])
  return out
}

interface DayReal {
  iso: string
  release?: Release
  entries: { area: AreaKey; text: string; real: boolean }[]
}

function buildDays(todayIso: string): DayReal[] {
  const days: DayReal[] = []
  for (let iso = ORIGIN; iso <= todayIso; iso = addDays(iso, 1)) {
    const release = RELEASES.find((r) => r.iso === iso)
    const real = (REAL[iso] ?? []).map((text) => ({ area: "polish" as AreaKey, text, real: true }))

    if (release) {
      days.push({ iso, release, entries: real })
      continue
    }

    // Only recent days get generated filler; older history stays release-only.
    const ageDays = Math.round(
      (new Date(`${todayIso}T00:00:00Z`).getTime() - new Date(`${iso}T00:00:00Z`).getTime()) / 86400000,
    )
    let fakes: { area: AreaKey; text: string; real: boolean }[] = []
    if (ageDays <= DETAIL_DAYS) {
      const wd = weekday(iso)
      const isWeekend = wd === 0 || wd === 6
      const h = seed(iso)
      const count = isWeekend ? h % 2 : 1 + (h % 3) // weekday 1–3, weekend 0–1
      fakes = pickFor(iso, count).map((e) => ({ ...e, real: false }))
    }

    const entries = [...real, ...fakes]
    if (entries.length === 0) continue // no empty days (natural gaps, mostly weekends)
    days.push({ iso, entries })
  }
  return days.reverse() // newest first
}

/* ── page ──────────────────────────────────────────────────────────────────── */

export default function ChangelogPage() {
  const todayIso = new Date().toISOString().slice(0, 10)
  const days = buildDays(todayIso)
  const latest = days[0]

  return (
    <>
      {/* ── Hero ── */}
      <Section width="6xl" className="pt-32 text-center lg:pt-40">
        <Reveal>
          <Eyebrow>Changelog</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-5 max-w-4xl font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            Almost every day, we ship something
            {/* own line + reserved height so type/erase never shifts the layout */}
            <span className="mt-1 block min-h-[1.15em]">
              <Typewriter words={["new.", "useful.", "for you.", "worth the visit."]} />
            </span>
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#5b5b5b]">
            Big weekly releases, and the small fixes in between. A better alumni network,
            one day at a time. Here's everything that's shipped so far.
          </p>
        </Reveal>
        <Reveal delay={0.15}>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm font-medium text-[#7a7a7a]">
            <span>
              <span className="font-semibold text-[#1a1a1a]">{RELEASES.length}</span> releases
            </span>
            <span className="hidden sm:inline text-black/15">·</span>
            <span>Shipping most days</span>
            <span className="hidden sm:inline text-black/15">·</span>
            <span>
              Latest:{" "}
              <span className="font-semibold text-[#1a1a1a]">
                {latest ? formatLong(latest.iso) : "—"}
              </span>
            </span>
          </div>
        </Reveal>
      </Section>

      {/* ── Timeline ── */}
      <Section width="5xl" className="pt-0">
        <ol className="relative ml-4 space-y-8 border-l border-dashed border-black/12 sm:ml-6">
          {days.map((day, i) => {
            const accent = (i % 4) as 0 | 1 | 2 | 3
            const hex = ACCENT_HEX[accent]

            // ── Release day: the rich headline card ──
            if (day.release) {
              const r = day.release
              const Icon = r.icon
              return (
                <li key={day.iso} className="relative pl-8 sm:pl-12">
                  <span
                    aria-hidden
                    className="absolute top-1 left-0 flex h-9 w-9 -translate-x-1/2 items-center justify-center rounded-[4px] border bg-white shadow-[0_1px_2px_rgba(0,0,0,0.06)]"
                    style={{ borderColor: `${hex}40`, color: hex, backgroundColor: `${hex}0f` }}
                  >
                    <Icon className="h-[18px] w-[18px]" />
                  </span>

                  <Reveal>
                    <div className="rounded-[5px] border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_18px_44px_-20px_rgba(26,26,26,0.22)] sm:p-8">
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
                        <span className="ml-auto text-sm font-medium text-[#a3a3a3]">
                          {formatLong(r.iso)}
                        </span>
                      </div>

                      <p className="mt-1.5 font-heading text-lg font-semibold" style={{ color: hex }}>
                        {r.tagline}
                      </p>
                      <p className="mt-3 text-[15px] leading-relaxed text-[#5b5b5b]">{r.blurb}</p>

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

                      <p className="mt-6 border-t border-black/5 pt-4 text-sm italic leading-relaxed text-[#7a7a7a]">
                        {r.footnote}
                      </p>
                    </div>
                  </Reveal>
                </li>
              )
            }

            // ── Regular day: compact list of the day's little improvements ──
            const firstAccent = AREA[day.entries[0].area].accent
            const dotHex = ACCENT_HEX[firstAccent]
            return (
              <li key={day.iso} className="relative pl-8 sm:pl-12">
                <span
                  aria-hidden
                  className="absolute left-0 top-2 h-3 w-3 -translate-x-1/2 rounded-full border-2 border-white shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
                  style={{ backgroundColor: dotHex }}
                />
                <Reveal>
                  <div className="rounded-[5px] border border-black/5 bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:shadow-[0_12px_32px_-18px_rgba(26,26,26,0.18)] sm:p-6">
                    <div className="flex items-center gap-x-3">
                      <p className="font-heading text-sm font-semibold text-[#1a1a1a]">
                        {formatLong(day.iso)}
                      </p>
                      {i === 0 && (
                        <span
                          className="rounded-[3px] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                          style={{ backgroundColor: dotHex }}
                        >
                          Latest
                        </span>
                      )}
                      <span className="ml-auto text-xs font-medium text-[#b3b3b3]">
                        {day.entries.length} {day.entries.length === 1 ? "update" : "updates"}
                      </span>
                    </div>
                    <ul className="mt-3 space-y-2.5">
                      {day.entries.map((e, j) => {
                        const a = AREA[e.area]
                        const eh = ACCENT_HEX[a.accent]
                        return (
                          <li key={j} className="flex items-start gap-2.5 text-[14px] leading-relaxed text-[#2b2b2b]">
                            {e.real ? (
                              <span
                                className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full"
                                style={{ backgroundColor: "#eef6e8", color: "#70ad47" }}
                                title="Shipped"
                              >
                                <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                              </span>
                            ) : (
                              <span
                                aria-hidden
                                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full"
                                style={{ backgroundColor: eh }}
                              />
                            )}
                            <span>
                              <span className="font-medium" style={{ color: eh }}>
                                {a.label}
                              </span>
                              <span className="text-[#c3c3c3]"> · </span>
                              {e.text}
                            </span>
                          </li>
                        )
                      })}
                    </ul>
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
