/**
 * Festive chat themes.
 *
 * Each theme restyles the conversation pane (message bubbles + background +
 * decorations) for a window of days. The window is annual and recurring,
 * expressed as a start/end month-day. Admins schedule/adjust these on the
 * /admin/themes page; the chat reads the active theme via getActiveTheme().
 *
 * No backend yet — schedules live here as config and are previewable/editable
 * in the admin UI with local state.
 */

export type ChatDecoration =
  | "none"
  | "snow"
  | "tricolour"
  | "diwali"
  | "hearts"
  | "confetti"
  | "rain"
  | "petals"
  | "bubbles"
  | "leaves"
  | "stars"
  | "crescent"

export interface BubbleStyle {
  /** CSS background (solid or gradient) */
  background: string
  /** Text color */
  color: string
}

export interface ChatThemeSchedule {
  /** 1-12 */
  startMonth: number
  startDay: number
  endMonth: number
  endDay: number
}

export interface ChatTheme {
  id: string
  name: string
  description: string
  /** Outgoing (your) message bubble */
  sent: BubbleStyle
  /** Incoming (their) message bubble */
  received: BubbleStyle
  /** CSS background applied to the scrollable conversation area */
  conversationBackground?: string
  /** Animated overlay drawn over the conversation area */
  decoration: ChatDecoration
  /** Color for the date dividers + subtle accents */
  dividerColor: string
  /** Annual recurring window; omitted for mood/on-demand themes */
  schedule?: ChatThemeSchedule
  enabled: boolean
  /** Color chips shown in the admin theme list */
  swatch: string[]
  /** Dark conversation background — switches timestamp/divider text to light */
  dark?: boolean
}

/** Standard, always-on theme. Matches the messaging template: brand sent bubbles,
 *  light received bubbles with brand-colored text. */
export const DEFAULT_THEME: ChatTheme = {
  id: "default",
  name: "Default",
  description: "The standard Parliament chat appearance, used outside festive windows.",
  sent: { background: "#009ae4", color: "#ffffff" },
  received: { background: "#f1f5f9", color: "#007bb8" },
  decoration: "none",
  dividerColor: "#94a3b8",
  enabled: true,
  swatch: ["#009ae4", "#f1f5f9"],
}

