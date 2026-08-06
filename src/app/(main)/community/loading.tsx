import { PageHeaderSkeleton, CardGridSkeleton } from "@/components/shared/skeletons"
import { RailSkeletonShell } from "@/components/shared/ProfileSidebarView"

export default function Loading() {
  return (
    <RailSkeletonShell>
      <PageHeaderSkeleton />
      <div className="mt-4">
        <CardGridSkeleton count={12} />
      </div>
    </RailSkeletonShell>
  )
}
