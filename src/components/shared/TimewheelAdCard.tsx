"use client"

import { useEffect, useState } from "react"
import { TIMEWHEEL_ADS, TIMEWHEEL_CTA_URL, ROTATION_MS } from "@/config/timewheel-ads"

function getAdIndex(): number {
  const hour = Math.floor(Date.now() / ROTATION_MS)
  return hour % TIMEWHEEL_ADS.length
}

export function TimewheelAdCard() {
  const [index, setIndex] = useState(getAdIndex)

  useEffect(() => {
    const id = setInterval(() => setIndex(getAdIndex()), 60_000)
    return () => clearInterval(id)
  }, [])

  const ad = TIMEWHEEL_ADS[index]

  return (
    <div className="overflow-hidden rounded-[5px] bg-[#0a0a0a] text-white">
      {/* Accent glow */}
      <div
        className="h-1.5"
        style={{ background: `linear-gradient(90deg, transparent, ${ad.accentColor}, transparent)` }}
      />

      <div className="px-5 pt-5 pb-4">
        <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-gray-500">
          Timewheel · Alumni &apos;06 &amp; &apos;12
        </p>

        <h3 className="mt-3 text-[28px] font-extrabold leading-[1.1] text-white">
          We build{" "}
          <span style={{ color: ad.accentColor }} className="whitespace-pre-line">
            {ad.headline}
          </span>
        </h3>

        <p className="mt-3 text-[13px] leading-relaxed text-gray-300">{ad.description}</p>

        <p className="mt-3 text-[11px] leading-relaxed text-gray-500">{ad.subtext}</p>

        {/* Price pill */}
        <div className="mt-4 inline-flex items-center gap-2 rounded-[4px] border border-gray-700/60 bg-gray-900/80 px-3 py-2">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            {ad.priceLabel}
          </span>
          <span className="text-lg font-extrabold" style={{ color: ad.accentColor }}>
            {ad.price}
          </span>
        </div>

        <p className="mt-2 text-[11px] text-gray-500">{ad.punchline}</p>

        <a
          href={TIMEWHEEL_CTA_URL}
          target="_blank"
          rel="noopener noreferrer"
          className={`mt-4 block w-full rounded-full py-2.5 text-center text-sm font-bold transition-colors ${ad.buttonBg} ${ad.buttonText}`}
        >
          Let&apos;s talk →
        </a>
      </div>
    </div>
  )
}
