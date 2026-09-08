// Anonymous-post identities (member-facing fun). An anon post shows a codename +
// icon instead of the author. Assigned by a stable hash of the POST id: the same
// post always renders the same identity, but two anon posts by the same author get
// independent identities — so it can't be correlated back to a person (the real
// authorId is also withheld from non-authors, see map-row). Anyone can land any
// name from the shared pool; collisions are fine and expected.

export const ANON_NAMES = [
  "Thanos from Sitabuldi",
  "Tiny Galactus",
  "Light Pink Ranger",
  "Budget Batman",
  "Local Loki",
  "Deadpool from Dharampeth",
  "Wolverine of Wardha Road",
  "Refurbished Iron Man",
  "Captain Civil Lines",
  "Spider-Mama",
  "Doctor Strange-ish",
  "Aunty-Man",
  "Pocket-Size Hulk",
  "Thor from Trimurti Nagar",
  "Load-Shedding Lantern",
  "Nearly Nightwing",
  "Groot from Gittikhadan",
  "Buffering Vision",
  "Mini Magneto",
  "Scarlet Sadar Witch",
  "Xerox Black Panther",
  "Low-Battery Flash",
  "Tap-Water Aquaman",
  "Licenseless Ghost Rider",
  "Second-Hand Silver Surfer",
  "Wanda from Wadi",
  "Professor Dropout",
  "Blind Hawkeye",
  "Star-Lord of Sakkardara",
  "Recharge-Over Rocket",
  "AC-Broken Winter Soldier",
  "One-Eye-Combo Nick Fury",
  "Shaktimaan Jr.",
  "Krrish from Kamptee",
  "Mostly Mister Fantastic",
  "The Invisible Aunty",
  "Peak-Traffic Juggernaut",
  "Rented Venom",
  "Teen Patti Gambit",
  "Night-Shift Nightcrawler",
  "Power-Cut Cyclops",
  "Trial-Pack Beast",
  "Under-Construction Colossus",
  "Storm - The Monsoon Edition",
  "Rebooted Phoenix",
  "Doctor Octopus from Dhantoli",
  "Bat-Bhai",
  "Super Chacha",
  "Ghost of Gandhibagh",
  "Skull Uncle",
] as const

// lucide-react icon keys (the member app uses lucide, not emoji). FeedCard maps
// each key to its component. Skull/ghost/mask/villain vibe.
export const ANON_ICONS = ["skull", "ghost", "mask", "drama", "bot"] as const
export type AnonIcon = (typeof ANON_ICONS)[number]

// Avatar-circle background per identity (deterministic).
export const ANON_COLORS = [
  "#6b7280", "#7c3aed", "#0ea5e9", "#059669",
  "#d4a017", "#dc2626", "#db2777", "#475569",
] as const

// djb2 string hash → unsigned 32-bit. Pure + stable across runs/machines.
function hashStr(s: string): number {
  let h = 5381
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0
  return h
}

export interface AnonIdentity {
  name: string
  icon: AnonIcon
  color: string
}

/** Stable pseudo-random identity for an anonymous post, seeded by its id. Distinct
 *  divisors decorrelate name / icon / color from the same hash. */
export function anonIdentity(postId: string): AnonIdentity {
  const h = hashStr(postId)
  return {
    name: ANON_NAMES[h % ANON_NAMES.length],
    icon: ANON_ICONS[Math.floor(h / 97) % ANON_ICONS.length],
    color: ANON_COLORS[Math.floor(h / 9973) % ANON_COLORS.length],
  }
}
