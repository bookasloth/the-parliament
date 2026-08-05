import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { hotScore } from "../src/modules/feed/ranking";

/**
 * Seed feed content for the NNAWCA network, authored by the owner account.
 * Three kinds:
 *   1. Build-in-public — one post per merged PR, backdated to its merge time.
 *   2. Welcome — one post per member, backdated to their join date.
 *   3. Engagement — a few polls + open questions, posted "now".
 *
 * Idempotent: every seeded post stamps a namespaced sentinel in `quoteSource`
 * ("seed:..."); a rerun findFirst-skips anything already present. Post has no
 * natural unique key, and quoteSource only renders for format:"quote" posts,
 * so it's a safe place to hang a dedup marker. Delete a sentinel row and rerun
 * to regenerate just that one.
 *
 * Run:  npx tsx scripts/seed-feed-content.ts          (all sections)
 *       npx tsx scripts/seed-feed-content.ts --dry    (log, write nothing)
 *       SECTIONS=bip,welcome,engagement npx tsx scripts/seed-feed-content.ts
 */

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DRY = process.argv.includes("--dry");
const SECTIONS = (process.env.SECTIONS ?? "bip,welcome,engagement")
  .split(",")
  .map((s) => s.trim());

const SCHOOL_SLUG = "ngp";
const OWNER_EMAIL = "sndatarkar@gmail.com";

// ---------------------------------------------------------------------------
// Build-in-public: one post per merged PR, in the owner's voice, addressed to
// the alumni watching the network get built. Backdated to `at` (merge time).
// `cat` is a PostCategory key. Curated to member-visible progress — pure infra
// PRs (CI, build fixes, deploy markers) are intentionally left out.
// ---------------------------------------------------------------------------
type Bip = { pr: number; at: string; cat: string; body: string };

// A "should we build this?" prompt posted BEFORE a build-in-public post, so the
// feed reads like the network asked before it shipped. Keyed by PR number; a PR
// without an entry just ships without a preceding ask. Posted at the build's
// time minus a spread-out offset (askOffsetHours), so the ask always precedes
// its ship and the asks don't all cluster.
type Ask =
  | { kind: "poll"; question: string; options: string[]; cat?: string }
  | { kind: "question"; body: string; cat?: string };

