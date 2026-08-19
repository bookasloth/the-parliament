import { getSetting, setSetting } from "@/modules/admin/settings"
import type { Member } from "@/lib/committee"

// Admin-editable committee overrides live as one JSON blob in the AdminSetting
// KV store (key `committee_photos`), mapping a member `key` -> { name?,
// profileLink?, photo? }. No migration; the static roster in @/lib/committee
// stays the default source of names/positions. Legacy values were bare photo
// URL strings — coerced to { photo } on read for backward compatibility.

const KEY = "committee_photos"

export type CommitteeOverride = { name?: string; profileLink?: string; photo?: string }
export type CommitteeOverrides = Record<string, CommitteeOverride>

function coerce(raw: Record<string, unknown>): CommitteeOverrides {
  const out: CommitteeOverrides = {}
  for (const [k, v] of Object.entries(raw)) {
    if (typeof v === "string") out[k] = { photo: v } // legacy shape
    else if (v && typeof v === "object") out[k] = v as CommitteeOverride
  }
  return out
}

export async function getCommitteeOverrides(): Promise<CommitteeOverrides> {
  return coerce(await getSetting<Record<string, unknown>>(KEY, {}))
}

/** Merge a partial override into a member's entry. Empty strings clear a field. */
export async function setCommitteeOverride(actorId: string, memberKey: string, patch: CommitteeOverride): Promise<void> {
  const all = await getCommitteeOverrides()
  const next: CommitteeOverride = { ...all[memberKey] }
  for (const field of ["name", "profileLink", "photo"] as const) {
    if (field in patch) {
      const val = patch[field]
      if (val === undefined || val === "") delete next[field]
      else next[field] = val
    }
  }
  if (Object.keys(next).length === 0) delete all[memberKey]
  else all[memberKey] = next
  await setSetting(actorId, KEY, all)
}

/** Overlay stored overrides onto a roster by member `key`. Pure — unit-tested.
 *  Only non-empty override fields win; everything else falls back to the roster. */
export function applyOverrides<T extends Member>(members: T[], overrides: CommitteeOverrides): T[] {
  return members.map((m) => {
    const o = m.key ? overrides[m.key] : undefined
    if (!o) return m
    return {
      ...m,
      ...(o.name ? { name: o.name } : {}),
      ...(o.profileLink ? { profileLink: o.profileLink } : {}),
      ...(o.photo ? { photo: o.photo } : {}),
    }
  })
}
