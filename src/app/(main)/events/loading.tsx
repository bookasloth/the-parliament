import { PageHeaderSkeleton, CardGridSkeleton } from "@/components/shared/skeletons"
import { RailSkeletonShell } from "@/components/shared/ProfileSidebarView"

export default function Loading() {
  return (
    <RailSkeletonShell>
      <PageHeaderSkeleton action />
      <div className="mt-4">
        <CardGridSkeleton count={6} />
      </div>
    </RailSkeletonShell>
  )
}
