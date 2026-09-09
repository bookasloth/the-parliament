import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { optionalUser } from "@/modules/auth/session";
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
  const rest = d.earners.slice(3);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <Link href="/badges" className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-brand">
          <ArrowLeft className="h-4 w-4" /> All badges
        </Link>

        {/* Hero */}
        <div className="mb-8 flex flex-col items-center gap-4 rounded-2xl border border-gray-200 bg-white p-8 text-center sm:flex-row sm:text-left">
          <div className={`flex h-28 w-28 flex-shrink-0 items-center justify-center rounded-2xl ring-2 ${tone.bg} ${tone.ring}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={d.iconUrl || BADGE_FALLBACK} alt="" className="h-full w-full object-contain p-3" />
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
              <h1 className="text-2xl font-bold text-gray-900">{d.label}</h1>
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tone.bg} ${tone.text}`}>
                <span className={`h-2 w-2 rounded-full ${tone.dot}`} />
                {RARITY_LABEL[d.rarity]}
              </span>
              {d.viewerEarned && (
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">✓ Earned</span>
              )}
            </div>
            {d.description && <p className="mt-2 text-sm text-gray-600">{d.description}</p>}
            <p className="mt-3 text-sm text-gray-500">
              <span className="font-bold text-gray-900">{d.totalEarned.toLocaleString("en-IN")}</span> alumni earned this
              {d.awardMode === "manual" && <span className="ml-2 rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-500">invite / manual</span>}
            </p>
          </div>
        </div>

        {d.earners.length === 0 ? (
          <div className="rounded-xl border border-gray-200 bg-white px-5 py-12 text-center text-sm text-gray-400">
            No one has earned this badge yet.
          </div>
        ) : (
          <>
            {/* Podium — first to unlock */}
            <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-gray-700">First to unlock</h2>
            <div className="mb-8 grid grid-cols-3 items-end gap-3">
              {podium.map((e) => (
                <PodiumBlock key={e.userId} e={e} />
              ))}
            </div>

            {/* Table */}
            {rest.length > 0 && (
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                <ul className="divide-y divide-gray-50">
                  {rest.map((e) => (
                    <Row key={e.userId} e={e} me={e.userId === session?.id} />
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Avatar({ e, size }: { e: BadgeEarner; size: number }) {
  if (e.photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={e.photoUrl} alt="" className="rounded-full object-cover ring-2 ring-white" style={{ width: size, height: size }} />;
  }
  return (
    <div
      className="flex items-center justify-center rounded-full font-bold text-white ring-2 ring-white"
      style={{ width: size, height: size, background: e.houseColor || "#009ae4", fontSize: size * 0.4 }}
    >
      {e.name.charAt(0).toUpperCase()}
    </div>
  );
}

const MEDAL = ["🥇", "🥈", "🥉"];
const PODIUM_H = { 1: "h-24", 2: "h-16", 3: "h-12" } as const;

function PodiumBlock({ e }: { e: BadgeEarner }) {
  const href = `/${e.username ?? e.userId}/badges`;
  return (
    <div className="flex flex-col items-center">
      <Link href={href} className="flex flex-col items-center">
        <Avatar e={e} size={e.rank === 1 ? 72 : 56} />
        <p className="mt-2 max-w-[8rem] truncate text-center text-sm font-semibold text-gray-900">{e.name}</p>
      </Link>
      <p className="text-xs text-gray-400">
        {e.awardedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </p>
      <div className={`mt-2 flex w-full items-start justify-center rounded-t-lg bg-gradient-to-b from-amber-100 to-amber-50 pt-2 ${PODIUM_H[e.rank as 1 | 2 | 3]}`}>
        <span className="text-2xl">{MEDAL[e.rank - 1]}</span>
      </div>
    </div>
  );
}

function Row({ e, me }: { e: BadgeEarner; me: boolean }) {
  const href = `/${e.username ?? e.userId}/badges`;
  return (
    <li className={`flex items-center gap-3 px-4 py-3 ${me ? "bg-brand-50" : ""}`}>
      <span className="w-7 flex-shrink-0 text-center text-sm font-bold tabular-nums text-gray-400">{e.rank}</span>
      <Avatar e={e} size={36} />
      <div className="min-w-0 flex-1">
        <Link href={href} className="block truncate text-sm font-semibold text-gray-900 hover:underline">{e.name}</Link>
        <p className="truncate text-xs text-gray-400">{[e.batchLabel, e.houseName].filter(Boolean).join(" · ") || "—"}</p>
      </div>
      <time className="flex-shrink-0 text-xs text-gray-400">
        {e.awardedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
      </time>
    </li>
  );
}
