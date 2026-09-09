import { RailSkeletonShell } from "@/components/shared/ProfileSidebarView";

// Mirrors /badges: left rail + header + rarity legend + category sections of
// badge-card tiles (white box, art square, name bar, corner dot).
export default function BadgesLoading() {
  return (
    <RailSkeletonShell>
      <div className="animate-pulse">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <div className="h-7 w-32 rounded bg-gray-200" />
            <div className="mt-2 h-3 w-48 rounded bg-gray-100" />
          </div>
          <div className="h-8 w-56 rounded-full bg-gray-100" />
        </div>

        {/* Legend */}
        <div className="mb-8 flex flex-wrap gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-6 w-20 rounded-full bg-gray-100" />
          ))}
        </div>

        {/* Category sections */}
        <div className="space-y-9">
          {Array.from({ length: 2 }).map((_, s) => (
            <section key={s}>
              <div className="mb-4 flex items-center gap-2.5">
                <span className="inline-block h-6 w-1.5 rounded-full bg-gray-200" />
                <div className="h-5 w-40 rounded bg-gray-200" />
              </div>
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {Array.from({ length: 6 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </RailSkeletonShell>
  );
}

function CardSkeleton() {
  return (
    <div className="relative flex flex-col items-center gap-2 rounded-[10px] border border-gray-200 bg-white p-3">
      <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-gray-200" />
      <div className="h-16 w-16 rounded bg-gray-100" />
      <div className="h-2.5 w-14 rounded bg-gray-100" />
    </div>
  );
}
