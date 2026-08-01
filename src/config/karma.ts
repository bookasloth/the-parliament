export const KARMA = {
  CONTENT: {
    LIKE: { actor: 1, publisher: 1 },
    COMMENT: { actor: 1.5, publisher: 2 },
    SHARE: { actor: 2, publisher: 3 },
    DOWNVOTE_POST: { actor: -0.5, publisher: -2 },
    DOWNVOTE_COMMENT: { actor: -1, publisher: -1 },
  },
  // Reduced actor value once the daily comment cap is exceeded (see DAILY_COMMENT_CAP).
  COMMENT_OVER_CAP_ACTOR: 0.5,
  // Repeated comments on the same target within this window are halved.
  REPEAT_COMMENT_FACTOR: 0.5,
  REPEAT_COMMENT_WINDOW_MIN: 10,
  // If the target downvoted the actor within this window, actor earns no negative.
  MUTUAL_DOWNVOTE_WINDOW_HOURS: 24,
  // Running balance never drops below this.
  TOTAL_FLOOR: 0,
  // Sybil blunt: karma a user GIVES counts full only if they're verified or their
  // account is at least this old; otherwise it's weighted down. Fresh throwaway
  // accounts can't farm a target to the top.
  GIVER_TRUST_MIN_AGE_DAYS: 7,
  GIVER_WEIGHT_UNTRUSTED: 0.5,
  // Karma for paying. Perks-only: credited to balance + lifetime but NOT to the
  // 30-day "earned" pool, so money can never buy a social unlock (Poller/Mentor).
  // One-time per tier reached; renewing the same tier pays the flat renewal value.
  MEMBERSHIP_KARMA: { associate: 10, premium: 25, life: 100 } as Record<string, number>,
  MEMBERSHIP_RENEWAL: 5,
  // Donations reward per ₹500 (charity beats self-benefit), capped per payment.
  // DONATION_PER_500 / DONATION_MAX live under ACTIVITY above.
  BONUS: {
    COMMENT_3_LIKES: 2,
    POST_5_LIKES: 3,
    REFERRAL_SIGNUP: { publisher: 5, sharer: 3 },
  },
  ACTIVITY: {
    DAILY_LOGIN: 1,
    PROFILE_FIELD: 2,
    PROFILE_COMPLETE: 10,
    BUSINESS_ADDED: 15,
    BUSINESS_REVIEW: 2,
    EVENT_ATTENDED: 10,
    EVENT_HOSTED: 30,
    EVENT_FEEDBACK: 2,
    REFERRAL_VERIFIED: 25,
    DONATION_PER_500: 5,
    DONATION_MAX: 50,
    CONNECTION_ACCEPTED: 1,
    GROUP_JOINED: 1,
  },
  UNLOCKS: {
    POLLS: 100,
    CREATE_GROUP: 250,
    MENTOR_BADGE: 500,
  },
  UNLOCK_KEEP_PCT: 0.8,
  DAILY_LIKE_CAP: 30,
  DAILY_COMMENT_CAP: 20,
  DAILY_SHARE_CAP: 10,
  PAIR_LIKE_CAP: 5,
  PAIR_LIKE_WINDOW_HOURS: 24,
  PUBLISHER_DAILY_CAP: 20,
  NEGATIVE_DAILY_FLOOR: -10,
  CONNECTION_DAILY_CAP: 10,
  GAME_KARMA_HARD_CAP: 0,
} as const;