const ASKS: Record<number, Ask> = {
  1: { kind: "question", cat: "school_memory",
    body: "Serious question for the JNV Navegaon Khairi family: if there were one place online where all of us could actually find each other again, would you use it? Thinking of building it." },
  16: { kind: "poll", cat: "event",
    question: "Would you actually turn up to an NNAWCA event if we ran one?",
    options: ["Yes, count me in", "Depends on the city", "Online only for me", "Not really"] },
  17: { kind: "poll", cat: "event",
    question: "Should this network have a paid membership tier to keep it running?",
    options: ["Yes, happy to chip in", "Only if there are perks", "Keep it fully free", "Not sure yet"] },
  18: { kind: "question", cat: "achievement",
    body: "About to build the sign-up flow. What's the one thing that's made you abandon a signup halfway? Tell me so I don't do it." },
  21: { kind: "poll", cat: "achievement",
    question: "What do you most want to be able to post in the feed?",
    options: ["Photos & videos", "Polls", "Long updates", "Just text is fine"] },
  33: { kind: "question", cat: "school_memory",
    body: "Writing the public pages that tell the world what NNAWCA is. In one line — how would YOU describe what this network is for?" },
  44: { kind: "poll", cat: "achievement",
    question: "Should we add private 1:1 messaging, or keep everything in the open feed?",
    options: ["Yes, private DMs", "Only between connections", "Prefer group chats", "Don't need it"] },
  77: { kind: "poll", cat: "achievement",
    question: "How often should the network email you?",
    options: ["Only important stuff", "A weekly digest", "Tell me everything", "Never, please"] },
  90: { kind: "poll", cat: "event",
    question: "Should the network wish members a happy birthday?",
    options: ["Yes, love that", "Only if I opt in", "No thanks"] },
  92: { kind: "question", cat: "event",
    body: "When we open the doors wider — who should we invite first? Your batch, your house, or just everyone at once?" },
  128: { kind: "poll", cat: "achievement",
    question: "Would you want to see stats on how your posts do — views, reactions, reach?",
    options: ["Yes, show me", "A little is fine", "No, keep it simple"] },
  133: { kind: "poll", cat: "achievement",
    question: "Should helpful, active members earn visible reputation on the network?",
    options: ["Yes, reward good contributors", "Keep it subtle", "No, treat everyone equal"] },
  167: { kind: "question", cat: "event",
    body: "Thinking about letting any member create events, not just admins. What's the first meetup you'd organise for your batch or house?" },
  168: { kind: "poll", cat: "achievement",
    question: "Want a Save Draft button so half-written posts aren't lost?",
    options: ["Yes please", "Doesn't matter to me"] },
  170: { kind: "question", cat: "school_memory",
    body: "Building a Wall of Honour for JNV Navegaon Khairi. Who — teacher, senior, batchmate — deserves a place on it? Drop names." },
  176: { kind: "poll", cat: "achievement",
    question: "What's the most useful way to find fellow alumni?",
    options: ["By city", "By batch", "By profession", "By house"] },
  180: { kind: "poll", cat: "achievement",
    question: "On profiles, should followers be public?",
    options: ["Yes, show who follows whom", "Only show counts", "Keep it private"] },
  191: { kind: "question", cat: "school_memory",
    body: "Drafting the community rules before this grows. What's the one line of conduct you'd insist an alumni network holds to?" },
  196: { kind: "poll", cat: "school_memory",
    question: "Should we bring back the original pre-2002 houses alongside the ANSU ones?",
    options: ["Yes — Jawahar, Tilak, Subhash, Rajiv", "Just keep the current four", "Show both, by era"] },
  198: { kind: "question", cat: "achievement",
    body: "How should we prove someone's really one of us? Trying to design verification that's tight but not a pain. What would you trust?" },
};

function askDate(buildAtISO: string, pr: number): Date {
  // 14–37h before the ship, spread by pr so asks don't clump on one instant.
  const offsetH = 14 + (pr % 24);
  return new Date(new Date(buildAtISO).getTime() - offsetH * 3_600_000);
}

