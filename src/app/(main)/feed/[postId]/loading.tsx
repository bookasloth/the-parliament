import { CommentsSkeleton, PostSkeleton } from "@/components/shared/feed-skeletons"

export default function PostDetailLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-6 space-y-4">
      <div className="h-4 w-32 rounded bg-gray-200 animate-pulse" />
      <PostSkeleton />
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="h-3 w-32 rounded bg-gray-200 animate-pulse" />
        </div>
        <CommentsSkeleton count={4} />
      </div>
    </div>
  )
}
