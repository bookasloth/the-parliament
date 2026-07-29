// Deterministic default avatar (a colour icon) used instead of initials when a
// user hasn't uploaded a photo. Stable per seed (usually the user id).
const AVATAR_BASE = "https://website-assets.shubhamdatarkar.com/images/sd/website/icons/avatar-icons/sd-"

export const AVATAR_COLORS = [
  "orange", "amber", "lime", "teal", "blue", "indigo",
  "violet", "purple", "coral", "sky", "magenta",
] as const

function hash(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return h
}

export function colorAvatar(seed: string): string {
  const color = AVATAR_COLORS[hash(seed) % AVATAR_COLORS.length]
  return `${AVATAR_BASE}${color}.png`
}
