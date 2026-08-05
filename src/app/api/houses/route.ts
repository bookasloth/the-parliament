import { NextResponse } from "next/server"
import { getDefaultSchoolId } from "@/lib/school"
import { listHousesForContext } from "@/lib/houses"

// House options, optionally scoped to a batch year + gender:
//   /api/houses?startYear=1999&gender=male  → pre-2002 boys houses
//   /api/houses                             → all houses
export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const startYearRaw = url.searchParams.get("startYear")
    const gender = url.searchParams.get("gender")
    const startYear = startYearRaw && Number.isFinite(Number(startYearRaw)) ? Number(startYearRaw) : null
    const schoolId = (await getDefaultSchoolId()) ?? undefined

    const houses = await listHousesForContext({ schoolId, startYear, gender })
    return NextResponse.json(
      { houses },
      { headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" } },
    )
  } catch (error) {
    console.error("Houses fetch error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
