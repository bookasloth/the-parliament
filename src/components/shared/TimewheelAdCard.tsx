"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
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
    <a
      href={TIMEWHEEL_CTA_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="block overflow-hidden rounded-[5px]"
    >
      <Image
        src={ad.src}
        alt={ad.alt}
        width={680}
        height={1000}
        className="w-full h-auto"
        priority
      />
    </a>
  )
}
