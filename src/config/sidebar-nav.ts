import {
  UsersRound,
  Bookmark,
  Star,
  Award,
  CreditCard,
  FileText,
  PenLine,
  Users,
  Calendar,
  CalendarDays,
  Gamepad2,
  Type,
  Trophy,
  Crown,
  BadgeCheck,
  Sparkles,
  ArrowDownAZ,
  ShoppingBag,
  type LucideIcon,
} from "lucide-react"

export type SidebarNavItem = {
  label: string
  href: string
  icon: LucideIcon
}

export type SidebarNav = {
  /** Small uppercase label above the list (e.g. "Your content"). */
  heading?: string
  items: SidebarNavItem[]
}

// Default rail — used on any page that doesn't pass its own nav. These are the
// destinations otherwise buried in the profile dropdown.
export const DEFAULT_SIDEBAR_NAV: SidebarNav = {
  heading: "Shortcuts",
  items: [
    { label: "My Groups", href: "/groups", icon: UsersRound },
    { label: "Saved", href: "/saved", icon: Bookmark },
    { label: "Karma", href: "/karma", icon: Star },
    { label: "Achievements", href: "/achievements", icon: Award },
    { label: "Membership", href: "/membership", icon: CreditCard },
    { label: "Shell Store", href: "/store", icon: ShoppingBag },
  ],
}

// Per-page contextual rails. Same card, different data.
// Every href points to a real route or a query the target page already handles.
export const SIDEBAR_NAV = {
  feed: {
    heading: "Your content",
    items: [
      { label: "Saved posts", href: "/saved", icon: Bookmark },
      { label: "Drafts", href: "/compose/drafts", icon: FileText },
      { label: "New post", href: "/compose", icon: PenLine },
      { label: "Membership", href: "/membership", icon: CreditCard },
    ],
  },
  games: {
    heading: "Games",
    items: [
      { label: "All games", href: "/games", icon: Gamepad2 },
      { label: "Alfazy", href: "/games/alfazy", icon: Type },
      { label: "Leaderboard", href: "/games/alfazy/leaderboard", icon: Trophy },
      { label: "Champions", href: "/games/alfazy/champions", icon: Crown },
    ],
  },
  groups: {
    heading: "Explore",
    items: [
      { label: "All groups", href: "/groups", icon: UsersRound },
      { label: "Alumni directory", href: "/community", icon: Users },
      { label: "Events", href: "/events", icon: Calendar },
      { label: "Membership", href: "/membership", icon: CreditCard },
    ],
  },
  events: {
    heading: "Explore",
    items: [
      { label: "All events", href: "/events", icon: CalendarDays },
      { label: "Groups", href: "/groups", icon: UsersRound },
      { label: "Alumni directory", href: "/community", icon: Users },
      { label: "Membership", href: "/membership", icon: CreditCard },
    ],
  },
  community: {
    heading: "Directory",
    items: [
      { label: "All alumni", href: "/community", icon: Users },
      { label: "Verified only", href: "/community?verified=1", icon: BadgeCheck },
      { label: "Newest members", href: "/community?sort=newest", icon: Sparkles },
      { label: "Sort by name", href: "/community?sort=name", icon: ArrowDownAZ },
    ],
  },
} satisfies Record<string, SidebarNav>
