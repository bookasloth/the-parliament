import { HOUSE_CATALOG } from "@/config/houses"
import { PLANS, TIER_PRECEDENCE } from "@/config/membership"
import { KARMA } from "@/config/karma"
import { BADGE_CATALOG } from "@/config/badges"

/** Karma a badge needs, read off the catalogue so the two can't drift apart. */
function badgeTarget(key: string): number {
  return BADGE_CATALOG.find((b) => b.key === key)?.criteria?.target ?? 0
}

// Platform glossary — every bit of vocabulary a member meets (houses, member &
// membership types, karma, batches, posts/feed, social graph, groups/events,
// economy, moderation, comms). The dynamic sections (houses, membership, karma)
// are BUILT FROM the real config so numbers/names never drift from the app.

export interface GlossaryTerm {
  term: string
  def: string
  /** Optional short badge (a colour hex, a price, a number). */
  tag?: string
  /** For colour badges — renders a swatch. */
  color?: string
}
export interface GlossarySection {
  id: string
  title: string
  blurb?: string
  terms: GlossaryTerm[]
}

const inr = (rupees: number) => (rupees === 0 ? "Free" : `₹${rupees.toLocaleString("en-IN")}`)

// ── Houses (from HOUSE_CATALOG) ──────────────────────────────────────────────
const houseSystemLabel = (s: string) =>
  s === "ansu" ? "ANSU (post-2002, everyone)" : "Pre-2002"
const houseTerms: GlossaryTerm[] = [
  {
    term: "House system",
    def: "Which set of houses a batch belongs to. Pre-2002 batches use the old boys' houses (Jawahar, Tilak, Subhash, Rajiv) and girls' houses (Indira, Laxmi); 2002-onward batches use the ANSU houses (Aravali, Nilgiri, Shiwalik, Udaigiri) shared by everyone. Old and new houses are distinct identities even when they share a colour.",
  },
  ...HOUSE_CATALOG.map((h): GlossaryTerm => ({
    term: h.name,
    def: `${houseSystemLabel(h.system)} house${h.gender ? ` · ${h.gender === "male" ? "boys" : "girls"}` : ""} · ${h.colorName}.`,
    color: h.colorHex,
  })),
]

// ── Membership tiers (from PLANS) ────────────────────────────────────────────
const membershipTerms: GlossaryTerm[] = TIER_PRECEDENCE.slice()
  .reverse()
  .map((code): GlossaryTerm => {
    const p = PLANS[code]
    return { term: p.displayName, def: p.description, tag: inr(p.priceInr) }
  })

// ── Karma (from KARMA) ───────────────────────────────────────────────────────
const karmaTerms: GlossaryTerm[] = [
  {
    term: "Karma",
    def: "Your reputation score, earned by genuine participation (posting, commenting, helpful reactions, attending/hosting events, completing your profile). It gates social unlocks and can be spent in the Karma Store. Money can never buy the social unlocks.",
  },
  {
    term: "Karma levels",
    def: "Named tiers you climb as karma grows — Reader (0), Commenter (25), Poster (50), Poller (100), Group Leader (250), Mentor (500).",
  },
  {
    term: "Unlocks",
    def: `Abilities karma opens up: create polls at ${KARMA.UNLOCKS.POLLS}, create groups at ${KARMA.UNLOCKS.CREATE_GROUP}, the Mentor badge at ${badgeTarget("karma_mentor")}. Spending an unlock keeps ${Math.round(KARMA.UNLOCK_KEEP_PCT * 100)}% of the karma.`,
  },
  {
    term: "Daily caps",
    def: `Anti-farming limits on how much karma-bearing activity counts per day: ${KARMA.DAILY_LIKE_CAP} likes, ${KARMA.DAILY_COMMENT_CAP} comments, ${KARMA.DAILY_SHARE_CAP} shares, and at most ${KARMA.PAIR_LIKE_CAP} counted likes to the same person per ${KARMA.PAIR_LIKE_WINDOW_HOURS}h.`,
  },
  {
    term: "Giver trust weight",
    def: `Karma you GIVE counts fully only if you're verified or your account is at least ${KARMA.GIVER_TRUST_MIN_AGE_DAYS} days old; brand-new accounts count for ${KARMA.GIVER_WEIGHT_UNTRUSTED}× — so a throwaway can't farm someone to the top.`,
  },
  { term: "Karma Store", def: "Where you redeem karma for reward items (badges, perks, codes)." },
]

