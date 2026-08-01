import type { ReactNode } from "react"
import { ShieldCheck } from "lucide-react"
import type { AlumniCard, Membership } from "@/lib/homepage-data"
import Link from "next/link"
import Image from "next/image"
import { MEMBERSHIP_TIERS } from "@/config/membership-colors"

const houseColors: Record<string, string> = {
  Aravali: "#5a9bd5",
  Nilgiri: "#70ad47",
  Shiwalik: "#e8503a",
  Udaigiri: "#ffe135",
  Indira: "#ff9933",
  Laxmi: "#e75480",
}

/** Lighten a hex color toward white by `amount` (0–1) for the cover gradient's second stop. */
function lighten(hex: string, amount: number): string {
  const n = hex.replace("#", "")
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  const mix = (c: number) => Math.round(c + (255 - c) * amount)
  return `rgb(${mix(r)}, ${mix(g)}, ${mix(b)})`
}

interface AlumniProfileCardProps {
  alumni: AlumniCard
  /** Override the profile link target (defaults to /[id]) */
  profileHref?: string
  /** Show a verified check next to the name */
  verified?: boolean
  /** Extra content rendered above the action buttons (e.g. mutual connections / role) */
  footer?: ReactNode
  /** Replace the default View Profile / Follow buttons */
  actions?: ReactNode
}

export function AlumniProfileCard({ alumni, profileHref, verified, footer, actions }: AlumniProfileCardProps) {
  const membership = alumni.membership || "associate"
  const tier = MEMBERSHIP_TIERS[membership] ?? MEMBERSHIP_TIERS.associate
  const href = profileHref ?? `/${alumni.id}`

  const houseColor = alumni.house ? houseColors[alumni.house] : undefined
  const cover = houseColor
    ? `linear-gradient(120deg, ${houseColor}, ${lighten(houseColor, 0.4)})`
    : "linear-gradient(120deg, #009ae4, #4fc3f7)"
  const houseTextColor = alumni.house === "Udaigiri" ? "#8a7a00" : houseColor

  const batchShort = alumni.batch || alumni.batchLabel?.replace(/\s*Batch\s*$/i, "") || "—"

  return (
    <div className="w-full max-w-[350px] mx-auto overflow-hidden rounded-2xl border border-gray-200 bg-white text-center transition-shadow duration-300 hover:shadow-md">
      {/* House-colored cover band */}
      <div className="h-[70px] w-full" style={{ background: cover }} />

      <div className="px-[18px] pb-[18px]">
        {/* Avatar overlapping the cover */}
        <div className="-mt-[38px]">
          <Link href={href} aria-label={`View ${alumni.name}'s profile`}>
            <Image
              src={alumni.image}
              alt={alumni.name}
              width={76}
              height={76}
              className="mx-auto h-[76px] w-[76px] rounded-full border-4 border-white object-cover cursor-pointer transition-transform duration-300 hover:scale-105"
            />
          </Link>
        </div>

        {/* Name */}
        <h3 className="mt-1.5 flex items-center justify-center gap-1.5 text-[17px] font-bold text-gray-900">
          <Link href={href} className="text-inherit no-underline transition-colors duration-300 hover:text-brand">
            {alumni.name}
          </Link>
          {verified && <ShieldCheck className="h-4 w-4 flex-shrink-0 fill-blue-100 text-blue-500" />}
        </h3>

        {/* Headline */}
        {alumni.bio && <p className="mt-1 line-clamp-1 text-[13px] text-gray-500">{alumni.bio}</p>}

        {/* Stat strip: Batch · House · Member tier */}
        <div className="-mx-[18px] my-3 flex items-stretch border-y border-gray-100">
          <div className="flex-1 py-2.5">
            <p className="text-sm font-bold text-gray-900 tabular-nums leading-none">{batchShort}</p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">Batch</p>
          </div>
          <div className="flex-1 border-l border-gray-100 py-2.5">
            <p className="text-sm font-bold leading-none" style={{ color: houseTextColor || "#374151" }}>
              {alumni.house || "—"}
            </p>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">House</p>
          </div>
          <div className="flex-1 border-l border-gray-100 py-2.5">
            <span className="flex items-center justify-center gap-1.5 text-sm font-bold leading-none text-gray-900">
              <span className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: tier.background }} />
              {tier.label}
            </span>
            <p className="mt-1 text-[10px] uppercase tracking-wide text-gray-400">Member</p>
          </div>
        </div>

        {/* Extra footer info (role, mutual connections) */}
        {footer && <div className="mb-3">{footer}</div>}

        {/* Buttons */}
        {actions ? (
          <div className="flex flex-wrap justify-center gap-2">{actions}</div>
        ) : (
          <div className="flex gap-2">
            <button className="flex-1 rounded-lg bg-brand px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-300 hover:bg-brand-600">
              Follow
            </button>
            <Link
              href={href}
              className="flex-1 rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-semibold text-gray-700 transition-colors duration-300 hover:bg-gray-50"
            >
              Profile
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
