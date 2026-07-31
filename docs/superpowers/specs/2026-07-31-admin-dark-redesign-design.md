# Admin Console — Dark Redesign (UI-first) Design Spec

**Date:** 2026-07-31
**Status:** Approved. Build order: **UI for every page first, wire to real data after.**

## Goal
Redesign the admin console to a dark, dense, enterprise look (references: Resend
+ Supabase dashboards) with Poppins everywhere, duotone multicolour icons, and a
blue primary CTA. Phase 1 = the design system + shell + reskin **every** admin
page (UI only; existing mock/real data untouched). Phase 2 (separate) = wire
pages to real Prisma data.

## Scope
- **In (Phase 1):** dark tokens; Poppins across admin; Phosphor duotone icons
  (admin only); rebuilt `admin-ui.tsx` primitives; new dark `admin-shell` +
  `layout`; reskin of all ~20 admin pages to the new primitives keeping their
  current data (mock stays mock, real stays real).
- **Out (Phase 2, later):** wiring mock pages to Prisma; new admin functionality;
  the member-facing app (stays light, keeps lucide).

## Design tokens (dark)
- Surfaces: page `#0a0a0a` (zinc-950); cards/panels `#111113` (zinc-900); sidebar
  `#0a0a0a` with a right hairline `zinc-800`. Borders: `zinc-800`, 1px.
- Text: primary `zinc-100`; muted `zinc-400`; micro-labels `zinc-500`
  UPPERCASE `tracking-wider text-[11px]` (Supabase style).
- Accents: **primary CTA = blue-600** (hover blue-500, focus ring blue-500/40);
  secondary = ghost with `zinc-700` border; danger = rose-600; success/active =
  emerald. Per-section icon tints (users=blue, moderation=rose,
  membership=violet, karma=amber, events=sky, growth=emerald).
- Radius: cards `rounded-lg` (8px); controls `rounded-md` (6px).
- Density (Resend): body 13px, table cells 12–13px, compact row height (~40px),
  section dividers with a header label.
- Implemented as admin-scoped CSS (a `.admin-dark` wrapper or the admin `layout`
  setting the dark surface + `font-admin`), NOT global — the member app is
  unaffected.

## Typography
Poppins everywhere in admin. Poppins is already wired (`@/lib/fonts` exports
`poppins`). The admin `layout` applies Poppins as the admin font (via a CSS var
/ class on the admin root), overriding the app's Plus-Jakarta-headings default
within `/admin`.

## Icons — Phosphor duotone
Add dependency **`@phosphor-icons/react`** (duotone weight). Used **only** under
`src/app/admin/**`. Member app keeps `lucide-react`. Duotone gives the two-tone
"multicolour" look; section/status color is applied via the icon's `color` +
the duotone secondary opacity.

## Shell (`src/app/admin/admin-shell.tsx` + `layout.tsx`)
- Left sidebar ~220px, dark: brand/org switcher top; grouped nav
  (Overview · Community · Moderation · Growth · System) each item = duotone icon
  + label; active = subtle blue-tinted bg + 2px left blue accent + brighter text.
- Top bar: breadcrumb (section / page), a search affordance (`⌘K` styling, no
  functionality required Phase 1), profile menu.
- Content region: dark, generous max width, dense.
- Preserve current routes + admin auth gate (middleware `isAdmin` unchanged).

## Primitives (rebuild `src/app/admin/admin-ui.tsx`, dark)
Keep the **same export names and prop shapes** wherever possible so page reskins
are minimal:
- `PageHeader({title, description, actions})` — dark.
- `StatCard` — Supabase micro-label (UPPERCASE) + large `tabular-nums` value +
  optional delta; duotone icon chip with section accent.
- `Table` / table primitives — compact dark rows, muted header row, hover, right-
  aligned row-action slot. (Add a small `Table`/`Th`/`Td` set if pages currently
  hand-roll tables; otherwise provide row/cell helpers.)
- `StatusBadge({status})` — dark variants of the existing status→color map
  (emerald/amber/rose/sky/violet/zinc), pill with 1px border.
- `Button({variant})` — `primary` (blue), `ghost` (bordered), `danger` (rose),
  `subtle`; sizes sm/md.
- `SectionHeader({title, action?})` — Resend-style labelled divider.
- `EmptyState`, `Modal` (dark), `ComingSoon` (dark).

## Per-page reskin (all ~20 pages)
For each admin page, swap to the rebuilt primitives + dark classes; **do not
change its data source** (mock arrays stay, real services stay). Pages:
dashboard, users, verification, moderation, membership, karma, themes, events,
groups, businesses, jobs, games, rewards, messaging, notifications, analytics,
audit-logs, settings, + the index/`page.tsx`. Coming-soon stubs get the dark
`ComingSoon`. Payments: a **new** page under membership area — since it has no
mock, Phase 1 builds its UI with a small local placeholder dataset (wired for
real in Phase 2).

## Testing
- `tsc --noEmit` = 0 after each change.
- E2E: extend the Playwright smoke to assert `/admin` (as admin — or at least the
  redirect for non-admins) and that a couple of admin pages render without page
  errors. (Admin auth in E2E is limited; at minimum assert non-admin → redirect,
  and that the shell/tokens compile + render on a seeded admin if feasible.)
- Visual correctness (dark look, density, icons) is **manual** — reviewed in the
  running app; a mockup/screenshot pass by the user.
- No unit/integration tests for pure-presentational reskins (YAGNI); primitives
  with any logic (e.g. `StatusBadge` mapping) get a tiny unit test.

## Phasing (build order)
1. **Phase 1 (this plan):** dep + tokens + font + shell + primitives, then reskin
   every page group-by-group. Ships a fully dark, consistent admin (UI complete;
   data as-is).
2. **Phase 2 (later):** wire the mock pages to Prisma, per page/group, on top of
   the finished UI. Its own spec + plan.

## Housekeeping
Update `CLAUDE.md` admin section: "dark theme; Poppins; Phosphor **duotone**
multicolour icons (admin only, member app keeps lucide); **blue** primary CTA;
`admin-ui.tsx` dark primitives." Remove the old "slate + indigo / avoid emoji /
lucide" wording for admin.

## Out of scope
Member app restyle; new admin features/permissions; real-data wiring (Phase 2);
search/⌘K functionality; charts library changes.
