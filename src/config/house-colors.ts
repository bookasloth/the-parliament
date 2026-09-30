// Status-bar / PWA theme colors per JNV house, mirroring the --color-house-*
// tokens in globals.css. Used to tint the mobile status bar to the member's
// house so it reads as their colour instead of one flat brand blue.
// Keyed by lowercased house name.
export const HOUSE_COLORS: Record<string, string> = {
  aravali: "#5a9bd5", // blue
  nilgiri: "#70ad47", // green
  shiwalik: "#e8503a", // red
  shivalik: "#e8503a", // red (alt spelling)
  udaigiri: "#ffe135", // yellow
  indira: "#ff9933", // orange
  laxmi: "#e75480", // pink
  // Alternate house naming used at some schools.
  jawahar: "#5a9bd5",
  tilak: "#70ad47",
  subhash: "#e8503a",
  rajiv: "#ffe135",
}

/** House name → hex colour, or null when unknown/missing (keep brand default). */
export function houseColor(name: string | null | undefined): string | null {
  if (!name) return null
  return HOUSE_COLORS[name.trim().toLowerCase()] ?? null
}
