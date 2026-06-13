import { BENEFITS, type BenefitTier, type PlanCode, isBenefitTierAtLeast, VOTING_MIN_ACTIVE_DAYS } from "@/config/membership"
import { daysSinceFirstActive, type UserLike } from "@/lib/membership-cycle"

export interface MemberContext {
  user: UserLike
  benefitTier: BenefitTier
  planCode: PlanCode
  isSuperAdmin?: boolean
}

export function benefitsFor(ctx: MemberContext) {
  return BENEFITS[ctx.benefitTier]
}

export function canPostJob(ctx: MemberContext): boolean {
  return benefitsFor(ctx).jobs
}

export function canApplyAsMentor(ctx: MemberContext): boolean {
  return benefitsFor(ctx).mentorApply
}

export function canListBusiness(ctx: MemberContext): boolean {
  return benefitsFor(ctx).businessListing
}

export function isHighlightedProfile(ctx: MemberContext): boolean {
  return benefitsFor(ctx).highlightedProfile
}

export function isEligibleForSevaCell(ctx: MemberContext): boolean {
  return benefitsFor(ctx).sevaCells
}

export function canVoteInNNAWCA(ctx: MemberContext, now: Date = new Date()): boolean {
  if (!ctx.user.isVerified) return false
  return daysSinceFirstActive(ctx.user, now) >= VOTING_MIN_ACTIVE_DAYS
}

export function isEligibleForCommitteeInvite(ctx: MemberContext): boolean {
  return ctx.planCode === "life"
}

export function canInviteToCommittee(ctx: MemberContext): boolean {
  return ctx.isSuperAdmin === true
}

export function requireBenefitTier(ctx: MemberContext, minimum: BenefitTier): void {
  if (!isBenefitTierAtLeast(ctx.benefitTier, minimum)) {
    throw new MembershipGateError(`Requires ${minimum} tier or higher`)
  }
}

export class MembershipGateError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "MembershipGateError"
  }
}
