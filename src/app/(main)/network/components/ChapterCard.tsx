"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Users, Check, Activity } from "lucide-react"
import type { Chapter } from "../network-data"

export function ChapterCard({ chapter }: { chapter: Chapter }) {
  const [joined, setJoined] = useState(chapter.joined)

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-[5px] border border-gray-200 bg-white transition-shadow hover:shadow-card">
      <Link href={`/network/chapters/${chapter.slug}`} className="relative block">
        <Image src={chapter.cover} alt={chapter.name} fill sizes="(max-width: 768px) 100vw, 400px" className="h-20 w-full object-cover" />
      </Link>
      <div className="flex flex-1 flex-col p-3">
        <h3 className="text-sm font-semibold text-gray-900">
          <Link href={`/network/chapters/${chapter.slug}`} className="hover:text-brand transition-colors">{chapter.name}</Link>
        </h3>
        <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500"><Users className="h-3.5 w-3.5" /> {chapter.members} members</p>
        <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400"><Activity className="h-3.5 w-3.5" /> {chapter.recentActivity}</p>
        <button
          onClick={() => setJoined((v) => !v)}
          aria-pressed={joined}
          className={`mt-3 flex items-center justify-center gap-1.5 rounded-[3px] px-3 py-1.5 text-sm font-medium transition-all duration-300 ${
            joined
              ? "border border-gray-200 bg-gray-100 text-gray-600"
              : "border border-brand bg-brand text-white hover:bg-white hover:text-brand"
          }`}
        >
          {joined ? <><Check className="h-3.5 w-3.5" /> Joined</> : "Join"}
        </button>
      </div>
    </div>
  )
}
