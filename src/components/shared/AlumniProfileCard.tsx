import type { ReactNode } from "react"
import { MapPin, ShieldCheck } from "lucide-react"
import type { AlumniCard, Membership } from "@/lib/homepage-data"
import Link from "next/link"
import { MEMBERSHIP_TIERS } from "@/config/membership-colors"

const houseColors: Record<string, string> = {
  Aravali: "#5a9bd5",
  Nilgiri: "#70ad47",
  Shiwalik: "#e8503a",
  Udaigiri: "#ffe135",
  Indira: "#ff9933",
  Laxmi: "#e75480",
}

function HouseBadge({ house }: { house: string }) {
  const bg = houseColors[house] || "#6c757d"
  const isUdaigiri = house === "Udaigiri"
  return (
    <span
      className="absolute top-4 right-4 z-10 rounded-full px-2.5 py-0.5 text-xs font-medium select-none"
      style={{
        backgroundColor: bg,
        color: isUdaigiri ? "#000" : "#fff",
      }}
    >
      {house}
    </span>
  )
}

function MembershipStripe({ membership }: { membership: Membership }) {
  const tier = MEMBERSHIP_TIERS[membership] ?? MEMBERSHIP_TIERS.associate
  return (
    <div
      className="absolute top-0 left-0 w-full h-2 rounded-t-lg pointer-events-none select-none overflow-hidden"
      style={{ textIndent: "-9999px" }}
    >
      <div className="w-full h-full" style={{ background: tier.background }} />
    </div>
  )
}

interface AlumniProfileCardProps {
  alumni: AlumniCard
  /** Override the profile link target (defaults to /alumni/[id]) */
  profileHref?: string
  /** Show a verified check next to the name */
  verified?: boolean
  /** Extra content rendered between location and the action buttons (e.g. mutual connections) */
  footer?: ReactNode
  /** Replace the default View Profile / Follow buttons */
  actions?: ReactNode
}

export function AlumniProfileCard({ alumni, profileHref, verified, footer, actions }: AlumniProfileCardProps) {
  const membership = alumni.membership || "associate"
  const href = profileHref ?? `/alumni/${alumni.id}`

  return (
    <div className="relative bg-white rounded-lg shadow-md flex flex-col items-center text-center w-full max-w-[350px] mx-auto pt-3">
      <MembershipStripe membership={membership} />

      {/* Batch badge - top left */}
      <span className="absolute top-4 left-4 z-10 rounded-full bg-[#6c757d] px-2.5 py-0.5 text-xs font-semibold text-white select-none">
        {alumni.batchLabel}
      </span>

      {/* House badge - top right */}
      <HouseBadge house={alumni.house} />

      {/* Profile photo - square with rounded corners and subtle border */}
      <div className="mt-10 mb-3 flex-shrink-0">
        <Link href={href} aria-label={`View ${alumni.name}'s profile`}>
          <img
            src={alumni.image}
            alt={alumni.name}
            className="h-[135px] w-[135px] rounded object-cover border border-gray-200 cursor-pointer transition-transform duration-300 hover:scale-105"
          />
        </Link>
      </div>

      {/* Name */}
      <h3 className="text-xl font-bold text-gray-900 mb-1 flex items-center justify-center gap-1.5 px-4">
        <Link
          href={href}
          className="text-inherit no-underline hover:text-brand transition-colors duration-300"
        >
          {alumni.name}
        </Link>
        {verified && (
          <ShieldCheck className="h-4.5 w-4.5 text-blue-500 fill-blue-100 flex-shrink-0" />
        )}
      </h3>

      {/* Bio - primary color */}
      {alumni.bio && (
        <p className="text-sm text-brand mx-4 leading-snug">
          {alumni.bio}
        </p>
      )}

      {/* Location */}
      <div className="flex items-center justify-center gap-1.5 text-sm text-gray-600 mt-2 mb-4">
        <MapPin className="h-3.5 w-3.5" />
        <span>{alumni.location || "India"}</span>
      </div>

      {/* Extra footer info */}
      {footer && <div className="-mt-2 mb-3 px-4 w-full">{footer}</div>}

      {/* Buttons */}
      {actions ? (
        <div className="flex gap-3 w-full justify-center px-4 pb-4 flex-wrap">{actions}</div>
      ) : (
        <div className="flex gap-3 w-full justify-center px-4 pb-4">
          <Link
            href={href}
            className="rounded-md border border-brand bg-white px-4 py-1.5 text-sm font-medium text-brand hover:bg-brand hover:text-white transition-all duration-300"
          >
            View Profile
          </Link>
          <button
            className="rounded-md border border-brand bg-brand px-4 py-1.5 text-sm font-medium text-white hover:bg-white hover:text-brand transition-all duration-300"
          >
            Follow
          </button>
        </div>
      )}
    </div>
  )
}
