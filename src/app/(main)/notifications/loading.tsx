import { ListSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons"

export default function Loading() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <PageHeaderSkeleton />
      <ListSkeleton count={7} />
    </div>
  )
}