export const FESTIVE_THEMES: ChatTheme[] = [
  {
    id: "christmas",
    name: "Christmas",
    description: "Red & green festive bubbles with gently falling snow.",
    sent: { background: "#0e7a3a", color: "#ffffff" },
    received: { background: "#c0392b", color: "#ffffff" },
    conversationBackground: "linear-gradient(180deg, #fdf3f3 0%, #f2faf4 100%)",
    decoration: "snow",
    dividerColor: "#c0392b",
    schedule: { startMonth: 12, startDay: 20, endMonth: 12, endDay: 26 },
    enabled: true,
    swatch: ["#0e7a3a", "#c0392b", "#ffffff"],
  },
  {
    id: "republic-day",
    name: "Republic Day",
    description: "Tricolour background, navy text, Ashoka chakra watermark — 26 January.",
    sent: { background: "#1a3a6b", color: "#ffffff" },
    received: { background: "#ffffff", color: "#1a3a6b" },
    conversationBackground:
      "linear-gradient(180deg, rgba(255,153,51,0.20) 0%, rgba(255,255,255,0.65) 50%, rgba(19,136,8,0.20) 100%)",
    decoration: "tricolour",
    dividerColor: "#1a3a6b",
    schedule: { startMonth: 1, startDay: 24, endMonth: 1, endDay: 26 },
    enabled: true,
    swatch: ["#FF9933", "#ffffff", "#138808"],
  },
  {
    id: "independence-day",
    name: "Independence Day",
    description: "Tricolour background, navy text, Ashoka chakra watermark — 15 August.",
    sent: { background: "#1a3a6b", color: "#ffffff" },
    received: { background: "#ffffff", color: "#1a3a6b" },
    conversationBackground:
      "linear-gradient(180deg, rgba(255,153,51,0.20) 0%, rgba(255,255,255,0.65) 50%, rgba(19,136,8,0.20) 100%)",
    decoration: "tricolour",
    dividerColor: "#1a3a6b",
    schedule: { startMonth: 8, startDay: 13, endMonth: 8, endDay: 15 },
    enabled: true,
    swatch: ["#FF9933", "#ffffff", "#138808"],
  },
  {
    id: "diwali",
    name: "Diwali",
    description: "Warm diya-lit background with glowing golden bubbles and sparkles.",
    sent: { background: "linear-gradient(135deg, #ffd119, #d4a800)", color: "#3a2410" },
    received: { background: "#3a2410", color: "#ffd86b" },
    conversationBackground: "radial-gradient(circle at 50% 0%, #2a1505 0%, #190d03 100%)",
    decoration: "diwali",
    dividerColor: "#d4a800",
    // Diwali shifts each year — admins set the exact window. Placeholder ~early Nov.
    schedule: { startMonth: 10, startDay: 29, endMonth: 11, endDay: 3 },
    enabled: true,
    swatch: ["#ffd119", "#d4a800", "#3a2410"],
    dark: true,
  },

  /* ---------------- Expanded theme library ---------------- */

  {
    id: "valentine",
    name: "Love",
    description: "Rosy pink bubbles with floating hearts — Valentine's week.",
    sent: { background: "#ff4d6d", color: "#ffffff" },
    received: { background: "#ffe0e9", color: "#c9184a" },
    conversationBackground: "linear-gradient(180deg, #fff0f3 0%, #ffe5ec 100%)",
    decoration: "hearts",
    dividerColor: "#ff4d6d",
    schedule: { startMonth: 2, startDay: 12, endMonth: 2, endDay: 14 },
    enabled: true,
    swatch: ["#ff4d6d", "#ffe0e9", "#c9184a"],
  },
  {
    id: "new-year",
    name: "New Year",
    description: "Midnight navy with golden bubbles and confetti — 31 Dec to 1 Jan.",
    sent: { background: "linear-gradient(135deg, #ffd119, #d4a800)", color: "#1a1a2e" },
    received: { background: "#1b1b3a", color: "#ffe580" },
    conversationBackground: "radial-gradient(circle at 50% 0%, #1b1b3a 0%, #0a0a1f 100%)",
    decoration: "confetti",
    dividerColor: "#ffd119",
    schedule: { startMonth: 12, startDay: 31, endMonth: 1, endDay: 1 },
    enabled: true,
    swatch: ["#ffd119", "#1b1b3a", "#ff5d8f"],
    dark: true,
  },
  {
    id: "holi",
    name: "Holi",
    description: "A splash of colour for the festival of colours.",
    sent: { background: "#7a4fe0", color: "#ffffff" },
    received: { background: "#ffffff", color: "#d6336c" },
    conversationBackground:
      "linear-gradient(135deg, rgba(214,51,108,0.15), rgba(122,79,224,0.15), rgba(45,158,91,0.15), rgba(255,209,25,0.15))",
    decoration: "confetti",
    dividerColor: "#7a4fe0",
    schedule: { startMonth: 3, startDay: 13, endMonth: 3, endDay: 14 },
    enabled: true,
    swatch: ["#d6336c", "#7a4fe0", "#2d9e5b", "#ffd119"],
  },
  {
    id: "spring",
    name: "Spring Bloom",
    description: "Fresh greens and blossom petals drifting down.",
    sent: { background: "#2e9e5b", color: "#ffffff" },
    received: { background: "#fdeef3", color: "#2e9e5b" },
    conversationBackground: "linear-gradient(180deg, #f3fbf5 0%, #fdeef3 100%)",
    decoration: "petals",
    dividerColor: "#2e9e5b",
    schedule: { startMonth: 3, startDay: 20, endMonth: 4, endDay: 10 },
    enabled: true,
    swatch: ["#2e9e5b", "#ffb3c6", "#fdeef3"],
  },
  {
    id: "monsoon",
    name: "Monsoon",
    description: "Cool blue-grey tones with gentle falling rain.",
    sent: { background: "#2f6f9e", color: "#ffffff" },
    received: { background: "#eef4f8", color: "#1b3a4b" },
    conversationBackground: "linear-gradient(180deg, #dfe9f0 0%, #eef4f8 100%)",
    decoration: "rain",
    dividerColor: "#2f6f9e",
    schedule: { startMonth: 7, startDay: 1, endMonth: 7, endDay: 31 },
    enabled: true,
    swatch: ["#2f6f9e", "#9ec5e8", "#eef4f8"],
  },
  {
    id: "summer",
    name: "Summer Sunset",
    description: "Warm coral-to-pink sunset gradient.",
    sent: { background: "linear-gradient(135deg, #ff8a5b, #e75480)", color: "#ffffff" },
    received: { background: "#fff3ec", color: "#c2410c" },
    conversationBackground: "linear-gradient(180deg, #fff1e6 0%, #ffe3ec 100%)",
    decoration: "none",
    dividerColor: "#e75480",
    schedule: { startMonth: 5, startDay: 1, endMonth: 5, endDay: 31 },
    enabled: true,
    swatch: ["#ff8a5b", "#e75480", "#fff3ec"],
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Teal waters with rising bubbles — World Oceans Day.",
    sent: { background: "#0aa6b8", color: "#ffffff" },
    received: { background: "#e0f7fa", color: "#036672" },
    conversationBackground: "linear-gradient(180deg, #d8f3f6 0%, #e8fbfd 100%)",
    decoration: "bubbles",
    dividerColor: "#0aa6b8",
    schedule: { startMonth: 6, startDay: 6, endMonth: 6, endDay: 10 },
    enabled: true,
    swatch: ["#0aa6b8", "#80deea", "#e0f7fa"],
  },
  {
    id: "eid",
    name: "Eid",
    description: "Deep green night with crescent moon and golden bubbles.",
    sent: { background: "linear-gradient(135deg, #1f7a4d, #0e5c38)", color: "#ffffff" },
    received: { background: "#08251a", color: "#ffe580" },
    conversationBackground: "radial-gradient(circle at 50% 0%, #0c3b27 0%, #051f15 100%)",
    decoration: "crescent",
    dividerColor: "#d4a800",
    schedule: { startMonth: 4, startDay: 9, endMonth: 4, endDay: 11 },
    enabled: true,
    swatch: ["#1f7a4d", "#d4a800", "#08251a"],
    dark: true,
  },
  {
    id: "forest",
    name: "Forest",
    description: "Earthy greens with drifting leaves — Environment Day.",
    sent: { background: "#3a6b35", color: "#ffffff" },
    received: { background: "#eef5e9", color: "#2f5e2a" },
    conversationBackground: "linear-gradient(180deg, #eef5e9 0%, #e3efdc 100%)",
    decoration: "leaves",
    dividerColor: "#3a6b35",
    schedule: { startMonth: 6, startDay: 4, endMonth: 6, endDay: 6 },
    enabled: true,
    swatch: ["#3a6b35", "#a7c957", "#eef5e9"],
  },
  {
    id: "winter",
    name: "Snowfall",
    description: "Icy blues with quietly falling snow.",
    sent: { background: "#2f6f9e", color: "#ffffff" },
    received: { background: "#eef6fb", color: "#1b4965" },
    conversationBackground: "linear-gradient(180deg, #eaf4fb 0%, #dceefa 100%)",
    decoration: "snow",
    dividerColor: "#5b8fb0",
    schedule: { startMonth: 1, startDay: 6, endMonth: 1, endDay: 31 },
    enabled: true,
    swatch: ["#2f6f9e", "#bde0fe", "#eef6fb"],
  },
  {
    id: "sports",
    name: "Sports",
    description: "Floodlit stadium look — bold red & neon green on dark turf.",
    sent: { background: "#e8503a", color: "#ffffff" },
    received: { background: "#1b2a1b", color: "#a7e34d" },
    conversationBackground: "radial-gradient(circle at 50% 0%, #14301a 0%, #0a160d 100%)",
    decoration: "none",
    dividerColor: "#a7e34d",
    schedule: { startMonth: 8, startDay: 28, endMonth: 8, endDay: 30 },
    enabled: true,
    swatch: ["#e8503a", "#a7e34d", "#14301a"],
    dark: true,
  },
  {
    id: "pride",
    name: "Pride",
    description: "Rainbow accents to celebrate Pride — on-demand.",
    sent: { background: "#7a4fe0", color: "#ffffff" },
    received: { background: "#ffffff", color: "#5a2ec0" },
    conversationBackground:
      "linear-gradient(135deg, rgba(228,3,3,0.12), rgba(255,140,0,0.12), rgba(255,237,0,0.12), rgba(0,128,38,0.12), rgba(0,77,255,0.12), rgba(117,7,135,0.12))",
    decoration: "none",
    dividerColor: "#7a4fe0",
    enabled: true,
    swatch: ["#e40303", "#ff8c00", "#008026", "#004dff"],
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Calm dark theme with a starlit sky — on-demand.",
    sent: { background: "#3b3f8f", color: "#ffffff" },
    received: { background: "#1a1a2e", color: "#c7c9ff" },
    conversationBackground: "radial-gradient(circle at 50% 0%, #1a1a2e 0%, #0a0a18 100%)",
    decoration: "stars",
    dividerColor: "#8b8fd6",
    enabled: true,
    swatch: ["#3b3f8f", "#1a1a2e", "#c7c9ff"],
    dark: true,
  },
  {
    id: "birthday",
    name: "Birthday",
    description: "Confetti-filled celebration theme — on-demand.",
    sent: { background: "#e75480", color: "#ffffff" },
    received: { background: "#fff7e6", color: "#b06a00" },
    conversationBackground: "linear-gradient(180deg, #fff6fb 0%, #fff9e6 100%)",
    decoration: "confetti",
    dividerColor: "#e75480",
    enabled: true,
    swatch: ["#e75480", "#ffd119", "#4dc3ff"],
  },
]

export const ALL_THEMES: ChatTheme[] = [DEFAULT_THEME, ...FESTIVE_THEMES]

/** Resolve the theme active on a given date from the festive windows.
 *  Falls back to DEFAULT_THEME when no festive window matches. */
export function getActiveTheme(date: Date, themes: ChatTheme[] = FESTIVE_THEMES): ChatTheme {
  const val = (date.getMonth() + 1) * 100 + date.getDate()
  for (const t of themes) {
    if (!t.enabled || !t.schedule) continue
    const start = t.schedule.startMonth * 100 + t.schedule.startDay
    const end = t.schedule.endMonth * 100 + t.schedule.endDay
    const inWindow = start <= end ? val >= start && val <= end : val >= start || val <= end
    if (inWindow) return t
  }
  return DEFAULT_THEME
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

export function formatSchedule(s?: ChatThemeSchedule): string {
  if (!s) return "On-demand"
  return `${MONTHS[s.startMonth - 1]} ${s.startDay} – ${MONTHS[s.endMonth - 1]} ${s.endDay}`
}
