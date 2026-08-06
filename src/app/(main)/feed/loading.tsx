import {
  ComposeTriggerSkeleton,
  FeedListSkeleton,
  RailCardSkeleton,
} from "@/components/shared/feed-skeletons"
import { ProfileSidebarSkeleton } from "@/components/shared/ProfileSidebarView"

export default function FeedLoading() {
  return (
    <div className="min-h-screen bg-[#f3f2ef]">
      <div className="mx-auto max-w-[1400px] px-4 sm:px-6 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* Left rail */}
          <aside className="hidden lg:block w-[280px] flex-shrink-0">
            <ProfileSidebarSkeleton navRows={4} />
          </aside>

          {/* Feed column */}
          <div className="flex-1 min-w-0 space-y-3">
            <ComposeTriggerSkeleton />
            <FeedListSkeleton count={6} />
          </div>

          {/* Right rail */}
          <aside className="hidden xl:block w-[300px] flex-shrink-0 space-y-3">
            <RailCardSkeleton lines={4} />
            <RailCardSkeleton lines={3} />
          </aside>
        </div>
      </div>
    </div>
  )
}
