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

export type ChatDecoration = "none" | "snow" | "tricolour" | "diwali"

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
  /** Annual recurring window; omitted for the default theme */
  schedule?: ChatThemeSchedule
  enabled: boolean
  /** Color chips shown in the admin theme list */
  swatch: string[]
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
  if (!s) return "Always on"
  return `${MONTHS[s.startMonth - 1]} ${s.startDay} – ${MONTHS[s.endMonth - 1]} ${s.endDay}`
}
