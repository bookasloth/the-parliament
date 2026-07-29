import { NextResponse } from "next/server"
import { getDefaultSchoolId } from "@/lib/school"
import { searchDirectory } from "@/modules/directory/service"

const PAGE_SIZE = 24

// Paged rows for the community infinite-scroll loader.
export async function GET(req: Request) {
  const url = new URL(req.url)
  const sp = url.searchParams
  const schoolId = (await getDefaultSchoolId()) ?? undefined
  const page = Math.max(1, parseInt(sp.get("page") ?? "1") || 1)

  const { rows, total } = await searchDirectory(
    {
      schoolId,
      q: sp.get("q") || undefined,
      batchId: sp.get("batch") || undefined,
      houseId: sp.get("house") || undefined,
      membershipStatus: sp.get("membership") || undefined,
      city: sp.get("city") || undefined,
      verifiedOnly: sp.get("verified") === "1",
    },
    { page, pageSize: PAGE_SIZE },
  )

  return NextResponse.json({ rows, total, page, pageSize: PAGE_SIZE })
}
