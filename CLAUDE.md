# The Parliament — JNV Nagpur Alumni Network (NNAWCA)

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
- **File storage:** Cloudflare R2 (S3-compatible)
- **Package manager:** npm

## Project Structure
```
src/
  middleware.ts # Route protection + onboarding gate (active redirect layer)
  app/          # Next.js App Router routes
    (auth)/     # Auth route group (signin, signup)
    (main)/     # Authenticated route group (dashboard, feed, profile/[username], settings)
    (onboarding)/ # Onboarding wizard route group (/onboarding/[step])
    api/        # Route handlers (auth, onboarding, houses, schools, membership)
  components/   # Shared UI components
    homepage/   # Landing page sections
    onboarding/ # Onboarding wizard steps (OnboardingWizard + StepX)
    shared/     # Cross-feature components (AlumniProfileCard)
  config/       # App configuration (karma.ts, env.ts, schools.ts)
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
- Import from `@/generated/prisma` (NOT `@prisma/client`)
- Client singleton in `src/lib/prisma.ts` (uses `@prisma/adapter-pg`)
- `prisma.config.ts` contains the config — `datasource.url` from `process.env.DATABASE_URL`
- After schema changes: `npx prisma generate && npx prisma migrate dev --name <name>`
- PrismaClient requires `{ adapter: new PrismaPg(pool) }` in constructor
- Recently added model groups: onboarding/interests (`Interest`, `UserInterest`, `OnboardingProgress`), feed engagement (`SavedPost`, `PostAward`, `Poll`/`PollOption`/`PollVote`, `Hashtag`/`PostHashtag`), `Notification`, and per-school `KarmaThreshold`. `Post` now carries denormalized `upvoteCount`/`downvoteCount`/`commentCount`/`shareCount`.

### Auth
- Auth.js config in `src/lib/auth.ts` — **Google OAuth + Credentials** providers
- Sign-in page at `/auth/signin`, sign-up at `/auth/signup`
- Route protection + onboarding gate in `src/middleware.ts` (matcher-configured; this is the active layer). The older root `proxy.ts` predates it and is now redundant.
- Session via JWT — user ID in `token.sub`. Session/JWT augmented with `username`, `onboardingStep`, `onboardingCompleted`, `membershipStatus` (typed in `src/types/next-auth.d.ts`, populated in the `jwt`/`session` callbacks)
- `username` is auto-generated (slug from name + uniqueness suffix) on both credentials signup and first Google sign-in — see `generateUsername`/`ensureUniqueUsername`
- User model fields: `legalName` (not `name`), `passwordHash` (not `hashedPassword`)
- School is optional at signup (`schoolId String?`); new users default `status: "active"`, `onboardingStep: "profile"`
- ⚠️ **Auth is currently commented out for UI testing** in `src/middleware.ts` and the `/api/onboarding/*` route handlers — all routes are public and onboarding saves return mocked success. Re-enable (uncomment) before shipping.

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
DATABASE_URL
AUTH_SECRET, AUTH_URL
RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET
R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET  # when Google OAuth is configured
```

## Karma System (from `src/config/karma.ts`)
- Thresholds: 0 Reader · 25 Commenter · 50 Poster · 100 Poller · 250 Group Leader · 500 Mentor
- Thresholds are also persisted per-school in the `KarmaThreshold` model (DB-backed, seeded from the config defaults) to support future multi-school overrides
- Content: like (1/1), comment (1.5/2), share (2/3), downvote (0/-2 or 0/-1)
- Caps: 30 likes/day, 20 comments/day, 10 shares/day, 5 pair-likes/24h, -10 negative/day
- 80% karma retained on unlock spend
- Game karma hard-capped at 0

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
