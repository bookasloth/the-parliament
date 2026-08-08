"use client"

import { useState, useEffect, useCallback } from "react"
import Image from "next/image"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { ArrowRight } from "lucide-react"

const WORDS = [
  {
    word: "connect",
    color: "#e8503a",       // red
    activeBg: "#e8503a",
    activeText: "#fff",
    image: "https://website-assets.shubhamdatarkar.com/nnawca/hero/connect.jpg",
  },
  {
    word: "celebrate",
    color: "#70ad47",       // green
    activeBg: "#70ad47",
    activeText: "#fff",
    image: "https://website-assets.shubhamdatarkar.com/nnawca/hero/celebrate.jpg",
  },
  {
    word: "build",
    color: "#009ae4",       // blue
    activeBg: "#009ae4",
    activeText: "#fff",
    image: "https://website-assets.shubhamdatarkar.com/nnawca/hero/build.jpg",
  },
  {
    word: "belong",
    color: "#d4a800",       // yellow
    activeBg: "#d4a800",
    activeText: "#000",
    image: "https://website-assets.shubhamdatarkar.com/nnawca/hero/belong.jpg",
  },
] as const

const CYCLE_MS = 3000

export function HeroCycler() {
  const [active, setActive] = useState(0)
  const [paused, setPaused] = useState(false)

  const advance = useCallback(() => {
    setActive((i) => (i + 1) % WORDS.length)
  }, [])

  useEffect(() => {
    if (paused) return
    const id = setInterval(advance, CYCLE_MS)
    return () => clearInterval(id)
  }, [paused, advance])

  function pick(i: number) {
    setActive(i)
    setPaused(true)
    // Resume auto-cycle after one full hold
    setTimeout(() => setPaused(false), CYCLE_MS)
  }

  const current = WORDS[active]

  return (
    <div className="grid items-center gap-10 lg:grid-cols-2 lg:gap-14">
      {/* Left — copy */}
      <div>
        <h1 className="font-heading text-4xl font-semibold tracking-[-0.035em] text-[#1a1a1a] sm:text-5xl lg:text-[3.25rem] lg:leading-[1.15]">
          For every Navodian who wants to{" "}
          {WORDS.map((w, i) => {
            const isActive = i === active
            const sep = i < WORDS.length - 1 ? ", " : "."
            return (
              <span key={w.word}>
                <button
                  onClick={() => pick(i)}
                  className="relative inline rounded-[4px] px-1.5 py-0.5 transition-all duration-300"
                  style={{
                    background: isActive ? w.activeBg : "transparent",
                    color: isActive ? w.activeText : w.color,
                  }}
                >
                  {w.word}
                  {isActive && !paused && (
                    <motion.span
                      key={`bar-${i}-${active}`}
                      className="absolute bottom-0 left-0 h-[3px] rounded-full"
                      style={{ background: w.color, opacity: 0.4 }}
                      initial={{ width: "0%" }}
                      animate={{ width: "100%" }}
                      transition={{ duration: CYCLE_MS / 1000, ease: "linear" }}
                    />
                  )}
                </button>
                <span className="text-[#ccc]">{sep}</span>
              </span>
            )
          })}
        </h1>

        <p className="mt-6 max-w-lg text-base leading-relaxed text-[#5b5b5b] sm:text-lg">
          The alumni network built by JNV Nagpur graduates, for JNV Nagpur
          graduates. Find your batch. Share your journey. Shape what comes next.
        </p>

        <div className="mt-8">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-[3px] bg-brand px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-brand-600"
          >
            Join the community <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {/* Right — cycling image */}
      <div className="relative hidden aspect-[4/3] overflow-hidden rounded-[8px] lg:block">
        <AnimatePresence mode="wait">
          <motion.div
            key={active}
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
          >
            <Image
              src={current.image}
              alt={current.word}
              fill
              className="object-cover"
              sizes="(min-width: 1024px) 50vw, 0px"
              priority={active === 0}
            />
            {/* Subtle colour tint overlay */}
            <div
              className="absolute inset-0"
              style={{ background: current.color, opacity: 0.08 }}
            />
          </motion.div>
        </AnimatePresence>

        {/* Dot indicators */}
        <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2">
          {WORDS.map((w, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              className="h-2 rounded-full transition-all duration-300"
              style={{
                width: i === active ? 24 : 8,
                background: i === active ? w.color : "rgba(255,255,255,0.5)",
              }}
              aria-label={w.word}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
