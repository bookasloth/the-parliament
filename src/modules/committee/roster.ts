import { prisma } from "@/lib/prisma"
import { uploadCommitteePhoto, deleteStorageObject } from "@/lib/supabase-storage"

// Public committee roster: DB-backed, fully admin-CRUD'd. Rendered on /committee
// and /about. Public reads are fail-soft (return [] on error) so the pages keep
// prerendering even before the migration runs.

export type RosterGroup = "executive" | "advisory"

export interface RosterMemberDTO {
  id: string
  name: string
  position: string
  groupType: RosterGroup
  profileLink: string | null
  email: string | null
  phone: string | null
  photo: string | null
  displayOrder: number
  isPublished: boolean
}

interface DbRow {
  id: string; name: string; position: string; groupType: string
  profileLink: string | null; email: string | null; phone: string | null
  photoUrl: string | null; displayOrder: number; isPublished: boolean
}

/** DB row → DTO. `photoUrl` → `photo`; group coerced to the known union. */
export function mapRosterMember(r: DbRow): RosterMemberDTO {
  return {
    id: r.id,
    name: r.name,
    position: r.position,
    groupType: r.groupType === "advisory" ? "advisory" : "executive",
    profileLink: r.profileLink,
    email: r.email,
    phone: r.phone,
    photo: r.photoUrl,
    displayOrder: r.displayOrder,
    isPublished: r.isPublished,
  }
}

const orderBy = [{ displayOrder: "asc" as const }, { createdAt: "asc" as const }]

// ---- reads ----

/** Published roster, split by group. Fail-soft: [] on any error. */
export async function getPublicRoster(): Promise<{ executive: RosterMemberDTO[]; advisory: RosterMemberDTO[] }> {
  try {
    const rows = await prisma.committeeRoster.findMany({ where: { isPublished: true }, orderBy })
    const all = rows.map(mapRosterMember)
    return { executive: all.filter((m) => m.groupType === "executive"), advisory: all.filter((m) => m.groupType === "advisory") }
  } catch (e) {
    console.error("[committee] getPublicRoster failed", e)
    return { executive: [], advisory: [] }
  }
}

export async function listRosterAdmin(): Promise<RosterMemberDTO[]> {
  const rows = await prisma.committeeRoster.findMany({ orderBy: [{ groupType: "asc" }, ...orderBy] })
  return rows.map(mapRosterMember)
}

// ---- mutations ----

const cap = (s: string | null | undefined, n: number) => (s ?? "").trim().slice(0, n)

export interface MemberInput {
  name: string
  position: string
  groupType?: RosterGroup
  profileLink?: string | null
  email?: string | null
  phone?: string | null
}

function cleanData(input: MemberInput) {
  return {
    name: cap(input.name, 120),
    position: cap(input.position, 80),
    groupType: input.groupType === "advisory" ? "advisory" : "executive",
    profileLink: input.profileLink ? cap(input.profileLink, 500) : null,
    email: input.email ? cap(input.email, 254) : null,
    phone: input.phone ? cap(input.phone, 20) : null,
  }
}

export async function createRosterMember(input: MemberInput): Promise<RosterMemberDTO> {
  const data = cleanData(input)
  if (!data.name || !data.position) throw new Error("Name and position are required")
  const max = await prisma.committeeRoster.aggregate({ _max: { displayOrder: true }, where: { groupType: data.groupType } })
  const row = await prisma.committeeRoster.create({ data: { ...data, displayOrder: (max._max.displayOrder ?? -1) + 1 } })
  return mapRosterMember(row)
}

export async function updateRosterMember(id: string, input: MemberInput): Promise<RosterMemberDTO> {
  const data = cleanData(input)
  if (!data.name || !data.position) throw new Error("Name and position are required")
  const row = await prisma.committeeRoster.update({ where: { id }, data })
  return mapRosterMember(row)
}

/** Delete a member; best-effort remove their photo object. */
export async function deleteRosterMember(id: string): Promise<void> {
  const row = await prisma.committeeRoster.findUnique({ where: { id }, select: { photoUrl: true } })
  await prisma.committeeRoster.delete({ where: { id } })
  const path = row?.photoUrl ? storagePathFromUrl(row.photoUrl) : null
  if (path) await deleteStorageObject(path).catch(() => {})
}

export async function setRosterPublished(id: string, isPublished: boolean): Promise<void> {
  await prisma.committeeRoster.update({ where: { id }, data: { isPublished } })
}

export async function reorderRoster(ids: string[]): Promise<void> {
  await prisma.$transaction(ids.map((id, i) => prisma.committeeRoster.update({ where: { id }, data: { displayOrder: i } })))
}

/** Upload + attach a photo to a member. Replaces (and cleans up) the old one. */
export async function setRosterPhoto(id: string, bytes: Uint8Array, contentType: string): Promise<RosterMemberDTO> {
  const existing = await prisma.committeeRoster.findUnique({ where: { id }, select: { photoUrl: true } })
  const url = await uploadCommitteePhoto(id, bytes, contentType)
  const row = await prisma.committeeRoster.update({ where: { id }, data: { photoUrl: url } })
  const oldPath = existing?.photoUrl ? storagePathFromUrl(existing.photoUrl) : null
  if (oldPath) await deleteStorageObject(oldPath).catch(() => {})
  return mapRosterMember(row)
}

export async function removeRosterPhoto(id: string): Promise<void> {
  const row = await prisma.committeeRoster.findUnique({ where: { id }, select: { photoUrl: true } })
  await prisma.committeeRoster.update({ where: { id }, data: { photoUrl: null } })
  const path = row?.photoUrl ? storagePathFromUrl(row.photoUrl) : null
  if (path) await deleteStorageObject(path).catch(() => {})
}

/** Extract the storage object path (`committee/…`) from a public bucket URL. */
export function storagePathFromUrl(url: string): string | null {
  const m = url.match(/\/object\/public\/[^/]+\/(.+)$/)
  return m ? m[1] : null
}
