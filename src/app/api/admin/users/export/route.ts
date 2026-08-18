import { prisma } from "@/lib/prisma"
import { requirePermission } from "@/lib/gate"
import { handleError } from "@/lib/api"

const COLUMNS = [
  "id", "name", "email", "username", "batch", "house",
  "membership", "status", "verification", "karma", "joined", "lastActive",
] as const

function csvCell(v: unknown): string {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

export async function GET() {
  try {
    await requirePermission("members:read")
    const rows = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: {
        id: true, username: true, legalName: true, displayName: true, email: true,
        membershipStatus: true, status: true, verificationStatus: true,
        createdAt: true, lastLoginAt: true,
        profile: { select: { house: { select: { name: true } }, batch: { select: { label: true } } } },
        userKarma: { select: { karmaBalance: true } },
      },
    })

    const lines = [COLUMNS.join(",")]
    for (const u of rows) {
      lines.push([
        u.id,
        u.displayName || u.legalName,
        u.email,
        u.username ?? "",
        u.profile?.batch?.label ?? "",
        u.profile?.house?.name ?? "",
        u.membershipStatus,
        u.status,
        u.verificationStatus,
        Number(u.userKarma?.karmaBalance ?? 0),
        u.createdAt.toISOString().slice(0, 10),
        u.lastLoginAt ? u.lastLoginAt.toISOString().slice(0, 10) : "",
      ].map(csvCell).join(","))
    }

    const date = rows[0]?.createdAt.toISOString().slice(0, 10) ?? "export"
    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="users-${date}.csv"`,
      },
    })
  } catch (e) {
    return handleError(e)
  }
}
