/**
 * Short flavour lines shown on the badge detail hero. One per badge key; a
 * generic fallback covers anything unmapped. Keep them one short sentence.
 */
export const BADGE_TAGLINES: Record<string, string> = {
  // Getting Started
  new_sailor: "Welcome aboard — the voyage begins.",
  profile_complete: "A profile worth knowing.",
  first_upvote: "You lifted someone up.",
  first_comment: "Small steps, big conversations.",
  first_connection: "Every network starts with one.",
  social_linked: "Bring the whole story together.",
  // Contributor
  contributor_starter: "The first ten of many.",
  contributor_rising: "You're finding your voice.",
  contributor_active: "Showing up, again and again.",
  contributor_dedicated: "A hundred posts of heart.",
  contributor_power: "The feed knows your name.",
  contributor_elite: "Five hundred and unstoppable.",
  // Commentator
  commentator_bishop: "Your words landed well.",
  commentator_morrison: "People are listening.",
  commentator_razdan: "A voice the room trusts.",
  commentator_sapru: "Comments that carry weight.",
  commentator_bhogale: "Legendary in the threads.",
  commentator_shastri: "The last word, earned.",
  // Engagement
  well_received: "The community loves your work.",
  decorated: "Awarded, and deservedly so.",
  // Supporter
  paid_member: "Thank you for backing NNAWCA.",
  donor_benefactor: "Generosity that gets noticed.",
  donor_patron: "A patron of the community.",
  donor_philanthropist: "Giving on a grand scale.",
  donor_legendary_donor: "Legendary generosity.",
  visionary_sponsor: "You build the future.",
  // Consistency
  streak_5_day: "Five days, one habit.",
  streak_10_day: "Ten days strong.",
  streak_5_week: "Weeks of showing up.",
  streak_10_week: "Consistency is a superpower.",
  streak_5_month: "Months of momentum.",
  streak_10_month: "Unbreakable rhythm.",
  // Milestones
  tenure_one_year: "One year in the family.",
  tenure_veteran: "A trusted veteran.",
  tenure_founding_era: "Here from the early days.",
  karma_poster: "Reputation, earned.",
  karma_poller: "The community's pulse-taker.",
  karma_group_leader: "People follow your lead.",
  karma_mentor: "A mentor to many.",
  // Special
  librarian: "A collector of good reads.",
  voter: "Your voice, your vote.",
  bargainer: "Karma well spent.",
  the_welcoming: "You make newcomers feel at home.",
  chickened: "Beloved enough to be egged.",
  nnawca_police: "Keeping the community clean.",
  wallflower: "Quiet — then unforgettable.",
  secret_admirer: "Appreciation, no words needed.",
  gardener: "You grew a great conversation.",
  the_explorer: "Bridging batches and houses.",
  open_wallet: "Generous, again and again.",
  influencer: "You brought the alumni home.",
  early_riser: "First light, first post.",
  night_owl: "The best ideas after midnight.",
  the_legend: "A name everyone knows.",
  meme_lord: "The feed's finest humour.",
  bug_hunter: "You made the platform better.",
  hall_of_famer: "Immortalised in the Hall of Fame.",
  // Recognition
  committee_executive: "Leading NNAWCA forward.",
  committee_sports: "Champion of the games.",
  committee_cultural: "Keeper of our culture.",
  committee_developer: "Builder of the platform.",
};

export const taglineFor = (key: string): string =>
  BADGE_TAGLINES[key] ?? "Every badge tells a story — start yours.";
