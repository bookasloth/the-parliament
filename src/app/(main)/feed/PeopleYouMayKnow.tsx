"use client"

import { useState, useTransition } from "react"
import Image from "next/image"
import { X, UserPlus, Check } from "lucide-react"
import { AlumniCarousel } from "@/app/(main)/network/components/AlumniCarousel"
import { followAction } from "@/app/(main)/connections/actions"
import type { SuggestedConnection } from "./feed-content"

// "People you may know" — reuses getFollowSuggestions (house/batch/gender
// buckets) + AlumniCarousel. Dismiss is client-only for this session.
// ponytail: no DismissedSuggestion table — add one only if dismissals need to
// survive reloads.
export function PeopleYouMayKnow({ people }: { people: SuggestedConnection[] }) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [, startTransition] = useTransition()

  const visible = people.filter((p) => !dismissed.has(p.id))
  if (visible.length === 0) return null

  const follow = (id: string) => {
    setFollowed((s) => new Set(s).add(id)) // optimistic
    startTransition(async () => {
      try {
        await followAction(id)
      } catch {
        setFollowed((s) => {
          const n = new Set(s)
          n.delete(id)
          return n
        })
      }
    })
  }

  return (
    <AlumniCarousel title="People you may know" itemClassName="w-[150px]">
      {visible.map((p) => {
        const isFollowed = followed.has(p.id)
        return (
          <div
            key={p.id}
            className="relative flex h-full flex-col overflow-hidden rounded-[5px] border border-gray-200 bg-white"
          >
            <button
              onClick={() => setDismissed((s) => new Set(s).add(p.id))}
              aria-label={`Dismiss ${p.name}`}
              className="absolute right-1.5 top-1.5 z-10 grid h-6 w-6 place-items-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <a href={p.username ? `/${p.username}` : "#"} className="block">
              <Image
                src={p.avatar}
                alt={p.name}
                width={150}
                height={150}
                unoptimized
                className="aspect-square w-full object-cover"
              />
            </a>
            <div className="flex flex-1 flex-col p-2.5">
              <a
                href={p.username ? `/${p.username}` : "#"}
                className="truncate text-sm font-semibold text-gray-900 hover:underline"
              >
                {p.name}
              </a>
              <p className="mt-0.5 truncate text-xs text-gray-500">{p.reason}</p>
              <button
                onClick={() => !isFollowed && follow(p.id)}
                disabled={isFollowed}
                className={`mt-2 flex items-center justify-center gap-1.5 rounded-[4px] py-1.5 text-xs font-semibold transition-colors ${
                  isFollowed
                    ? "bg-gray-100 text-gray-500"
                    : "bg-brand text-white hover:bg-brand-600"
                }`}
              >
                {isFollowed ? (
                  <>
                    <Check className="h-3.5 w-3.5" /> Following
                  </>
                ) : (
                  <>
                    <UserPlus className="h-3.5 w-3.5" /> Follow
                  </>
                )}
              </button>
            </div>
          </div>
        )
      })}
    </AlumniCarousel>
  )
}