// ── Static curated sections ──────────────────────────────────────────────────
const staticSections: GlossarySection[] = [
  {
    id: "members",
    title: "Members & identity",
    terms: [
      { term: "Alumnus / Alumni", def: "A verified past student of JNV Nagpur — the default member type." },
      { term: "Member type", def: "What kind of account this is: alumni (default), or a system/bot account (the official NNAWCA account that posts announcements and welcomes new members)." },
      { term: "Verification", def: "Confirming you really are a JNV Nagpur alumnus. Status is Pending, Approved, or Rejected; approved members get the verified tick." },
      { term: "Legal name vs Display name", def: "Real names are required (no pseudonyms). Your legal name is on record; your display name is what shows on your posts and profile." },
      { term: "Username", def: "Your @handle and profile URL (/username), auto-generated from your name on signup." },
      { term: "Profile visibility", def: "Who can see your full profile: Public, Alumni-only, Connections-only, or Private. Sensitive fields (DOB, blood group, address) are redacted server-side per your settings." },
    ],
  },
  {
    id: "school",
    title: "Batches, divisions & school",
    terms: [
      { term: "Batch", def: "Your cohort by entry year, shown as an ordinal — JNV Nagpur's first batch entered 1986, so 1986 is the 1st batch, 2006 the 21st." },
      { term: "Pass-out year", def: "The year you finished. Graduates within the last 5 years are treated as Students (free tier) automatically." },
      { term: "Division", def: "Region tags on your profile; multi-valued, with an immutable \"Nagpur\" default." },
      { term: "School codes", def: "NGP = JNV Nagpur (Navegaon Khairi); JND = Jindi. Foreign keys carry a school id everywhere for a multi-school future, though NGP is the only school today." },
    ],
  },
  {
    id: "posts",
    title: "Posts & feed",
    terms: [
      { term: "Post formats", def: "Text, Image/Video, Link (with preview), Quote, Question, and Poll." },
      { term: "Repost", def: "Resharing a post — it appears in your feed as its own item embedding the original, optionally with your comment. Deleted/private originals show a tombstone." },
      { term: "Anonymous post", def: "A post shown under a random codename + icon (e.g. Skull Uncle, Blind Hawkeye) instead of your name. The codename is per-post, so your anonymous posts can't be linked to each other or to you." },
      { term: "Visibility scope", def: "Who a post reaches: Public (anyone), Network (all alumni), Followers (only your followers), or My Groups (group members)." },
      { term: "Reactions", def: "Upvote, Downvote, or Like on a post; up/down votes feed ranking and karma." },
      { term: "Award", def: "Spend karma to give a post a special award badge." },
      { term: "Save", def: "Bookmark a post to your Saved list." },
      { term: "Not interested", def: "Hide a post from your feed so it won't resurface." },
      { term: "Pin", def: "An admin/owner action that floats a post to the top of the feed." },
      { term: "Draft", def: "A saved, unpublished post; drafts autosave as you write." },
      { term: "Hashtag & Mention", def: "#tags group posts by topic; @mentions notify a person (or a whole @house / @batch)." },
      { term: "Feed ranking", def: "The \"For You\" order, a hot-score of engagement, freshness, author reputation, and report penalty. Also available: Following, Trending, and Chronological." },
    ],
  },
  {
    id: "graph",
    title: "Connections",
    terms: [
      { term: "Follow / Following / Followers", def: "One-way subscriptions. You follow people to see their posts; your followers see yours." },
      { term: "Connection", def: "A mutual relationship (you follow each other), used for connections-only privacy and mutual-count suggestions." },
      { term: "Block", def: "Cut someone off entirely — symmetric and total: neither of you sees the other on the feed, profile, search, comments, mentions, or DMs. Reversible from Settings → Blocked accounts." },
      { term: "People you may know", def: "Suggested alumni to follow, ranked by mutual connections, batch, and house." },
    ],
  },
  {
    id: "groups-events",
    title: "Groups & events",
    terms: [
      { term: "Group", def: "A space around a batch, house, department, or interest. Visibility is Public, Private, or Secret; roles are Member, Moderator, Admin." },
      { term: "Event", def: "A gathering (in-person or online) with RSVPs, check-in, and feedback. Paid events use a one-time order." },
      { term: "Invite waves", def: "Staggered event invitations sent tier-by-tier (Life first, then Premium, Associate, Student) a few hours apart." },
      { term: "Spotlight", def: "A curated feature of a member, post, or business for a set period." },
    ],
  },
  {
    id: "economy",
    title: "Economy & games",
    terms: [
      { term: "Eggs", def: "A playful hot-potato currency (you start with 20) — throw an egg at someone; monthly top-holders get flagged." },
      { term: "Shells", def: "A commercial currency used across NNAWCA activities." },
      { term: "Vyapaar wallet", def: "Play-money coins for Vyapaar, the multiplayer Monopoly-style game." },
      { term: "Badges", def: "Earned or awarded marks of achievement shown on your profile." },
      { term: "Alfazy", def: "The daily word puzzle; solving it earns karma and feeds leaderboards." },
    ],
  },
  {
    id: "safety",
    title: "Moderation & safety",
    terms: [
      { term: "Report", def: "Flag a post, comment, profile, business, or message for the moderation team." },
      { term: "Moderation actions", def: "What moderators can do: hide, remove, warn, and restore content; and suspend or ban members." },
      { term: "Suspension vs Ban", def: "Suspension is a temporary time-out (auto-lifts on expiry); a ban is permanent. Both block posting, commenting, DMing, and reacting." },
      { term: "Rate limits", def: "Caps on how fast you can post, comment, react, follow, message, or report — to stop spam and abuse." },
      { term: "Guardian consent", def: "Minors need a guardian's consent to participate." },
    ],
  },
  {
    id: "comms",
    title: "Notifications & messaging",
    terms: [
      { term: "Notifications (the bell)", def: "In-app alerts for follows, reactions, comments, mentions, and more. A burst from many people collapses into one \"and N others\" entry." },
      { term: "Web push", def: "Optional browser/phone notifications that reach you even when the tab is closed." },
      { term: "Direct messages", def: "Private 1:1 chats with real-time delivery, typing indicators, read receipts, reactions, and image attachments. You can message your connections." },
      { term: "Chat themes", def: "Festive skins for the conversation view that activate around dates (Diwali, Holi, New Year, etc.)." },
      { term: "Blood request", def: "A member-raised alert that WhatsApp-broadcasts to compatible, opted-in donors nearby." },
    ],
  },
]

export const GLOSSARY: GlossarySection[] = [
  { id: "houses", title: "Houses", blurb: "JNV Nagpur's three house systems.", terms: houseTerms },
  { id: "membership", title: "Membership tiers", blurb: "From free to Life Member.", terms: membershipTerms },
  { id: "karma", title: "Karma", blurb: "Reputation earned by participation.", terms: karmaTerms },
  ...staticSections,
]