const BUILD_IN_PUBLIC: Bip[] = [
  { pr: 1, at: "2026-06-15T02:47:55Z", cat: "school_memory", body:
    "Day one. Started building a place for our JNV Navegaon Khairi family to actually find each other again. No idea yet how far this goes — but it's begun. Watch this space." },
  { pr: 2, at: "2026-06-15T03:07:18Z", cat: "achievement", body:
    "The network is live on a real server for the first time. It does almost nothing yet. But it exists, on the internet, with our name on it." },
  { pr: 3, at: "2026-07-29T19:22:22Z", cat: "achievement", body:
    "The feed shows real people now instead of placeholder text — real names, real profiles down the side. The thing is starting to feel less like a mockup and more like ours." },
  { pr: 4, at: "2026-07-29T19:25:02Z", cat: "achievement", body:
    "Rebuilt the profile page — proper header, a sidebar that makes sense. Your corner of the network should feel like yours, so I'm sweating the layout early." },
  { pr: 5, at: "2026-07-29T19:54:02Z", cat: "achievement", body:
    "Profiles now have real tabs and an Experience section — where you studied, where you've worked. The alumni story, not just a name and a face." },
  { pr: 8, at: "2026-07-30T06:22:08Z", cat: "achievement", body:
    "Admins can now invite people in by email, activation link and all. The first real doorway into the network." },
  { pr: 9, at: "2026-07-30T07:03:47Z", cat: "achievement", body:
    "Profile editing got a proper cover-and-avatar hero. Making the first thing people see when they land on you actually look like something." },
  { pr: 10, at: "2026-07-30T08:03:29Z", cat: "achievement", body:
    "A batch of quick wins wired up at once — feed actions, notifications, settings, events all doing real things now instead of pretending to." },
  { pr: 12, at: "2026-07-30T08:32:42Z", cat: "achievement", body:
    "Made the feed feel instant — likes and posts respond the moment you tap, with proper skeletons while things load. The bar for this stuff is Facebook and LinkedIn, so that's the bar I'm building to." },
  { pr: 14, at: "2026-07-30T08:38:29Z", cat: "achievement", body:
    "Your social links now sit as a neat icon row on your profile. Small thing. The small things are the whole thing." },
  { pr: 15, at: "2026-07-30T11:49:09Z", cat: "achievement", body:
    "Feed polish day: sticky nav, a cleaner left rail, reactions that actually reflect what you've tapped. Death by a thousand papercuts, in reverse." },
  { pr: 16, at: "2026-07-30T11:56:55Z", cat: "event", body:
    "Admins can create real events now — straight from a modal, saved as an actual event. The groundwork for getting us in the same room again." },
  { pr: 17, at: "2026-07-30T13:16:59Z", cat: "achievement", body:
    "Membership tiers now have real checkout, real pricing. If this network is going to sustain itself, it needs to stand on its own feet — this is the start of that." },
  { pr: 18, at: "2026-07-30T13:16:59Z", cat: "achievement", body:
    "New onboarding: a split-screen flow that actually verifies your email and saves as you go. First impressions matter, and this is ours." },
  { pr: 19, at: "2026-07-30T13:37:10Z", cat: "achievement", body:
    "You can now upload a profile photo and cover during onboarding. Put a face to the name from minute one." },
  { pr: 21, at: "2026-07-30T14:33:37Z", cat: "achievement", body:
    "The feed can hold real posts now — text, photos, videos, polls, even coloured text backgrounds. A place to actually say something, not just exist in a directory." },
  { pr: 23, at: "2026-07-30T14:46:02Z", cat: "achievement", body:
    "Comments grew up: upvotes and downvotes, @mention autocomplete, sorting, an author badge. Conversations, not just a wall of replies." },
  { pr: 24, at: "2026-07-30T15:03:17Z", cat: "achievement", body:
    "More comment tools — delete, report, and a ping when someone replies to you. The plumbing that makes a place feel alive." },
  { pr: 26, at: "2026-07-30T15:16:17Z", cat: "achievement", body:
    "Photos and videos now open in a proper lightbox instead of a sad little thumbnail. See each other's memories full-size." },
  { pr: 28, at: "2026-07-30T15:31:32Z", cat: "achievement", body:
    "Redesigned the feed cards — compact, LinkedIn-clean. Read more, scroll less." },
  { pr: 31, at: "2026-07-30T16:12:51Z", cat: "achievement", body:
    "Gave the login and signup pages a dark redesign. The front door should look like someone cared about it." },
  { pr: 32, at: "2026-07-30T16:26:23Z", cat: "school_memory", body:
    "Switched the auth pages to NNAWCA blue, not the borrowed orange. Our colours, our house." },
  { pr: 33, at: "2026-07-30T16:47:29Z", cat: "achievement", body:
    "Shipped the public marketing site — eleven pages telling people what this is and why it exists. The version of us the world sees before they sign in." },
  { pr: 44, at: "2026-07-31T12:07:27Z", cat: "achievement", body:
    "Direct messages are in — one-to-one, private. Sometimes you don't want to post it to the whole batch, you just want to say hi to one person." },
  { pr: 46, at: "2026-07-31T14:14:58Z", cat: "achievement", body:
    "Messages now arrive instantly, in real time. No refresh, no wait — it just appears. Chatting with a batchmate should feel like chatting." },
  { pr: 49, at: "2026-07-31T15:23:08Z", cat: "achievement", body:
    "Feed comments now open inline with a see-more, and you get notified when someone reacts. The conversation stays where the post is." },
  { pr: 52, at: "2026-07-31T15:35:28Z", cat: "achievement", body:
    "The feed learned to rank by quality, not just recency — good contributors surface, noise sinks. Trying to keep this a place worth scrolling." },
  { pr: 53, at: "2026-07-31T15:38:48Z", cat: "achievement", body:
    "Feed cards now show a bit of alumni context — how you're connected to the person posting. A network should remind you it's a network." },
  { pr: 66, at: "2026-07-31T15:57:29Z", cat: "achievement", body:
    "Self-signups now verify their email before they're in. Keeping the network real — actual alumni, not drive-by accounts." },
  { pr: 77, at: "2026-07-31T17:19:04Z", cat: "achievement", body:
    "Rewrote all seventeen of our emails on one shared design system. Every message from the network should feel like it came from the same place — because it did." },
  { pr: 79, at: "2026-07-31T17:33:06Z", cat: "achievement", body:
    "Consolidated every email down one guarded path, so nothing goes out that shouldn't. Boring, invisible, important." },
  { pr: 82, at: "2026-07-31T18:38:51Z", cat: "achievement", body:
    "Pay for a membership and you now get a proper receipt email and an invoice. The little proof that you're part of this." },
  { pr: 86, at: "2026-07-31T19:14:39Z", cat: "achievement", body:
    "The network can reach out now — welcome notes, an expiry heads-up, a nudge when someone mentions you or your post hits a milestone. Emails that are actually worth opening." },
  { pr: 89, at: "2026-07-31T19:51:31Z", cat: "achievement", body:
    "Settings you can actually change: email preferences and your password. Your account, your controls." },
  { pr: 90, at: "2026-07-31T20:01:26Z", cat: "event", body:
    "More lifecycle emails wired up — RSVP confirmations, renewals, birthdays. Yes, the network will remember your birthday now. You're welcome." },
  { pr: 91, at: "2026-07-31T20:09:59Z", cat: "achievement", body:
    "Membership pricing is now driven by config, with a clear path from one tier to the next. Grow into it at your own pace." },
  { pr: 92, at: "2026-07-31T20:18:42Z", cat: "event", body:
    "Events can now send priority 'invite everyone' waves. When we do something real, everyone hears about it." },
  { pr: 93, at: "2026-07-31T20:43:14Z", cat: "achievement", body:
    "Refunds are automatic now — if something needs reversing, it just reverses. Money stuff should never make you email support." },
  { pr: 94, at: "2026-07-31T20:49:31Z", cat: "achievement", body:
    "Polish pass: a health check, a proper share image when you link the site, a bigger sitemap. The unglamorous work that makes the whole thing feel solid." },
  { pr: 95, at: "2026-08-01T02:19:09Z", cat: "achievement", body:
    "Redesigned the feed card header and reaction bar, and gave nested comments some room to breathe. Reading the feed should feel effortless." },
  { pr: 96, at: "2026-08-01T03:16:32Z", cat: "achievement", body:
    "Comments can carry images and emoji now, with skeletons while they load. Say it with a picture when words won't do." },
  { pr: 99, at: "2026-08-01T04:02:36Z", cat: "achievement", body:
    "Made the whole thing feel like an app on your phone — a bottom nav bar, per-section skeletons, respect for the notch. Most of us live on mobile, so mobile gets loved." },
  { pr: 118, at: "2026-08-01T07:30:17Z", cat: "achievement", body:
    "Fixed messaging properly — faster sends, a real typing bubble, auth that stops dropping. Chat that behaves like chat." },
  { pr: 119, at: "2026-08-01T16:10:08Z", cat: "achievement", body:
    "Feed posts and authors are clickable now, with share buttons and a few stats. Tap a name, land on a person — the way it should've always worked." },
  { pr: 122, at: "2026-08-01T17:25:08Z", cat: "achievement", body:
    "Reworked the profile to match the design I actually wanted. Kept fiddling until it felt right." },
  { pr: 124, at: "2026-08-01T18:10:30Z", cat: "achievement", body:
    "Profile header now adapts — centred on mobile, one clean line on desktop. Looks right on whatever you're holding." },
  { pr: 125, at: "2026-08-01T18:15:49Z", cat: "achievement", body:
    "Tap a feed card and it opens the full post now. Obvious in hindsight; most good things are." },
  { pr: 126, at: "2026-08-01T18:37:34Z", cat: "achievement", body:
    "Opening a post now reuses the same card and shows comments straight away. One less click between you and the conversation." },
  { pr: 128, at: "2026-08-01T19:28:22Z", cat: "achievement", body:
    "Added post analytics right in the reaction bar plus a proper stats page. See what actually landed with people." },
  { pr: 133, at: "2026-08-01T20:09:05Z", cat: "achievement", body:
    "Built real karma guardrails — Sybil weighting, no buying your way up with payments. Reputation here should be earned, not gamed." },
  { pr: 135, at: "2026-08-01T21:24:33Z", cat: "achievement", body:
    "Tightened the community header so it's compact on every screen. More directory, less chrome." },
  { pr: 136, at: "2026-08-01T21:38:55Z", cat: "achievement", body:
    "Redesigned the alumni card — cover plus avatar — everywhere it shows. A better first glance at every one of us." },
  { pr: 137, at: "2026-08-01T21:36:02Z", cat: "achievement", body:
    "Wired the admin console to real data — verification, moderation, membership, karma, audit logs. Running the network from actual controls instead of guesswork." },
  { pr: 138, at: "2026-08-01T21:39:24Z", cat: "achievement", body:
    "Added a changelog page so anyone can see what's shipping, week to week. Building in the open, on purpose." },
  { pr: 140, at: "2026-08-01T22:23:06Z", cat: "achievement", body:
    "Gamified the profile editor — a strength meter, live preview, gentle nudges toward the fields you skipped. A complete profile helps people find you; this makes finishing it feel good." },
  { pr: 141, at: "2026-08-02T02:51:38Z", cat: "achievement", body:
    "Reworked the community filters and profile editing — autosave, live username checks, a little confetti when you're done. Should feel smooth, maybe even fun." },
  { pr: 142, at: "2026-08-02T03:20:49Z", cat: "achievement", body:
    "The feed remembers what you've already seen — no more scrolling past the same post twice. Your time here is worth respecting." },
  { pr: 143, at: "2026-08-02T05:58:53Z", cat: "achievement", body:
    "New pre-login homepage and a split-screen sign-in. The welcome mat got a lot nicer." },
  { pr: 144, at: "2026-08-02T06:04:22Z", cat: "achievement", body:
    "Profile editing now handles multiple jobs and degrees, with a guard before you delete anything. Careers aren't one line; the form finally agrees." },
  { pr: 148, at: "2026-08-02T07:12:42Z", cat: "achievement", body:
    "Rebuilt onboarding as a five-screen wizard that saves each step with a live preview. Signing up should feel like you're already part of it, not filling a form." },
  { pr: 149, at: "2026-08-02T07:35:40Z", cat: "achievement", body:
    "Signups were getting stuck — fixed it with a simple five-character email code before login. If people can't get in, nothing else matters." },
  { pr: 150, at: "2026-08-02T07:49:14Z", cat: "achievement", body:
    "Our emails were quietly bouncing because they came from an address we didn't own. Now they send from a real one. Nothing gets lost between us and you." },
  { pr: 151, at: "2026-08-02T08:05:31Z", cat: "school_memory", body:
    "Made it official everywhere: we're NNAWCA. Dropped the old working name. The house has its name on the door now." },
  { pr: 152, at: "2026-08-03T12:54:42Z", cat: "school_memory", body:
    "Added the Gallery, the MOA and the Rules pages, and polished the marketing site. The formal bones of an alumni association, in public." },
  { pr: 153, at: "2026-08-03T13:17:53Z", cat: "school_memory", body:
    "More of the association pages, filled in — pricing, FAQ, contact, donate, committee, governance. The paperwork of belonging, made readable." },
  { pr: 156, at: "2026-08-03T14:03:53Z", cat: "achievement", body:
    "Mobile polish across feed and community — reaction order, polls, the verified tick. It's 2026; it has to feel right in your hand." },
  { pr: 157, at: "2026-08-03T14:28:52Z", cat: "achievement", body:
    "Gave verified members a scalloped seal, everywhere. A small mark that says: yes, this is really them." },
  { pr: 158, at: "2026-08-04T13:15:41Z", cat: "achievement", body:
    "Follow state is finally consistent — follow someone once and it sticks across the feed, their profile, everywhere. It should never make you wonder if it worked." },
  { pr: 166, at: "2026-08-05T09:25:59Z", cat: "achievement", body:
    "Your profile timeline, post count and feed now all agree with each other. The numbers should tell the truth." },
  { pr: 167, at: "2026-08-05T09:30:20Z", cat: "event", body:
    "Members can create events properly now — the modes, the fields, and they actually save. Your turn to bring us together." },
  { pr: 168, at: "2026-08-05T09:40:05Z", cat: "achievement", body:
    "Added Save Draft and a Drafts section. Half-written thoughts don't have to be lost thoughts." },
  { pr: 169, at: "2026-08-05T09:45:05Z", cat: "school_memory", body:
    "Redesigned the About committee section into clean tabs. Easier to see who's steering this." },
  { pr: 170, at: "2026-08-05T09:48:55Z", cat: "school_memory", body:
    "Redesigned the Wall of Honour cards. The people who make us proud deserve to look the part." },
  { pr: 173, at: "2026-08-05T10:19:34Z", cat: "achievement", body:
    "A Life member — top tier, paid in full — was still being nagged to Get Premium. The network was begging money off the people who'd already given the most. Fixed." },
  { pr: 175, at: "2026-08-05T10:41:30Z", cat: "achievement", body:
    "The upgrade button now names your actual next step — Student to Associate, Associate to Premium, and so on. Life members see nothing, because there's nothing above them." },
  { pr: 176, at: "2026-08-05T10:47:11Z", cat: "achievement", body:
    "Made the alumni directory actually searchable: filter by city, sort by recently active or name, search as you type. Half of it was already built and just… not switched on. Fixed that." },
  { pr: 180, at: "2026-08-05T11:02:49Z", cat: "achievement", body:
    "The Followers tab on your profile used to just say 'coming soon'. It now lists real people — face, name, batch — each with a Follow button. And no paywall on it, because gating who you can meet on a network this young would be quietly suicidal." },
  { pr: 181, at: "2026-08-05T11:09:46Z", cat: "achievement", body:
    "Your About tab's social links are now a proper 'Connect with me' grid — icon and platform name. Small touch, cleaner look." },
  { pr: 184, at: "2026-08-05T11:40:44Z", cat: "achievement", body:
    "Cleaned up sharing — one clear Share button with coloured options, and the three-dot menu goes back to hiding and blocking. One thing, one place." },
  { pr: 185, at: "2026-08-05T11:42:15Z", cat: "achievement", body:
    "Widened the profile and moved your headline up under your name. Reads better at a glance." },
  { pr: 186, at: "2026-08-05T11:47:00Z", cat: "school_memory", body:
    "The committee page grew up. Two clean tabs — Executive and Advisory — every office-bearer shown as a face with a name and a role, including eleven past ones. Institutional memory, in one place instead of a document nobody opens." },
  { pr: 190, at: "2026-08-05T11:59:18Z", cat: "achievement", body:
    "A pile of profile polish — a composer on your own page, coloured detail icons, a skeleton shaped like an actual profile so it stops lurching as it loads. The details you only notice when they're wrong." },
  { pr: 191, at: "2026-08-05T12:10:12Z", cat: "school_memory", body:
    "Wrote out the Community Rules & Guidelines as a real page — principles, conduct, spam, a hard student-safety section, zero-tolerance in red. A network built on a school's alumni needs its lines drawn where everyone can see them, not buried in a PDF." },
  { pr: 196, at: "2026-08-05T13:35:20Z", cat: "school_memory", body:
    "Spent today fixing something that should never have been broken: the Houses. The four pre-2002 boys' houses — Jawahar, Tilak, Subhash, Rajiv — weren't even in the system, and the picker let anyone land in any house from any era. Rebuilt it properly. Houses now follow your batch year, Jawahar and Aravali stay distinct even though both are blue, and nobody's existing house got touched. These names mean something. The code finally agrees." },
  { pr: 198, at: "2026-08-05T14:15:22Z", cat: "achievement", body:
    "New way to verify alumni we can't personally place: peer endorsements. An admin can now ask your batch- and house-mates — the people most likely to actually remember you — to vouch. They click endorse or 'don't know them'. It's advisory; a human still makes the final call. Verification by the people who sat next to you in class." },
  { pr: 199, at: "2026-08-05T14:17:32Z", cat: "achievement", body:
    "Signup now asks your batch and house up front and actually remembers them, with a friendlier set of forms. You arrive already sorted into a house — fitting, for a Navodaya network." },
  { pr: 200, at: "2026-08-05T15:08:05Z", cat: "achievement", body:
    "Wired up the admin tools for managing members against the real backend. Running the network properly, from the inside." },
  { pr: 202, at: "2026-08-05T15:08:47Z", cat: "achievement", body:
    "Admins can now edit a member's details from a clean modal. The unglamorous controls that keep the directory honest." },
];

