import type { Permission } from "@/modules/admin/permissions"

/**
 * In-app Help Center content — typed data, NOT markdown. Each guide is a
 * role-filtered task walkthrough. `slug` is a stable id used for deep-links
 * (`/admin/help#slug`) and for the topbar "?" → guide mapping (`guideForPath`).
 *
 * Visibility mirrors the nav rule (computed in the Help Center page):
 *   guide shows if  adminOnly ? user.isAdmin : permission ? can(user, permission) : true
 *
 * To add a guide: append a `Guide` entry below. It auto-appears in the Help
 * Center (role-filtered) and becomes the topbar "?" target for its `href`.
 */
export interface Guide {
  slug: string // stable id, used for deep-links (#slug) and route->guide mapping
  title: string
  section: string // group label, e.g. "Members", "Content"
  summary: string // one line
  permission?: Permission
  adminOnly?: boolean
  steps: string[] // ordered, imperative
  href?: string // the admin page this guide is about, e.g. "/admin/verification"
}

export const GUIDES: Guide[] = [
  {
    slug: "verify-member",
    title: "Verify a member",
    section: "Members",
    summary: "Review a pending verification and approve or reject it with a reason.",
    permission: "verification:review",
    href: "/admin/verification",
    steps: [
      "Open Verification from the Community section — the queue lists members whose status is pending.",
      "Click a request to open its detail: submitted proof, JNV batch/house, and any notes.",
      "Cross-check the claimed batch and school against the evidence provided.",
      "Approve to mark the member verified, or Reject and enter a clear reason (the member sees it).",
      "The action is logged to the audit trail; the member is notified of the outcome.",
    ],
  },
  {
    slug: "suspend-member",
    title: "Suspend an account",
    section: "Members",
    summary: "Suspend a member with a reason and optional duration, and how to lift it.",
    permission: "members:moderate",
    href: "/admin/users",
    steps: [
      "Open Users, search for the member, and open their row actions.",
      "Choose Suspend, enter a reason, and optionally set a duration (leave blank for indefinite).",
      "Confirm — the account is blocked from signing in until reinstated or the duration lapses.",
      "To lift it early, reopen the member and choose Reinstate; the reason is recorded.",
      "Every suspend/reinstate writes an audit entry with the actor and reason.",
    ],
  },
  {
    slug: "resolve-report",
    title: "Resolve a report",
    section: "Content",
    summary: "Claim a report cluster, pick an outcome, and add the required note.",
    permission: "reports:resolve",
    href: "/admin/reports",
    steps: [
      "Open Reports — reports are grouped into clusters by the content they target.",
      "Claim a cluster so other moderators know it is being handled.",
      "Review the reported content and the reporters' reasons.",
      "Pick an outcome: Dismiss, Warn the author, Hide, or Remove the content.",
      "Add the required resolution note explaining the decision, then submit.",
    ],
  },
  {
    slug: "moderate-content",
    title: "Hide or remove content",
    section: "Content",
    summary: "Take down a reported post by hiding or removing it.",
    permission: "content:moderate",
    href: "/admin/moderation",
    steps: [
      "Open Moderation to see reported posts awaiting a decision.",
      "Open the post to read it in full with its report context.",
      "Hide to make it invisible to members while keeping it recoverable.",
      "Remove to take it down permanently when it clearly breaks the rules.",
      "The author is notified and the decision is written to the audit log.",
    ],
  },
  {
    slug: "broadcast-announcement",
    title: "Broadcast an announcement",
    section: "Content",
    summary: "Compose and send an announcement to all active members.",
    permission: "announcements:send",
    href: "/admin/notifications",
    steps: [
      "Open Announcements and start a new broadcast.",
      "Write a clear title and body; keep it concise — it reaches every active member.",
      "Preview the message to confirm formatting before sending.",
      "Send — delivery is rate-limited, so wait for confirmation rather than resending.",
      "Sent broadcasts are logged; check the history before composing a follow-up.",
    ],
  },
  {
    slug: "cms-publish",
    title: "Publish a CMS page",
    section: "Content",
    summary: "Create or edit a page, save a version, and publish, unpublish, or revert.",
    permission: "cms:manage",
    href: "/admin/pages",
    steps: [
      "Open CMS Pages and create a new page or open an existing one to edit.",
      "Edit the content and Save — each save snapshots a new version you can revert to.",
      "Publish to make the page live, or Unpublish to pull it while keeping the draft.",
      "Use Revert to restore an earlier saved version if a change was wrong.",
      "Verify the live page after publishing.",
    ],
  },
  {
    slug: "grant-admin-role",
    title: "Grant or revoke an admin role",
    section: "Members",
    summary: "Assign or remove an admin role; some actions are super_admin only.",
    adminOnly: true,
    href: "/admin/users",
    steps: [
      "Open Users and find the member who should gain or lose console access.",
      "Open their admin roles and add or remove a role (admin, moderator, support, analyst).",
      "The role decides per-action rights via the permission matrix — grant the least needed.",
      "Granting or revoking super_admin, and impersonation/hard-delete, are super_admin-only.",
      "Changes take effect on the member's next request and are audited.",
    ],
  },
  {
    slug: "adjust-karma",
    title: "Adjust a member's karma",
    section: "Members",
    summary: "Apply a manual karma adjustment with a reason.",
    permission: "members:edit",
    href: "/admin/users",
    steps: [
      "Open Users and open the member whose karma you need to correct.",
      "Choose the karma adjustment action and enter the delta (positive or negative).",
      "Enter a reason — manual adjustments require one and it is shown in the ledger.",
      "Submit; the adjustment is recorded as a ledger entry, not a silent overwrite.",
      "Re-check the member's karma to confirm the new balance.",
    ],
  },
  {
    slug: "manage-business",
    title: "Manage a business listing",
    section: "Revenue",
    summary: "Approve, reject, or suspend an alumni business listing.",
    adminOnly: true,
    href: "/admin/businesses",
    steps: [
      "Open Businesses to see submitted and live listings.",
      "Open a pending listing and review its details for accuracy and policy fit.",
      "Approve to publish it to the directory, or Reject with a reason if it fails review.",
      "Suspend a live listing to pull it if a problem surfaces later.",
      "Each decision is audited with the actor and reason.",
    ],
  },
  {
    slug: "read-audit-log",
    title: "Read the audit log",
    section: "System",
    summary: "Filter admin actions by actor or action and read before/after values.",
    permission: "audit:read",
    href: "/admin/audit-logs",
    steps: [
      "Open Audit Logs — every admin mutation is recorded as an entry.",
      "Filter by actor to see one admin's actions, or by action to see one kind of change.",
      "Open an entry to see its before/after: the prior and new values of what changed.",
      "Use the timestamp and actor to reconstruct who did what and when.",
      "Audit entries are read-only — they cannot be edited or deleted.",
    ],
  },
  {
    slug: "change-settings",
    title: "Change console settings",
    section: "System",
    summary: "Edit a settings section and save (super_admin only).",
    permission: "settings:manage",
    href: "/admin/settings",
    steps: [
      "Open Settings — sections group related configuration.",
      "Edit the fields in a section; changes are staged until you save.",
      "Save the section to apply — only super_admins can save settings changes.",
      "Confirm the change took effect; settings edits are audited.",
    ],
  },
  {
    slug: "navigate-console",
    title: "Find your way around the console",
    section: "Getting started",
    summary: "The rail, secondary sidebar, command palette, breadcrumbs, and badges.",
    steps: [
      "The icon rail on the left switches sections; each icon opens that section's first page.",
      "The secondary sidebar lists the pages within the active section — the current one is highlighted.",
      "Press ⌘K (Ctrl+K) to open the command palette and jump to any page by name.",
      "Breadcrumbs at the top show where you are and let you step back up.",
      "A badge dot on a nav item flags items needing attention (e.g. a pending queue).",
      "The ? button in the topbar opens the guide for the page you are on.",
    ],
  },
]

/**
 * The guide documenting the page at `pathname` = the guide whose `href` is the
 * longest prefix of `pathname`. So `/admin/users/123` resolves to the users
 * guide, and the most specific href wins when several match. Pure — no prisma.
 */
export function guideForPath(pathname: string): Guide | undefined {
  let best: Guide | undefined
  let bestLen = -1
  for (const g of GUIDES) {
    if (!g.href) continue
    const matches = pathname === g.href || pathname.startsWith(g.href + "/")
    if (matches && g.href.length > bestLen) {
      best = g
      bestLen = g.href.length
    }
  }
  return best
}
