# Admin Dark Redesign (Phase 1: UI) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reskin the entire admin console to a dark, dense look (Resend + Supabase references) — Poppins everywhere, Phosphor duotone icons, blue primary CTA — via a rebuilt design system + shell, applied to every page. UI only; data unchanged (wiring is Phase 2).

**Architecture:** A dark, admin-scoped theme (not global — member app stays light). Rebuild the shared `src/app/admin/admin-ui.tsx` primitives and `admin-shell.tsx` dark, keeping export names/prop shapes so page reskins are minimal. Then reskin each page group to the new primitives + dark classes, preserving its existing data/logic.

**Tech Stack:** Next.js 16 App Router, Tailwind, Poppins (`@/lib/fonts`, `--font-body`), new dep `@phosphor-icons/react` (duotone, admin only). Member app keeps `lucide-react`.

## Global Constraints
- **Admin only.** All dark styling + Phosphor icons live under `src/app/admin/**`. Never touch member-facing components or make the theme global.
- **Tokens:** page `#0a0a0a`; cards `#111113`; borders `zinc-800`; text primary `zinc-100`, muted `zinc-400`, micro-label `zinc-500 uppercase tracking-wider text-[11px]`. Primary CTA **blue-600** (hover blue-500). Danger rose-600. Success/active emerald. Radius: cards `rounded-lg`, controls `rounded-md`. Body 13px, table cells 12–13px, compact rows.
- **Icons:** `@phosphor-icons/react` duotone weight (`weight="duotone"`), colored per section (users=blue, moderation=rose, membership=violet, karma=amber, events=sky, growth/overview=emerald, system=zinc).
- **Font:** Poppins for ALL admin text incl. headings (app default heading font is Plus Jakarta — override within admin).
- **Preserve:** every page's routes, data source (mock stays mock, real stays real), and the admin auth gate in `layout.tsx` (`auth()` + `isAdmin`). Do NOT wire mock pages to Prisma in this phase.
- **Verification:** `npx tsc --noEmit` = 0 after every task. Visual correctness is manual (running app). No tests for pure-presentational reskins; primitives with logic (StatusBadge map) get one tiny unit test.
- Keep the same component export names/props in `admin-ui.tsx` so pages need minimal edits.

---

### Task 1: Dependency + dark theme foundation + Poppins

**Files:**
- Modify: `package.json` (add dep), `src/app/globals.css` (admin dark scope), `src/app/admin/layout.tsx` (wrap admin root), possibly `src/lib/fonts.ts` (add Poppins 700 weight).

**Interfaces:**
- Produces: an `.admin-root` wrapper (dark surface + Poppins) that every admin page renders inside; the Phosphor dep available.

- [ ] **Step 1: Add the icon dependency**

Run: `npm i @phosphor-icons/react`
Expected: installs; `package-lock.json` updated.

- [ ] **Step 2: Ensure Poppins has a bold weight for headings**

In `src/lib/fonts.ts`, change the `poppins` `weight` array to `["400", "500", "600", "700"]` (adds 700 for headings).

- [ ] **Step 3: Add admin dark scope to `globals.css`**

Append an admin-scoped block (NOT global). Example:

```css
/* Admin console — dark, Poppins, scoped to .admin-root only */
.admin-root {
  --admin-bg: #0a0a0a;
  --admin-panel: #111113;
  --admin-border: #27272a; /* zinc-800 */
  background: var(--admin-bg);
  color: #f4f4f5; /* zinc-100 */
  font-family: var(--font-body), ui-sans-serif, system-ui, sans-serif; /* Poppins */
  min-height: 100dvh;
}
.admin-root h1, .admin-root h2, .admin-root h3 { font-family: var(--font-body); }
```

- [ ] **Step 4: Wrap the admin shell in `.admin-root`**

In `src/app/admin/layout.tsx`, wrap the returned `<AdminShell>` in `<div className="admin-root">…</div>` (or add the class inside AdminShell's outermost element in Task 3 — pick one; do it here on the layout's returned element for now). Keep the `auth()`/`isAdmin` gate unchanged.

- [ ] **Step 5: Verify**

