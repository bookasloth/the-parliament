// Flag Challenge catalogue + reference-image helper.
//
// We don't store flag images. The real flag is fetched from flagcdn.com
// (free, public-domain national flags) by ISO 3166-1 alpha-2 code, lowercased.
// The admin queue picks from COUNTRIES; the game shows the name and scores the
// player's drawing against flagRefUrl().

export type FlagCountry = { code: string; name: string };

// ponytail: a curated, recognisable/drawable subset — not all ~250 ISO codes.
// A daily game wants flags people have a fighting chance at, not Nauru from
// memory. Add more as the queue runs dry.
export const COUNTRIES: readonly FlagCountry[] = [
  { code: "in", name: "India" },
  { code: "us", name: "United States" },
  { code: "gb", name: "United Kingdom" },
  { code: "jp", name: "Japan" },
  { code: "fr", name: "France" },
  { code: "de", name: "Germany" },
  { code: "it", name: "Italy" },
  { code: "ca", name: "Canada" },
  { code: "br", name: "Brazil" },
  { code: "au", name: "Australia" },
  { code: "cn", name: "China" },
  { code: "ru", name: "Russia" },
  { code: "za", name: "South Africa" },
  { code: "mx", name: "Mexico" },
  { code: "ar", name: "Argentina" },
  { code: "es", name: "Spain" },
  { code: "pt", name: "Portugal" },
  { code: "nl", name: "Netherlands" },
  { code: "be", name: "Belgium" },
  { code: "ch", name: "Switzerland" },
  { code: "se", name: "Sweden" },
  { code: "no", name: "Norway" },
  { code: "fi", name: "Finland" },
  { code: "dk", name: "Denmark" },
  { code: "ie", name: "Ireland" },
  { code: "gr", name: "Greece" },
  { code: "pl", name: "Poland" },
  { code: "ua", name: "Ukraine" },
  { code: "tr", name: "Turkey" },
  { code: "eg", name: "Egypt" },
  { code: "sa", name: "Saudi Arabia" },
  { code: "ae", name: "United Arab Emirates" },
  { code: "il", name: "Israel" },
  { code: "ir", name: "Iran" },
  { code: "iq", name: "Iraq" },
  { code: "pk", name: "Pakistan" },
  { code: "bd", name: "Bangladesh" },
  { code: "lk", name: "Sri Lanka" },
  { code: "np", name: "Nepal" },
  { code: "bt", name: "Bhutan" },
  { code: "th", name: "Thailand" },
  { code: "vn", name: "Vietnam" },
  { code: "id", name: "Indonesia" },
  { code: "my", name: "Malaysia" },
  { code: "sg", name: "Singapore" },
  { code: "ph", name: "Philippines" },
  { code: "kr", name: "South Korea" },
  { code: "kp", name: "North Korea" },
  { code: "nz", name: "New Zealand" },
  { code: "ke", name: "Kenya" },
  { code: "ng", name: "Nigeria" },
  { code: "gh", name: "Ghana" },
  { code: "et", name: "Ethiopia" },
  { code: "ma", name: "Morocco" },
  { code: "dz", name: "Algeria" },
  { code: "cl", name: "Chile" },
  { code: "co", name: "Colombia" },
  { code: "pe", name: "Peru" },
  { code: "ve", name: "Venezuela" },
  { code: "cu", name: "Cuba" },
  { code: "jm", name: "Jamaica" },
  { code: "at", name: "Austria" },
  { code: "cz", name: "Czechia" },
  { code: "hu", name: "Hungary" },
  { code: "ro", name: "Romania" },
  { code: "is", name: "Iceland" },
  { code: "qa", name: "Qatar" },
  { code: "kw", name: "Kuwait" },
] as const;

const CODE_SET = new Set(COUNTRIES.map((c) => c.code));

export function isValidFlagCode(code: string): boolean {
  return CODE_SET.has(code.toLowerCase());
}

export function countryName(code: string): string | undefined {
  return COUNTRIES.find((c) => c.code === code.toLowerCase())?.name;
}

// 320px-wide PNG of the real flag. Used as the reference the drawing is scored
// against and shown on reveal. w320 keeps it light; the scorer downscales it
// to GRID×GRID anyway. The code is stripped to ISO-style [a-z] so a value that
// reached here from the DOM (e.g. a <select>) can't inject URL/HTML meta-chars
// into the image src (CodeQL js/xss-through-dom).
export function flagRefUrl(code: string): string {
  const safe = code.toLowerCase().replace(/[^a-z]/g, "");
  return `https://flagcdn.com/w320/${safe}.png`;
}
