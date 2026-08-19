import type { Permission } from "@/modules/admin/permissions"

/**
 * The single source of truth for admin navigation. Drives the primary rail,
 * the secondary sidebar, and role-scoping (computed in `admin/layout.tsx`).
 * Future consumers: breadcrumbs, section badges, command palette, help index.
 *
 * Visibility rule (applied server-side in the layout):
 *   item shows if  adminOnly ? user.isAdmin : permission ? can(user, permission) : true
 *   section shows if it has >= 1 visible item.
 *
 * `icon` is a phosphor component name resolved by `icon-map.ts` (client-safe).
 * `color` is the section hex used for the rail glyph + active accents.
 */
/** Keys of the live badge counts computed in `admin/layout.tsx`. */
export type BadgeKey = "openReports" | "pendingVerifications"

/** Live count per badge key, threaded from the layout to the nav regions. */
export type Badges = Record<BadgeKey, number>

/** Sum of an item's badge count within a section (for the rail dot). 0 if none. */
export function sectionBadgeCount(section: NavSection, badges: Badges): number {
  return section.items.reduce((n, item) => n + (item.badge ? badges[item.badge] ?? 0 : 0), 0)
}

export interface NavItem {
  label: string
  href: string
  icon: string
  permission?: Permission
  adminOnly?: boolean
  /** Tags a live count (from `badges` prop) to render as a pill/dot. */
  badge?: BadgeKey
}

export interface NavSection {
  key: string
  label: string
  icon: string
  color: string
  items: NavItem[]
}

export const NAV: NavSection[] = [
  {
    key: "overview",
    label: "Overview",
    icon: "Gauge",
    color: "#3b82f6",
    items: [
      { label: "Dashboard", href: "/admin", icon: "House" },
      { label: "Analytics", href: "/admin/analytics", icon: "ChartBar", permission: "analytics:read" },
    ],
  },
  {
    key: "community",
    label: "Community",
    icon: "UsersThree",
    color: "#0ea5e9",
    items: [
      { label: "Users", href: "/admin/users", icon: "Users", permission: "members:read" },
      { label: "Verification", href: "/admin/verification", icon: "ShieldCheck", permission: "verification:read", badge: "pendingVerifications" },
      { label: "Groups", href: "/admin/groups", icon: "UsersThree", permission: "groups:manage" },
      { label: "Events", href: "/admin/events", icon: "CalendarDots", permission: "events:manage" },
      { label: "AMA Sessions", href: "/admin/ama", icon: "VideoCamera", adminOnly: true },
      { label: "Committees", href: "/admin/committees", icon: "Bank", adminOnly: true },
    ],
  },
  {
    key: "content",
    label: "Content",
    icon: "Flag",
    color: "#f43f5e",
    items: [
      { label: "Moderation", href: "/admin/moderation", icon: "Flag", permission: "reports:read", badge: "openReports" },
      { label: "Reports", href: "/admin/reports", icon: "Warning", permission: "reports:read", badge: "openReports" },
      { label: "Announcements", href: "/admin/notifications", icon: "Megaphone", permission: "announcements:send" },
      { label: "CMS Pages", href: "/admin/pages", icon: "FileText", permission: "cms:manage" },
      { label: "Gallery", href: "/admin/gallery", icon: "Images", adminOnly: true },
    ],
  },
  {
    key: "revenue",
    label: "Revenue",
    icon: "CreditCard",
    color: "#8b5cf6",
    items: [
      { label: "Membership", href: "/admin/membership", icon: "CreditCard", adminOnly: true },
      { label: "Contributions", href: "/admin/contributions", icon: "HandHeart", adminOnly: true },
      { label: "Businesses", href: "/admin/businesses", icon: "Storefront", adminOnly: true },
      { label: "Jobs", href: "/admin/jobs", icon: "Briefcase", adminOnly: true },
    ],
  },
  {
    key: "engagement",
    label: "Engagement",
    icon: "Sparkle",
    color: "#f59e0b",
    items: [
      { label: "Karma", href: "/admin/karma", icon: "Sparkle", adminOnly: true },
      { label: "Themes", href: "/admin/themes", icon: "Palette", adminOnly: true },
      { label: "Rewards", href: "/admin/rewards", icon: "Trophy", adminOnly: true },
      { label: "Games", href: "/admin/games", icon: "GameController", adminOnly: true },
      { label: "Messaging", href: "/admin/messaging", icon: "ChatsCircle", adminOnly: true },
      { label: "WhatsApp", href: "/admin/whatsapp", icon: "WhatsappLogo", permission: "whatsapp:send" },
    ],
  },
  {
    key: "system",
    label: "System",
    icon: "Gear",
    color: "#71717a",
    items: [
      { label: "Settings", href: "/admin/settings", icon: "Gear", permission: "settings:manage" },
      { label: "Audit Logs", href: "/admin/audit-logs", icon: "Scroll", permission: "audit:read" },
      { label: "Help", href: "/admin/help", icon: "Question" },
    ],
  },
]

/** True if `href` is the active route for `pathname` (`/admin` exact, else prefix). */
export function itemActive(href: string, pathname: string): boolean {
  return href === "/admin" ? pathname === "/admin" : pathname === href || pathname.startsWith(href + "/")
}

/**
 * The section owning the current path = the one with the longest-prefix item
 * match. Falls back to the first section so the rail always has a selection.
 */
export function activeSection(sections: NavSection[], pathname: string): NavSection | undefined {
  let best: NavSection | undefined
  let bestLen = -1
  for (const section of sections) {
    for (const item of section.items) {
      if (itemActive(item.href, pathname) && item.href.length > bestLen) {
        best = section
        bestLen = item.href.length
      }
    }
  }
  return best ?? sections[0]
}
