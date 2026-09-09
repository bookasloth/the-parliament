"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { AD_SETS, adIndex, type AdSetKey } from "@/config/ad-sets"

/**
 * One rotating house-ad creative. The initial index is time-derived so the
 * server render and first client render agree; the interval keeps a long-lived
 * tab (or a statically-rendered page) rotating on the hour.
 */
export function AdCard({ set }: { set: AdSetKey }) {
  const { creatives, href, width, height } = AD_SETS[set]
  const [index, setIndex] = useState(() => adIndex(set))

  // Poll rather than setting state on mount: the mount value already matches the
  // server render, and a cached page self-corrects on the first tick.
  useEffect(() => {
    const id = setInterval(() => setIndex(adIndex(set)), 60_000)
    return () => clearInterval(id)
  }, [set])

  const ad = creatives[index]

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer sponsored"
      className="block overflow-hidden rounded-[5px]"
    >
      <Image
        src={ad.src}
        alt={ad.alt}
        width={width}
        height={height}
        sizes="340px"
        className="h-auto w-full"
      />
    </a>
  )
}
