import { ProfileSidebarSkeleton } from "@/components/shared/ProfileSidebarView";

// Mirrors /badges/[slug]: left rail · center (top bar, hero, podium) · right ad.
export default function BadgeDetailLoading() {
  return (
    <div className="mx-auto max-w-[1400px] px-4 py-6 sm:px-6">
      <div className="flex flex-col gap-8 lg:flex-row">
        {/* Left rail */}
        <aside className="hidden w-[280px] flex-shrink-0 lg:block">
          <div className="sticky top-20">
            <ProfileSidebarSkeleton navRows={5} />
          </div>
        </aside>

        {/* Center */}
        <div className="min-w-0 flex-1 animate-pulse">
          {/* Top bar */}
          <div className="mb-4 flex items-center justify-between">
            <div className="h-4 w-24 rounded bg-gray-200" />
            <div className="h-8 w-56 rounded-full bg-gray-100" />
          </div>

          {/* Hero */}
          <div className="mb-8 rounded-2xl border border-gray-200 bg-gray-50 p-6">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="h-32 w-32 flex-shrink-0 rounded-2xl bg-white/70" />
              <div className="min-w-0 flex-1">
                <div className="h-5 w-20 rounded-full bg-gray-200" />
                <div className="mt-3 h-8 w-56 rounded bg-gray-200" />
                <div className="mt-2 h-3 w-40 rounded bg-gray-100" />
              </div>
              <div className="flex shrink-0 flex-col items-end gap-2">
                <div className="flex -space-x-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="h-8 w-8 rounded-full bg-gray-200 ring-2 ring-white" />
                  ))}
                </div>
                <div className="h-3 w-28 rounded bg-gray-100" />
              </div>
            </div>
          </div>

          {/* First to unlock */}
          <div className="mb-4 flex items-end justify-between">
            <div>
              <div className="h-3.5 w-28 rounded bg-gray-200" />
              <div className="mt-2 h-3 w-56 rounded bg-gray-100" />
            </div>
            <div className="h-8 w-36 rounded-lg bg-gray-100" />
          </div>

          {/* Podium */}
          <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
            {[2, 1, 3].map((rank) => (
              <div key={rank} className="flex flex-col items-center rounded-2xl bg-gray-50 px-2 pt-4 ring-1 ring-gray-100">
                <div className={`rounded-full bg-gray-200 ${rank === 1 ? "h-[72px] w-[72px]" : "h-[52px] w-[52px]"}`} />
                <div className="mt-2 h-3 w-20 rounded bg-gray-200" />
                <div className="mt-1 h-2.5 w-16 rounded bg-gray-100" />
                <div className={`mt-3 w-full rounded-t-lg bg-gray-200 ${rank === 1 ? "h-16" : rank === 2 ? "h-11" : "h-9"}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Right ad */}
        <aside className="hidden w-[340px] flex-shrink-0 lg:block">
          <div className="sticky top-20 h-64 animate-pulse rounded-[5px] border border-gray-200 bg-gray-100" />
        </aside>
      </div>
    </div>
  );
}
