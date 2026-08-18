# Admin Console — Developer Guide

Practical reference for working on the admin console (`src/app/admin`). Dark
shell, Poppins, blue-600 accent, `@phosphor-icons/react` icons.

## 1. Architecture

`src/app/admin/nav/nav-config.ts` is the **single contract** for navigation. It
lists sections and items with their icon, color, and access rule. Everything
downstream reads from it: the primary rail, the secondary sidebar, and the
server-side role-scoping in `layout.tsx`. Future consumers (breadcrumbs, section
badges, command palette, help index) should read the same config rather than
hard-coding routes.

Three UI regions:

```
┌────────────────────────────────────────────────────────────┐
│ TOPBAR   logo · search · env badge · notifications · profile│
├──────┬───────────────┬─────────────────────────────────────┤
│ RAIL │  SECONDARY    │                                       │
│ icon │  SIDEBAR      │            PAGE CONTENT               │
│ only │  (items of    │           (scrolls)                   │
│ ~56px│  active sect) │                                       │
│      │  ~220px       │                                       │
└──────┴───────────────┴─────────────────────────────────────┘
```

- `nav-config.ts` — data + pure helpers (`itemActive`, `activeSection`). No JSX.
- `icon-map.ts` — maps the config's string icon names to phosphor components (client-safe).
- `PrimaryRail.tsx` — icon-only sections; active = longest-prefix item match; click → section's first item.
- `SecondarySidebar.tsx` — items of the active section; active item gets a colored left border.
- `Topbar.tsx` — logo, search, env badge, notifications, profile dropdown + signOut.
- `admin-shell.tsx` — composes the three regions; holds only the mobile-drawer toggle.
- `layout.tsx` — the auth gate; filters `NAV` by role and passes the visible sections to the shell.

Visibility rule (computed once, server-side, in `layout.tsx`):

```
item visible = adminOnly ? user.isAdmin : permission ? can(user, permission) : true
section visible = has >= 1 visible item
```

The rail/sidebar never re-check permissions — they render whatever the layout
handed them. **The nav is a convenience, not a security boundary** — every page
and action still enforces its own gate (see §3).

## 2. Add an admin page

1. **Page** — `src/app/admin/<name>/page.tsx`, an async server component:
   ```ts
   export const dynamic = "force-dynamic"
   export default async function Page() { ... }
   ```
2. **Gate** — for a page that mutates or shows sensitive data, call
   `requirePermission("<perm>")` from `@/lib/gate` at the top. Read-only pages
   can lean on the layout's console gate, but prefer an explicit gate.
3. **Mutations** — put them in a sibling `actions.ts` (`"use server"`). Each
   action: `requirePermission(...)` → zod-validate input → do the work →
   `audit({...})` (`@/lib/audit`) → `revalidatePath(...)`.
4. **Nav** — add a `NavItem` to the right section in `nav-config.ts` with its
   `permission` (or `adminOnly: true`). Reuse an existing icon name or add the
   phosphor component to `icon-map.ts`.
5. **Tests** — add a vitest for any real logic (`tests/admin-<name>.test.ts`).
   Because `"use server"` files may only export async functions, keep zod
   schemas in a sibling `schema.ts` and test those directly.
6. **Serialization** — Prisma `Decimal`/`BigInt` don't cross to client
   components. Convert with `Number(...)` / `String(...)` in the server layer.

## 3. RBAC

Five roles in `src/modules/admin/permissions.ts`: `super_admin`, `admin`,
`moderator`, `support`, `analyst`. The `MATRIX` there is the single per-action
grant table — never compare role strings inline; call `can(user, perm)`.

- **`requirePermission(perm)`** (`@/lib/gate`) — the normal page/action gate;
  allows any role granted `perm`.
- **`requireAdmin()`** — stricter; full admins only. Use for pages whose nav
  item is `adminOnly: true`.
- **`adminOnly` nav items** — visible only when `user.isAdmin`. Use this for
  surfaces with no dedicated fine-grained permission yet.
- **Console entry** (`canEnterConsole`) is separate from per-action rights: it
  only decides who reaches `/admin` at all. Inside, each surface re-checks.

## 4. Conventions

- **Dark tokens** — bg `#0a0a0a`, panels `#111113`, borders `zinc-800`, text
  `zinc-100/400/500`, primary `blue-600`. No emoji icons.
- **Primitives** — reuse `admin-ui.tsx` (`PageHeader`, `StatCard`, `Table` set,
  `Modal`, `EmptyState`, `ComingSoon`, `StatusBadge`, charts). Don't re-roll them.
- **`force-dynamic`** on every admin page — the console is never statically cached.
- **Audit everything** — every mutation writes an `audit()` entry.

## 5. Adding a help guide

The in-app Help Center (`/admin/help`) is data-driven. To document a task, add a
`Guide` entry to `src/app/admin/help/guides.ts`:

- `slug` — stable id, used for deep-links (`/admin/help#slug`) and the topbar `?`.
- `section` — group label the card sorts under (e.g. `"Members"`, `"Content"`).
- `permission` **or** `adminOnly` — same visibility rule as the nav; omit both for
  a guide everyone with console access can see.
- `steps` — ordered, imperative strings (rendered as a numbered list, plain text).
- `href` — the admin page the guide is about.

It then auto-appears in the Help Center (role-filtered server-side in `page.tsx`)
and becomes the topbar `?` target for its `href` via `guideForPath(pathname)`
(longest-prefix match). No markdown/HTML — steps are typed data rendered as JSX.
