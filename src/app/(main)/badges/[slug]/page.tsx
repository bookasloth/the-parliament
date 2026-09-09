import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Crown, Trophy, Users } from "lucide-react";
import { optionalUser } from "@/modules/auth/session";
import { ProfileSidebar } from "@/components/shared/ProfileSidebar";
import { SIDEBAR_NAV } from "@/config/sidebar-nav";
import { TimewheelAdCard } from "@/components/shared/TimewheelAdCard";
import { getBadgeDetail, type BadgeEarner } from "@/modules/badges/badge-detail";
import { RARITY_TONE, RARITY_LABEL, BADGE_FALLBACK } from "@/components/shared/badges/rarity";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const d = await getBadgeDetail(slug);
  return { title: d ? `${d.label} — Badge` : "Badge" };
}

export default async function BadgeDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const session = await optionalUser();
  const d = await getBadgeDetail(slug, session?.id);
  if (!d) notFound();

  const tone = RARITY_TONE[d.rarity];
  const podium = [d.earners[1], d.earners[0], d.earners[2]].filter(Boolean) as BadgeEarner[];
  // Ad-free perk: hide the display ad for premium/committee; everyone else sees it.
  const tier = session?.membershipStatus;
  const showAd = tier !== "premium" && tier !== "committee";

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left rail — feed profile sidebar */}
        <aside className="hidden w-[280px] flex-shrink-0 lg:block">
          <div className="sticky top-20">
            <ProfileSidebar nav={SIDEBAR_NAV.feed} />
          </div>
        </aside>

        {/* Center */}
        <div className="min-w-0 flex-1">
          {/* Top bar */}
          <div className="mb-4 flex items-center justify-between">
            <Link href="/badges" className="inline-flex items-center gap-1.5 text-sm font-bold text-gray-700 hover:text-brand">
              <ArrowLeft className="h-4 w-4" /> All badges
            </Link>
            <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600">
              <Crown className="h-4 w-4 text-amber-500" /> Collect badges. Be legendary.
            </span>
          </div>

          {/* Hero */}
          <div className={`relative mb-8 overflow-hidden rounded-2xl border border-gray-200 ${tone.bg}`}>
            <div className="relative flex flex-col gap-5 p-6 sm:flex-row sm:items-center">
              <div className="flex h-32 w-32 flex-shrink-0 items-center justify-center rounded-2xl bg-white/70 shadow-inner">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={d.iconUrl || BADGE_FALLBACK} alt="" className="h-full w-full object-contain p-3" />
              </div>
              <div className="min-w-0 flex-1">
                <span className={`inline-flex items-center gap-1.5 rounded-full bg-white/70 px-2.5 py-1 text-xs font-semibold ${tone.text}`}>
                  <span className={`h-2 w-2 rounded-full ${tone.dot}`} /> {RARITY_LABEL[d.rarity]}
                </span>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">{d.label}</h1>
                {d.description && <p className="mt-1 text-sm text-gray-600">{d.description}</p>}
              </div>
              {/* Earners — stacked to the right: avatars over count */}
              <div className="flex shrink-0 flex-col items-center gap-2 sm:items-end">
                {d.earners.length > 0 && (
                  <div className="flex -space-x-2">
                    {d.earners.slice(0, 3).map((e) => (
                      <AvatarRing key={e.userId} e={e} size={32} />
                    ))}
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  <span className="font-bold text-gray-900">{d.totalEarned.toLocaleString("en-IN")}</span> alumni earned this
                </p>
              </div>
            </div>
          </div>

          {/* First to unlock */}
          <div className="mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wide text-gray-700">First to unlock</h2>
              <p className="text-sm text-gray-500">The first three alumni who earned this badge.</p>
            </div>
            <Link href="/leaderboard" className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">
              <Trophy className="h-4 w-4" /> View leaderboard
            </Link>
          </div>

          {d.earners.length === 0 ? (
            <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-400">
              No one has earned this badge yet. Be the first.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
                {podium.map((e) => (
                  <PodiumCard key={e.userId} e={e} />
                ))}
              </div>

              {/* Viewer rank pill */}
              <div className="mt-6 flex justify-center">
                {d.viewerRank ? (
                  <span className="inline-flex items-center gap-2 rounded-full bg-brand-50 px-5 py-2.5 text-sm font-semibold text-gray-700">
                    <Users className="h-4 w-4 text-brand" /> Your rank is <span className={`font-extrabold ${tone.text}`}>#{d.viewerRank}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-2 rounded-full bg-gray-100 px-5 py-2.5 text-sm font-medium text-gray-600">
                    <Users className="h-4 w-4 text-gray-400" />
                    {session ? "You're yet to unlock this — your name could be here." : "Log in to see where you rank."}
                  </span>
                )}
              </div>
            </>
          )}
        </div>

        {/* Right rail — feed ad */}
        {showAd && (
          <aside className="hidden w-[340px] flex-shrink-0 lg:block">
            <div className="sticky top-20">
              <TimewheelAdCard />
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function AvatarRing({ e, size }: { e: BadgeEarner; size: number }) {
  if (e.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={e.photoUrl} alt="" className="rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />;
  }
  return (
    <div className="flex items-center justify-center rounded-full font-bold text-white ring-2 ring-white" style={{ width: size, height: size, background: e.houseColor || "#009ae4", fontSize: size * 0.42 }}>
      {e.name.charAt(0).toUpperCase()}
    </div>
  );
}

// Podium place styling — gold / silver / bronze.
const PLACE = {
  1: { label: "FIRST", base: "from-amber-400 to-yellow-500", text: "text-amber-900", card: "from-amber-50 to-white ring-amber-200", h: "h-16", medal: "bg-amber-400" },
  2: { label: "SECOND", base: "from-gray-300 to-gray-400", text: "text-gray-700", card: "from-gray-50 to-white ring-gray-200", h: "h-11", medal: "bg-gray-400" },
  3: { label: "THIRD", base: "from-orange-300 to-amber-600", text: "text-orange-900", card: "from-orange-50 to-white ring-orange-200", h: "h-9", medal: "bg-orange-400" },
} as const;

function PodiumCard({ e }: { e: BadgeEarner }) {
  const p = PLACE[e.rank as 1 | 2 | 3];
  const href = `/${e.username ?? e.userId}/badges`;
  const big = e.rank === 1;
  return (
    <div className={`flex flex-col items-center rounded-2xl bg-gradient-to-b ${p.card} px-2 pt-4 ring-1`}>
      {big && <Crown className="mb-1 h-6 w-6 text-amber-400" fill="currentColor" />}
      <Link href={href} className="relative flex flex-col items-center">
        <AvatarRing e={e} size={big ? 72 : 52} />
        <p className={`mt-2 max-w-[7rem] truncate text-center font-bold text-gray-900 ${big ? "text-base" : "text-sm"}`}>{e.name}</p>
      </Link>
      <p className="text-xs text-gray-500">
        {e.awardedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </p>
      <div className={`mt-3 flex w-full items-center justify-center rounded-t-lg bg-gradient-to-b ${p.base} ${p.h}`}>
        <span className={`text-xs font-extrabold tracking-wider ${p.text}`}>{p.label}</span>
      </div>
    </div>
  );
}
