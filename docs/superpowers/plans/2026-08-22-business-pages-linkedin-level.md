# Business Pages → LinkedIn Company-Page level (public + SEO)

**Decided:** LinkedIn *company-page* shape (not GMB storefront). Public core + **gated extras**
(full reviews list, contact details, follower list need login). Write actions always gated.

**Reuse baseline:** the profile-style page already shipped —
`components/shared/profile-kit.tsx` (`Card`/`SectionTitle`/`SocialLinks`),
`business/[slug]/business-view.tsx` (header + tab shell + rating rail),
`modules/business/service.ts` (`upsertReview`, `isValidRating`).

---

## Phase 1a — Public + SEO (NO migration) ← building now
Biggest ROI, uses only existing `Business` fields.

- **Un-gate:** middleware `PRIVATE_PREFIXES` `/business` → `/business/new` (gate creation only;
  directory + detail become public). Pages already use `optionalUser`/`auth()`, so guests render.
- **Gated extras:** `loadBusiness` passes `isAuthed`. Logged-out sees name, category, description,
  website, rating summary + first 3 reviews. Email/phone + full review list → "Sign in to view".
- **SEO:**
  - `generateMetadata` on `[slug]` — title/description/canonical/OpenGraph.
  - **JSON-LD** `Organization` + `aggregateRating` + `review[]` (`<script type=application/ld+json>`).
  - Per-business `opengraph-image.tsx` (reuse `renderOgCard` + `bannerArt`).
  - `sitemap.ts` → emit approved business slugs.
- Dedupe the metadata+page query with React `cache()`.

## Phase 1b — LinkedIn company fields (migration)
Schema adds on `Business`:
`tagline`, `industry`, `foundedYear`, `employeeSize`, `socialLinks Json` (reuse `SocialLinks`),
`headquarters`. New model **`BusinessFollower`** (userId + businessId, unique) → follower count +
follow button (client island, mirrors `FollowButton`). Header gains follower count; About tab gains
Overview (industry/size/founded/HQ).

## Phase 2 — Social layer
- **`BusinessPost`** model → page updates/posts (render with a trimmed `FeedCard`).
- **Review replies** (owner responds) + "helpful" count.
- **Photos** — `BusinessPhoto` (R2), gallery tab.

## Phase 3 — Claim / verify
`claimedByUserId` + `verifiedAt`. "Claim this business" flow for seeded/unclaimed listings;
verified badge in header.

---

### Notes / ceilings
- Page stays server-rendered dynamic (auth() reads cookies). Google still gets full HTML; ISR is a
  perf-only follow-up if these pages get hot — revalidateTag on the existing `businesses` tag.
- Migrations run manually (no DB access): Phase 1b/2/3 ship prisma schema edits + hand-run SQL.
- `/business/[slug]/edit` route still unbuilt — owner Edit button links ahead of it.
