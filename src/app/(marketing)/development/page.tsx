import type { Metadata } from "next"
import {
  Boxes,
  Database,
  ShieldCheck,
  CreditCard,
  Mail,
  Cloud,
  Video,
  Zap,
  Server,
  Globe,
  Code2,
  HeartHandshake,
  ExternalLink,
  Check,
  type LucideIcon,
} from "lucide-react"
import Link from "next/link"
import {
  Section,
  SectionHeading,
  Eyebrow,
  Reveal,
  CtaBand,
  CountUp,
  ACCENT_HEX,
  ACCENT_TEXT,
} from "@/components/marketing/primitives"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import { defaultHomepageContent } from "@/lib/homepage-data"
import { SponsorSection, SupportBox } from "./sponsor-section"
import { getWallContributions, getPaidTotalPaiseSafe } from "@/modules/contributions/service"

export const metadata: Metadata = {
  title: "Development — built in the open, funded by alumni",
  description:
    "Every rupee it costs to run NNAWCA, every rupee alumni have chipped in, the tech we build on, and the people who keep the lights on. Full transparency.",
}

// Reads approved contributions at request time; force-dynamic avoids a build-time DB hit.
export const dynamic = "force-dynamic"

/* ────────────────────────────────────────────────────────────────────────────
 * ponytail: THIS BLOCK IS THE ONLY THING TO EDIT. No DB, no admin — costs and
 * backers change a few times a year, so they live here as plain data. Update the
 * numbers/names below and the whole page (totals, %, counts) recomputes itself.
 * All money is INR / year.
 * ──────────────────────────────────────────────────────────────────────────── */

const RAISED = 28_500 // total contributed by alumni so far, this cycle

// What it actually costs to keep NNAWCA running for a year.
interface Cost {
  item: string
  detail: string
  amount: number // 0 = currently free / absorbed
  icon: LucideIcon
  accent: 0 | 1 | 2 | 3
}
const COSTS: Cost[] = [
  { item: "Database & storage", detail: "Supabase — Postgres, auth, backups", amount: 24_000, icon: Database, accent: 0 },
  { item: "Video calling", detail: "LiveKit — alumni calls & rooms", amount: 12_000, icon: Video, accent: 1 },
  { item: "File storage", detail: "Cloudflare R2 — photos, media, invoices", amount: 6_000, icon: Cloud, accent: 3 },
  { item: "Email delivery", detail: "Hostinger SMTP — invites, receipts, alerts", amount: 3_600, icon: Mail, accent: 2 },
  { item: "Domain & DNS", detail: "nnawca.org, renewals", amount: 1_500, icon: Globe, accent: 0 },
  { item: "Web hosting", detail: "Vercel — currently on the free tier", amount: 0, icon: Server, accent: 3 },
]

// The stack we build on. Grouped for credibility, not marketing.
const STACK: { group: string; items: { name: string; icon: LucideIcon; accent: 0 | 1 | 2 | 3 }[] }[] = [
  {
    group: "Application",
    items: [
      { name: "Next.js 16", icon: Boxes, accent: 0 },
      { name: "TypeScript", icon: Code2, accent: 0 },
      { name: "Tailwind CSS", icon: Code2, accent: 3 },
    ],
  },
  {
    group: "Data & auth",
    items: [
      { name: "PostgreSQL", icon: Database, accent: 0 },
      { name: "Prisma ORM", icon: Database, accent: 1 },
      { name: "Auth.js", icon: ShieldCheck, accent: 3 },
      { name: "Upstash Redis", icon: Zap, accent: 1 },
    ],
  },
  {
    group: "Infrastructure",
    items: [
      { name: "Vercel", icon: Server, accent: 0 },
      { name: "Supabase", icon: Database, accent: 3 },
      { name: "Cloudflare R2", icon: Cloud, accent: 2 },
      { name: "LiveKit", icon: Video, accent: 1 },
    ],
  },
  {
    group: "Services",
    items: [
      { name: "Razorpay", icon: CreditCard, accent: 0 },
      { name: "Nodemailer", icon: Mail, accent: 2 },
      { name: "Vercel Cron", icon: Zap, accent: 3 },
    ],
  },
]

