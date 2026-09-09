import Link from "next/link";
import { Crown } from "lucide-react";
import { optionalUser } from "@/modules/auth/session";
import { getBadgeCatalog } from "@/modules/badges/catalog-view";
import { LeftRailShell } from "@/components/shared/ProfileSidebar";
import { SIDEBAR_NAV } from "@/config/sidebar-nav";
import BadgeCard from "@/components/shared/badges/BadgeCard";
import { RARITY_TONE, RARITY_LABEL, RARITY_ORDER } from "@/components/shared/badges/rarity";
import { keyToSlug } from "@/modules/badges/slug";

export const metadata = { title: "Badges" };
export const dynamic = "force-dynamic";

export default async function BadgesCatalogPage() {
  const session = await optionalUser();
  const cat = await getBadgeCatalog(session?.id);

  return (
    <LeftRailShell nav={SIDEBAR_NAV.feed}>
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Badges</h1>
          <p className="mt-0.5 text-sm text-gray-500">
            {session ? `You've earned ${cat.earnedCount} of ${cat.totalCount}.` : `${cat.totalCount} achievements to collect.`}
          </p>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-700">
          <Crown className="h-4 w-4" /> Collect badges. Be legendary.
        </span>
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
      <div className="space-y-9">
        {cat.categories.map((c) => (
          <section key={c.key}>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="inline-block h-6 w-1.5 rounded-full bg-brand" />
              <h2 className="text-lg font-bold text-gray-900">{c.label}</h2>
              <span className="text-xs font-medium text-gray-400">
                {c.badges.filter((b) => b.earned).length}/{c.badges.length}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {c.badges.map((b) => (
                <BadgeCard key={b.key} badge={b} href={`/badges/${keyToSlug(b.key)}`} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </LeftRailShell>
  );
}
