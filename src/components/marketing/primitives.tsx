"use client"

import { animate, motion, useInView } from "framer-motion"
import { useEffect, useRef, useState, type ReactNode } from "react"
import { cn } from "@/lib/utils"

/**
 * Marketing design kit — "calm editorial" (bookasloth-inspired) on Parliament tokens.
 * Warm-paper + ink base, brand-blue-led with Google-style red/green/yellow accents.
 * Reused across every corporate/marketing page. Keep visual decisions HERE, not per page.
 */

// Google-style accent deck, mapped to existing Parliament tokens.
// 0 blue (brand) · 1 red (shiwalik) · 2 yellow (gold-500, text-safe) · 3 green (nilgiri)
export const ACCENT_TEXT = [
  "text-brand",
  "text-[#e8503a]",
  "text-[#d4a800]",
  "text-[#70ad47]",
] as const
export const ACCENT_BG_SOFT = [
  "bg-brand-50",
  "bg-[#fdecea]",
  "bg-[#fff8e1]",
  "bg-[#eef6e8]",
] as const
export const ACCENT_HEX = ["#009ae4", "#e8503a", "#d4a800", "#70ad47"] as const

type Accent = 0 | 1 | 2 | 3

// ── Eyebrow ──────────────────────────────────────────────────────────────────
export function Eyebrow({
  children,
  accent = 0,
  className,
}: {
  children: ReactNode
  accent?: Accent
  className?: string
}) {
  return (
    <p
      className={cn(
        "text-[13px] font-semibold uppercase tracking-[0.2em]",
        ACCENT_TEXT[accent],
        className,
      )}
    >
      {children}
    </p>
  )
}

// ── Section band ───────────────────────────────────────────────────────────────
export function Section({
  children,
  id,
  dark = false,
  className,
  width = "6xl",
}: {
  children: ReactNode
  id?: string
  dark?: boolean
  className?: string
  width?: "5xl" | "6xl" | "7xl" | "2xl"
}) {
  const max = {
    "2xl": "max-w-2xl",
    "5xl": "max-w-5xl",
    "6xl": "max-w-6xl",
    "7xl": "max-w-7xl",
  }[width]
  return (
    <section
      id={id}
      className={cn(
        "px-6 py-20 lg:py-28",
        dark ? "bg-[#1a1a1a] text-[#f4f1ea]" : "text-[#1a1a1a]",
        className,
      )}
    >
      <div className={cn("mx-auto", max)}>{children}</div>
    </section>
  )
}

// ── Section heading ─────────────────────────────────────────────────────────────
export function SectionHeading({
  eyebrow,
  accent = 0,
  title,
  sub,
  center = false,
  dark = false,
  className,
}: {
  eyebrow?: string
  accent?: Accent
  title: ReactNode
  sub?: ReactNode
  center?: boolean
  dark?: boolean
  className?: string
}) {
  return (
    <div className={cn(center && "text-center mx-auto", "max-w-3xl", center && "mx-auto", className)}>
      {eyebrow && (
        <Reveal>
          <Eyebrow accent={accent} className="mb-4">
            {eyebrow}
          </Eyebrow>
        </Reveal>
      )}
      <Reveal delay={0.05}>
        <h2
          className={cn(
            "font-heading font-semibold tracking-[-0.03em] text-balance",
            "text-3xl sm:text-4xl lg:text-[2.75rem] lg:leading-[1.08]",
            dark ? "text-white" : "text-[#1a1a1a]",
          )}
        >
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={0.1}>
          <p
            className={cn(
              "mt-5 text-base sm:text-lg leading-relaxed",
              dark ? "text-white/70" : "text-[#5b5b5b]",
            )}
          >
            {sub}
          </p>
        </Reveal>
      )}
    </div>
  )
}

// ── Reveal (scroll fade-up) ─────────────────────────────────────────────────────
export function Reveal({
  children,
  delay = 0,
  y = 24,
  className,
}: {
  children: ReactNode
  delay?: number
  y?: number
  className?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  )
}

