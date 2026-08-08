import { notFound } from "next/navigation"
import { requireUser } from "@/modules/auth/session"
import { prisma } from "@/lib/prisma"
import { callsEnabled } from "@/config/calls"
import AmaRoom from "./AmaRoom"

export const dynamic = "force-dynamic"

export default async function AmaJoinPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const user = await requireUser()
  if (!callsEnabled()) notFound()

  const ama = await prisma.amaSession.findUnique({ where: { id } })
  if (!ama || ama.status === "ended") notFound()

  const isHost = user.id === ama.hostId || user.id === ama.coHostId

  return (
    <AmaRoom
      amaId={ama.id}
      title={ama.title}
      description={ama.description}
      startsAt={ama.startsAt.toISOString()}
      isHost={isHost}
    />
  )
}
