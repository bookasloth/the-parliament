import Link from "next/link";
import { Medal } from "lucide-react";
import { optionalUser } from "@/modules/auth/session";
import { getBadgeCatalog } from "@/modules/badges/catalog-view";
import BadgeCard from "@/components/shared/badges/BadgeCard";
import { RARITY_TONE, RARITY_LABEL, RARITY_ORDER } from "@/components/shared/badges/rarity";
import { keyToSlug } from "@/modules/badges/slug";

export const metadata = { title: "Badges" };
export const dynamic = "force-dynamic";

export default async function BadgesCatalogPage() {
  const session = await optionalUser();
  const cat = await getBadgeCatalog(session?.id);

  return (
    <div className="mx-auto max-w-[1400px] px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-600">
          <Medal className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold text-gray-900">Badges</h1>
          <p className="text-sm text-gray-500">
            Every achievement on the platform{session ? ` · you've earned ${cat.earnedCount} of ${cat.totalCount}` : ` · ${cat.totalCount} to collect`}
          </p>
        </div>
        <Link href="/leaderboard" className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 hover:border-brand hover:text-brand">
          Leaderboard
        </Link>
      </div>

      {/* Rarity legend */}
      <div className="mb-8 flex flex-wrap gap-2">
        {RARITY_ORDER.map((r) => (
          <span key={r} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${RARITY_TONE[r].bg} ${RARITY_TONE[r].text}`}>
            <span className={`h-2 w-2 rounded-full ${RARITY_TONE[r].dot}`} />
            {RARITY_LABEL[r]}
          </span>
        ))}
      </div>

      {/* Categories */}
      <div className="space-y-8">
        {cat.categories.map((c) => (
          <section key={c.key}>
            <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-gray-700">
              <span className="inline-block h-[15px] w-[5px] rounded-[3px] bg-brand" />
              {c.label}
            </h2>
            <div className="grid grid-cols-3 gap-4 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8">
              {c.badges.map((b) => (
                <BadgeCard key={b.key} badge={b} href={`/badges/${keyToSlug(b.key)}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
