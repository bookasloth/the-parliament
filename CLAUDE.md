# The Parliament — JNV Nagpur Alumni Network (NNAWCA)

## Working style (change requests)

- **Execute autonomously.** Do not ask for approval, confirmation, or scope-check on requested changes. The user is solo owner + operator; every gate costs a turn.
- Skip preface like "should I proceed?", "here's the plan — approve?", "confirm before I…". Just do it.
- Skip pre-work scoping paragraphs on batch requests. Do the work, report after.
- Still surface risks / tradeoffs / what was skipped **in the post-work summary**, not as a gate.
- Still confirm destructive git ops beyond the request (force-push to master, hard-reset over uncommitted work, deleting shared branches). Safety rails stay.
- Ask only when the request is genuinely ambiguous — two plausible interpretations that produce different files.

## Stack
- **Framework:** Next.js 16.2.9 (App Router, `src/` directory, Turbopack)
- **Language:** TypeScript (strict)
- **Styling:** Tailwind CSS
- **Database:** PostgreSQL 16 (self-hosted on Hostinger VPS, Docker Compose for local dev)
- **ORM:** Prisma 7.8.0 (`prisma-client` generator, output to `src/generated/prisma`)
- **Auth:** Auth.js (NextAuth beta) with Prisma adapter — JWT strategy
- **Async jobs:** pg-boss
- **Payments:** Razorpay
- **Email:** Hostinger SMTP / Nodemailer
- **File storage:** Cloudflare R2 (`src/lib/r2.ts`) for post media/invoices/onboarding uploads; Supabase Storage (`src/lib/supabase-storage.ts`) for avatars + covers
- **Package manager:** npm

## Project Structure
```
src/
  # NOTE: there is no src/middleware.ts in the active tree. Route protection +
  # onboarding gating happen per-page/per-route via requireUser/optionalUser
  # (src/modules/auth/session.ts). A middleware gate is a possible future refactor.
  app/          # Next.js App Router routes
    (auth)/     # Auth route group (signin, signup)
    (main)/     # Gated route group — shared layout.tsx mounts PrivateNavbar on every page.
                # Pages: feed, profile/[username], profile/edit, connections, directory,
                # companies/[slug], groups (+/[slug]), events (+/[slug] +/register),
                # membership, notifications, settings, compose, feed/[postId] (+/edit +/analytics),
                # messages (master-detail: layout + ChatSidebar + [conversationId])
    (onboarding)/ # Onboarding wizard route group (/onboarding/[step])
    admin/      # Admin console — own layout.tsx (dark #0a0a0a shell, Poppins, blue-600 accent,
                # separate from the member brand-blue). admin-ui.tsx holds shared admin primitives.
                # Built: dashboard, users, verification, moderation, events, groups, membership,
                # karma, themes (festive chat themes), settings. Coming-soon stubs:
                # analytics, businesses, jobs, games, rewards, messaging, notifications, audit-logs
    api/        # Route handlers (auth, onboarding, houses, schools, membership)
  components/   # Shared UI components
    homepage/   # Landing page sections
    onboarding/ # Onboarding wizard steps (OnboardingWizard + StepX)
    shared/     # Cross-feature components — see "Frontend / UI" below
                # (AlumniProfileCard, FeedCard, ComposeTrigger, PrivateNavbar, ChatDecorations)
  config/       # App configuration (karma.ts, env.ts, schools.ts, chat-themes.ts)
  lib/          # Shared utilities (prisma.ts, auth.ts, onboarding.ts, use-autosave.ts)
  types/        # Ambient type decls (next-auth.d.ts — Session/JWT augmentation)
  modules/      # Feature modules
    auth/       # Authentication
    karma/      # Karma reputation system
    feed/       # Content feed
    profile/    # User profiles
    connections/# Connections/follows
    events/     # Events & RSVPs
    business/   # Business directory & reviews
    membership/ # Paid memberships
    groups/     # Groups
    games/      # Games & tournaments
    rewards/    # Badges & rewards
    admin/      # Admin panel
    messaging/  # DMs & conversations
    notifications/ # Notifications
  generated/    # Prisma client (auto-generated, do not edit)
prisma/
  schema.prisma # Full platform schema (50+ models)
  migrations/   # Prisma migrations (latest: onboarding_flow, google_auth_onboarding)
docker/
  docker-compose.yml  # PostgreSQL 16 for local dev
scripts/
  seed.ts       # DB seed script
```

## Key Conventions

### Naming
- Files/directories: `kebab-case`
- Types/interfaces: `PascalCase`
- Functions/variables: `camelCase`
- Prisma models: `PascalCase`, mapped to `snake_case` tables via `@@map`
- Prisma fields: `camelCase`, mapped to `snake_case` columns via `@map`

