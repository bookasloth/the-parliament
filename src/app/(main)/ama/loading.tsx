import { ListSkeleton, PageHeaderSkeleton } from "@/components/shared/skeletons"
import { RailSkeletonShell } from "@/components/shared/ProfileSidebarView"

export default function Loading() {
  return (
    <RailSkeletonShell>
      <PageHeaderSkeleton action />
      <ListSkeleton count={4} />
    </RailSkeletonShell>
  )
}