// ---------------------------------------------------------------------------
// Welcome: one owner-authored post per member, backdated to their join date.
// Light per-member variation so a feed of them doesn't read like a mail merge.
// ---------------------------------------------------------------------------
function welcomeBody(name: string, i: number): string {
  const first = name.split(/\s+/)[0] || name;
  const lines = [
    `Welcome to the network, ${name}. Good to have you here.`,
    `${name} just joined us. That's one more of us back in touch.`,
    `Say hi to ${first} — newest member of the network. Welcome aboard.`,
    `${name} is in. The alumni circle gets a little more complete.`,
    `Glad you found your way here, ${first}. Welcome.`,
  ];
  return lines[i % lines.length];
}

// ---------------------------------------------------------------------------
// Engagement: polls + open questions, posted now (not backdated — these are
// live prompts). Poll = a Post(format:"poll") + a linked Poll with options.
// Question = a Post(format:"question"); the body IS the question.
// ---------------------------------------------------------------------------
type Engagement =
  | { kind: "poll"; sentinel: string; cat: string; question: string; body?: string; options: string[] }
  | { kind: "question"; sentinel: string; cat: string; body: string };

const ENGAGEMENT: Engagement[] = [
  { kind: "poll", sentinel: "poll-feature-next", cat: "event",
    question: "What should we build for the network next?",
    options: ["Events + RSVP", "Job board", "Mentorship matching", "Batch group chats"] },
  { kind: "poll", sentinel: "poll-reunion-when", cat: "event",
    question: "If we did a reunion, when works best?",
    options: ["Winter holidays", "Summer", "A long weekend", "Online first, meet later"] },
  { kind: "question", sentinel: "q-teacher", cat: "school_memory",
    body: "One teacher who changed the way you think — who was it? Drop the name. Let's see who comes up the most." },
  { kind: "question", sentinel: "q-house", cat: "school_memory",
    body: "Which house were you in? Represent below — let's see who's got the numbers." },
];