### Imports
- Use `@/` path alias (maps to `src/`)
- Group imports: built-in → third-party → internal

### Patterns
- **Server Components by default** — use `"use client"` only when you need interactivity
- **Route handlers** for API endpoints under `src/app/api/`
- **Server Actions** for mutations (use `"use server"`)
- **Karma logic** goes in `src/modules/karma/` — all karma values defined in `src/config/karma.ts`
- **Polymorphic relations** (Reaction, ContentReport) use plain fields + app-layer joins (no Prisma FK)

### Prisma
- Generated client (NOT `@prisma/client`). The Prisma 7 `prisma-client` generator's entry point is
  `@/generated/prisma/client` — `src/lib/prisma.ts` imports `PrismaClient` from there. Generated
  types/enums live under `@/generated/prisma/*` (e.g. `models`, `enums`).
- Client singleton in `src/lib/prisma.ts` (uses `@prisma/adapter-pg`)
- `prisma.config.ts` contains the config — `datasource.url` from `process.env.DATABASE_URL`
- After schema changes: `npx prisma generate && npx prisma migrate dev --name <name>`
- PrismaClient requires `{ adapter: new PrismaPg(pool) }` in constructor
- Recently added model groups: onboarding/interests (`Interest`, `UserInterest`, `OnboardingProgress`), feed engagement (`SavedPost`, `PostAward`, `Poll`/`PollOption`/`PollVote`, `Hashtag`/`PostHashtag`), `Notification`, and per-school `KarmaThreshold`. `Post` now carries denormalized `upvoteCount`/`downvoteCount`/`commentCount`/`shareCount`.

### Auth
- Auth.js config in `src/lib/auth.ts` — **Google OAuth + Credentials** providers
- Sign-in page at `/auth/signin`, sign-up at `/auth/signup`
- Route protection + onboarding gating are done **per-page/per-route** via `requireUser`/`optionalUser`/`requireAdmin` (`src/modules/auth/session.ts`). **There is no active `src/middleware.ts`** (a middleware gate is a possible future refactor).
- Session via JWT — user ID in `token.sub`. Session/JWT augmented with `username`, `onboardingStep`, `onboardingCompleted`, `membershipStatus` (typed in `src/types/next-auth.d.ts`, populated in the `jwt`/`session` callbacks)
- `username` is auto-generated (slug from name + uniqueness suffix) on both credentials signup and first Google sign-in — see `generateUsername`/`ensureUniqueUsername`
- User model fields: `legalName` (not `name`), `passwordHash` (not `hashedPassword`)
- School is optional at signup (`schoolId String?`); new users default `status: "active"`, `onboardingStep: "profile"`
- Auth is **enabled** — JWT + onboarding redirects are enforced per-page via the session helpers (see above), not by middleware. (The old root `proxy.ts` is removed.)

### Onboarding
- Multi-step wizard, route group `(onboarding)` → `/onboarding/[step]` rendered by `components/onboarding/OnboardingWizard`
- Steps (canonical order in `src/lib/onboarding.ts`): `profile → jnv → interests → membership → complete`
- `src/lib/onboarding.ts` holds step config, labels, per-step data shapes, and static option lists (gender, status, interests, membership plans)
- Autosave via `src/lib/use-autosave.ts` (debounced POST to `/api/onboarding/save`)
- API under `src/app/api/onboarding/*`: `save`, `progress`, `complete`, plus per-step (`profile`, `jnv`, `interests`, `membership`)
- Progress tracked on `User` (`onboardingStep`, `onboardingCompleted`, `profileCompletion`) and in the `OnboardingProgress` model

### User Model
Key fields (from `prisma/schema.prisma`):
- `id` (UUID), `email`, `username?` (unique, auto-generated), `legalName`, `displayName`, `passwordHash`
- `schoolId?` (optional), `memberType` (defaults to `"alumni"`)
- `dateOfBirth?`, `gender?`, `currentClass?`, `yearsStudied?`, `currentStatus?`, `mobileE164?`
- `status` (default `"active"`), `isVerified`, `verificationStatus` (default `"pending"`)
- Onboarding: `onboardingStep` (default `"profile"`), `onboardingCompleted`, `profileCompletion`
- Membership: `membershipStatus` (default `"free"`), `membershipExpiresAt?`
- JSON blobs: `verificationData?`, `membershipData?`, `connectionsData?`

## Frontend / UI

> Some `(main)` pages still use mock data (`/notifications`, `/connections`,
> `/events`, `/groups`, `/feed/[postId]/*`, `/settings`, `/dashboard`). Wire to Prisma
> as they get built out.

