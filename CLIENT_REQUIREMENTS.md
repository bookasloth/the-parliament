# Client Requirements — NNAWCA Developer Doc

> **Provenance:** Notes distilled from the client-shared `NNAWCA Developer Doc (1).pdf` (72 pages),
> captured **2026-06-12**. This is the client's *full feature vision and direction* — it is **not**
> committed scope. Where it conflicts with [`DECISIONS.md`](DECISIONS.md) (the product/tech source of
> truth) or the frozen Karma spec in [`ALUMNI_REPUTATION_SYSTEM.md`](ALUMNI_REPUTATION_SYSTEM.md),
> **those docs win**. Use this as a backlog / "where we want to go" reference; pull items into
> [`ROADMAP.md`](ROADMAP.md) as they get scheduled.

**Status legend** (current build vs. this vision — best-effort mapping to `prisma/schema.prisma` & `src/`):

- ✅ **Built/modeled** — schema + some app surface exists
- 🟡 **Partial** — schema exists but feature/UI incomplete, or under the "auth-disabled UI testing" flag
- ⬜ **Future** — not yet modeled or built

Houses in the doc are referenced as **R/G/B/Y/Orange/Pink** (6 houses).

---

## Base modules (MVP intent)

### Profile Module ✅🟡
*"The foundation of every user's presence. Clean, rich, editable, house-tagged."*
- Register / log in; select **house (R/G/B/Y/O/P)** during onboarding.
- View / edit profile; upload & change profile picture.
- Add batch, department, email, phone, bio.
- Manage social links (LinkedIn, Instagram, …); toggle WhatsApp update preference.
- View karma points; view badges/milestones (if enabled).
- **Exchange contact details** (mutual-consent — see `DECISIONS.md` contact privacy).
- Admin: edit / verify / deactivate a profile.
- Profile shows house color tag + batch.
- Visibility settings (public/private), incl. on Google.
- *Maps to:* `User`, `Profile`, `House`, onboarding flow (`(onboarding)/`, `lib/onboarding.ts`).

### Events Module 🟡
- View upcoming/past events; RSVP; attend online (Zoom/GMeet links).
- See which house has most attendees; filter by house/batch/location.
- Admin create/edit/delete; tag event house-specific.
- Event page: date/time/venue, host name & house, attendee list.
- Share to social; give post-event feedback; **karma for attendance/hosting**.
- *Maps to:* `Event` (+ `bannerUrl`), RSVP models. UI ⬜.

### My Business (Alumni Business Directory) 🟡
- Add / edit business profile; upload logo, banner, description, website, contact.
- Categories (Food, Tech, Services…); search & filter; reviews/ratings.
- Listing shows owner name + house + batch.
- Admin verify/remove. Karma & perks for: adding business, getting reviews, offering alumni discounts.
- Special badge: **"Alumni Supporting Alumni."**
- *Maps to:* `Business` (+ `city`), reviews. UI ⬜.

### Membership Subscription (Yearly) 🟡
- View plans; buy via **Razorpay / UPI**.
- Tiers (doc): Student, Associate, Premium, Life Member. *(See divergent tier names in sitemap: Associate / Senior / Entrepreneur / Life.)*
- Admin defines cost, duration (1-yr / lifetime), unlocked features.
- Status shown on profile; expiry notifications; **UPI autopay**; upgrade tiers.
- Unlocks: exclusive events, free promotions, premium features.
- Admin dashboard: subscribers, revenue reports, stats by house/batch.
- *Maps to:* `User.membershipStatus / membershipExpiresAt / membershipData`, onboarding membership step, `api/membership/*`. Payment integration ⬜.