// ---------------------------------------------------------------------------

async function main() {
  const school = await prisma.school.findUnique({ where: { slug: SCHOOL_SLUG } });
  if (!school) throw new Error(`School '${SCHOOL_SLUG}' not seeded.`);
  const owner = await prisma.user.findUnique({ where: { email: OWNER_EMAIL } });
  if (!owner) throw new Error(`Owner '${OWNER_EMAIL}' not found.`);

  const cats = await prisma.postCategory.findMany({ where: { schoolId: school.id } });
  const catId = (key: string) => {
    const c = cats.find((x) => x.key === key);
    if (!c) throw new Error(`PostCategory '${key}' not found for school.`);
    return c.id;
  };

  const base = { schoolId: school.id, authorId: owner.id, visibilityScope: "network", status: "visible" as const };

  // Skip anything already seeded under this sentinel.
  async function seen(sentinel: string): Promise<boolean> {
    const hit = await prisma.post.findFirst({ where: { quoteSource: sentinel }, select: { id: true } });
    return Boolean(hit);
  }
  function rank(createdAt: string): number {
    return hotScore({ upvoteCount: 0, downvoteCount: 0, commentCount: 0, shareCount: 0, qualityScore: 0, reportPenalty: 0, createdAt });
  }
  // Create one poll/question post. Shared by the pre-ship "asks" and the
  // standalone engagement prompts.
  async function postAsk(a: Ask, sentinel: string, at: Date): Promise<void> {
    const atISO = at.toISOString();
    if (a.kind === "question") {
      console.log(`ask?  ${atISO}  ${a.body.slice(0, 55)}…`);
      if (!DRY) await prisma.post.create({ data: {
        ...base, categoryId: catId(a.cat ?? "school_memory"), format: "question", body: a.body,
        quoteSource: sentinel, createdAt: at, rankingScore: rank(atISO),
      } });
    } else {
      console.log(`ask?  ${atISO}  poll: ${a.question.slice(0, 45)}…`);
      if (!DRY) await prisma.post.create({ data: {
        ...base, categoryId: catId(a.cat ?? "event"), format: "poll", body: null,
        quoteSource: sentinel, createdAt: at, rankingScore: rank(atISO),
        poll: { create: {
          question: a.question,
          options: { create: a.options.map((label, sortOrder) => ({ label, sortOrder })) },
        } },
      } });
    }
  }

  let created = 0, skipped = 0;

  // 1. Build-in-public — each PR that has an ASKS entry gets its "should we
  //    build this?" poll/question posted first, dated before the ship.
  if (SECTIONS.includes("bip")) {
    for (const p of BUILD_IN_PUBLIC) {
      const ask = ASKS[p.pr];
      if (ask) {
        const askSentinel = `seed:ask:${p.pr}`;
        if (await seen(askSentinel)) { skipped++; }
        else { await postAsk(ask, askSentinel, askDate(p.at, p.pr)); created++; }
      }
      const sentinel = `seed:bip:${p.pr}`;
      if (await seen(sentinel)) { skipped++; continue; }
      console.log(`bip   #${p.pr}  ${p.at}  ${p.body.slice(0, 60)}…`);
      if (!DRY) await prisma.post.create({ data: {
        ...base, categoryId: catId(p.cat), format: "text", body: p.body,
        quoteSource: sentinel, createdAt: new Date(p.at), rankingScore: rank(p.at),
      } });
      created++;
    }
  }

  // 2. Welcome — every active member except the owner, dated to their join.
  if (SECTIONS.includes("welcome")) {
    const members = await prisma.user.findMany({
      where: { schoolId: school.id, deletedAt: null, status: "active", id: { not: owner.id } },
      select: { id: true, displayName: true, legalName: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    });
    console.log(`welcome: ${members.length} members`);
    let i = 0;
    for (const m of members) {
      const sentinel = `seed:welcome:${m.id}`;
      if (await seen(sentinel)) { skipped++; i++; continue; }
      const name = (m.displayName || m.legalName || "").trim() || "a new member";
      const at = m.createdAt.toISOString();
      console.log(`welc ${at}  ${name}`);
      if (!DRY) await prisma.post.create({ data: {
        ...base, categoryId: catId("school_memory"), format: "text", body: welcomeBody(name, i),
        quoteSource: sentinel, createdAt: m.createdAt, rankingScore: rank(at),
      } });
      created++; i++;
    }
  }

  // 3. Engagement — standalone polls + questions, posted now.
  if (SECTIONS.includes("engagement")) {
    const now = new Date();
    for (const e of ENGAGEMENT) {
      const sentinel = `seed:${e.sentinel}`;
      if (await seen(sentinel)) { skipped++; continue; }
      const ask: Ask = e.kind === "poll"
        ? { kind: "poll", question: e.question, options: e.options, cat: e.cat }
        : { kind: "question", body: e.body, cat: e.cat };
      await postAsk(ask, sentinel, now);
      created++;
    }
  }

  console.log(`\n${DRY ? "[dry] " : ""}done. created=${created} skipped=${skipped}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
