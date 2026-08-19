import { getSetting, setSetting } from "@/modules/admin/settings"
import type { Member } from "@/lib/committee"

// Committee member headshots live as one JSON blob in the AdminSetting KV store
// (key `committee_photos`), mapping a member `key` -> public image URL. No
// migration; the static roster in @/lib/committee stays the source of names.

const KEY = "committee_photos"
export type CommitteePhotos = Record<string, string>

export async function getCommitteePhotos(): Promise<CommitteePhotos> {
  return getSetting<CommitteePhotos>(KEY, {})
}

export async function setCommitteePhoto(actorId: string, memberKey: string, url: string): Promise<void> {
  const current = await getCommitteePhotos()
  await setSetting(actorId, KEY, { ...current, [memberKey]: url })
}

export async function removeCommitteePhoto(actorId: string, memberKey: string): Promise<void> {
  const current = await getCommitteePhotos()
  delete current[memberKey]
  await setSetting(actorId, KEY, current)
}

/** Overlay stored photos onto a roster by member `key`. Pure — unit-tested. */
export function applyPhotos<T extends Member>(members: T[], photos: CommitteePhotos): T[] {
  return members.map((m) => (m.key && photos[m.key] ? { ...m, photo: photos[m.key] } : m))
}