### Karma System (Gamified Engagement) ✅
- Karma for: daily login, profile updates, adding business, event participation, referrals, donations…
- View karma history; **house-wise ranking** (e.g., Red House Top 5 Earners).
- Leaderboards: individual karma + house total.
- Redeemable for perks / badges / discounts; admin manual assign/revoke.
- *Maps to:* `config/karma.ts`, `KarmaThreshold`, `UserKarma`, karma ledger. Full rules frozen in `ALUMNI_REPUTATION_SYSTEM.md`. **Authoritative earn rules in the doc are reproduced in [Karma rules](#karma-rules-verbatim-from-doc) below.**

---

## Phase 1 (engagement layer)

### Feeds ✅🟡
- Create post (text/image/video/link); edit/delete own; like; threaded comments; share within platform.
- Filter by house / batch / department / my connections.
- Top 5 trending (by engagement); **"Alumni Spotlight"** (curated or auto-selected top posts).
- Post shows date/time, author, house badge.
- Post types: job openings, business promotions, achievements, announcements.
- Tag other alumni / house / batch.
- Admin: moderate, pin announcements, delete inappropriate.
- *Maps to:* `Post` (+ `upvoteCount/downvoteCount/commentCount/shareCount`), `Comment`, `SavedPost`, `PostAward`, `Poll/PollOption/PollVote`, `Hashtag/PostHashtag`, `(main)/feed/`.

### Connections (Networking) 🟡
- Search by name/batch/house/department/city.
- Contact-exchange requests (auto or manual accept/reject); block users.
- Suggestions by house / batch / shared interests / location.
- Karma for growing network. Admin: most-connected, flag spam.
- *Maps to:* connections module (per CLAUDE.md `modules/connections/`). Schema/UI ⬜🟡.

### Groups (Houses / Batch / City / Department) ⬜
- Types: batch, house, department, custom interest groups.
- Join/leave public; request private; per-group admins/mods (approve/remove/announce).
- Group page: member list, description + banner. Host events, polls, pin content.
- Post/comment in group feed; view my groups + suggested. Notifications. Group chat (future).
- *Maps to:* `modules/groups/` placeholder. Not yet modeled.

---

## Phase 2

### Election Module ⬜
- **Voter:** view live/upcoming elections; candidate profiles (bio, manifesto, video); **vote once** (login + member-verified); eligibility = active member, profile **≥ 80% complete**; countdown timer; email/WhatsApp notifications.
- **Candidate:** self-nominate or be nominated; nomination needs bio, vision statement, photo, optional video; admin approve/reject → profile goes live.
- **Admin:** create/manage multiple elections; set timelines, roles, eligibility; real-time analytics; publish or delay results; anonymous or open voting; export voting data.

### Gamification — Single & Multiplayer Games ⬜
- **Single:** trivia, quiz, memory match, puzzle → karma on level completion; leaderboard; admin-configurable rules/retry-limits/points; mobile-friendly.
- **Multiplayer:** real-time or turn-based (1v1 quiz duel, fastest typer, memory match); karma for winners + consolation; challenge friends or random; admin seasonal tournaments with prizes/badges.
- *Maps to:* `modules/games/` placeholder. Note: **game karma hard-capped at 0** per `config/karma.ts`.

### Karma Store — Redeem Digital Products ⬜
- Browse marketplace; products: eBooks, course access, event VIP passes, certificates, wallpapers, partner discount codes.
- Filter by points/category/latest/popularity; show points balance vs cost.
- Each product: title, description, image, karma cost, optional quantity.
- "Redeem Now" active if enough karma → emailed/downloadable, karma deducted, confirmation; redemption history on profile.
- Admin: add/edit/delete products, set karma value, upload files/links, view redemptions, feature limited-time products.
- *Maps to:* `modules/rewards/` placeholder, `KarmaRedemption`.

### General System Requirements (Phase 2 doc)
- **RBAC** on all modules; secure APIs with **JWT / OAuth2.0**.
- All karma transactions logged in dedicated **Karma Ledger** table.
- **WebSockets or polling** for real-time games & voting leaderboards.
- Store user actions for analytics & future karma adjustment.
- **Responsive (mobile + desktop) mandatory.**

---

## Admin

### Super Admin Feature List ⬜🟡
- **Access & permissions:** create/edit/remove Admin / Sub-Admin / Moderator / Editor roles; assign modules per role (RBAC); set view/edit/delete/approve rights; **impersonate any user** (debugging).
- **User management:** directory w/ filters (batch, role, location, status); edit/delete accounts; reset passwords; activity logs; activate/deactivate; **bulk import/export CSV/Excel**; manual badges/karma; verify/edit business; view karma history.
- **Membership plans:** CRUD tiers; pricing/benefits/durations/discounts; subscription transactions; manual assign; coupons/promo codes; trials & renewal reminders; payment gateways (Razorpay, Stripe…).
- **Elections:** create/manage; positions CRUD; nominee review; nomination counts; enable/disable voting per group/batch/house; live count; publish/delay results; export.
- **CMS:** edit homepage; hero banners; About/Help/Privacy/Terms; custom pages (WYSIWYG); announcements/newsletters; featured stories.
- **Business directory:** approve/reject; feature on homepage; tag Alumni-Owned/Discounted/Partner; categories/tags; assign karma; per-listing stats.
- **Events:** CRUD; assign moderators/hosts; RSVPs/attendees/check-ins; approve speakers; ticketing free/paid; track event donations; reminders.
- **Donation & campaigns:** CRUD campaigns; approve user-submitted; donation slabs & benefits; karma rules per tier; analytics; export for accounting.
- **Scholarships:** create/manage schemes; approve user-created; applications & statuses; manual assign/revoke; analytics; deadlines & eligibility filters.
- **Communication:** bulk email/SMS/WhatsApp; notification templates (event/election/feedback/birthday); newsletter list; scheduled automated messages; test sends; segment by engagement/tags.
- **Chat & messaging:** message logs (moderation); delete content; disable chat globally/per-user; moderate group chats; official announcement channels.
- **Feed & social:** approve/reject posts (if moderation on); feature top posts; delete/report; engagement badges; toggle post types (polls/stories/blogs).
- **Karma store & points:** product CRUD; karma value; redemption limits per user/product; redemption logs; manual karma; adjust history.
- **Reports & analytics:** platform health; user growth/logins/sessions; most engaged; top donors/businesses/contributors; election/event stats; karma leaderboard; export CSV/XLS/PDF; error & crash logs.
- *Maps to:* `modules/admin/` placeholder. Largely ⬜.

### Revenue & Transactions ⬜
- **Clean transaction ledger:** unique txn ID, user + PAN (if required), payment type (Membership/Donation/Event), gross amount, Razorpay fees, GST on fees, net amount, settlement date, refund trail. Export CSV/XLS.
- **GST & tax reports:** taxable revenue (monthly/quarterly), GST collected, GST on gateway charges, ITC summary, refund adjustments, GSTR-ready sheet.
- **Donation compliance:** campaign-wise ledger; named vs anonymous; **80G eligibility tracking**; auto donation receipts (serial number); annual summary per donor.

### Platform Settings ⬜
- Platform name/logos/favicon; primary colors/fonts; enable/disable registration; profile visibility; upload/file-size limits; domain whitelist/blacklist for signups; **karma rules (value per activity)**; maintenance mode.

### Integrations & Plugins ⬜
- Google Analytics, Meta Pixel, Hotjar; email provider (SMTP/Mailgun/Sendgrid); API access mgmt (mobile/third-party); webhooks (Slack/Discord/Zapier); cron job management.

### Moderation, Tags, Houses ⬜
- Feedback responses; bug reports → assign to tech; bug status tracking; feature-request boards.
- Tags/taxonomy: create/merge/delete across user interests, business categories, event types, scholarship fields.
- **House management:** create/manage houses (R, G, B, Y, Orange, Pink); assign users (manual or by batch); house leaderboards; filter elections/events/donations by house.

### Admin Dashboard ⬜
- **Top-level metric cards:** total users, new this week (% trend), active today, total donations, total karma distributed, events this month (online/offline), businesses listed, membership revenue ₹, pending approvals.
- **Graphs:** active users (30-day), donations trend, event engagement (donut/bar), karma heatmap.
- **Real-time notifications panel** (filter Unread/Critical/Info/All): user actions, moderation alerts, redemption alerts, new signups, event updates, feedback, bug reports, donation milestones.
- **Quick actions:** manage users, assign admin roles, create announcement, add event, upload membership plan, launch donation campaign, write newsletter, import alumni data, toggle maintenance.
- **Approval queue snapshot** (user verifications, business listings, posts, scholarships, events) with counts + actions.
- **Leaderboard highlights:** top 5 by karma, top donor, most active business, most engaged batch/house.
- **Quick filter widgets;** optional **health check** (API latency, cron status, email queue backlog, last backup, DB usage).

---

## Sitemaps

### Public sitemap (SEO) — domain `https://nnawca.org` ⬜
`/` · `/about` (`/committee`, `/chapters`, `/faqs`) · `/events` (`/{slug}`, `/categories`, `/calendar`) ·
`/donate` (`/campaigns`, `/campaigns/{slug}`, `/impact-report`, `/faq`) ·
`/scholarships` (`/funded-by-alumni`, `/{slug}`, `/apply`, `/nominate`) ·
`/membership` (`/benefits`, `/subscribe`, `/faq`) ·
`/alumni-business` (`/{slug}`) · `/impact` (`/{story-slug}`) ·
`/blog` (`/{category}`, `/{slug}`) · `/awards` (`/nominate`, `/vote`, `/2025-winners`) ·
`/contact` · `/press` · `/partner-with-us` · `/terms` · `/privacy` · `/refund-policy` ·
utility: `/search`, `/sitemap.xml`, `/404`, `/maintenance`.

### Private sitemap (post-login) 🟡⬜
- **Profile:** `/dashboard`, `/profile/view`, `/profile/edit/{basic|contact|social|education|work|house-batch|interests}`, `/profile/settings/{privacy|account|whatsapp-preference|notifications}`, `/profile/activity/{logs|karma|achievements}`.
- **Business:** `/business/profile/{view|edit/...}`, `/business/{reviews|refer|stats|perks}`.
- **Membership:** `/membership/{manage|upgrade|renew|benefits|payment-history}`.
- **Events:** `/events/{my-events|rsvp/{id}|host/...|feedback/{id}|my-attendance|watch/{id}}`.
- **Feed:** `/feed`, `/feed/{house|gender|batch|membership}`, `/feed/post/{create|edit/{id}|{id}/comments}`.
- **Messages:** `/messages`, `/messages/{user-id}`, `/messages/groups`, `/messages/groups/{id}`.
- **Directory:** `/directory/{all|batch/{year}|group/{name}|house/{color}|search}`.
- **Groups:** `/groups`, `/groups/{id}`, `/groups/join/{id}`, `/groups/create`, `/groups/edit/{id}`.
- **Scholarship / Donation / Games / Elections / Knowledge / Awards / Karma / Store / Settings / Feedback / Newsletter** — full route lists in the PDF (pp. 41–45); pull when those modules are scheduled.
- *Currently built:* `/dashboard`, `/feed`, `/profile/[username]`, `/settings`, `/onboarding/[step]`.

---

## Badges (criteria) ⬜

- **Top Writer:** publish 2 quality articles/month for 3 consecutive months; good engagement (reads/comments/shares/bookmarks); ≥5 helpful comments/month; ≥1 alumni discussion or Q&A per quarter; positive, JNV-aligned content; no >30-day breaks. Reviewed every 90 days; retained only with continued activity. **(Completing any 4 qualifies.)**
- **Social Butterfly:** ≥15 comments/replies per month; ≥2 events/meetups per quarter; regular group discussions; ≥5 welcome interactions/month with new members; share ≥5 alumni stories/month. Reviewed every 90 days.
- **People's Favourite** (per 90-day cycle, *only actions from other members count*): unique profile views ≥183; awards received ≥7; connection requests received ≥45; bookmarks/saves ≥18; shares by others ≥10; unique comments received ≥25 (from ≥10 distinct users). Awarded to highest engagement score; removed if below thresholds next cycle. **(Completing any 4 qualifies.)**
- *Maps to:* `Badge` / `UserBadge`.

---

## Future feature ideas (doc "9" / wishlist) ⬜

1. **Alumni Recognition System** — badges (Mentor/Volunteer/Donor/Speaker), Top Contributor of the Month, digital wall of fame, monthly leaderboards.
2. **Knowledge Base & Alumni Academy** — webinars, courses/guides, downloadables, RSVP + reminders + certificates.
3. **Alumni Awards & Nominations Portal** — nominate, voting w/ eligibility, past-winners archive, countdown + live leaderboard.
4. **Election Candidate Profiles** — public profiles, manifesto, video pitches, pre-vote AMA.
5. **Automated Receipts / Certificates / Invoices** — branded verifiable PDFs.
6. **Birthday & Anniversary Celebrations** — "Today's Celebrants" module, wishes, birthday badges, weekly newsletter.
7. **Alumni Business Toolkit** — services/products/offers, lead form / WhatsApp inquiry, analytics, alumni-only private coupons.
8. **Karma Redemption Marketplace** — claimable rewards, lucky draws, feature unlocks, member-hosted barter perks.
9. **House & Batch Challenges** — rivalries (e.g., Red vs Blue: max donations in August), leaderboards, reward badges/banners.
10. **Referral Link Generator + Analytics** — per-user invite links; track clicks/signups/conversions; bonus karma/badges.
11. **Digital Yearbook Generator** — per-batch yearbooks, photos/memories, flipbook/download, sponsored ad space.
12. **Self-Service Admin Panel** — micro-admins (batch leaders / house captains) with RBAC: group events, approve posts/members, polls, files, newsletters.
13. **Smart Recommendations** — AI/logic to recommend connections, events, groups, businesses, content, scholarships.

---

## Recommended external tools (doc) — reference for `INTEGRATION_SPEC.md`

| Purpose | Tool | Why |
|---|---|---|
| Push notifications | **OneSignal** | Reliable cross-browser push |
| Email | **Resend / Mailchimp** | Deliverability, open tracking |
| Payments | **Razorpay / Stripe** | PCI-compliant subscriptions |
| Analytics | **Google Analytics / Plausible** | Behavior insight |
| Image hosting | **Cloudinary / S3** | Auto-optimization/transform *(project currently targets Cloudflare R2)* |
| SMS/WhatsApp | **Twilio / WhatsApp Cloud API** | OTPs, alerts, campaigns |
| Perf monitoring | **Sentry / LogRocket** | Session replay, bug tracing |
| CDN/assets | **Cloudflare** | Speed + security |
| Design | **Figma** | UX/UI handoff |
| SEO audit | **Ahrefs / Screaming Frog** | Indexing insight |
| Live chat | **Crisp / Tawk.to** | Real-time support |
| Webinars | **Zoom API / Mixily** | Reliable online events |
| *Optional* | ConvertKit, Discourse, **Meilisearch/Algolia** (search), Google Optimize (A/B) | Build-vs-buy |

---

## Feed Engineering (doc deep-dive) 🟡

> Vision: the Feed is a *curated stream of longform stories, essays, memoirs, reflections* — "organic,
> prestigious, intelligent, never commercial." Note this is a **longform/editorial** framing that is
> richer than the current short-post `Post` model — worth reconciling before building the writer flow.

- **Reader:** scrollable feed (infinite scroll / load-more) showing title, author, date, read-time, preview, tags, batch, cover image; full-article read with **paywall after 1–2 free reads** + member auth-check; SEO URLs (`/feed/story-title`); share (Twitter/LinkedIn/WhatsApp/copy) + **quote cards from highlighted text**; filter by tag/topic/batch/"Most Shared"/"Most Recent" + search; **save/bookmark** → dashboard.
- **Writer:** rich-text editor (headings, blockquotes, images, embedded links, **autosave draft**, preview); tag input (auto-suggested, max 5); batch-year selector; cover-image uploader; performance stats (views, bookmarks, tips); edit/delete drafts (pre-publish only); optional version control/soft-delete.
- **Admin:** moderation queue (Draft / Pending Review / Published) w/ filters; feature a story (pin / Editor's Pick / Top Story); edit metadata w/ log trail.
- **Engagement:** auto quote-card image rendering (quote + author + NNAWCA branding); social meta previews (OG/Twitter cards); track views/shares/bookmarks/tips.
- **SEO:** meta title `<Story Title> | NNAWCA Alumni Feed`; 140–160 char meta description; OG + Twitter cards; crawlable homepage; dynamic story sitemap; canonical tags on paginated feeds.
- **Access control:** free stories → any user · full feed → logged-in · unlimited → paid members · submit → verified writer · moderate → admin only.
- **Suggested API:** `GET /api/feed` (paginated list) · `GET /api/feed/:slug` · `POST /api/feed` (submit) · `PUT /api/feed/:id` (update draft) · `DELETE /api/feed/:id` · `POST /api/feed/feature/:id` (admin).
- *Existing autosave hook (`src/lib/use-autosave.ts`) already matches the "autosave draft" pattern.*

---

## Karma rules (verbatim from doc)

> Cross-check against the **frozen** spec in [`ALUMNI_REPUTATION_SYSTEM.md`](ALUMNI_REPUTATION_SYSTEM.md)
> and values in [`src/config/karma.ts`](src/config/karma.ts). Reproduced here as the client's stated intent.
> *(Note: the doc says downvote-post = liker/voter −0.5; `CLAUDE.md`'s summary lists the voter at 0 — reconcile.)*

**Base actions** (actor / publisher):
- Like a post or comment → **+1 / +1**
- Comment on a post or comment → **+1.5 / +2**
- Share a post outside the network → **+2 / +3**
- Downvote a post → **−0.5 / −2**
- Downvote a comment → **−1 / −1**

**Anti-farming caps:**
- > 30 likes/day → further likes give **0** to liker (publisher still earns).
- > 20 comments/day → further comments give **+0.5** instead of +1.5.
- > 10 shares/day → further shares give **0** to sharer.

**Bonuses:**
- Comment hits 3 likes → publisher **+2** bonus.
- Post hits 5 likes → publisher **+3** bonus.
- Shared post brings 1 new signup → publisher **+5**, sharer **+3**.

**Anti-collusion:**
- User A likes user B > 5×/24h → further likes give **0**.
- A repeatedly comments on same user's content in short window → karma **−50%**.
- Two users downvoting each other repeatedly → downvotes apply but voter earns **no negative karma**.

**Daily floor:**
- Positive daily gain → nothing special.
- Daily karma below **−10** → further negative karma **capped** for the day.

**Totals model:**
- **Total Karma** never < 0; represents lifetime contribution.
- **Earned Karma (last 30 days)** → used for feature unlocks; decays with inactivity.

**Explicit ZERO-karma actions:** viewing/scrolling/refreshing/lurking · self-likes · editing a comment only to change formatting · actions triggered by automation/scripts.

---

## Reconciliation flags (for follow-up)

- **Houses:** doc says **6 houses (R/G/B/Y/Orange/Pink)** — confirm seed data matches.
- **Membership tiers:** doc lists two different tier sets (Student/Associate/Premium/Life vs Associate/Senior/Entrepreneur/Life) — pick canonical set.
- **Downvote-post actor value:** doc **−0.5** vs `CLAUDE.md` summary **0** — confirm against `config/karma.ts`.
- **Feed model:** doc's longform/editorial "story" feed vs current short-post `Post` schema — decide whether to extend or add a separate `Story` model before building the writer experience.
- **Image hosting:** doc suggests Cloudinary/S3; project is standardized on **Cloudflare R2** — keep R2 unless a reason emerges.
- **Election eligibility:** requires **profile ≥ 80% complete** — `User.profileCompletion` already exists to support this.
