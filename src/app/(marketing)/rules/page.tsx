import type { Metadata } from "next"
import { ShieldCheck, Check, X, AlertTriangle, Ban, Scale } from "lucide-react"
import { Section, Eyebrow, Reveal, CtaBand } from "@/components/marketing/primitives"

export const metadata: Metadata = {
  title: "Rules & Guidelines — NNAWCA",
  description:
    "Community Rules & Guidelines for the NNAWCA platform, plus the Rules & Regulations of the Nagpur Navodaya Alumni Welfare and Charitable Association.",
}

type Block =
  | { kind: "list"; heading: string; note?: string; items: string[] }
  | { kind: "allow"; heading: string; note?: string; allowed: string[]; notAllowed: string[] }
  | { kind: "danger"; heading: string; note?: string; items: string[] }

const BLOCKS: Block[] = [
  {
    kind: "list",
    heading: "Platform-Wide Principles (Read This First)",
    items: [
      "This is not a public social network.",
      "This is a closed alumni & student community.",
      "Identity, dignity, and contribution matter more than virality.",
      "Moderation exists to protect culture, not control opinions.",
    ],
  },
  {
    kind: "list",
    heading: "Identity & Eligibility Rules",
    items: [
      "Only verified Navodayans (students, alumni, teachers) may use the platform.",
      "Impersonation, fake profiles, or misrepresentation will lead to permanent removal.",
      "One person = one account.",
      "Sharing accounts is not allowed.",
    ],
  },
  {
    kind: "allow",
    heading: "Relevance Rule (Stay on Purpose)",
    note: "Contextual mentions are fine. Agenda-pushing is not.",
    allowed: [
      "Alumni life",
      "Student support",
      "Career guidance",
      "School memories",
      "Mentorship",
      "Events, welfare, and service",
      "Intellectual games and discussions",
    ],
    notAllowed: [
      "Irrelevant politics or religious debates",
      "National or ideological propaganda",
      "Content unrelated to Navodaya, education, or alumni life",
    ],
  },
  {
    kind: "danger",
    heading: "Respect & Conduct (Zero Tolerance Zone)",
    note: "Criticism is allowed. Disrespect is not. Severe violations may result in immediate permanent bans.",
    items: [
      "Personal attacks or name-calling",
      "Harassment or intimidation",
      "Racism, casteism, regional hate",
      "Sexism or gender-based insults",
      "Homophobia or slurs of any kind",
      "Mocking someone's background, English, salary, or profession",
      "Sharing private information without consent",
    ],
  },
  {
    kind: "list",
    heading: "No Toxic Fan or Batch Behavior",
    note: "Healthy pride is encouraged. Batch & house games exist for fun and bonding, not hostility.",
    items: [
      "No batch-shaming",
      "No house-bashing",
      'No "my batch is superior" narratives',
      "No targeting of specific groups or years",
    ],
  },
  {
    kind: "list",
    heading: "No Spam, Self-Promotion, or Marketing Abuse",
    note: "Contribution first. Promotion later.",
    items: [
      "No unsolicited promotion of businesses, services, or products",
      "No affiliate links, referral farming, or external funneling",
      "Alumni businesses may post only in designated sections",
      "Repeated self-promotion will be treated as spam",
    ],
  },
  {
    kind: "list",
    heading: "Content Quality Rules (Signal Over Noise)",
    note: "Quality over quantity is expected.",
    items: [
      'No low-effort posts ("Agree?", "Thoughts?" without substance)',
      "No reposting the same content across multiple groups",
      "No clickbait titles or misleading headlines",
      "No excessive emojis or all-caps shouting",
      "No copy-paste forwards without context",
    ],
  },
  {
    kind: "list",
    heading: "Language & Accessibility",
    note: "We value inclusion without excluding understanding.",
    items: [
      "Posts may be in any Indian language or English",
      "If posting in a regional language, add a short English summary",
      "Images, videos, memes, gifs, or screenshots must include context",
    ],
  },
  {
    kind: "list",
    heading: "Games, Polls & Engagement Rules",
    note: "Games exist for mental engagement, not farming points.",
    items: [
      "Only platform-approved games are allowed",
      "No daily voting games created by users",
      "No manipulation of scores, streaks, or leaderboards",
      "Exploits, cheating, or automation will result in bans",
    ],
  },
  {
    kind: "danger",
    heading: "Student Safety Rules (Very Important)",
    note: "Any violation here is treated as serious misconduct.",
    items: [
      "Students (Classes 6–12) are protected users",
      "No unsolicited DMs to students",
      "Mentorship must happen through approved channels",
      "No inappropriate advice, pressure, or personal contact",
    ],
  },
  {
    kind: "list",
    heading: "Moderation & Enforcement",
    note: "Arguing publicly with moderators is discouraged. Use official support or moderation channels.",
    items: [
      "Moderators are alumni volunteers",
      "Decisions are based on intent, impact, and pattern",
      "Not every violation leads to a ban; warnings may apply",
      "Repeated or severe violations escalate quickly",
    ],
  },
  {
    kind: "list",
    heading: "Reporting & Appeals",
    items: [
      "Report content that violates rules instead of engaging",
      "False or abusive reporting may lead to penalties",
      "Appeals can be submitted respectfully",
      "Moderation decisions may be reviewed but not publicly debated",
    ],
  },
  {
    kind: "danger",
    heading: "Zero-Tolerance Violations (Instant Action)",
    note: "The following may result in immediate permanent removal:",
    items: [
      "Racism, caste hate, or violent speech",
      "Sexual harassment",
      "Threats or doxxing",
      "Student safety violations",
      "Coordinated harassment or trolling",
    ],
  },
]