### Layouts & route groups
- **`(main)/layout.tsx`** is a server layout that renders `<PrivateNavbar/>` then the page.
  Every gated page gets the navbar automatically — do **not** add a per-page logo/top bar.
  Add new gated pages under `(main)/` and they inherit it.
- **`PrivateNavbar`** (`components/shared/PrivateNavbar.tsx`): expanding search with Quora-style
  scoped options (Profiles/Posts/Groups/Events/Businesses) + suggested searches, "Get Premium"
  CTA, directory/events/messages icon nav, notifications dropdown, and a profile dropdown whose
  **membership button supports all 6 tiers** and enforces the upgrade flow
  `student → associate → premium → life` (life & committee can't upgrade). Height is `h-14`
  (`3.5rem`) — full-height pages use `h-[calc(100dvh-3.5rem)]`.
- **`admin/layout.tsx`** is a separate console shell (own nav, search, profile), **dark-themed**
  (near-black `#0a0a0a` bg, `#111113` cards, `zinc-800` borders, `zinc-100/400/500` text),
  **Poppins** everywhere, **blue-600** primary CTA — distinct from the member light brand-blue.
  Icons are **`@phosphor-icons/react` duotone** (`weight="duotone"`), coloured per section
  (admin only — the member app keeps `lucide-react`). No emoji icons. Shared dark primitives live
  in `admin-ui.tsx` (`PageHeader`, `StatCard`, `StatusBadge`/`statusBadgeClass`, `Button`, `Table`
  set, `SectionHeader`, `Modal`, `EmptyState`, `ComingSoon`, charts). Design system + per-page
  scope: `docs/superpowers/plans/2026-07-31-admin-dark-redesign.md`. UI is Phase 1; wiring mock
  pages to Prisma is Phase 2.
- **`messages/`** is a master-detail shell: `messages/layout.tsx` (client) renders the chat list
  (`ChatSidebar`) + the conversation/empty-state child. Desktop shows both panes; mobile shows the
  list on `/messages` and the conversation on `/messages/[id]`. Wired to `src/modules/messaging`
  (1:1 DMs, polling delivery); Supabase Realtime + presence are Slice 2.

### Standard page width (consistency rule)
- Full-content / list pages use **`mx-auto max-w-[1400px] px-4 sm:px-6`** — the same width as the
  navbar, so content edges line up with it on every page (feed, directory, connections, events,
  groups, profile/edit, post detail/analytics). Keep new app pages on this standard.
- Narrower tiers (intentional): detail pages w/ sidebar ≈ `max-w-5xl`; centered forms/reading
  (notifications, settings, event registration) ≈ `max-w-2xl`.

### Shared components (`components/shared/`)
- **`AlumniProfileCard`** — the canonical alumni card (membership stripe, batch + house badges,
  square photo, headline, location). Used on the homepage Featured Alumni **and** directory,
  connections, and group member grids. Optional props: `profileHref`, `verified`, `footer`,
  `actions` (keep usages backward-compatible — all are optional). Render grids of these with the
  `FeaturedAlumni` motion-stagger pattern.
- **`FeedCard`** — the one true post card (colored avatar border, membership asterisk, verified
  badge, rich text w/ @mentions & #tags, image grids, polls, quote blocks, question banners, full
  reaction bar with award modal). Use it **everywhere a post renders** (main feed, group feed).
  `FeedPost` type lives here.
- **`ComposeTrigger`** — the standard "add post" entry (avatar + "Start a post…" + Photo/Poll/
  Question/Quote shortcuts). Always links to **`/compose`** (the shared composer). Use it instead
  of bespoke composers.
- **`ChatDecorations`** — animated festive overlay for chat themes (see below).

### Design tokens (`src/app/globals.css`)
- Member brand blue `--color-brand: #009ae4` (+ `brand-50..900`); house colours
  `--color-house-{aravali,nilgiri,shiwalik,udaigiri,indira,laxmi}`; navy/charcoal/gold scales.
- Membership tier colours (stripes/buttons) are duplicated in `AlumniProfileCard` and
  `PrivateNavbar` — student (green radial), associate (blue), premium (deep blue), life (gold
  radial), inactive (grey), committee (pastel gradient).
- Page background is `#f3f2ef`; cards are `bg-white border border-gray-200 rounded-xl`.
- Fonts: Plus Jakarta Sans (headings) + Poppins (body) via CSS vars in `app/layout.tsx`.

### Festive chat themes (`src/config/chat-themes.ts`)
- 18 themes restyle the conversation pane (bubbles + background + decoration) for a date window.
  `getActiveTheme(date)` resolves the live theme; scheduled themes auto-activate, on-demand
  (scheduleless) themes are manual-only. `dark` flag flips timestamp/divider text to light.
- Decorations: a generic floating-glyph renderer (hearts, confetti, rain, petals, bubbles, leaves,
  stars, crescent) + bespoke snow / tricolour-chakra / diwali-diya. Keyframes in `globals.css`
  (`festive-snowfall`, `festive-rise`, `festive-twinkle`, `festive-flicker`). Positions are
  index-derived (no `Math.random`) to avoid hydration mismatch.
- Admins schedule windows + toggle themes at **`/admin/themes`** (local state for now).

## Database
- Local: `docker compose -f docker/docker-compose.yml up -d`
- Connection string: `postgresql://postgres:postgres@localhost:5432/the_parliament`
- Migrate: `npx prisma migrate dev --name <name>`
- Seed: `npx tsx scripts/seed.ts`

## Commands
```bash
npm run dev      # Start dev server
npm run build    # Production build (runs type-check)
npm run lint     # ESLint
```

## Environment Variables (`.env`)
```
DATABASE_URL     # app runtime — Supabase transaction pooler (pgBouncer, port 6543, ?pgbouncer=true)
DIRECT_URL       # migrations/studio — direct/session connection (port 5432); prisma.config.ts prefers this
AUTH_SECRET, AUTH_URL
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET  # when Google OAuth is configured
AISENSY_API_KEY                     # AiSensy WhatsApp (utility templates). Unset = fail-closed, sends no-op.
AISENSY_API_URL                     # optional; defaults to https://backend.aisensy.com/campaign/t1/api/v2
```

## Karma System (from `src/config/karma.ts`)
- Thresholds: 0 Reader · 25 Commenter · 50 Poster · 100 Poller · 250 Group Leader · 500 Mentor
- Thresholds are also persisted per-school in the `KarmaThreshold` model (DB-backed, seeded from the config defaults) to support future multi-school overrides
- Content: like (1/1), comment (1.5/2), share (2/3), downvote (0/-2 or 0/-1)
- Caps: 30 likes/day, 20 comments/day, 10 shares/day, 5 pair-likes/24h, -10 negative/day
- 80% karma retained on unlock spend
- Game karma hard-capped at 0

## Testing (standing rule)
- **Runner:** vitest (`npm test` → `vitest run`). Unit tests live in `tests/*.test.ts`, node env, `@/` alias configured in `vitest.config.ts`. No jsdom/frameworks unless a test needs the DOM. Keep unit tests DB-free (pure logic).
- **Integration tests** (`npm run test:integration` → `vitest.integration.config.ts`) hit a real DB and live in `tests/integration/*.itest.ts`. They run against a throwaway **local** `*_test` database only — `tests/integration/guard.ts` hard-fails if `DATABASE_URL` isn't a localhost `*_test` DB, so the prod Supabase URL can never be touched. Requires local Postgres up: `docker compose -f docker/docker-compose.yml up -d`. `global-setup.ts` creates `the_parliament_test` + `prisma db push`. Override host with `TEST_DATABASE_URL`.
- **When writing/changing a function, route, server action, or lib helper that has real logic, add a test in the same change** — cover the happy path AND edge cases (empty/missing input, boundary values, invalid/tampered input, error branches). Money, karma, auth/authz, and validation paths are mandatory to test.
- **Skip tests** only for trivial one-liners (pass-through getters, static config objects, pure JSX with no logic) — YAGNI applies to tests too. Don't test the framework or Prisma itself.
- Prefer testing pure logic directly (extract it if a route buries it). Set required env vars in the test (e.g. `RAZORPAY_KEY_SECRET`) rather than mocking crypto.
- Coverage priority when catching up: karma ledger, membership tier state-machine, invoice/paise math, gates, rate-limit, onboarding validation, username generation.

## Design Decisions
- Source of truth for scope/stack: `DECISIONS.md`. Client's full feature vision / backlog: `CLIENT_REQUIREMENTS.md` (distilled from the NNAWCA Developer Doc — aspirational, not committed scope).
- Legal entity: **Nagpur Navodaya Alumni Welfare and Charitable Association (NNAWCA)**
- School: Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur (JNV Nagpur)
- School ID codes: **NGP** (Nagpur), **JND** (Jindi) — see `src/config/schools.ts`
- Single school now (JNV Nagpur/NGP) but `school_id` foreign keys everywhere for multi-school future
- Real legal names enforced (no pseudonyms)
- Division is multi-valued with immutable "Nagpur" default
- Minors require guardian consent
- Old 6-level ARS docs archived — only new Karma model (PRD-style) is active