Run: `npx tsc --noEmit` → 0 errors. (Visual: manual — the admin pages should now render on a near-black background with Poppins.)

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/lib/fonts.ts src/app/globals.css "src/app/admin/layout.tsx"
git commit -m "Admin: dark theme scope + Phosphor duotone dep + Poppins"
```

---

### Task 2: Rebuild `admin-ui.tsx` primitives (dark)

**Files:**
- Modify: `src/app/admin/admin-ui.tsx` (rebuild all exports dark; add `Button`, `SectionHeader`, `Table`/`Th`/`Td`, `EmptyState`, `Modal`).
- Test: `tests/admin-ui.test.ts` (tiny — StatusBadge mapping only).

**Interfaces:**
- Produces (keep existing names + props, add new): `PageHeader`, `StatCard`, `StatusBadge`, `ComingSoon`, `LineChart`, `BarChart`, `ProgressBar` (recolored for dark), plus new `Button({ variant?: "primary"|"ghost"|"danger"|"subtle"; size?: "sm"|"md" })`, `SectionHeader({ title, action? })`, `Table`/`Thead`/`Tbody`/`Tr`/`Th`/`Td`, `EmptyState({ icon, title, description, action? })`, `Modal({ open, onClose, title, children })`. Import icons from `@phosphor-icons/react` (`weight="duotone"`).

- [ ] **Step 1: Rebuild presentational primitives dark.** Convert every existing export's classes: `bg-white`→`bg-[#111113]`, `border-slate-200`→`border-zinc-800`, `text-slate-900`→`text-zinc-100`, `text-slate-500`→`text-zinc-400`, accents indigo→blue for CTAs. `StatCard` micro-label = `text-[11px] uppercase tracking-wider text-zinc-500`; value `text-zinc-100`. Chart default colors → blue `#3b82f6` etc. `ComingSoon` dark. Replace lucide imports with Phosphor duotone equivalents (e.g. `CaretLeft`, `Wrench`/`Hammer`, `CheckCircle`).

- [ ] **Step 2: Add `Button`** — primary = `bg-blue-600 hover:bg-blue-500 text-white`, ghost = `border border-zinc-700 text-zinc-200 hover:bg-zinc-800`, danger = `bg-rose-600 hover:bg-rose-500 text-white`, subtle = `text-zinc-300 hover:bg-zinc-800`; sizes `sm` (`h-8 px-3 text-xs`) / `md` (`h-9 px-4 text-sm`); `rounded-md font-medium`.

- [ ] **Step 3: Add `SectionHeader`** — Resend-style: `text-sm font-semibold text-zinc-200` + optional right `action`, with a `border-b border-zinc-800 pb-2 mb-3`.

- [ ] **Step 4: Add `Table` set** — dark compact table: `Table` = `w-full text-sm`; `Th` = `text-left text-[11px] uppercase tracking-wider text-zinc-500 font-medium py-2 px-3`; `Td` = `py-2.5 px-3 text-zinc-300 border-t border-zinc-800`; `Tr` hover `hover:bg-zinc-900/50`.

- [ ] **Step 5: Add `EmptyState` + `Modal`** (dark).

- [ ] **Step 6: Rebuild `StatusBadge` dark** — keep the same status→semantic-color map but dark variants, e.g. `active/verified/...` = `bg-emerald-950/50 text-emerald-300 border-emerald-800`; amber/rose/sky/violet/zinc equivalents; default `bg-zinc-800 text-zinc-300 border-zinc-700`. Keep `capitalize` pill.

- [ ] **Step 7: Write the StatusBadge unit test** — `tests/admin-ui.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { statusBadgeClass } from "@/app/admin/admin-ui"; // export the map fn for testability

describe("statusBadgeClass", () => {
  it("maps known statuses to their semantic color and falls back for unknown", () => {
    expect(statusBadgeClass("active")).toContain("emerald");
    expect(statusBadgeClass("rejected")).toContain("rose");
    expect(statusBadgeClass("totally-unknown")).toContain("zinc"); // default
  });
});
```
(Extract the class lookup into an exported `statusBadgeClass(status: string): string` used by `StatusBadge`.)

- [ ] **Step 8: Verify.** Run: `npx tsc --noEmit` (0) and `npm test` (the new test passes). Commit:

```bash
git add "src/app/admin/admin-ui.tsx" tests/admin-ui.test.ts
git commit -m "Admin: rebuild admin-ui primitives dark (+ Button/Table/SectionHeader/Modal/EmptyState)"
```

---

### Task 3: Rebuild the shell (`admin-shell.tsx`) dark + duotone nav

**Files:** Modify `src/app/admin/admin-shell.tsx`.

**Interfaces:** Consumes the `.admin-root` scope (Task 1) and `AdminIdentity` (unchanged). Keep the `NAV` groups + routes + `badge`/`soon` flags.

- [ ] **Step 1: Dark sidebar** — `bg-[#0a0a0a] border-r border-zinc-800 w-[220px]`; group labels `text-[10px] uppercase tracking-widest text-zinc-600`; nav item `text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 rounded-md`; **active** = `bg-blue-950/40 text-zinc-100` + a 2px left blue accent bar; `badge` pill = `bg-zinc-800 text-zinc-300` (or blue for counts); `soon` = muted + a tiny "Soon" tag.
- [ ] **Step 2: Duotone icons** — replace each lucide icon in `NAV` with a Phosphor duotone equivalent (`House`, `ChartBar`, `Users`, `ShieldCheck`, `UsersThree`, `CalendarDots`, `Flag`, `Megaphone`, `CreditCard`, `Storefront`, `Briefcase`, `Sparkle`, `Palette`, `Trophy`, `GameController`, `ChatsCircle`, `Gear`, `Scroll`), `weight="duotone"`, colored per section accent.
- [ ] **Step 3: Top bar** — dark: breadcrumb (section / page) left, a `⌘K`-styled search affordance (non-functional this phase) + profile menu (initials avatar) right; `border-b border-zinc-800`.
- [ ] **Step 4: Content region** — `bg-[#0a0a0a]` main with padding; keep responsive/mobile drawer if present (dark it).
- [ ] **Step 5: Verify.** `npx tsc --noEmit` (0). Manual: sidebar dark, active item blue, duotone icons. Commit `git commit -am "Admin: dark shell + duotone nav + top bar"` (stage only admin-shell.tsx).

---

### Task 4: Reskin Overview — dashboard + analytics

**Files:** `src/app/admin/page.tsx`, `src/app/admin/dashboard-client.tsx`, `src/app/admin/analytics/page.tsx`.

- [ ] **Step 1:** Swap to dark primitives: `StatCard` grid (Supabase micro-labels), `LineChart`/`BarChart` (blue), `SectionHeader` for panels, `Table` for recent-activity. Keep existing (mock) data arrays. Apply dark classes to any bespoke wrappers (`bg-[#111113] border-zinc-800 rounded-lg`).
- [ ] **Step 2:** Analytics: if `ComingSoon`, use the dark `ComingSoon`; else reskin its cards/charts.
- [ ] **Step 3: Verify.** `npx tsc --noEmit` (0). Commit (stage only these files) `git commit -m "Admin: reskin dashboard + analytics (dark)"`.

---

### Task 5: Reskin Community — users + verification + groups + events

**Files:** `src/app/admin/users/users-client.tsx` (+ `users/page.tsx` if present), `src/app/admin/verification/page.tsx`, `src/app/admin/groups/page.tsx`, `src/app/admin/events/page.tsx` (+ `events/create-event-modal.tsx`).

- [ ] **Step 1:** Convert each list to the dark `Table` primitives + `StatusBadge` + `Button` (row actions = ghost/subtle; primary actions = blue). Search/filter inputs → dark (`bg-[#111113] border-zinc-800 text-zinc-200 placeholder-zinc-500`). `PageHeader` + `SectionHeader`. **Keep all existing data + handlers** — presentation only. The event create modal → dark `Modal`.
- [ ] **Step 2: Verify.** `npx tsc --noEmit` (0). Commit `git commit -m "Admin: reskin users/verification/groups/events (dark)"` (stage only these).

---

### Task 6: Reskin Moderation + Announcements

**Files:** `src/app/admin/moderation/page.tsx`, `src/app/admin/notifications/page.tsx`.

- [ ] **Step 1:** Moderation reports → dark `Table` + `StatusBadge` + resolve actions (`Button` danger/ghost) + a dark `Modal` for resolution if present. Notifications/announcements: reskin or dark `ComingSoon`. Keep data/handlers.
- [ ] **Step 2: Verify + commit** `git commit -m "Admin: reskin moderation + announcements (dark)"` (stage only these).

---

### Task 7: Reskin Growth — membership + Payments (new) + businesses + jobs

**Files:** `src/app/admin/membership/page.tsx`, **new** `src/app/admin/payments/page.tsx`, `src/app/admin/businesses/page.tsx`, `src/app/admin/jobs/page.tsx`. Add a Payments nav entry in `admin-shell.tsx` (Growth group).

- [ ] **Step 1:** Reskin membership dark. **Create `payments/page.tsx`** — a new dark page modeled on the Resend/table layout (a payments/transactions table + summary StatCards) using a **small local placeholder dataset** (`const PAYMENTS = [...]` — a few rows; a comment `// ponytail: placeholder — wired to real Razorpay/Payment data in Phase 2`). Add its nav item (duotone `Receipt` icon). Businesses/jobs: dark `ComingSoon` or reskin.
- [ ] **Step 2: Verify + commit** `git commit -m "Admin: reskin membership + new Payments page + businesses/jobs (dark)"` (stage only these).

---

### Task 8: Reskin System-of-features — karma + themes + rewards + games + messaging

**Files:** `src/app/admin/karma/page.tsx`, `src/app/admin/themes/page.tsx`, `src/app/admin/rewards/page.tsx`, `src/app/admin/games/page.tsx`, `src/app/admin/messaging/page.tsx`.

- [ ] **Step 1:** Reskin karma (thresholds table/inputs dark) + themes (theme cards dark) to primitives; rewards/games/messaging → dark `ComingSoon` or reskin. Keep data/handlers.
- [ ] **Step 2: Verify + commit** `git commit -m "Admin: reskin karma/themes/rewards/games/messaging (dark)"` (stage only these).

---

### Task 9: Reskin System — settings + audit-logs

**Files:** `src/app/admin/settings/page.tsx`, `src/app/admin/audit-logs/page.tsx`.

- [ ] **Step 1:** Settings form controls dark (inputs/toggles/`Button`); audit-logs → dark `Table` or `ComingSoon`. Keep data.
- [ ] **Step 2: Verify + commit** `git commit -m "Admin: reskin settings + audit-logs (dark)"` (stage only these).

---

### Task 10: Sweep, docs, E2E, final verify

**Files:** any remaining page still on light classes; `CLAUDE.md`; `e2e/smoke.spec.ts`.

- [ ] **Step 1: Grep for leftover light classes in admin** — `grep -rn "bg-white\|text-slate-\|border-slate-\|text-indigo-\|bg-indigo-" src/app/admin` → reskin any stragglers to the dark tokens. (Some may be intentional inside charts — judge.)
- [ ] **Step 2: Confirm no lucide left in admin** — `grep -rn "lucide-react" src/app/admin` → should be empty (all Phosphor now).
- [ ] **Step 3: Update `CLAUDE.md`** admin section: dark theme; Poppins everywhere; Phosphor **duotone** multicolour icons (admin only — member app keeps lucide); **blue** primary CTA; `admin-ui.tsx` dark primitives (Button/Table/SectionHeader/Modal/EmptyState). Remove the old "slate + indigo / avoid emoji / lucide" admin wording. Note Payments page exists with placeholder data (Phase 2 wires it).
- [ ] **Step 4: Extend E2E** — in `e2e/smoke.spec.ts` add: logged-out `/admin` → redirects to `/auth/signin` (middleware gate). (Full admin render needs an admin session — out of smoke scope; note it.)
- [ ] **Step 5: Full verify** — `npx tsc --noEmit` (0), `npm test` (unit incl. admin-ui test green), `npm run test:integration` (unchanged, green), `npm run test:e2e` (smoke green).
- [ ] **Step 6: Commit** `git commit -m "Admin: dark redesign sweep + docs + e2e"` (stage only changed files; NOT the untracked PERF_PLAN.md).

---

## Verification (whole phase)
- `npx tsc --noEmit` → 0; `npm test` unit green; integration green; e2e smoke green.
- Manual: every admin page renders dark, Poppins, duotone icons, blue CTA; density matches the references; member app unchanged (still light).
- No `lucide-react` and no light `bg-white/slate/indigo` classes remain under `src/app/admin`.

## Deferred to Phase 2
Wiring mock admin pages (moderation, membership, karma, events, groups, dashboard, Payments, …) to real Prisma data. Its own spec + plan.
