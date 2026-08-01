import { FeedListSkeleton } from "@/components/shared/feed-skeletons"
import { PageHeaderSkeleton } from "@/components/shared/skeletons"

export default function Loading() {
  return (
    <div className="mx-auto max-w-[680px] px-4 py-6 sm:px-6">
      <PageHeaderSkeleton />
      <FeedListSkeleton count={5} />
    </div>
  )
}
