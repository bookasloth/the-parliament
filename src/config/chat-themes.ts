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

/** Explicit calendar window (inclusive), ISO `YYYY-MM-DD`. Used for movable
 *  festivals (Diwali, Holi, Eid) whose Gregorian date shifts every year, so a
 *  recurring month-day `schedule` can't express them. */
export interface DateWindow {
  start: string
  end: string
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
  /** Explicit per-year windows for movable festivals; take priority over
   *  `schedule`. When set, the theme lights up only on these exact dates. */
  windows?: DateWindow[]
  /** Time-of-day window (24h, end exclusive) — e.g. Midnight active 00:00–06:00.
   *  Lowest priority: only applies when no festival/holiday matches. */
  hours?: { start: number; end: number }
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
  description: "The standard NNAWCA chat appearance, used outside festive windows.",
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
    // Movable (Kartik Amavasya) — real Lakshmi Puja dates, day-before → day-of.
    windows: [
      { start: "2026-11-07", end: "2026-11-09" },
      { start: "2027-10-28", end: "2027-10-30" },
      { start: "2028-10-16", end: "2028-10-18" },
      { start: "2029-11-04", end: "2029-11-06" },
      { start: "2030-10-25", end: "2030-10-27" },
      { start: "2031-11-13", end: "2031-11-15" },
      { start: "2032-11-01", end: "2032-11-03" },
      { start: "2033-10-21", end: "2033-10-23" },
      { start: "2034-11-09", end: "2034-11-11" },
      { start: "2035-10-29", end: "2035-10-31" },
    ],
    enabled: true,
    swatch: ["#ffd119", "#d4a800", "#3a2410"],
    dark: true,
  },

  /* ---------------- Expanded theme library ---------------- */

  {
    id: "valentine",
    name: "Love",
    description: "Rosy pink bubbles with floating hearts — Valentine's week (hidden for under-18 students).",
    sent: { background: "#ff4d6d", color: "#ffffff" },
    received: { background: "#ffe0e9", color: "#c9184a" },
    conversationBackground: "linear-gradient(180deg, #fff0f3 0%, #ffe5ec 100%)",
    decoration: "hearts",
    dividerColor: "#ff4d6d",
    // Full Valentine's week.
    schedule: { startMonth: 2, startDay: 8, endMonth: 2, endDay: 14 },
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
    // Movable (Phalguna Purnima) — Holika Dahan → Rangwali Holi.
    windows: [
      { start: "2026-03-03", end: "2026-03-04" },
      { start: "2027-03-22", end: "2027-03-23" },
      { start: "2028-03-11", end: "2028-03-12" },
      { start: "2029-03-01", end: "2029-03-02" },
      { start: "2030-03-20", end: "2030-03-21" },
      { start: "2031-03-09", end: "2031-03-10" },
      { start: "2032-03-26", end: "2032-03-27" },
      { start: "2033-03-15", end: "2033-03-16" },
      { start: "2034-03-04", end: "2034-03-05" },
      { start: "2035-03-23", end: "2035-03-24" },
    ],
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
    description: "Deep green night with crescent moon and golden bubbles — Eid al-Fitr & Eid al-Adha.",
    sent: { background: "linear-gradient(135deg, #1f7a4d, #0e5c38)", color: "#ffffff" },
    received: { background: "#08251a", color: "#ffe580" },
    conversationBackground: "radial-gradient(circle at 50% 0%, #0c3b27 0%, #051f15 100%)",
    decoration: "crescent",
    dividerColor: "#d4a800",
    // Movable (Islamic calendar, moon-sighting ±1 day). Both Eids per year.
    windows: [
      // Eid al-Fitr
      { start: "2026-03-20", end: "2026-03-21" },
      { start: "2027-03-09", end: "2027-03-10" },
      { start: "2028-02-26", end: "2028-02-27" },
      { start: "2029-02-14", end: "2029-02-15" },
      { start: "2030-02-04", end: "2030-02-05" },
      { start: "2031-01-24", end: "2031-01-25" },
      { start: "2032-01-14", end: "2032-01-15" },
      // Eid al-Adha
      { start: "2026-05-27", end: "2026-05-28" },
      { start: "2027-05-16", end: "2027-05-17" },
      { start: "2028-05-05", end: "2028-05-06" },
      { start: "2029-04-24", end: "2029-04-25" },
      { start: "2030-04-13", end: "2030-04-14" },
      { start: "2031-04-02", end: "2031-04-03" },
      { start: "2032-03-22", end: "2032-03-23" },
      // Eid windows run to 2032. 2033+ shift into two-per-Gregorian-year and
      // depend on moon-sighting too far out to fix reliably — an admin adds
      // them once each year's dates are confirmed.
    ],
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
    description: "Rainbow accents to celebrate Pride Month — all of June.",
    sent: { background: "#7a4fe0", color: "#ffffff" },
    received: { background: "#ffffff", color: "#5a2ec0" },
    conversationBackground:
      "linear-gradient(135deg, rgba(228,3,3,0.12), rgba(255,140,0,0.12), rgba(255,237,0,0.12), rgba(0,128,38,0.12), rgba(0,77,255,0.12), rgba(117,7,135,0.12))",
    decoration: "none",
    dividerColor: "#7a4fe0",
    schedule: { startMonth: 6, startDay: 1, endMonth: 6, endDay: 30 },
    enabled: true,
    swatch: ["#e40303", "#ff8c00", "#008026", "#004dff"],
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Calm dark theme with a starlit sky — late night (12 AM–6 AM).",
    sent: { background: "#3b3f8f", color: "#ffffff" },
    received: { background: "#1a1a2e", color: "#c7c9ff" },
    conversationBackground: "radial-gradient(circle at 50% 0%, #1a1a2e 0%, #0a0a18 100%)",
    decoration: "stars",
    dividerColor: "#8b8fd6",
    hours: { start: 0, end: 6 },
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

/** Local calendar date as `YYYY-MM-DD` (not UTC — matches the viewer's day). */
function isoDay(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** True if the theme is scheduled to appear on its own (window, annual, or hours). */
export function isScheduled(t: ChatTheme): boolean {
  return !!(t.windows?.length || t.schedule || t.hours)
}

/** True if a date-of-birth falls yesterday, today, or tomorrow (month/day). */
export function isBirthdayNear(dob: Date | null | undefined, now: Date = new Date()): boolean {
  if (!dob) return false
  const md = (dt: Date) => (dt.getMonth() + 1) * 100 + dt.getDate()
  const day = (offset: number) => md(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset))
  const b = md(dob)
  return b === day(-1) || b === day(0) || b === day(1)
}

/** Whole years elapsed since `dob` as of `now`. */
export function ageYears(dob: Date, now: Date = new Date()): number {
  let age = now.getFullYear() - dob.getFullYear()
  const beforeBirthday =
    now.getMonth() < dob.getMonth() ||
    (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
  if (beforeBirthday) age--
  return age
}

export interface ThemeContext {
  /** Either chat participant has a birthday yesterday/today/tomorrow. */
  birthday?: boolean
  /** Viewer is a student under 18 — suppress the Valentine (Love) theme. */
  suppressValentine?: boolean
  /** Theme set to resolve against (defaults to FESTIVE_THEMES). */
  themes?: ChatTheme[]
}

/**
 * Resolve the theme active on a given date/time for a given conversation.
 * Priority: birthday → dated windows (movable festivals) → annual holidays →
 * time-of-day (late-night Midnight) → default. The Valentine theme is skipped
 * when `suppressValentine` (under-18 student).
 */
export function getActiveTheme(date: Date, ctx: ThemeContext = {}): ChatTheme {
  const themes = ctx.themes ?? FESTIVE_THEMES
  const enabled = (id: string) => themes.find((t) => t.id === id && t.enabled)

  // 0 — Birthday of either participant beats every calendar theme.
  if (ctx.birthday) {
    const bday = enabled("birthday")
    if (bday) return bday
  }

  const iso = isoDay(date)

  // 1 — explicit dated windows (movable festivals land on exact days).
  for (const t of themes) {
    if (!t.enabled || !t.windows?.length) continue
    if (t.windows.some((w) => iso >= w.start && iso <= w.end)) return t
  }

  // 2 — annual recurring month-day schedules (fixed-date holidays).
  const val = (date.getMonth() + 1) * 100 + date.getDate()
  for (const t of themes) {
    if (!t.enabled || !t.schedule) continue
    if (t.id === "valentine" && ctx.suppressValentine) continue
    const start = t.schedule.startMonth * 100 + t.schedule.startDay
    const end = t.schedule.endMonth * 100 + t.schedule.endDay
    const inWindow = start <= end ? val >= start && val <= end : val >= start || val <= end
    if (inWindow) return t
  }

  // 3 — time-of-day ambience (Midnight), lowest priority.
  const hour = date.getHours()
  for (const t of themes) {
    if (!t.enabled || !t.hours) continue
    const { start, end } = t.hours
    const inHours = start <= end ? hour >= start && hour < end : hour >= start || hour < end
    if (inHours) return t
  }

  return DEFAULT_THEME
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

/** Human label for a theme's timing. Prefers the next upcoming dated window
 *  (movable festivals), else the annual month-day range, else on-demand. */
export function formatSchedule(theme: ChatTheme | ChatThemeSchedule | undefined, now: Date = new Date()): string {
  // Back-compat: callers passing a bare schedule.
  const s = theme && "startMonth" in theme ? (theme as ChatThemeSchedule) : undefined
  const t = theme && "id" in theme ? (theme as ChatTheme) : undefined

  if (t?.windows?.length) {
    const iso = isoDay(now)
    const upcoming = [...t.windows].sort((a, b) => a.start.localeCompare(b.start)).find((w) => w.end >= iso)
    const w = upcoming ?? t.windows[t.windows.length - 1]
    const start = new Date(`${w.start}T00:00:00`)
    const end = new Date(`${w.end}T00:00:00`)
    const y = start.getFullYear()
    if (w.start === w.end) return `${MONTHS[start.getMonth()]} ${start.getDate()}, ${y}`
    return `${MONTHS[start.getMonth()]} ${start.getDate()} – ${MONTHS[end.getMonth()]} ${end.getDate()}, ${y}`
  }

  if (t?.hours) {
    const fmt = (h: number) => `${((h + 11) % 12) + 1} ${h < 12 ? "AM" : "PM"}`
    return `${fmt(t.hours.start)}–${fmt(t.hours.end)}`
  }

  const sched = s ?? t?.schedule
  if (!sched) return "On-demand"
  return `${MONTHS[sched.startMonth - 1]} ${sched.startDay} – ${MONTHS[sched.endMonth - 1]} ${sched.endDay}`
}

/**
 * Admin-editable overrides for the static theme set, persisted as one JSON blob
 * in the `AdminSetting` KV store (key `chat_themes`). Only the two fields the
 * admin UI actually edits are overridable — `enabled` and the annual `schedule`.
 * Everything else (colors, decorations, windows) stays code-owned.
 */
export type ThemeOverride = { enabled?: boolean; schedule?: ChatThemeSchedule }
export type ThemeOverrides = Record<string, ThemeOverride>

/** Apply persisted admin overrides onto the base theme set. Unknown ids are
 *  ignored so a stale saved blob can never resurrect a removed theme. */
export function mergeThemeOverrides(
  overrides: ThemeOverrides | null | undefined,
  base: ChatTheme[] = FESTIVE_THEMES,
): ChatTheme[] {
  if (!overrides) return base
  return base.map((t) => {
    const o = overrides[t.id]
    if (!o) return t
    return {
      ...t,
      ...(o.enabled !== undefined ? { enabled: o.enabled } : {}),
      ...(o.schedule && t.schedule ? { schedule: { ...t.schedule, ...o.schedule } } : {}),
    }
  })
}

/** Reduce a full theme set down to the persistable override blob. */
export function extractThemeOverrides(themes: ChatTheme[], base: ChatTheme[] = FESTIVE_THEMES): ThemeOverrides {
  const out: ThemeOverrides = {}
  for (const t of themes) {
    const b = base.find((x) => x.id === t.id)
    if (!b) continue
    const o: ThemeOverride = {}
    if (t.enabled !== b.enabled) o.enabled = t.enabled
    if (t.schedule && b.schedule && (
      t.schedule.startMonth !== b.schedule.startMonth || t.schedule.startDay !== b.schedule.startDay ||
      t.schedule.endMonth !== b.schedule.endMonth || t.schedule.endDay !== b.schedule.endDay
    )) o.schedule = t.schedule
    if (o.enabled !== undefined || o.schedule) out[t.id] = o
  }
  return out
}
