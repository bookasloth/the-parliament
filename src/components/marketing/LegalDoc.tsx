import { Section, Eyebrow } from "@/components/marketing/primitives"

export interface LegalBlock {
  heading: string
  /** Paragraph strings, or a { list: string[] } for bullet points. */
  body: (string | { list: string[] })[]
}

/** Editorial long-form layout for Privacy / Terms. max-w reading width. */
export function LegalDoc({
  eyebrow,
  title,
  updated,
  intro,
  blocks,
}: {
  eyebrow: string
  title: string
  updated: string
  intro: string
  blocks: LegalBlock[]
}) {
  return (
    <Section width="2xl" className="pt-32 lg:pt-40">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h1 className="mt-5 font-heading text-4xl font-semibold tracking-[-0.03em] text-[#1a1a1a] sm:text-5xl">
        {title}
      </h1>
      <p className="mt-4 text-sm text-[#a3a3a3]">Last updated {updated}</p>
      <p className="mt-6 text-lg leading-relaxed text-[#5b5b5b]">{intro}</p>

      <div className="mt-12 space-y-10">
        {blocks.map((b) => (
          <section key={b.heading}>
            <h2 className="font-heading text-xl font-semibold text-[#1a1a1a]">{b.heading}</h2>
            <div className="mt-3 space-y-3">
              {b.body.map((item, i) =>
                typeof item === "string" ? (
                  <p key={i} className="text-[15px] leading-relaxed text-[#4a4a4a]">
                    {item}
                  </p>
                ) : (
                  <ul key={i} className="space-y-2 pl-1">
                    {item.list.map((li) => (
                      <li key={li} className="flex gap-2.5 text-[15px] leading-relaxed text-[#4a4a4a]">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                        {li}
                      </li>
                    ))}
                  </ul>
                ),
              )}
            </div>
          </section>
        ))}
      </div>
    </Section>
  )
}
