"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { AnimatePresence, motion, useReducedMotion } from "framer-motion"

// Brand hero — cycles what the network is *for*. Each word maps to a JNV house
// colour (contrast-safe on white; yellow udaigiri swapped for orange indira) and
// a matching product panel. Images are online placeholders — swap the `img`
// URLs for real product/community screenshots later. An accent gradient sits
// under each image so a dead URL still renders on-brand instead of grey.
export const WORDS = [
  {
    key: "reconnect",
    label: "reconnect",
    accent: "#5a9bd5", // house aravali
    img: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=1200&q=80",
    caption: "Find batchmates by batch, house, city or company.",
  },
  {
    key: "mentor",
    label: "mentor",
    accent: "#70ad47", // house nilgiri
    img: "https://images.unsplash.com/photo-1543269865-cbf427effbad?auto=format&fit=crop&w=1200&q=80",
    caption: "Guide juniors — or find a senior who's been there.",
  },
  {
    key: "grow",
    label: "grow",
    accent: "#e8503a", // house shiwalik
    img: "https://images.unsplash.com/photo-1521737604893-d14cc237f11d?auto=format&fit=crop&w=1200&q=80",
    caption: "Jobs, referrals and collaborations, alumni-to-alumni.",
  },
  {
    key: "give-back",
    label: "give back",
    accent: "#c9a227", // turmeric-lime-gold (was house indira #ff9933)
    img: "https://images.unsplash.com/photo-1593113646773-028c64a8f1b8?auto=format&fit=crop&w=1200&q=80",
    caption: "Fund scholarships and lift the batch that follows.",
  },
] as const

// One headline sentence:
// "We are here to <reconnect>, <mentor>, <grow> and <give back> together."
// LEAD opens it; SEPS[i] trails word i and is glued to it (no orphan comma on
// wrap); TAIL closes and may wrap on its own.
export const LEAD = "We are here to "
export const GLUE = [",", ",", "", ""] as const // glued to word (inside nowrap)
export const SEPS = [" ", " ", " and ", " together."] as const // breakable

// Grey the active word takes (words are coloured by house accent when idle).
const ACTIVE_GREY = "#8a8a8a"

export const CYCLE_MS = 2000

// Pure wraparound advance — tested in WordCyclerHero.test.ts.
export function nextIndex(i: number, len: number): number {
  return (i + 1) % len
}

export function WordCyclerHero() {
  const reduceMotion = useReducedMotion()
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)
  const tabsRef = useRef<(HTMLButtonElement | null)[]>([])

  // Auto-cycle. Pauses on user click or when reduced-motion is requested.
  useEffect(() => {
    if (paused || reduceMotion) return
    const id = setInterval(
      () => setActive((i) => nextIndex(i, WORDS.length)),
      CYCLE_MS,
    )
    return () => clearInterval(id)
  }, [paused, reduceMotion])

  const pickWord = (i: number) => {
    setActive(i)
    setPaused(true) // any manual pick stops the auto-loop
  }

  // Roving arrow-key nav across the tablist.
  const onKey = (e: React.KeyboardEvent, i: number) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return
    e.preventDefault()
    const dir = e.key === "ArrowRight" ? 1 : -1
    const to = (i + dir + WORDS.length) % WORDS.length
    pickWord(to)
    tabsRef.current[to]?.focus()
  }

  const word = WORDS[active]

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14">
      {/* LEFT — headline word-cycler */}
      <div>
        <motion.span
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
          className="inline-flex items-center gap-2 rounded-[3px] border border-black/10 bg-brand-50 px-3.5 py-1.5 text-xs font-semibold text-brand"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />
          The JNV Nagpur alumni network
        </motion.span>

        {/* One sentence — each word is a tab, coloured by its house accent and
            greyed while active, with a progress underline that fills over the
            cycle. Word + its trailing comma are glued (whitespace-nowrap) so the
            comma never orphans to the next line. */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          role="tablist"
          aria-label="What we are here to do"
          className="mt-5 font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] text-balance sm:text-5xl lg:text-[3.5rem] lg:leading-[1.08]"
        >
          {LEAD}
          {WORDS.map((w, i) => {
            const on = i === active
            return (
              <span key={w.key}>
                <span className="whitespace-nowrap">
                <button
                  ref={(el) => {
                    tabsRef.current[i] = el
                  }}
                  role="tab"
                  aria-selected={on}
                  tabIndex={on ? 0 : -1}
                  onClick={() => pickWord(i)}
                  onKeyDown={(e) => onKey(e, i)}
                  className="relative inline-block cursor-pointer capitalize transition-colors duration-300"
                  style={{ color: on ? ACTIVE_GREY : w.accent }}
                >
                  {w.label}
                  <motion.span
                    key={`${w.key}-${on}-${paused}`}
                    initial={{ scaleX: on && !(reduceMotion || paused) ? 0 : on ? 1 : 0 }}
                    animate={{ scaleX: on ? 1 : 0 }}
                    transition={
                      on && !(reduceMotion || paused)
                        ? { duration: CYCLE_MS / 1000, ease: "linear" }
                        : { duration: reduceMotion ? 0 : 0.3 }
                    }
                    className="absolute inset-x-0 -bottom-0.5 h-[3px] origin-left rounded-full"
                    style={{ backgroundColor: ACTIVE_GREY }}
                  />
                </button>
                {GLUE[i]}
                </span>
                {SEPS[i]}
              </span>
            )
          })}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="mt-6 max-w-xl text-lg leading-relaxed text-[#5b5b5b]"
        >
          Find your batchmates, grow your network, discover opportunities, and
          give back — all in one place.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="mt-8 flex flex-wrap gap-3"
        >
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-[3px] bg-brand px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Join the community <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/community"
            className="rounded-[3px] border border-black/10 bg-white px-7 py-3.5 text-sm font-semibold text-[#1a1a1a] transition hover:border-black/20"
          >
            Explore directory
          </Link>
        </motion.div>
      </div>

      {/* RIGHT — image panel, crossfades + subtle zoom with the active word */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
        className="relative hidden lg:block"
      >
        <div
          className="relative aspect-[4/3] overflow-hidden rounded-[5px] border shadow-[0_30px_80px_-30px_rgba(26,26,26,0.3)]"
          style={{ borderColor: `${word.accent}33` }}
        >
          <AnimatePresence initial={false}>
            <motion.div
              key={word.key}
              initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 1.06 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 1.06 }}
              transition={{ duration: reduceMotion ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 bg-cover bg-center"
              style={{
                // Gradient fallback shows on-brand if the online image 404s.
                backgroundImage: `linear-gradient(135deg, ${word.accent}22, ${word.accent}0a), url(${word.img})`,
              }}
            />
          </AnimatePresence>

          {/* Caption chip, bottom-left */}
          <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/55 to-transparent p-5">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={word.key}
                initial={reduceMotion ? false : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
                transition={{ duration: 0.35 }}
                className="text-sm font-medium text-white"
              >
                {word.caption}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
