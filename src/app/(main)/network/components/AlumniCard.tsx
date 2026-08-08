"use client"

import Link from "next/link"
import { X, UserPlus, MessageSquare, Check, Users } from "lucide-react"
import { AlumniProfileCard } from "@/components/shared/AlumniProfileCard"
import type { AlumniCard as SharedAlumniCard, Membership } from "@/lib/homepage-data"
import { type NetworkAlumni } from "../network-data"

interface AlumniCardProps {
  alumni: NetworkAlumni
  followed: boolean
  dismissed: boolean
  onFollow: (id: string) => void
  onDismiss: (id: string) => void
}

function toShared(a: NetworkAlumni): SharedAlumniCard {
  return {
    id: a.id,
    name: a.name,
    batch: a.batch,
    batchLabel: a.batchLabel,
    batchAlt: a.batchLabel,
    house: a.house,
    company: a.company ?? "",
    achievement: "",
    image: a.avatar,
    location: a.city,
    membership: a.membership as Membership,
    bio: a.headline,
  }
}

export function AlumniCard({ alumni, followed, onFollow, onDismiss }: AlumniCardProps) {
  const profileHref = `/${alumni.username}`

  return (
    <div className="relative">
      {/* Dismiss — overlaid on the shared card */}
      <button
        onClick={() => onDismiss(alumni.id)}
        aria-label={`Dismiss ${alumni.name}`}
        className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-[3px] bg-white/80 text-gray-500 backdrop-blur-sm transition-colors hover:bg-white hover:text-gray-700"
      >
        <X className="h-4 w-4" />
      </button>

      <AlumniProfileCard
        alumni={toShared(alumni)}
        profileHref={profileHref}
        verified={alumni.verified}
        footer={
          alumni.socialProof ? (
            <p className="flex items-center justify-center gap-1.5 text-[11px] font-medium text-brand">
              <Users className="h-3 w-3 flex-shrink-0" /> {alumni.socialProof}
            </p>
          ) : undefined
        }
        actions={
          <div className="flex w-full gap-2">
            {followed ? (
              <span className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-gray-100 px-3 py-2 text-[13px] font-semibold text-gray-600">
                <Check className="h-3.5 w-3.5" /> Following
              </span>
            ) : (
              <button
                onClick={() => onFollow(alumni.id)}
                className="flex flex-1 items-center justify-center gap-1.5 rounded-[4px] bg-brand px-3 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-brand-600"
              >
                <UserPlus className="h-3.5 w-3.5" /> Follow
              </button>
            )}
            <Link
              href={`/messages/conv-${alumni.id}`}
              aria-label={`Message ${alumni.name}`}
              className="grid w-10 flex-shrink-0 place-items-center rounded-[4px] border border-gray-200 bg-white text-gray-500 transition-colors hover:border-brand hover:text-brand"
            >
              <MessageSquare className="h-4 w-4" />
            </Link>
          </div>
        }
      />
    </div>
  )
}