// Stagger helper: wrap a list, each child fades up in sequence.
export function RevealStagger({
  children,
  className,
  step = 0.08,
}: {
  children: ReactNode[]
  className?: string
  step?: number
}) {
  return (
    <div className={className}>
      {children.map((child, i) => (
        <Reveal key={i} delay={i * step}>
          {child}
        </Reveal>
      ))}
    </div>
  )
}

// ── CountUp odometer ────────────────────────────────────────────────────────────
export function CountUp({
  to,
  prefix = "",
  suffix = "",
  duration = 1.6,
  className,
}: {
  to: number
  prefix?: string
  suffix?: string
  duration?: number
  className?: string
}) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, margin: "-40px" })
  const [val, setVal] = useState(0)

  useEffect(() => {
    if (!inView) return
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate: (v) => setVal(v),
    })
    return () => controls.stop()
  }, [inView, to, duration])

  return (
    <span ref={ref} className={className}>
      {prefix}
      {Math.round(val).toLocaleString("en-IN")}
      {suffix}
    </span>
  )
}

// ── Glass / floating mockup card ────────────────────────────────────────────────
export function GlassCard({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-black/5 bg-white/80 p-4 backdrop-blur",
        "shadow-[0_1px_2px_rgba(0,0,0,0.04),0_24px_60px_-24px_rgba(26,26,26,0.28)]",
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── CTA band (dark, closes every page) ──────────────────────────────────────────
export function CtaBand({
  title,
  sub,
  primary,
  secondary,
}: {
  title: ReactNode
  sub?: ReactNode
  primary: { label: string; href: string }
  secondary?: { label: string; href: string }
}) {
  return (
    <Section dark className="text-center">
      <Reveal>
        <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-[-0.03em] text-white text-balance">
          {title}
        </h2>
      </Reveal>
      {sub && (
        <Reveal delay={0.05}>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-white/70">{sub}</p>
        </Reveal>
      )}
      <Reveal delay={0.1}>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
          <a
            href={primary.href}
            className="rounded-full bg-brand px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            {primary.label}
          </a>
          {secondary && (
            <a
              href={secondary.href}
              className="rounded-full border border-white/25 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              {secondary.label}
            </a>
          )}
        </div>
      </Reveal>
    </Section>
  )
}

// ── Typewriter (type → hold → erase → next word) ─────────────────────────────────
// Smooth per-character type/erase with a blinking caret. Each word takes the next
// Google accent colour. Respects prefers-reduced-motion (shows words statically).
export function Typewriter({
  words,
  typeMs = 75,
  eraseMs = 40,
  holdMs = 1400,
  className,
}: {
  words: string[]
  typeMs?: number
  eraseMs?: number
  holdMs?: number
  className?: string
}) {
  const [wordIdx, setWordIdx] = useState(0)
  const [text, setText] = useState("")
  const [phase, setPhase] = useState<"typing" | "holding" | "erasing">("typing")

  useEffect(() => {
    const word = words[wordIdx]
    let t: ReturnType<typeof setTimeout>

    if (phase === "typing") {
      if (text.length < word.length) {
        t = setTimeout(() => setText(word.slice(0, text.length + 1)), typeMs)
      } else {
        t = setTimeout(() => setPhase("holding"), holdMs)
      }
    } else if (phase === "holding") {
      t = setTimeout(() => setPhase("erasing"), holdMs)
    } else {
      if (text.length > 0) {
        t = setTimeout(() => setText(word.slice(0, text.length - 1)), eraseMs)
      } else {
        setWordIdx((i) => (i + 1) % words.length)
        setPhase("typing")
      }
    }
    return () => clearTimeout(t)
  }, [text, phase, wordIdx, words, typeMs, eraseMs, holdMs])

  return (
    <span className={cn("inline", ACCENT_TEXT[wordIdx % 4], className)}>
      {text}
      <motion.span
        aria-hidden
        animate={{ opacity: [1, 1, 0, 0] }}
        transition={{ duration: 1, repeat: Infinity, times: [0, 0.5, 0.5, 1] }}
        className="ml-0.5 inline-block w-[0.06em] self-stretch bg-current align-[-0.1em]"
        style={{ height: "0.95em" }}
      >
        {"​"}
      </motion.span>
    </span>
  )
}