// Association bylaws — the formal Rules & Regulations.
const BYLAWS: { heading: string; body: string }[] = [
  { heading: "1. Membership", body: "Membership is open to alumni, students and staff of JNV Nagpur. Tiers are Student, Associate, Premium and Life, with a Committee tier by invitation. Members must use their real legal identity; pseudonyms are not permitted. The committee may admit, suspend or remove members per these rules." },
  { heading: "2. The Executive Committee", body: "An eleven-member Executive Committee, elected by the membership, holds the association's mandate. Office-bearers include the President, Vice President, Secretaries and Treasurers, guided by an Advisory Committee of past office-bearers." },
  { heading: "3. Elections & tenure", body: "Committee members are elected for a defined tenure through a member vote overseen by the Election process. Casual vacancies are filled for the remainder of the term in accordance with the Memorandum." },
  { heading: "4. Meetings", body: "The association holds an Annual General Meeting open to all members, alongside regular committee meetings. Notice periods, quorum and voting procedures follow the registered rules." },
  { heading: "5. Finances", body: "Funds are held in the association's name and applied only to its stated objects. Accounts are maintained transparently, audited as required, and presented to members. Donations are directed to their designated causes." },
  { heading: "6. Duties & conduct", body: "Members and office-bearers act in the association's interest, uphold its charitable character, and avoid conflicts of interest. Conduct that harms the community or the school may attract action under these rules." },
  { heading: "7. Amendments", body: "The Memorandum and these Rules may be amended only by the process they prescribe, with member approval, and in accordance with applicable law." },
]

