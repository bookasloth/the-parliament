"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  ShieldCheck, X, UserPlus, MessageSquare, Check, Building2, MapPin, Briefcase, Users,
} from "lucide-react"
import {
  type NetworkAlumni, HOUSE_BANNER, MEMBERSHIP_BADGE,
} from "../network-data"

interface AlumniCardProps {
  alumni: NetworkAlumni
  connected: boolean
  dismissed: boolean
  onConnect: (id: string) => void
  onDismiss: (id: string) => void
}

export function AlumniCard({ alumni, connected, dismissed, onConnect, onDismiss }: AlumniCardProps) {
  const router = useRouter()
  const profileHref = `/profile/${alumni.username}`
  const banner = HOUSE_BANNER[alumni.house] ?? "#009ae4"
  const badge = MEMBERSHIP_BADGE[alumni.membership]

  // Card is clickable to the profile; interactive controls stopPropagation.
  const go = () => router.push(profileHref)
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); go() }
  }

  return (
    <div
      role="link"
      tabIndex={0}
      aria-label={`${alumni.name}, ${alumni.batchLabel}`}
      onClick={go}
      onKeyDown={onKey}
      className="group relative w-full overflow-hidden rounded-xl border border-gray-200 bg-white text-left transition-shadow hover:shadow-card focus:outline-none focus-visible:ring-2 focus-visible:ring-brand cursor-pointer flex flex-col"
    >
      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(alumni.id) }}
        aria-label={`Dismiss ${alumni.name}`}
        className="absolute right-2 top-2 z-10 grid h-7 w-7 place-items-center rounded-full bg-white/80 text-gray-500 backdrop-blur-sm hover:bg-white hover:text-gray-700 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>

      {/* Banner — cover photo or house colour */}
      <div className="h-[60px] w-full" style={alumni.cover ? undefined : { backgroundColor: banner }}>
        {alumni.cover && (
          <img src={alumni.cover} alt="" loading="lazy" className="h-full w-full object-cover" />
        )}
      </div>

      {/* Avatar overlapping banner */}
      <div className="px-4">
        <img
          src={alumni.avatar}
          alt={alumni.name}
          loading="lazy"
          className="-mt-8 h-16 w-16 rounded-full border-4 border-white object-cover shadow-sm"
        />
      </div>

      <div className="flex flex-1 flex-col px-4 pb-4 pt-2">
        {/* Identity */}
        <div className="flex items-start gap-1.5">
          <h3 className="text-sm font-semibold text-gray-900 leading-snug">
            <Link href={profileHref} onClick={(e) => e.stopPropagation()} className="hover:text-brand transition-colors">
              {alumni.name}
            </Link>
          </h3>
          {alumni.verified && (
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-500 fill-blue-100" aria-label="Verified alumni" />
          )}
        </div>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="text-xs text-gray-500">{alumni.batchLabel}</span>
          {badge && (
            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${badge.className}`}>
              {badge.label}
            </span>
          )}
        </div>

        {/* Headline */}
        <p className="mt-2 text-xs text-gray-700 leading-relaxed line-clamp-2 min-h-[2rem]">
          {alumni.headline}
        </p>

        {/* Metadata */}
        <div className="mt-2 space-y-1">
          {alumni.company && (
            <p className="flex items-center gap-1.5 text-[11px] text-gray-500"><Building2 className="h-3 w-3 flex-shrink-0" /> {alumni.company}</p>
          )}
          {alumni.city && (
            <p className="flex items-center gap-1.5 text-[11px] text-gray-500"><MapPin className="h-3 w-3 flex-shrink-0" /> {alumni.city}</p>
          )}
          {alumni.industry && (
            <p className="flex items-center gap-1.5 text-[11px] text-gray-500"><Briefcase className="h-3 w-3 flex-shrink-0" /> {alumni.industry}</p>
          )}
        </div>

        {/* Social proof */}
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-medium text-brand">
          <Users className="h-3 w-3 flex-shrink-0" /> {alumni.socialProof}
        </p>

        {/* CTA */}
        <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {connected ? (
            <span className="flex flex-1 items-center justify-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
              <Check className="h-3.5 w-3.5" /> Pending
            </span>
          ) : (
            <button
              onClick={() => onConnect(alumni.id)}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-md border border-brand bg-brand px-3 py-1.5 text-sm font-medium text-white transition-all duration-300 hover:bg-white hover:text-brand"
            >
              <UserPlus className="h-3.5 w-3.5" /> Connect
            </button>
          )}
          <Link
            href={`/messages/conv-${alumni.id}`}
            aria-label={`Message ${alumni.name}`}
            className="grid h-8 w-8 place-items-center rounded-md border border-gray-200 bg-white text-gray-500 transition-colors hover:border-brand hover:text-brand"
          >
            <MessageSquare className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  )
}
