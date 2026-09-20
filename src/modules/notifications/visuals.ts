import {
  UserPlus, Flame, MessageCircle, AtSign, Repeat2, Award, Calendar, Users,
  BadgeCheck, ShieldAlert, Store, ThumbsUp, Phone, Gamepad2, Egg, Bell,
  Sparkles, Contact,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

// One source of truth for how a notification KIND looks — the coloured type badge
// that overlays the actor avatar (FB/Reddit/Twitter pattern). Used by both the
// bell dropdown and the /notifications page so a redesign stays consistent.
// `bg` is a solid Tailwind background for the badge circle; the glyph is white.

export interface NotifVisual {
  Icon: LucideIcon
  /** Tailwind background class for the badge circle. */
  bg: string
}

const FOLLOW: NotifVisual = { Icon: UserPlus, bg: "bg-emerald-500" }
const REACTION: NotifVisual = { Icon: Flame, bg: "bg-orange-500" }
const COMMENT: NotifVisual = { Icon: MessageCircle, bg: "bg-blue-500" }
const MENTION: NotifVisual = { Icon: AtSign, bg: "bg-violet-500" }
const SHARE: NotifVisual = { Icon: Repeat2, bg: "bg-teal-500" }
const AWARD: NotifVisual = { Icon: Award, bg: "bg-amber-500" }
const EVENT: NotifVisual = { Icon: Calendar, bg: "bg-indigo-500" }
const GROUP: NotifVisual = { Icon: Users, bg: "bg-sky-500" }
const VERIFIED: NotifVisual = { Icon: BadgeCheck, bg: "bg-brand" }
const ALERT: NotifVisual = { Icon: ShieldAlert, bg: "bg-red-500" }
const REVIEW: NotifVisual = { Icon: Store, bg: "bg-emerald-600" }
const ENDORSE: NotifVisual = { Icon: ThumbsUp, bg: "bg-cyan-500" }
const CALL: NotifVisual = { Icon: Phone, bg: "bg-green-500" }
const GAME: NotifVisual = { Icon: Gamepad2, bg: "bg-pink-500" }
const EGG: NotifVisual = { Icon: Egg, bg: "bg-pink-400" }
const CONTACT: NotifVisual = { Icon: Contact, bg: "bg-slate-500" }
const DEFAULT: NotifVisual = { Icon: Bell, bg: "bg-gray-400" }

const MAP: Record<string, NotifVisual> = {
  new_follower: FOLLOW,
  reaction_on_post: REACTION,
  reaction_on_comment: REACTION,
  reaction_milestone: { Icon: Sparkles, bg: "bg-orange-500" },
  comment_on_post: COMMENT,
  mention: MENTION,
  share_on_post: SHARE,
  award_on_post: AWARD,
  achievement_unlocked: AWARD,
  event_rsvp: EVENT,
  new_event_in_batch: EVENT,
  group_join: GROUP,
  group_request: GROUP,
  verification_approved: VERIFIED,
  verification_rejected: ALERT,
  moderation_warning: ALERT,
  business_review: REVIEW,
  endorsement_request: ENDORSE,
  endorsement_received: ENDORSE,
  contact_reveal_request: CONTACT,
  incoming_call: CALL,
  game_nudge: GAME,
  egg_thrown: EGG,
  egg_volunteer: EGG,
}

/** The badge icon + colour for a notification kind (falls back to a bell). */
export function notifVisual(type: string): NotifVisual {
  return MAP[type] ?? DEFAULT
}