export default function RulesPage() {
  return (
    <>
      <Section width="5xl" className="pt-32 lg:pt-40">
        <Reveal>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <ShieldCheck className="h-6 w-6" />
          </div>
        </Reveal>
        <Reveal delay={0.05}>
          <Eyebrow className="mt-6">Community</Eyebrow>
        </Reveal>
        <Reveal delay={0.08}>
          <h1 className="mt-4 font-heading text-4xl font-semibold tracking-[-0.03em] text-[#1a1a1a] sm:text-5xl">
            Rules &amp; Guidelines
          </h1>
        </Reveal>
        <Reveal delay={0.12}>
          <p className="mt-5 text-lg leading-relaxed text-[#5b5b5b]">
            The rules and expectations for everyone using the NNAWCA platform.
          </p>
        </Reveal>
        <Reveal delay={0.16}>
          <div className="mt-6 rounded-2xl border border-brand/15 bg-brand/5 px-6 py-5">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand">Our goal is simple</p>
            <p className="mt-1 text-[15px] leading-relaxed text-[#1a1a1a]">
              Create a safe, respectful, high-signal space for Navodayans to connect, contribute, and grow.
            </p>
          </div>
        </Reveal>
      </Section>

      {/* Community rules & guidelines */}
      <Section width="5xl" className="pt-4">
        <div className="space-y-10">
          {BLOCKS.map((b, i) => (
            <Reveal key={b.heading} delay={(i % 3) * 0.05}>
              <section>
                <h2 className="font-heading text-xl font-semibold text-[#1a1a1a] sm:text-2xl">{b.heading}</h2>

                {b.kind === "allow" ? (
                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5">
                      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-emerald-700">
                        <Check className="h-4 w-4" /> Allowed
                      </p>
                      <ul className="space-y-2 text-[15px] text-[#3f3f3f]">
                        {b.allowed.map((t) => (
                          <li key={t} className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{t}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="rounded-2xl border border-rose-200 bg-rose-50/60 p-5">
                      <p className="mb-3 flex items-center gap-2 text-sm font-bold text-rose-700">
                        <X className="h-4 w-4" /> Not allowed
                      </p>
                      <ul className="space-y-2 text-[15px] text-[#3f3f3f]">
                        {b.notAllowed.map((t) => (
                          <li key={t} className="flex gap-2"><X className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />{t}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <ul className="mt-4 space-y-2.5 text-[15px] leading-relaxed text-[#3f3f3f]">
                    {b.items.map((t) => (
                      <li key={t} className="flex gap-2.5">
                        {b.kind === "danger" ? (
                          <Ban className="mt-0.5 h-4 w-4 shrink-0 text-rose-500" />
                        ) : (
                          <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        )}
                        {t}
                      </li>
                    ))}
                  </ul>
                )}

                {b.note && (
                  <p className={`mt-4 flex items-start gap-2 rounded-lg px-4 py-2.5 text-sm ${b.kind === "danger" ? "bg-rose-50 text-rose-700" : "bg-gray-50 text-[#5b5b5b]"}`}>
                    {b.kind === "danger" && <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />}
                    {b.note}
                  </p>
                )}
              </section>
            </Reveal>
          ))}

          {/* Final note */}
          <Reveal>
            <section className="rounded-3xl border border-black/5 bg-[#1a1a1a] p-8 text-white">
              <h2 className="font-heading text-xl font-semibold sm:text-2xl">Final Note</h2>
              <p className="mt-3 text-[15px] leading-relaxed text-white/80">
                NNAWCA is built on trust, shared roots, and responsibility. If something makes the platform:
              </p>
              <ul className="mt-4 space-y-2 text-[15px]">
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> Safer → allowed</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> More respectful → encouraged</li>
                <li className="flex gap-2"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" /> More useful → celebrated</li>
              </ul>
              <p className="mt-5 text-[15px] font-semibold">If not, it doesn't belong here.</p>
            </section>
          </Reveal>
        </div>
      </Section>

      {/* Association bylaws */}
      <Section width="5xl" className="pt-8">
        <Reveal>
          <div className="flex items-center gap-3 border-t border-black/10 pt-10">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#e8503a]/10 text-[#e8503a]">
              <Scale className="h-5 w-5" />
            </div>
            <div>
              <h2 className="font-heading text-xl font-semibold text-[#1a1a1a] sm:text-2xl">Rules &amp; Regulations of the Association</h2>
              <p className="text-sm text-[#8a8a8a]">How the association is run — this page summarises the Rules; the registered document prevails.</p>
            </div>
          </div>
        </Reveal>
        <div className="mt-6 space-y-4">
          {BYLAWS.map((s, i) => (
            <Reveal key={s.heading} delay={(i % 3) * 0.05}>
              <div className="rounded-2xl border border-black/5 bg-white p-6 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
                <h3 className="font-heading text-lg font-semibold text-[#1a1a1a]">{s.heading}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-[#4a4a4a]">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </Section>

      <CtaBand
        title="Questions about how we're run?"
        sub="The committee is happy to walk any member through our governance and accounts."
        primary={{ label: "Contact the committee", href: "/contact" }}
        secondary={{ label: "Read the Memorandum", href: "/moa" }}
      />
    </>
  )
}
