// Shared skeletons for feed surfaces. Framework-agnostic (server or client).

export function PostSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading post"
      className="bg-white border border-gray-200 rounded-xl overflow-hidden animate-pulse"
    >
      <div className="px-4 pt-4 pb-3 flex items-center gap-3">
        <div className="h-12 w-12 rounded-full bg-gray-200" />
        <div className="flex-1 space-y-2">
          <div className="h-3 w-40 rounded bg-gray-200" />
          <div className="h-2.5 w-24 rounded bg-gray-100" />
        </div>
      </div>
      <div className="px-4 pb-3 space-y-2">
        <div className="h-3 w-full rounded bg-gray-100" />
        <div className="h-3 w-11/12 rounded bg-gray-100" />
        <div className="h-3 w-2/3 rounded bg-gray-100" />
      </div>
      <div className="h-48 bg-gray-100" />
      <div className="border-t border-gray-100 px-4 py-3 flex items-center gap-4">
        <div className="h-6 w-16 rounded bg-gray-100" />
        <div className="h-6 w-16 rounded bg-gray-100" />
        <div className="h-6 w-16 rounded bg-gray-100" />
        <div className="h-6 w-16 rounded bg-gray-100 ml-auto" />
      </div>
    </div>
  )
}

export function FeedListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  )
}

export function CommentSkeleton() {
  return (
    <li className="px-5 py-4 flex gap-3 animate-pulse">
      <div className="h-9 w-9 rounded-full bg-gray-200 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2 space-y-2">
          <div className="h-3 w-32 rounded bg-gray-200" />
          <div className="h-3 w-full rounded bg-gray-100" />
          <div className="h-3 w-2/3 rounded bg-gray-100" />
        </div>
      </div>
    </li>
  )
}

export function CommentsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="divide-y divide-gray-100" aria-label="Loading comments">
      {Array.from({ length: count }).map((_, i) => (
        <CommentSkeleton key={i} />
      ))}
    </ul>
  )
}

export function RailCardSkeleton({ lines = 4 }: { lines?: number }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 animate-pulse space-y-3">
      <div className="h-3 w-24 rounded bg-gray-200" />
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-28 rounded bg-gray-200" />
            <div className="h-2.5 w-20 rounded bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ComposeTriggerSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-3 flex items-center gap-3 animate-pulse">
      <div className="h-10 w-10 rounded-full bg-gray-200" />
      <div className="flex-1 h-10 rounded-full bg-gray-100" />
    </div>
  )
}
