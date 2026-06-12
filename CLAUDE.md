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
  app/          # Next.js App Router routes
    (auth)/     # Auth route group (signin, signup)
    (main)/     # Authenticated route group
    api/        # Route handlers (API endpoints)
  components/   # Shared UI components
  config/       # App configuration (karma.ts, env.ts)
  lib/          # Shared utilities (prisma.ts, auth.ts, utils.ts)
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
  schema.prisma # Full platform schema (40+ models)
  migrations/   # Prisma migrations
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

### Auth
- Auth.js config in `src/lib/auth.ts`
- Sign-in page at `/auth/signin`, sign-up at `/auth/signup`
- Redirect proxy at root `proxy.ts` (Next.js 16, not middleware)
- Session via JWT — user ID in `token.sub`
- User model fields: `legalName` (not `name`), `passwordHash` (not `hashedPassword`)
- School is optional at signup (`schoolId String?`)

### User Model
Key fields (from `prisma/schema.prisma`):
- `id` (UUID), `email`, `legalName`, `displayName`, `passwordHash`
- `schoolId?` (optional), `memberType` (defaults to `"alumni"`)
- `dateOfBirth?`, `currentClass?`, `mobileE164?`
- `status` (default `"pending"`), `isVerified`

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
- Content: like (1/1), comment (1.5/2), share (2/3), downvote (0/-2 or 0/-1)
- Caps: 30 likes/day, 20 comments/day, 10 shares/day, 5 pair-likes/24h, -10 negative/day
- 80% karma retained on unlock spend
- Game karma hard-capped at 0

## Design Decisions
- Legal entity: **Nagpur Navodaya Alumni Welfare and Charitable Association (NNAWCA)**
- School: Jawahar Navodaya Vidyalaya, Navegaon Khairi, Nagpur (JNV Nagpur)
- School ID codes: **NGP** (Nagpur), **JND** (Jindi) — see `src/config/schools.ts`
- Single school now (JNV Nagpur/NGP) but `school_id` foreign keys everywhere for multi-school future
- Real legal names enforced (no pseudonyms)
- Division is multi-valued with immutable "Nagpur" default
- Minors require guardian consent
- Old 6-level ARS docs archived — only new Karma model (PRD-style) is active
