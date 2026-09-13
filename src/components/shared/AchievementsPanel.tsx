import Link from "next/link"
import { Plus } from "lucide-react"
import type { BadgeRarity } from "@/config/badges"
import { keyToSlug } from "@/modules/badges/slug"

const BADGE_FALLBACK = "/achievements/badge.svg"

/**
 * Profile "Achievements" card — earned Badges + Collectables (Rotten Eggs /
 * Karma) + the existing Alfazy TrophyCase, grouped as one card in the profile
 * right rail. Featured badges link to the full /[username]/achievements page.
 *
 * Icons for Eggs / Karma fall back to placeholder SVGs in /public/achievements/*.
 * Swap those files (same paths) for real artwork — no code change needed. Badge
 * icons come from the DB (`badge.iconUrl`); trophies come from TrophyCase.
 */

const EGG_ICON = "/achievements/egg.png"
const KARMA_ICON = "/achievements/tithonia.png"

const BADGES_SHOWN = 9

export type AchievementBadge = { key: string; label: string; iconUrl: string | null; rarity: BadgeRarity }

export type AchievementsData = {
  ownerFirstName: string
  ownerUsername: string
  userId: string
  badges: AchievementBadge[]
  totalBadges: number
  eggs: number
  shells: number
  karma: number
}

const fmt = (n: number) => n.toLocaleString("en-US")
const SUBHEAD = "mb-3 text-xs font-semibold uppercase tracking-wide text-gray-500"

export function AchievementsPanel({ data }: { data: AchievementsData }) {
  const { ownerFirstName, ownerUsername, badges, totalBadges, eggs, karma } = data
  // Order is set upstream in loadProfile (Committee first, then each category
  // top→lower). Just take the first 6.
  const shown = badges.slice(0, BADGES_SHOWN)
  const overflow = totalBadges - shown.length
  const badgesHref = `/${ownerUsername}/badges`

  return (
    <div className="rounded-[5px] border border-gray-200/80 bg-white soft-shadow overflow-hidden">
      <div className="px-7 pt-5 pb-1">
        <h5 className="font-heading text-[15px] font-bold text-gray-900">
          {ownerFirstName}&apos;s Achievements
        </h5>
      </div>

      <div className="px-7 pb-6 pt-3">
        {/* Badges — one compact row: up to 3 icons + a "+N" box */}
        <h4 className={SUBHEAD}>Badges</h4>
        {totalBadges === 0 ? (
          <p className="mb-2 text-xs text-gray-400">No badges yet — stay active to start earning.</p>
        ) : (
          // Mobile: up to 9 badges + a "+N" overflow tile (the current 5×2 grid).
          // Desktop: exactly 6 badges + a "+" tile → all badges. Each badge opens
          // its own detail page; only the "+" goes to the full badges list.
          <div className="mb-2 flex flex-wrap gap-1.5">
            {shown.map((b, i) => (
              <Link
                key={b.key}
                href={`/badges/${keyToSlug(b.key)}`}
                className={`flex h-[46px] w-[46px] items-center justify-center rounded-[8px] border border-[#ddd] bg-[#f7f7f7] p-1.5 hover:border-brand ${i >= 6 ? "lg:hidden" : ""}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.iconUrl || BADGE_FALLBACK} alt={b.label} className="max-h-[28px] max-w-[28px] object-contain" />
              </Link>
            ))}
            {/* Mobile-only overflow count */}
            {overflow > 0 && (
              <Link
                href={badgesHref}
                className="flex h-[46px] w-[46px] items-center justify-center rounded-[8px] border border-[#ddd] bg-[#f7f7f7] text-xs font-bold text-brand hover:border-brand lg:hidden"
              >
                +{overflow}
              </Link>
            )}
            {/* Desktop-only "+" — the 7th slot, links to all badges */}
            <Link
              href={badgesHref}
              aria-label="View all badges"
              className="hidden h-[46px] w-[46px] items-center justify-center rounded-[8px] border border-[#ddd] bg-[#f7f7f7] text-brand hover:border-brand lg:flex"
            >
              <Plus className="h-5 w-5" />
            </Link>
          </div>
        )}
        <Link href={badgesHref} className="mb-5 inline-block text-xs font-semibold text-brand hover:underline">
          View Your Badges
        </Link>

        {/* Collectables — stacked on mobile, side by side on desktop */}
        <h4 className={SUBHEAD}>Collectables</h4>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Collectable icon={EGG_ICON} value={fmt(eggs)} label="Rotten Eggs" />
          <Collectable icon={KARMA_ICON} value={fmt(karma)} label="Karma Points" />
        </div>
      </div>
    </div>
  )
}

function Collectable({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-[8px] border border-gray-200 bg-gray-50/60 px-3 py-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt="" className="h-8 w-8 flex-shrink-0 object-contain" />
      <div className="leading-tight">
        <p className="text-base font-bold tabular-nums text-gray-900">{value}</p>
        <p className="text-xs font-medium text-gray-500">{label}</p>
      </div>
    </div>
  )
}