// Platinum sponsors — companies. Add a paid company here once payment clears
// (its name rides in the Razorpay order notes). `logo` optional; falls back to
// the name. Silver/Gold minimums are enforced in src/config/sponsor.ts.
const COMPANIES: { name: string; note?: string; url?: string; logo?: string }[] = [
  // { name: "Acme Corp", note: "Platinum sponsor", url: "https://acme.example", logo: "https://…/logo.png" },
]

// Alumni backers shown as profile cards. ponytail: placeholder curated list
// reusing homepage sample alumni — swap in real backers and point profileHref at
// their real /username. "View profile" is the only action (community-page style).
const PEOPLE = defaultHomepageContent.featuredAlumni.slice(0, 4)

/* ──────────────────────────────────────────────────────────────────────────── */

const TOTAL = COSTS.reduce((s, c) => s + c.amount, 0)

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`

export default async function DevelopmentPage() {
  // Live figures: baseline seed + real paid contributions, plus approved wall entries.
  const [wall, extraPaise] = await Promise.all([getWallContributions(), getPaidTotalPaiseSafe()])
  const raised = RAISED + Math.round(extraPaise / 100)
  const PCT = TOTAL > 0 ? Math.min(100, Math.round((raised / TOTAL) * 100)) : 0
  const GAP = Math.max(0, TOTAL - raised)

  // Company logos = curated baseline + approved company contributions.
  const companiesAll = [
    ...COMPANIES,
    ...wall.companies.map((c) => ({ name: c.name, url: c.websiteUrl ?? undefined, logo: c.logoUrl ?? undefined, note: undefined as string | undefined })),
  ]
  const BACKERS = companiesAll.length + PEOPLE.length + wall.people.length

  return (
    <>
      {/* ── Hero ── */}
      <Section width="6xl" className="pt-32 text-center lg:pt-40">
        <Reveal>
          <Eyebrow>Development</Eyebrow>
        </Reveal>
        <Reveal delay={0.05}>
          <h1 className="mx-auto mt-5 max-w-4xl font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-6xl lg:leading-[1.05]">
            Built in the open, kept alive by alumni.
          </h1>
        </Reveal>
        <Reveal delay={0.1}>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-[#5b5b5b]">
            No investors. No ads. Just a small volunteer team and the people who
            went to JNV Nagpur. Here's exactly what it costs to run this, what
            we've raised, and who keeps the lights on.
          </p>
        </Reveal>
        {/* headline stats */}
        <Reveal delay={0.15}>
          <div className="mx-auto mt-12 grid max-w-3xl grid-cols-2 gap-px overflow-hidden rounded-[6px] border border-black/8 bg-black/8 sm:grid-cols-4">
            {[
              { n: <CountUp to={TOTAL} prefix="₹" />, l: "Runs on / year" },
              { n: <CountUp to={raised} prefix="₹" />, l: "Raised so far" },
              { n: <CountUp to={PCT} suffix="%" />, l: "Of costs covered" },
              { n: <CountUp to={BACKERS} />, l: "Backers" },
            ].map((s, i) => (
              <div key={i} className="bg-white px-4 py-6">
                <p className={`font-heading text-2xl font-semibold sm:text-3xl ${ACCENT_TEXT[i % 4]}`}>
                  {s.n}
                </p>
                <p className="mt-1.5 text-xs font-medium uppercase tracking-wide text-[#8a8a8a]">
                  {s.l}
                </p>
              </div>
            ))}
          </div>
        </Reveal>
      </Section>

      {/* ── Funding progress ── */}
      <Section width="5xl" dark className="rounded-t-[5px]">
        <SectionHeading
          center
          dark
          accent={2}
          eyebrow="This year"
          title={
            <>
              {PCT}% funded.{" "}
              <span className="text-white/50">{inr(GAP)} to go.</span>
            </>
          }
          sub="When alumni cover the running costs, every rupee of membership and donations goes straight to scholarships and students — not servers."
        />
        <Reveal delay={0.15}>
          <div className="mx-auto mt-12 max-w-2xl">
            <div className="h-4 w-full overflow-hidden rounded-full bg-white/12">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand to-[#70ad47]"
                style={{ ["--pct" as string]: `${PCT}%`, width: `${PCT}%`, animation: "sponsor-fill 1.4s cubic-bezier(0.22,1,0.36,1) both" }}
              />
            </div>
            <div className="mt-3 flex justify-between text-sm font-medium text-white/70">
              <span>{inr(raised)} raised</span>
              <span>{inr(TOTAL)} needed</span>
            </div>
          </div>
        </Reveal>
        <SupportBox />
      </Section>

      {/* ── The bill ── */}
      <Section width="5xl">
        <SectionHeading
          eyebrow="The bill"
          title="Where the money goes."
          sub="Nothing hidden. This is the full list of what we pay for to keep NNAWCA online, every year."
        />
        <div className="mt-12 overflow-hidden rounded-[6px] border border-black/8 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {COSTS.map((c) => {
            const Icon = c.icon
            const hex = ACCENT_HEX[c.accent]
            return (
              <div
                key={c.item}
                className="flex items-center gap-4 border-b border-black/5 px-5 py-4 last:border-b-0 sm:px-7"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px]"
                  style={{ backgroundColor: `${hex}14`, color: hex }}
                >
                  <Icon className="h-5 w-5" strokeWidth={1.75} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-heading text-[15px] font-semibold text-[#1a1a1a]">{c.item}</p>
                  <p className="truncate text-sm text-[#8a8a8a]">{c.detail}</p>
                </div>
                <p className="shrink-0 font-heading text-[15px] font-semibold text-[#1a1a1a]">
                  {c.amount === 0 ? (
                    <span className="text-[#70ad47]">Free</span>
                  ) : (
                    <>
                      {inr(c.amount)}
                      <span className="text-xs font-normal text-[#a3a3a3]">/yr</span>
                    </>
                  )}
                </p>
              </div>
            )
          })}
          <div className="flex items-center justify-between bg-[#1a1a1a] px-5 py-5 sm:px-7">
            <p className="font-heading text-base font-semibold text-white">Total to keep running</p>
            <p className="font-heading text-xl font-semibold text-white">
              {inr(TOTAL)}
              <span className="text-sm font-normal text-white/50">/yr</span>
            </p>
          </div>
        </div>
      </Section>

      {/* ── Tech stack ── */}
      <Section width="6xl" className="bg-[#f4f1ea]">
        <SectionHeading
          center
          accent={0}
          eyebrow="Under the hood"
          title="The stack that runs it."
          sub="Modern, boring-on-purpose, and built to last. This is what your contribution keeps online."
        />
        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {STACK.map((g) => (
            <Reveal key={g.group}>
              <div className="h-full rounded-[6px] border border-black/6 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">
                  {g.group}
                </p>
                <ul className="mt-4 space-y-3">
                  {g.items.map((it) => {
                    const Icon = it.icon
                    const hex = ACCENT_HEX[it.accent]
                    return (
                      <li key={it.name} className="flex items-center gap-3 text-[15px] text-[#2b2b2b]">
                        <span
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-[5px]"
                          style={{ backgroundColor: `${hex}14`, color: hex }}
                        >
                          <Icon className="h-4 w-4" strokeWidth={1.75} />
                        </span>
                        {it.name}
                      </li>
                    )
                  })}
                </ul>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      {/* ── Platinum sponsors (companies) ── */}
      {companiesAll.length > 0 && (
        <Section width="6xl">
          <SectionHeading
            center
            accent={0}
            eyebrow="Platinum sponsors"
            title="Companies that back us."
            sub="These businesses cover real chunks of the bill above. Their logos ride along everywhere the platform goes."
          />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {companiesAll.map((c) => {
              const inner = (
                <>
                  {c.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={c.logo} alt={c.name} className="h-12 max-w-[70%] object-contain" />
                  ) : (
                    <p className="font-heading text-lg font-semibold text-[#1a1a1a]">{c.name}</p>
                  )}
                  {c.note && <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-brand">{c.note}</p>}
                </>
              )
              const cls =
                "flex h-32 flex-col items-center justify-center rounded-[6px] border border-black/8 bg-white px-6 text-center shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition hover:-translate-y-1 hover:shadow-[0_18px_44px_-20px_rgba(26,26,26,0.22)]"
              return (
                <Reveal key={c.name}>
                  {c.url ? (
                    <a href={c.url} target="_blank" rel="noopener noreferrer" className={cls}>
                      {inner}
                    </a>
                  ) : (
                    <div className={cls}>{inner}</div>
                  )}
                </Reveal>
              )
            })}
          </div>
        </Section>
      )}

      {/* ── People (alumni backers) ── */}
      <Section width="6xl" className={companiesAll.length > 0 ? "pt-0" : undefined}>
        <SectionHeading
          center
          accent={3}
          eyebrow="Who keeps the lights on"
          title="The people behind the bill."
          sub="Every name here paid for a slice of the servers above so the rest of us could use them for free. Thank you."
        />
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {PEOPLE.map((a, i) => (
            <Reveal key={a.id} delay={(i % 4) * 0.07}>
              <AlumniProfileCard
                alumni={a}
                profileHref="/community"
                hideMembership
                actions={
                  <Link
                    href="/community"
                    className="w-full rounded-[4px] border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-700 transition-colors duration-300 hover:bg-gray-50"
                  >
                    View profile
                  </Link>
                }
              />
            </Reveal>
          ))}
        </div>

        {/* Community supporters — approved individual contributors from the DB */}
        {wall.people.length > 0 && (
          <div className="mx-auto mt-12 max-w-4xl">
            <p className="text-center text-xs font-semibold uppercase tracking-[0.16em] text-[#9a9a9a]">
              Community supporters
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2.5">
              {wall.people.map((p) => {
                const chip = (
                  <>
                    <Check className="h-3.5 w-3.5 text-[#70ad47]" strokeWidth={3} />
                    {p.name}
                    {p.websiteUrl && <ExternalLink className="h-3 w-3 opacity-50" />}
                  </>
                )
                const cls =
                  "inline-flex items-center gap-1.5 rounded-full border border-black/8 bg-white px-4 py-2 text-sm font-medium text-[#2b2b2b] shadow-[0_1px_2px_rgba(0,0,0,0.03)] transition hover:border-black/20"
                return p.websiteUrl ? (
                  <a key={p.id} href={p.websiteUrl} target="_blank" rel="noopener noreferrer" className={cls}>{chip}</a>
                ) : (
                  <span key={p.id} className={cls}>{chip}</span>
                )
              })}
            </div>
          </div>
        )}
      </Section>

      {/* ── Become a sponsor (tiers + pay modal) ── */}
      <Section width="7xl" className="bg-[#f4f1ea]">
        <SectionHeading
          center
          accent={2}
          eyebrow="Add your name"
          title="Put your name on the wall."
          sub="Silver from ₹100, Gold from ₹500, or Platinum for companies. Pay in seconds — UPI, card or netbanking."
        />
        <SponsorSection />
      </Section>

      {/* ── CTA ── */}
      <CtaBand
        title="Fund the next release."
        sub={`We're ${PCT}% of the way to covering this year. ${inr(GAP)} keeps every feature above online for the whole network.`}
        primary={{ label: "Chip in", href: "/donate" }}
        secondary={{ label: "See the code", href: "/changelog" }}
      />
    </>
  )
}
