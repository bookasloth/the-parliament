import { prisma } from "@/lib/prisma";

/** Poster identity for the shared result-post image. */
export interface Poster {
  name: string;
  batchLabel?: string;
  avatarUrl?: string;
  verified?: boolean;
}

export async function getPoster(userId: string): Promise<Poster> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      displayName: true,
      legalName: true,
      isVerified: true,
      profile: { select: { photoUrl: true, batch: { select: { label: true } } } },
    },
  });
  const batch = u?.profile?.batch?.label;
  return {
    name: u?.displayName || u?.legalName || "Alumnus",
    avatarUrl: u?.profile?.photoUrl ?? undefined,
    verified: u?.isVerified ?? false,
    batchLabel: batch ? (/batch/i.test(batch) ? batch : `${batch} batch`) : undefined,
  };
}
